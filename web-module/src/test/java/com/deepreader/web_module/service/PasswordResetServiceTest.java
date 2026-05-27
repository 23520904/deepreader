package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCrypt;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class PasswordResetServiceTest {
	private JdbcTemplate jdbcTemplate;
	private MailService mailService;
	private PasswordResetService passwordResetService;
	private UserAccountService userAccountService;

	@BeforeEach
	void setUp() {
		DriverManagerDataSource dataSource = new DriverManagerDataSource();
		dataSource.setDriverClassName("org.h2.Driver");
		dataSource.setUrl("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1");
		jdbcTemplate = new JdbcTemplate(dataSource);
		mailService = mock(MailService.class);
		passwordResetService = new PasswordResetService(jdbcTemplate, mailService, 10, 5);
		userAccountService = new UserAccountService(jdbcTemplate);
		createSchema();
		insertUser("user-1", "reader@example.com", "OldPass123");
	}

	@Test
	void resetPasswordWorksWithValidOtpAndLoginAcceptsNewPassword() {
		passwordResetService.requestReset("reader@example.com");

		String otp = captureSentOtp("reader@example.com");
		passwordResetService.resetPassword("reader@example.com", otp, "NewPass123");

		UserAccountService.UserRecord user = userAccountService.login("reader@example.com", "NewPass123");
		Boolean sessionRevoked = jdbcTemplate.queryForObject(
				"select revoked from auth_sessions where user_id = ?",
				Boolean.class,
				"user-1"
		);
		Integer consumedCount = jdbcTemplate.queryForObject(
				"select count(*) from password_reset_otps where consumed_at is not null",
				Integer.class
		);

		assertThat(user.userId()).isEqualTo("user-1");
		assertThat(sessionRevoked).isTrue();
		assertThat(consumedCount).isEqualTo(1);
	}

	@Test
	void invalidOtpIncrementsAttempts() {
		passwordResetService.requestReset("reader@example.com");

		assertThatThrownBy(() -> passwordResetService.resetPassword("reader@example.com", "000000", "NewPass123"))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Password reset code is invalid.");

		Integer attempts = jdbcTemplate.queryForObject(
				"select attempts from password_reset_otps where email = ?",
				Integer.class,
				"reader@example.com"
		);
		assertThat(attempts).isEqualTo(1);
	}

	@Test
	void expiredOtpIsRejectedAndConsumed() {
		UUID otpId = UUID.randomUUID();
		jdbcTemplate.update(
				"""
				insert into password_reset_otps
					(id, email, otp_hash, expires_at, attempts, consumed_at, created_at)
				values (?, ?, ?, ?, 0, null, now())
				""",
				otpId,
				"reader@example.com",
				BCrypt.hashpw("123456", BCrypt.gensalt()),
				Timestamp.from(Instant.now().minusSeconds(60))
		);

		assertThatThrownBy(() -> passwordResetService.resetPassword("reader@example.com", "123456", "NewPass123"))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("Password reset code expired. Please request a new code.");

		Timestamp consumedAt = jdbcTemplate.queryForObject(
				"select consumed_at from password_reset_otps where id = ?",
				Timestamp.class,
				otpId
		);
		assertThat(consumedAt).isNotNull();
	}

	private String captureSentOtp(String email) {
		ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
		verify(mailService).sendPasswordResetOtp(eq(email), otpCaptor.capture());
		return otpCaptor.getValue();
	}

	private void createSchema() {
		jdbcTemplate.execute("""
				create table app_users (
					user_id varchar(100) primary key,
					email varchar(320) not null unique,
					username varchar(80),
					avatar_url text,
					full_name varchar(120),
					phone_number varchar(30),
					location varchar(120),
					password_hash text not null,
					role varchar(32) not null,
					llm_api_token text,
					email_verified boolean not null default false,
					auth_provider varchar(32) not null default 'LOCAL',
					provider_subject varchar(255)
				)
				""");
		jdbcTemplate.execute("""
				create table auth_sessions (
					session_id varchar(100) primary key,
					user_id varchar(100) not null,
					refresh_token varchar(200) not null unique,
					expires_at timestamp with time zone not null,
					revoked boolean not null default false,
					created_at timestamp with time zone not null default now(),
					updated_at timestamp with time zone not null default now()
				)
				""");
		jdbcTemplate.execute("""
				create table password_reset_otps (
					id uuid primary key,
					email varchar(320) not null,
					otp_hash varchar(100) not null,
					expires_at timestamp with time zone not null,
					attempts integer not null default 0,
					consumed_at timestamp with time zone,
					created_at timestamp with time zone not null default now()
				)
				""");
	}

	private void insertUser(String userId, String email, String password) {
		jdbcTemplate.update(
				"""
				insert into app_users
					(user_id, email, username, password_hash, role, email_verified)
				values (?, ?, ?, ?, ?, true)
				""",
				userId,
				email,
				"Reader",
				BCrypt.hashpw(password, BCrypt.gensalt()),
				UserRole.USER.name()
		);
		jdbcTemplate.update(
				"""
				insert into auth_sessions
					(session_id, user_id, refresh_token, expires_at, revoked)
				values (?, ?, ?, ?, false)
				""",
				"session-1",
				userId,
				"refresh-token",
				Timestamp.from(Instant.now().plusSeconds(86400))
		);
	}
}
