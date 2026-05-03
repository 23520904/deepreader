package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
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

	public UserAccountService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public UserRecord register(String email, String password) {
		String normalizedEmail = normalizeEmail(email);
		validatePassword(password);
		if (existsByEmail(normalizedEmail)) {
			throw new IllegalArgumentException("Email already exists");
		}
		String userId = UUID.randomUUID().toString();
		String passwordHash = BCrypt.hashpw(password, BCrypt.gensalt());
		UserRole role = UserRole.USER;
		jdbcTemplate.update(
				"insert into app_users (user_id, email, password_hash, role) values (?, ?, ?, ?)",
				userId,
				normalizedEmail,
				passwordHash,
				role.name()
		);
		return new UserRecord(userId, normalizedEmail, role, null);
	}

	public UserRecord login(String email, String password) {
		String normalizedEmail = normalizeEmail(email);
		List<UserWithHash> users = jdbcTemplate.query(
				"select user_id, email, password_hash, role, llm_api_token from app_users where email = ?",
				(rs, rowNum) -> new UserWithHash(
						rs.getString("user_id"),
						rs.getString("email"),
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
		if (!BCrypt.checkpw(password, user.passwordHash())) {
			throw new IllegalArgumentException("Invalid email or password");
		}
		return new UserRecord(user.userId(), user.email(), user.role(), user.llmApiToken());
	}

	public UserRecord findById(String userId) {
		List<UserRecord> users = jdbcTemplate.query(
				"select user_id, email, role, llm_api_token from app_users where user_id = ?",
				(rs, rowNum) -> new UserRecord(
						rs.getString("user_id"),
						rs.getString("email"),
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

	private record UserWithHash(String userId, String email, String passwordHash, UserRole role, String llmApiToken) {}
	public record UserRecord(String userId, String email, UserRole role, String llmApiToken) {}
}
