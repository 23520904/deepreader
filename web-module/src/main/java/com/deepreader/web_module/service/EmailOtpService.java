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

@Service
public class EmailOtpService {
	public enum Purpose {
		REGISTER,
		PASSWORD_RESET
	}

	private static final SecureRandom RANDOM = new SecureRandom();

	private final JdbcTemplate jdbcTemplate;
	private final EmailDeliveryService emailDeliveryService;
	private final int ttlMinutes;
	private final int maxAttempts;
	private volatile boolean tableEnsured;

	public EmailOtpService(
			JdbcTemplate jdbcTemplate,
			EmailDeliveryService emailDeliveryService,
			@Value("${deepreader.auth.otp.ttl-minutes:10}") int ttlMinutes,
			@Value("${deepreader.auth.otp.max-attempts:5}") int maxAttempts
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.emailDeliveryService = emailDeliveryService;
		this.ttlMinutes = Math.max(1, ttlMinutes);
		this.maxAttempts = Math.max(1, maxAttempts);
	}

	public void sendRegistrationCode(String email) {
		sendCode(email, Purpose.REGISTER, "DeepReader sign up verification code");
	}

	public void sendPasswordResetCode(String email) {
		sendCode(email, Purpose.PASSWORD_RESET, "DeepReader password reset code");
	}

	public void verifyRegistrationCode(String email, String code) {
		verifyCode(email, Purpose.REGISTER, code);
	}

	public void verifyPasswordResetCode(String email, String code) {
		verifyCode(email, Purpose.PASSWORD_RESET, code);
	}

	private void sendCode(String email, Purpose purpose, String subject) {
		ensureTable();
		String normalizedEmail = normalizeEmail(email);
		String code = "%04d".formatted(RANDOM.nextInt(10_000));
		String hash = BCrypt.hashpw(code, BCrypt.gensalt());
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

		emailDeliveryService.sendOtp(normalizedEmail, code, subject, ttlMinutes);
	}

	private void verifyCode(String email, Purpose purpose, String code) {
		ensureTable();
		String normalizedEmail = normalizeEmail(email);
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

		if (records.isEmpty()) {
			throw new IllegalArgumentException("Verification code is invalid or expired.");
		}

		OtpRecord record = records.getFirst();
		if (record.expiresAt().isBefore(Instant.now())) {
			deleteCode(normalizedEmail, purpose);
			throw new IllegalArgumentException("Verification code expired. Please request a new code.");
		}

		if (record.attempts() >= maxAttempts) {
			deleteCode(normalizedEmail, purpose);
			throw new IllegalArgumentException("Too many failed attempts. Please request a new code.");
		}

		if (!BCrypt.checkpw(code.trim(), record.codeHash())) {
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

		deleteCode(normalizedEmail, purpose);
	}

	private void deleteCode(String email, Purpose purpose) {
		jdbcTemplate.update(
				"delete from auth_email_otps where email = ? and purpose = ?",
				email,
				purpose.name()
		);
	}

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

	private String normalizeEmail(String email) {
		if (!StringUtils.hasText(email) || !email.contains("@")) {
			throw new IllegalArgumentException("Email is invalid");
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private record OtpRecord(String codeHash, Instant expiresAt, int attempts) {
	}
}
