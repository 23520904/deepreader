package com.deepreader.web_module.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for writing user and admin actions to the audit log.
 *
 * <p>Audit logs help track important security and account events.
 */
@Service
public class AuditLogService {
	private final JdbcTemplate jdbcTemplate;

	public AuditLogService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Stores one audit log entry.
	 *
	 * <p>The user ID can be null for actions that happen before authentication,
	 * such as password reset requests.
	 */
	public void log(String userId, String action, String details) {
		jdbcTemplate.update(
				"insert into audit_logs (user_id, action, details) values (?, ?, ?)",
				userId,
				action,
				details
		);
	}
}