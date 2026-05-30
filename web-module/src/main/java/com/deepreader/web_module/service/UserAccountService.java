package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
import com.deepreader.web_module.model.UserStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserAccountService {
	private final JdbcTemplate jdbcTemplate;
	private volatile boolean profileColumnsEnsured;

	public UserAccountService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public UserRecord register(String email, String password, String username) {
		ensureProfileColumns();
		String normalizedEmail = normalizeEmail(email);
		String normalizedUsername = normalizeUsername(username, normalizedEmail);
		validatePassword(password);
		if (existsByEmail(normalizedEmail)) {
			throw new IllegalArgumentException("Email already exists");
		}
		String userId = UUID.randomUUID().toString();
		String passwordHash = BCrypt.hashpw(password, BCrypt.gensalt());
		UserRole role = UserRole.USER;
		jdbcTemplate.update(
				"insert into app_users (user_id, email, username, avatar_url, password_hash, role, email_verified) values (?, ?, ?, ?, ?, ?, false)",
				userId,
				normalizedEmail,
				normalizedUsername,
				null,
				passwordHash,
				role.name()
		);
		return new UserRecord(userId, normalizedEmail, normalizedUsername, null, null, null, null, role, null);
	}

	public UserRecord login(String email, String password) {
		ensureProfileColumns();
		String normalizedEmail = normalizeEmail(email);
		List<UserWithHash> users = jdbcTemplate.query(
				"""
				select user_id, email, username, avatar_url, full_name, phone_number, location,
				       password_hash, role, llm_api_token, email_verified, status
				from app_users
				where email = ?
				""",
				(rs, rowNum) -> new UserWithHash(
						rs.getString("user_id"),
						rs.getString("email"),
						rs.getString("username"),
						rs.getString("avatar_url"),
						rs.getString("full_name"),
						rs.getString("phone_number"),
						rs.getString("location"),
						rs.getString("password_hash"),
						UserRole.from(rs.getString("role")),
						rs.getString("llm_api_token"),
						rs.getBoolean("email_verified"),
						UserStatus.from(rs.getString("status"))
				),
				normalizedEmail
		);
		if (users.isEmpty()) {
			throw new IllegalArgumentException("Invalid email or password");
		}
		UserWithHash user = users.getFirst();
		if (!BCrypt.checkpw(password, user.passwordHash())) {
			throw new IllegalArgumentException("Invalid email or password");
		}
		if (user.status() == UserStatus.BANNED) {
			throw new IllegalArgumentException("Account is banned.");
		}
		if (!user.emailVerified()) {
			throw new IllegalArgumentException("Please verify your email first.");
		}
		return new UserRecord(
				user.userId(),
				user.email(),
				resolveUsername(user.username(), user.email()),
				normalizeOptionalText(user.avatarUrl()),
				normalizeOptionalText(user.fullName()),
				normalizeOptionalText(user.phoneNumber()),
				normalizeOptionalText(user.location()),
				user.role(),
				user.llmApiToken()
		);
	}

	public UserRecord findOrCreateGoogleUser(GoogleAuthService.GoogleProfile profile) {
		ensureProfileColumns();
		String normalizedEmail = normalizeEmail(profile.email());
		List<UserRecord> existingUsers = findRecordsByEmail(normalizedEmail);
		if (!existingUsers.isEmpty()) {
			ensureUserIsActive(existingUsers.getFirst().userId());
			jdbcTemplate.update(
					"""
					update app_users
					set email_verified = true,
					    provider_subject = coalesce(provider_subject, ?),
					    avatar_url = coalesce(nullif(avatar_url, ''), ?)
					where email = ?
					""",
					profile.subject(),
					normalizeOptionalText(profile.picture()),
					normalizedEmail
			);
			return findRecordsByEmail(normalizedEmail).getFirst();
		}

		String userId = UUID.randomUUID().toString();
		String username = normalizeUsername(profile.name(), normalizedEmail);
		String passwordHash = BCrypt.hashpw(UUID.randomUUID().toString(), BCrypt.gensalt());
		UserRole role = UserRole.USER;
		jdbcTemplate.update(
				"""
				insert into app_users
					(user_id, email, username, avatar_url, password_hash, role, email_verified, auth_provider, provider_subject)
				values (?, ?, ?, ?, ?, ?, true, 'GOOGLE', ?)
				""",
				userId,
				normalizedEmail,
				username,
				normalizeOptionalText(profile.picture()),
				passwordHash,
				role.name(),
				profile.subject()
		);
		return new UserRecord(userId, normalizedEmail, username, normalizeOptionalText(profile.picture()), null, null, null, role, null);
	}

	public UserRecord findById(String userId) {
		ensureProfileColumns();
		List<UserRecord> users = jdbcTemplate.query(
				"""
				select user_id, email, username, avatar_url, full_name, phone_number, location,
				       role, llm_api_token
				from app_users
				where user_id = ?
				""",
				(rs, rowNum) -> new UserRecord(
						rs.getString("user_id"),
						rs.getString("email"),
						resolveUsername(rs.getString("username"), rs.getString("email")),
						normalizeOptionalText(rs.getString("avatar_url")),
						normalizeOptionalText(rs.getString("full_name")),
						normalizeOptionalText(rs.getString("phone_number")),
						normalizeOptionalText(rs.getString("location")),
						UserRole.from(rs.getString("role")),
						rs.getString("llm_api_token")
				),
				userId
		);
		if (users.isEmpty()) {
			throw new IllegalArgumentException("User not found: " + userId);
		}
		ensureUserIsActive(users.getFirst().userId());
		return users.getFirst();
	}

	public UserRecord updateProfile(
			String userId,
			String username,
			String avatarUrl,
			String fullName,
			String phoneNumber,
			String location
	) {
		ensureProfileColumns();
		UserRecord existing = findById(userId);
		String normalizedUsername = normalizeUsername(username, existing.email());
		String normalizedAvatarUrl = normalizeOptionalText(avatarUrl);
		String normalizedFullName = normalizeOptionalText(fullName);
		String normalizedPhoneNumber = normalizeOptionalText(phoneNumber);
		String normalizedLocation = normalizeOptionalText(location);
		int updated = jdbcTemplate.update(
				"""
				update app_users
				set username = ?, avatar_url = ?, full_name = ?, phone_number = ?, location = ?
				where user_id = ?
				""",
				normalizedUsername,
				normalizedAvatarUrl,
				normalizedFullName,
				normalizedPhoneNumber,
				normalizedLocation,
				userId
		);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found: " + userId);
		}
		return new UserRecord(
				userId,
				existing.email(),
				normalizedUsername,
				normalizedAvatarUrl,
				normalizedFullName,
				normalizedPhoneNumber,
				normalizedLocation,
				existing.role(),
				existing.llmApiToken()
		);
	}
	
	public void updateLlmApiToken(String userId, String token) {
		int updated = jdbcTemplate.update("update app_users set llm_api_token = ? where user_id = ?", token, userId);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found: " + userId);
		}
	}

	private boolean existsByEmail(String email) {
		Integer count = jdbcTemplate.queryForObject("select count(*) from app_users where email = ?", Integer.class, email);
		return count != null && count > 0;
	}

	private List<UserRecord> findRecordsByEmail(String email) {
		return jdbcTemplate.query(
				"""
				select user_id, email, username, avatar_url, full_name, phone_number, location,
				       role, llm_api_token
				from app_users
				where email = ?
				""",
				(rs, rowNum) -> new UserRecord(
						rs.getString("user_id"),
						rs.getString("email"),
						resolveUsername(rs.getString("username"), rs.getString("email")),
						normalizeOptionalText(rs.getString("avatar_url")),
						normalizeOptionalText(rs.getString("full_name")),
						normalizeOptionalText(rs.getString("phone_number")),
						normalizeOptionalText(rs.getString("location")),
						UserRole.from(rs.getString("role")),
						rs.getString("llm_api_token")
				),
				email
		);
	}

	public List<String> findAdminUserIds() {
		ensureProfileColumns();
		return jdbcTemplate.queryForList(
				"select user_id from app_users where role = ?",
				String.class,
				UserRole.ADMIN.name()
		);
	}

	private void ensureProfileColumns() {
		if (profileColumnsEnsured) {
			return;
		}
		synchronized (this) {
			if (profileColumnsEnsured) {
				return;
			}
			jdbcTemplate.execute("alter table app_users add column if not exists username varchar(80)");
			jdbcTemplate.execute("alter table app_users add column if not exists avatar_url text");
			jdbcTemplate.execute("alter table app_users add column if not exists full_name varchar(120)");
			jdbcTemplate.execute("alter table app_users add column if not exists phone_number varchar(30)");
			jdbcTemplate.execute("alter table app_users add column if not exists location varchar(120)");
			jdbcTemplate.execute("alter table app_users add column if not exists email_verified boolean not null default false");
			jdbcTemplate.execute("alter table app_users add column if not exists auth_provider varchar(32) not null default 'LOCAL'");
			jdbcTemplate.execute("alter table app_users add column if not exists provider_subject varchar(255)");
			jdbcTemplate.execute("alter table app_users add column if not exists status varchar(32) not null default 'ACTIVE'");
			jdbcTemplate.execute("alter table app_users add column if not exists daily_requests_limit integer");
			jdbcTemplate.execute("alter table app_users add column if not exists daily_tokens_limit integer");
			jdbcTemplate.execute("alter table app_users add column if not exists quota_disabled boolean not null default false");
			profileColumnsEnsured = true;
		}
	}

	private void ensureUserIsActive(String userId) {
		List<String> statuses = jdbcTemplate.queryForList(
				"select status from app_users where user_id = ?",
				String.class,
				userId
		);
		if (!statuses.isEmpty() && UserStatus.from(statuses.getFirst()) == UserStatus.BANNED) {
			throw new IllegalArgumentException("Account is banned.");
		}
	}

	private String normalizeEmail(String email) {
		if (!StringUtils.hasText(email) || !email.contains("@")) {
			throw new IllegalArgumentException("Email is invalid");
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private void validatePassword(String password) {
		if (!StringUtils.hasText(password) || password.length() < 8) {
			throw new IllegalArgumentException("Password must contain at least 8 characters");
		}
	}

	private String normalizeUsername(String username, String email) {
		if (!StringUtils.hasText(username)) {
			return defaultUsernameFromEmail(email);
		}
		String trimmed = username.trim();
		if (trimmed.length() > 80) {
			throw new IllegalArgumentException("Username must contain at most 80 characters");
		}
		return trimmed;
	}

	private String resolveUsername(String username, String email) {
		return StringUtils.hasText(username) ? username.trim() : defaultUsernameFromEmail(email);
	}

	private String defaultUsernameFromEmail(String email) {
		String normalizedEmail = normalizeEmail(email);
		int atIndex = normalizedEmail.indexOf('@');
		return atIndex > 0 ? normalizedEmail.substring(0, atIndex) : normalizedEmail;
	}

	private String normalizeOptionalText(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		return value.trim();
	}

	private record UserWithHash(
			String userId,
			String email,
			String username,
			String avatarUrl,
			String fullName,
			String phoneNumber,
			String location,
			String passwordHash,
			UserRole role,
			String llmApiToken,
			boolean emailVerified,
			UserStatus status
	) {}
	public record UserRecord(
			String userId,
			String email,
			String username,
			String avatarUrl,
			String fullName,
			String phoneNumber,
			String location,
			UserRole role,
			String llmApiToken
	) {}
}
