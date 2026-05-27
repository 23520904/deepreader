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

	@Override
	public void run(ApplicationArguments args) {
		if (!seedEnabled) {
			return;
		}

		jdbcTemplate.execute("alter table app_users add column if not exists email_verified boolean not null default false");
		jdbcTemplate.execute("alter table app_users add column if not exists auth_provider varchar(32) not null default 'LOCAL'");
		jdbcTemplate.execute("alter table app_users add column if not exists provider_subject varchar(255)");

		Integer adminCount = jdbcTemplate.queryForObject(
				"select count(*) from app_users where role = ?",
				Integer.class,
				UserRole.ADMIN.name()
		);

		if (adminCount != null && adminCount > 0) {
			jdbcTemplate.update(
					"update app_users set email_verified = true where role = ?",
					UserRole.ADMIN.name()
			);
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
						(user_id, email, username, avatar_url, password_hash, role, email_verified)
					values (?, ?, ?, ?, ?, ?, true)
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

		jdbcTemplate.update(
				"update app_users set role = ?, username = coalesce(nullif(username, ''), ?), email_verified = true where email = ?",
				UserRole.ADMIN.name(),
				username,
				email
		);
		log.info("Promoted existing account {} to ADMIN because no admin account existed", email);
	}

	private String normalizeEmail(String value) {
		if (!StringUtils.hasText(value) || !value.contains("@")) {
			return "admin@deepreader.local";
		}

		return value.trim().toLowerCase(Locale.ROOT);
	}

	private String normalizeUsername(String value, String email) {
		if (StringUtils.hasText(value)) {
			return value.trim();
		}

		int atIndex = email.indexOf('@');
		return atIndex > 0 ? email.substring(0, atIndex) : "admin";
	}

	private String normalizePassword(String value) {
		if (StringUtils.hasText(value) && value.length() >= 8) {
			return value;
		}

		return "admin12345";
	}
}
