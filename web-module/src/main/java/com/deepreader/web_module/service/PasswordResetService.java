package com.deepreader.web_module.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
public class PasswordResetService {
	private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

	private final JdbcTemplate jdbcTemplate;
	private final MailService mailService;
	private final SecureRandom secureRandom = new SecureRandom();
	private final Duration otpTtl;
	private final int maxAttempts;

	public PasswordResetService(
			JdbcTemplate jdbcTemplate,
			MailService mailService,
			@Value("${deepreader.password-reset.otp-ttl-minutes:10}") long otpTtlMinutes,
			@Value("${deepreader.password-reset.max-attempts:5}") int maxAttempts
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.mailService = mailService;
		this.otpTtl = Duration.ofMinutes(otpTtlMinutes);
		this.maxAttempts = maxAttempts;
	}

	public void requestReset(String email) {
		String normalizedEmail = normalizeEmail(email);
		List<UserResetState> users = findUser(normalizedEmail);
		if (users.isEmpty()) {
			return;
		}

		String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
		jdbcTemplate.update(
				"""
				insert into password_reset_otps
					(id, email, otp_hash, expires_at, attempts, consumed_at, created_at)
				values (?, ?, ?, ?, 0, null, now())
				""",
				UUID.randomUUID(),
				normalizedEmail,
				BCrypt.hashpw(otp, BCrypt.gensalt()),
				Timestamp.from(Instant.now().plus(otpTtl))
		);
		mailService.sendPasswordResetOtp(normalizedEmail, otp);
	}

	public void resetPassword(String email, String otp, String newPassword) {
		String normalizedEmail = normalizeEmail(email);
		String normalizedOtp = normalizeOtp(otp);
		validatePassword(newPassword);
		OtpRecord record = latestActiveOtp(normalizedEmail);

		if (Instant.now().isAfter(record.expiresAt())) {
			consumeOtp(record.id());
			throw new IllegalArgumentException("Password reset code expired. Please request a new code.");
		}

		if (record.attempts() >= maxAttempts) {
			consumeOtp(record.id());
			throw new IllegalArgumentException("Too many attempts. Please request a new code.");
		}

		if (!BCrypt.checkpw(normalizedOtp, record.otpHash())) {
			incrementAttempts(record.id());
			throw new IllegalArgumentException("Password reset code is invalid.");
		}

		List<UserResetState> users = findUser(normalizedEmail);
		if (users.isEmpty()) {
			consumeOtp(record.id());
			throw new IllegalArgumentException("Password reset code is invalid.");
		}

		String userId = users.getFirst().userId();
		String passwordHash = BCrypt.hashpw(newPassword, BCrypt.gensalt());
		jdbcTemplate.update("update app_users set password_hash = ? where user_id = ?", passwordHash, userId);
		int revoked = jdbcTemplate.update(
				"update auth_sessions set revoked = true, updated_at = now() where user_id = ? and revoked = false",
				userId
		);
		consumeOtp(record.id());
		log.info("Password reset completed for email={}, revokedSessions={}", normalizedEmail, revoked);
	}

	private List<UserResetState> findUser(String email) {
		return jdbcTemplate.query(
				"select user_id, email from app_users where email = ?",
				(rs, rowNum) -> new UserResetState(rs.getString("user_id"), rs.getString("email")),
				email
		);
	}

	private OtpRecord latestActiveOtp(String email) {
		List<OtpRecord> records = jdbcTemplate.query(
				"""
				select id, otp_hash, expires_at, attempts
				from password_reset_otps
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
			throw new IllegalArgumentException("Password reset code not found. Please request a new code.");
		}
		return records.getFirst();
	}

	private void consumeOtp(UUID id) {
		jdbcTemplate.update(
				"update password_reset_otps set consumed_at = coalesce(consumed_at, now()) where id = ?",
				id
		);
	}

	private void incrementAttempts(UUID id) {
		jdbcTemplate.update(
				"update password_reset_otps set attempts = attempts + 1 where id = ?",
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
			throw new IllegalArgumentException("Password reset code must be a 6-digit code.");
		}
		return otp.trim();
	}

	private void validatePassword(String password) {
		if (!StringUtils.hasText(password) || password.length() < 8 || password.length() > 128) {
			throw new IllegalArgumentException("New password must contain between 8 and 128 characters");
		}
	}

	private record UserResetState(String userId, String email) {}

	private record OtpRecord(UUID id, String otpHash, Instant expiresAt, int attempts) {}
}
