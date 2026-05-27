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
import java.util.UUID;

@Service
public class EmailVerificationService {
	private final JdbcTemplate jdbcTemplate;
	private final MailService mailService;
	private final SecureRandom secureRandom = new SecureRandom();
	private final Duration otpTtl;
	private final Duration resendCooldown;
	private final int maxAttempts;

	public EmailVerificationService(
			JdbcTemplate jdbcTemplate,
			MailService mailService,
			@Value("${deepreader.email-verification.otp-ttl-minutes:10}") long otpTtlMinutes,
			@Value("${deepreader.email-verification.resend-cooldown-seconds:60}") long resendCooldownSeconds,
			@Value("${deepreader.email-verification.max-attempts:5}") int maxAttempts
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.mailService = mailService;
		this.otpTtl = Duration.ofMinutes(otpTtlMinutes);
		this.resendCooldown = Duration.ofSeconds(resendCooldownSeconds);
		this.maxAttempts = maxAttempts;
	}

	public void sendRegistrationOtp(String email) {
		String normalizedEmail = normalizeEmail(email);
		createAndSendOtp(normalizedEmail, false);
	}

	public void resendOtp(String email) {
		String normalizedEmail = normalizeEmail(email);
		UserVerificationState user = requireUser(normalizedEmail);
		if (user.emailVerified()) {
			throw new IllegalArgumentException("Email is already verified.");
		}
		createAndSendOtp(normalizedEmail, true);
	}

	public void verifyEmail(String email, String otp) {
		String normalizedEmail = normalizeEmail(email);
		String normalizedOtp = normalizeOtp(otp);
		OtpRecord record = latestActiveOtp(normalizedEmail);

		if (Instant.now().isAfter(record.expiresAt())) {
			consumeOtp(record.id());
			throw new IllegalArgumentException("Verification code expired. Please request a new code.");
		}

		if (record.attempts() >= maxAttempts) {
			consumeOtp(record.id());
			throw new IllegalArgumentException("Too many attempts. Please request a new code.");
		}

		if (!BCrypt.checkpw(normalizedOtp, record.otpHash())) {
			incrementAttempts(record.id());
			throw new IllegalArgumentException("Verification code is invalid.");
		}

		int updated = jdbcTemplate.update(
				"update app_users set email_verified = true where email = ?",
				normalizedEmail
		);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found.");
		}
		consumeOtp(record.id());
	}

	private void createAndSendOtp(String email, boolean enforceCooldown) {
		if (enforceCooldown && hasRecentOtp(email)) {
			throw new IllegalArgumentException("Please wait " + resendCooldown.toSeconds() + " seconds before requesting another code.");
		}

		String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
		jdbcTemplate.update(
				"""
				insert into email_verification_otps
					(id, email, otp_hash, expires_at, attempts, consumed_at, created_at)
				values (?, ?, ?, ?, 0, null, now())
				""",
				UUID.randomUUID(),
				email,
				BCrypt.hashpw(otp, BCrypt.gensalt()),
				Timestamp.from(Instant.now().plus(otpTtl))
		);
		mailService.sendVerificationOtp(email, otp);
	}

	private boolean hasRecentOtp(String email) {
		Integer count = jdbcTemplate.queryForObject(
				"""
				select count(*)
				from email_verification_otps
				where email = ?
				  and consumed_at is null
				  and created_at > ?
				""",
				Integer.class,
				email,
				Timestamp.from(Instant.now().minus(resendCooldown))
		);
		return count != null && count > 0;
	}

	private UserVerificationState requireUser(String email) {
		List<UserVerificationState> users = jdbcTemplate.query(
				"select email, email_verified from app_users where email = ?",
				(rs, rowNum) -> new UserVerificationState(rs.getString("email"), rs.getBoolean("email_verified")),
				email
		);
		if (users.isEmpty()) {
			throw new IllegalArgumentException("User not found.");
		}
		return users.getFirst();
	}

	private OtpRecord latestActiveOtp(String email) {
		List<OtpRecord> records = jdbcTemplate.query(
				"""
				select id, otp_hash, expires_at, attempts
				from email_verification_otps
				where email = ?
				  and consumed_at is null
				order by created_at desc
				limit 1
				""",
				(rs, rowNum) -> new OtpRecord(
						rs.getObject("id", UUID.class),
						rs.getString("otp_hash"),
						rs.getTimestamp("expires_at").toInstant(),
						rs.getInt("attempts")
				),
				email
		);
		if (records.isEmpty()) {
			throw new IllegalArgumentException("Verification code not found. Please request a new code.");
		}
		return records.getFirst();
	}

	private void consumeOtp(UUID id) {
		jdbcTemplate.update(
				"update email_verification_otps set consumed_at = coalesce(consumed_at, now()) where id = ?",
				id
		);
	}

	private void incrementAttempts(UUID id) {
		jdbcTemplate.update(
				"update email_verification_otps set attempts = attempts + 1 where id = ?",
				id
		);
	}

	private String normalizeEmail(String email) {
		if (!StringUtils.hasText(email) || !email.contains("@")) {
			throw new IllegalArgumentException("Email is invalid");
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private String normalizeOtp(String otp) {
		if (!StringUtils.hasText(otp) || !otp.trim().matches("\\d{6}")) {
			throw new IllegalArgumentException("Verification code must be a 6-digit code.");
		}
		return otp.trim();
	}

	private record UserVerificationState(String email, boolean emailVerified) {}

	private record OtpRecord(UUID id, String otpHash, Instant expiresAt, int attempts) {}
}
