package com.deepreader.ai_service.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Service responsible for writing user activity records to the audit log.
 *
 * Audit logs help track important actions performed in the system,
 * such as ingestion requests, document processing events, or other
 * user-related operations.
 */
@Service
public class AuditLogService {

	private final JdbcTemplate jdbcTemplate;

	/**
	 * Creates the audit log service with a JDBC template for database access.
	 */
	public AuditLogService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Stores an audit log entry for a user action.
	 *
	 * @param userId the user who performed the action
	 * @param action the type or name of the action
	 * @param details additional information about the action
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