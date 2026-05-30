package com.deepreader.web_module.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Service for creating, sending, and verifying email OTP codes.
 *
 * <p>This service supports different OTP purposes, such as registration and
 * password reset. Each email can have one active OTP per purpose.
 *
 * <p>OTP codes are never stored as plain text. Only BCrypt hashes are saved in
 * the database, so leaked OTP records cannot be used directly.
 */
@Service
public class EmailOtpService {
	/**
	 * Represents why an OTP code was created.
	 *
	 * <p>The purpose is stored with the email to keep registration OTPs and
	 * password reset OTPs separate.
	 */
	public enum Purpose {
		REGISTER,
		PASSWORD_RESET
	}

	private static final SecureRandom RANDOM = new SecureRandom();

	private final JdbcTemplate jdbcTemplate;
	private final EmailDeliveryService emailDeliveryService;
	private final int ttlMinutes;
	private final int maxAttempts;

	// Used to avoid running the create-table statement on every OTP operation.
	private volatile boolean tableEnsured;

	public EmailOtpService(
			JdbcTemplate jdbcTemplate,
			EmailDeliveryService emailDeliveryService,
			@Value("${deepreader.auth.otp.ttl-minutes:10}") int ttlMinutes,
			@Value("${deepreader.auth.otp.max-attempts:5}") int maxAttempts
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.emailDeliveryService = emailDeliveryService;

		// Ensure invalid configuration values cannot disable expiration or attempt limits.
		this.ttlMinutes = Math.max(1, ttlMinutes);
		this.maxAttempts = Math.max(1, maxAttempts);
	}

	/**
	 * Sends an OTP code used for new user registration.
	 */
	public void sendRegistrationCode(String email) {
		sendCode(email, Purpose.REGISTER, "DeepReader sign up verification code");
	}

	/**
	 * Sends an OTP code used for password reset.
	 */
	public void sendPasswordResetCode(String email) {
		sendCode(email, Purpose.PASSWORD_RESET, "DeepReader password reset code");
	}

	/**
	 * Verifies a registration OTP code.
	 */
	public void verifyRegistrationCode(String email, String code) {
		verifyCode(email, Purpose.REGISTER, code);
	}

	/**
	 * Verifies a password reset OTP code.
	 */
	public void verifyPasswordResetCode(String email, String code) {
		verifyCode(email, Purpose.PASSWORD_RESET, code);
	}

	/**
	 * Creates a new OTP code, stores its hash, and sends the plain code by email.
	 *
	 * <p>If an OTP already exists for the same email and purpose, it is replaced.
	 * This makes the latest email code the only valid code and resets failed attempts.
	 */
	private void sendCode(String email, Purpose purpose, String subject) {
		ensureTable();

		// Normalize before storing so the same email is not saved in multiple formats.
		String normalizedEmail = normalizeEmail(email);

		// Generate a 4-digit code and keep leading zeroes when needed.
		String code = "%04d".formatted(RANDOM.nextInt(10_000));

		// Store only a hash of the OTP, not the plain code.
		String hash = BCrypt.hashpw(code, BCrypt.gensalt());

		// The code is valid only for the configured TTL window.
		Instant expiresAt = Instant.now().plus(Duration.ofMinutes(ttlMinutes));

		jdbcTemplate.update(
				"""
				insert into auth_email_otps
					(email, purpose, code_hash, expires_at, attempts, created_at, updated_at)
				values (?, ?, ?, ?, 0, now(), now())
				on conflict (email, purpose) do update
				set code_hash = excluded.code_hash,
				    expires_at = excluded.expires_at,
				    attempts = 0,
				    updated_at = now()
				""",
				normalizedEmail,
				purpose.name(),
				hash,
				Timestamp.from(expiresAt)
		);

		// Send the plain OTP only by email. The database contains only the hash.
		emailDeliveryService.sendOtp(normalizedEmail, code, subject, ttlMinutes);
	}

	/**
	 * Verifies an OTP code for the given email and purpose.
	 *
	 * <p>The method checks format, existence, expiration, failed-attempt count,
	 * and finally compares the submitted code with the stored BCrypt hash.
	 *
	 * <p>OTP records are deleted when they expire, exceed the attempt limit,
	 * or are successfully used.
	 */
	private void verifyCode(String email, Purpose purpose, String code) {
		ensureTable();

		String normalizedEmail = normalizeEmail(email);

		// Only accept the expected 4-digit OTP format before touching the hash check.
		if (!StringUtils.hasText(code) || !code.trim().matches("\\d{4}")) {
			throw new IllegalArgumentException("Verification code must contain 4 digits.");
		}

		List<OtpRecord> records = jdbcTemplate.query(
				"""
				select code_hash, expires_at, attempts
				from auth_email_otps
				where email = ? and purpose = ?
				""",
				(rs, rowNum) -> new OtpRecord(
						rs.getString("code_hash"),
						rs.getTimestamp("expires_at").toInstant(),
						rs.getInt("attempts")
				),
				normalizedEmail,
				purpose.name()
		);

		// No active OTP means the code was never requested, already used, or already deleted.
		if (records.isEmpty()) {
			throw new IllegalArgumentException("Verification code is invalid or expired.");
		}

		OtpRecord record = records.getFirst();

		// Expired OTPs are removed immediately so they cannot be retried again.
		if (record.expiresAt().isBefore(Instant.now())) {
			deleteCode(normalizedEmail, purpose);
			throw new IllegalArgumentException("Verification code expired. Please request a new code.");
		}

		// Too many failed attempts invalidates the OTP and forces the user to request a new one.
		if (record.attempts() >= maxAttempts) {
			deleteCode(normalizedEmail, purpose);
			throw new IllegalArgumentException("Too many failed attempts. Please request a new code.");
		}

		if (!BCrypt.checkpw(code.trim(), record.codeHash())) {
			// Increase attempts only after a valid-format but incorrect code.
			jdbcTemplate.update(
					"""
					update auth_email_otps
					set attempts = attempts + 1, updated_at = now()
					where email = ? and purpose = ?
					""",
					normalizedEmail,
					purpose.name()
			);
			throw new IllegalArgumentException("Verification code is not correct.");
		}

		// OTPs are single-use, so delete the record after a successful verification.
		deleteCode(normalizedEmail, purpose);
	}

	/**
	 * Removes the active OTP for one email and purpose.
	 *
	 * <p>This is used after success and also when a code should no longer be valid.
	 */
	private void deleteCode(String email, Purpose purpose) {
		jdbcTemplate.update(
				"delete from auth_email_otps where email = ? and purpose = ?",
				email,
				purpose.name()
		);
	}

	/**
	 * Creates the OTP storage table when it is first needed.
	 *
	 * <p>The table is created lazily so the service can run even if this table
	 * was not created by a migration yet.
	 *
	 * <p>The volatile flag avoids repeated checks, and the synchronized block
	 * prevents multiple threads from running the DDL at the same time.
	 */
	private void ensureTable() {
		if (tableEnsured) {
			return;
		}
		synchronized (this) {
			if (tableEnsured) {
				return;
			}
			jdbcTemplate.execute(
					"""
					create table if not exists auth_email_otps (
						email varchar(320) not null,
						purpose varchar(32) not null,
						code_hash text not null,
						expires_at timestamptz not null,
						attempts integer not null default 0,
						created_at timestamptz not null default now(),
						updated_at timestamptz not null default now(),
						primary key (email, purpose)
					)
					"""
			);
			tableEnsured = true;
		}
	}

	/**
	 * Validates and normalizes an email address before database operations.
	 *
	 * <p>Lowercasing prevents separate OTP rows for the same email with different
	 * letter casing.
	 */
	private String normalizeEmail(String email) {
		if (!StringUtils.hasText(email) || !email.contains("@")) {
			throw new IllegalArgumentException("Email is invalid");
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	/**
	 * Small internal record containing only the fields needed for OTP verification.
	 */
	private record OtpRecord(String codeHash, Instant expiresAt, int attempts) {
	}
}