package com.deepreader.web_module.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {
	private final JdbcTemplate jdbcTemplate;

	public AuditLogService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public void log(String userId, String action, String details) {
		jdbcTemplate.update(
				"insert into audit_logs (user_id, action, details) values (?, ?, ?)",
				userId,
				action,
				details
		);
	}
}
