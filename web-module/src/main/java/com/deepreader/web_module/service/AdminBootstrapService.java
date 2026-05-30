package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Seeds or promotes a default admin account when the application starts.
 *
 * <p>This helps new deployments have at least one admin account, unless admin
 * seeding is disabled by configuration.
 */
@Service
public class AdminBootstrapService implements ApplicationRunner {
	private static final Logger log = LoggerFactory.getLogger(AdminBootstrapService.class);

	private final JdbcTemplate jdbcTemplate;
	private final boolean seedEnabled;
	private final String adminEmail;
	private final String adminUsername;
	private final String adminPassword;

	public AdminBootstrapService(
			JdbcTemplate jdbcTemplate,
			@Value("${app.admin.seed.enabled:true}") boolean seedEnabled,
			@Value("${app.admin.email:admin@deepreader.local}") String adminEmail,
			@Value("${app.admin.username:admin}") String adminUsername,
			@Value("${app.admin.password:admin12345}") String adminPassword
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.seedEnabled = seedEnabled;
		this.adminEmail = adminEmail;
		this.adminUsername = adminUsername;
		this.adminPassword = adminPassword;
	}

	/**
	 * Runs once at startup and ensures at least one ADMIN user exists.
	 */
	@Override
	public void run(ApplicationArguments args) {
		if (!seedEnabled) {
			return;
		}

		Integer adminCount = jdbcTemplate.queryForObject(
				"select count(*) from app_users where role = ?",
				Integer.class,
				UserRole.ADMIN.name()
		);

		// Do nothing when an admin account already exists.
		if (adminCount != null && adminCount > 0) {
			return;
		}

		String email = normalizeEmail(adminEmail);
		String username = normalizeUsername(adminUsername, email);
		String password = normalizePassword(adminPassword);
		List<String> existingUsers = jdbcTemplate.queryForList(
				"select user_id from app_users where email = ?",
				String.class,
				email
		);

		if (existingUsers.isEmpty()) {
			jdbcTemplate.update(
					"""
					insert into app_users
						(user_id, email, username, avatar_url, password_hash, role)
					values (?, ?, ?, ?, ?, ?)
					""",
					UUID.randomUUID().toString(),
					email,
					username,
					null,
					BCrypt.hashpw(password, BCrypt.gensalt()),
					UserRole.ADMIN.name()
			);
			log.info("Seeded default admin account with email {}", email);
			return;
		}

		// If the configured email already exists, promote that account instead of creating a duplicate.
		jdbcTemplate.update(
				"update app_users set role = ?, username = coalesce(nullif(username, ''), ?) where email = ?",
				UserRole.ADMIN.name(),
				username,
				email
		);
		log.info("Promoted existing account {} to ADMIN because no admin account existed", email);
	}

	/**
	 * Normalizes the configured admin email and falls back to a safe development email.
	 */
	private String normalizeEmail(String value) {
		if (!StringUtils.hasText(value) || !value.contains("@")) {
			return "admin@deepreader.local";
		}

		return value.trim().toLowerCase(Locale.ROOT);
	}

	/**
	 * Normalizes the admin username or derives one from the email address.
	 */
	private String normalizeUsername(String value, String email) {
		if (StringUtils.hasText(value)) {
			return value.trim();
		}

		int atIndex = email.indexOf('@');
		return atIndex > 0 ? email.substring(0, atIndex) : "admin";
	}

	/**
	 * Ensures the seeded admin password has a minimum length.
	 */
	private String normalizePassword(String value) {
		if (StringUtils.hasText(value) && value.length() >= 8) {
			return value;
		}

		return "admin12345";
	}
}