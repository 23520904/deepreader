package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Service for managing user accounts in the web module.
 *
 * <p>This service handles local registration/login, profile updates, password reset,
 * Google OAuth user linking, admin user lookup, and user-related schema compatibility.
 *
 * <p>Passwords are never stored directly. They are hashed with BCrypt before being
 * written to the database.
 */
@Service
public class UserAccountService {
	private final JdbcTemplate jdbcTemplate;

	// Prevents running profile-column migration checks on every service call.
	private volatile boolean profileColumnsEnsured;

	public UserAccountService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Registers a new local user account.
	 *
	 * <p>The email is normalized, the username is cleaned or derived from the email,
	 * and the password is validated before the account is created.
	 */
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
				"""
				insert into app_users
					(user_id, email, username, avatar_url, password_hash, role, email_verified, auth_provider)
				values (?, ?, ?, ?, ?, ?, true, 'LOCAL')
				""",
				userId,
				normalizedEmail,
				normalizedUsername,
				null,
				passwordHash,
				role.name()
		);

		return new UserRecord(userId, normalizedEmail, normalizedUsername, null, null, null, null, role, null);
	}

	/**
	 * Logs in a local user using email and password.
	 *
	 * <p>The error message is intentionally the same for missing email and wrong
	 * password, so callers cannot easily discover which emails are registered.
	 */
	public UserRecord login(String email, String password) {
		ensureProfileColumns();

		String normalizedEmail = normalizeEmail(email);
		List<UserWithHash> users = jdbcTemplate.query(
				"""
				select user_id, email, username, avatar_url, full_name, phone_number, location,
				       password_hash, role, llm_api_token
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
						rs.getString("llm_api_token")
				),
				normalizedEmail
		);

		if (users.isEmpty()) {
			throw new IllegalArgumentException("Invalid email or password");
		}

		UserWithHash user = users.getFirst();

		// Reject accounts without a local password hash or with a password mismatch.
		if (!StringUtils.hasText(user.passwordHash()) || !BCrypt.checkpw(password, user.passwordHash())) {
			throw new IllegalArgumentException("Invalid email or password");
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

	/**
	 * Finds one user by ID.
	 *
	 * <p>This returns the public account fields used by controllers and auth flows,
	 * not the password hash.
	 */
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

		return users.getFirst();
	}

	/**
	 * Updates editable profile fields for a user.
	 *
	 * <p>The existing user is loaded first so unchanged account data like email,
	 * role, and LLM token can be preserved in the returned response.
	 */
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

	/**
	 * Updates the user's personal LLM API token.
	 *
	 * <p>The token is stored separately from public profile fields and is not
	 * changed by normal profile updates.
	 */
	public void updateLlmApiToken(String userId, String token) {
		int updated = jdbcTemplate.update("update app_users set llm_api_token = ? where user_id = ?", token, userId);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found: " + userId);
		}
	}

	/**
	 * Resets the password for a registered email address.
	 *
	 * <p>The new password is validated and hashed before it replaces the old hash.
	 */
	public void resetPassword(String email, String password) {
		ensureProfileColumns();

		String normalizedEmail = normalizeEmail(email);
		validatePassword(password);

		int updated = jdbcTemplate.update(
				"update app_users set password_hash = ? where email = ?",
				BCrypt.hashpw(password, BCrypt.gensalt()),
				normalizedEmail
		);

		if (updated == 0) {
			throw new IllegalArgumentException("Email is not registered");
		}
	}

	/**
	 * Ensures an email is not already used by another account.
	 *
	 * <p>This is used before sending registration OTPs.
	 */
	public void assertEmailAvailable(String email) {
		ensureProfileColumns();

		String normalizedEmail = normalizeEmail(email);
		if (existsByEmail(normalizedEmail)) {
			throw new IllegalArgumentException("Email already exists");
		}
	}

	/**
	 * Ensures an email belongs to an existing account.
	 *
	 * <p>This is used before sending password reset OTPs.
	 */
	public void assertEmailRegistered(String email) {
		ensureProfileColumns();

		String normalizedEmail = normalizeEmail(email);
		if (!existsByEmail(normalizedEmail)) {
			throw new IllegalArgumentException("Email is not registered");
		}
	}

	/**
	 * Finds or creates a user account from Google OAuth profile data.
	 *
	 * <p>The method first checks for an existing account already linked to the
	 * Google subject. If none exists, it tries to link by email. If no account
	 * exists at all, it creates a new Google-based account.
	 */
	public UserRecord findOrCreateGoogleUser(String providerSubject, String email, String name, String avatarUrl) {
		ensureProfileColumns();

		if (!StringUtils.hasText(providerSubject)) {
			throw new IllegalArgumentException("Google account is missing subject.");
		}

		String normalizedEmail = normalizeEmail(email);
		String normalizedUsername = normalizeExternalUsername(name, normalizedEmail);
		String normalizedAvatarUrl = normalizeOptionalText(avatarUrl);

		List<UserRecord> linkedUsers = queryUserRecords(
				"where auth_provider = 'GOOGLE' and provider_subject = ?",
				providerSubject
		);

		if (!linkedUsers.isEmpty()) {
			UserRecord linkedUser = linkedUsers.getFirst();

			// Keep Google-linked account data fresh when the user logs in again.
			jdbcTemplate.update(
					"""
					update app_users
					set email = ?, username = ?, avatar_url = ?, email_verified = true
					where user_id = ?
					""",
					normalizedEmail,
					normalizedUsername,
					normalizedAvatarUrl,
					linkedUser.userId()
			);
			return findById(linkedUser.userId());
		}

		List<UserRecord> emailUsers = queryUserRecords("where email = ?", normalizedEmail);
		if (!emailUsers.isEmpty()) {
			UserRecord existingUser = emailUsers.getFirst();

			// Link an existing email account to Google instead of creating a duplicate user.
			jdbcTemplate.update(
					"""
					update app_users
					set username = ?, avatar_url = ?, auth_provider = 'GOOGLE',
					    provider_subject = ?, email_verified = true
					where user_id = ?
					""",
					normalizedUsername,
					normalizedAvatarUrl,
					providerSubject,
					existingUser.userId()
			);
			return findById(existingUser.userId());
		}

		String userId = UUID.randomUUID().toString();

		// Google users still receive a random password hash so the column remains populated.
		String passwordHash = BCrypt.hashpw(UUID.randomUUID().toString(), BCrypt.gensalt());
		UserRole role = UserRole.USER;

		jdbcTemplate.update(
				"""
				insert into app_users
					(user_id, email, username, avatar_url, password_hash, role,
					 email_verified, auth_provider, provider_subject)
				values (?, ?, ?, ?, ?, ?, true, 'GOOGLE', ?)
				""",
				userId,
				normalizedEmail,
				normalizedUsername,
				normalizedAvatarUrl,
				passwordHash,
				role.name(),
				providerSubject
		);

		return new UserRecord(userId, normalizedEmail, normalizedUsername, normalizedAvatarUrl, null, null, null, role, null);
	}

	/**
	 * Checks whether an email already exists in the user table.
	 */
	private boolean existsByEmail(String email) {
		Integer count = jdbcTemplate.queryForObject("select count(*) from app_users where email = ?", Integer.class, email);
		return count != null && count > 0;
	}

	/**
	 * Finds all admin user IDs.
	 *
	 * <p>This is used by admin-facing flows that need to inspect admin-owned data.
	 */
	public List<String> findAdminUserIds() {
		ensureProfileColumns();
		return jdbcTemplate.queryForList(
				"select user_id from app_users where role = ?",
				String.class,
				UserRole.ADMIN.name()
		);
	}

	/**
	 * Ensures optional account/profile columns exist.
	 *
	 * <p>This works like a lightweight compatibility migration. The volatile flag
	 * and synchronized block avoid repeating the DDL checks for every request.
	 */
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
			jdbcTemplate.execute("alter table app_users add column if not exists llm_api_token text");
			jdbcTemplate.execute("alter table app_users add column if not exists role varchar(32) not null default 'USER'");
			jdbcTemplate.execute("alter table app_users add column if not exists email_verified boolean not null default false");
			jdbcTemplate.execute("alter table app_users add column if not exists auth_provider varchar(32) not null default 'LOCAL'");
			jdbcTemplate.execute("alter table app_users add column if not exists provider_subject varchar(160)");

			// Prevent linking the same Google account to multiple users.
			jdbcTemplate.execute(
					"""
					create unique index if not exists uq_app_users_auth_provider_subject
					on app_users(auth_provider, provider_subject)
					where provider_subject is not null
					"""
			);

			profileColumnsEnsured = true;
		}
	}

	/**
	 * Queries users and maps database rows to public user records.
	 *
	 * <p>The where clause is supplied by internal methods only, while values are
	 * still passed as query arguments.
	 */
	private List<UserRecord> queryUserRecords(String whereClause, Object... args) {
		return jdbcTemplate.query(
				"""
				select user_id, email, username, avatar_url, full_name, phone_number, location,
				       role, llm_api_token
				from app_users
				""" + whereClause,
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
				args
		);
	}

	/**
	 * Validates and normalizes email addresses.
	 *
	 * <p>Lowercasing avoids treating the same email with different casing as
	 * different accounts.
	 */
	private String normalizeEmail(String email) {
		if (!StringUtils.hasText(email) || !email.contains("@")) {
			throw new IllegalArgumentException("Email is invalid");
		}
		return email.trim().toLowerCase(Locale.ROOT);
	}

	/**
	 * Validates local-account passwords.
	 */
	private void validatePassword(String password) {
		if (!StringUtils.hasText(password) || password.length() < 8) {
			throw new IllegalArgumentException("Password must contain at least 8 characters");
		}
	}

	/**
	 * Normalizes a username for local profile updates and registration.
	 *
	 * <p>If no username is provided, the email prefix is used as a fallback.
	 */
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

	/**
	 * Normalizes a username received from an external provider such as Google.
	 *
	 * <p>External names are truncated instead of rejected so OAuth login is not
	 * blocked by a long display name.
	 */
	private String normalizeExternalUsername(String username, String email) {
		String normalized = StringUtils.hasText(username) ? username.trim() : defaultUsernameFromEmail(email);
		return normalized.length() > 80 ? normalized.substring(0, 80) : normalized;
	}

	/**
	 * Returns a stored username or derives one from the email when missing.
	 */
	private String resolveUsername(String username, String email) {
		return StringUtils.hasText(username) ? username.trim() : defaultUsernameFromEmail(email);
	}

	/**
	 * Builds a default username from the part before the email's @ symbol.
	 */
	private String defaultUsernameFromEmail(String email) {
		String normalizedEmail = normalizeEmail(email);
		int atIndex = normalizedEmail.indexOf('@');
		return atIndex > 0 ? normalizedEmail.substring(0, atIndex) : normalizedEmail;
	}

	/**
	 * Normalizes optional text fields.
	 *
	 * <p>Blank values are stored as null to keep profile data clean.
	 */
	private String normalizeOptionalText(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		return value.trim();
	}

	/**
	 * Internal user record that includes the password hash for login verification.
	 *
	 * <p>This record should only be used inside the service and should not be
	 * returned to API clients.
	 */
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
			String llmApiToken
	) {}

	/**
	 * Public user record used by controllers and authentication responses.
	 *
	 * <p>This record does not include the password hash.
	 */
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