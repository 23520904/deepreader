package com.deepreader.web_module.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;

import java.net.InetSocketAddress;
import java.util.List;
import java.util.Locale;

@Service
public class LoginHistoryService {
	private final JdbcTemplate jdbcTemplate;

	public LoginHistoryService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public void record(ServerWebExchange exchange, String email, String userId, boolean success, String failureReason) {
		jdbcTemplate.update(
				"""
				insert into login_history (user_id, email, ip_address, user_agent, success, failure_reason)
				values (?, ?, ?, ?, ?, ?)
				""",
				userId,
				normalizeEmail(email),
				clientIp(exchange),
				exchange.getRequest().getHeaders().getFirst("User-Agent"),
				success,
				failureReason
		);
	}

	public String findUserIdByEmail(String email) {
		if (!StringUtils.hasText(email)) {
			return null;
		}
		List<String> ids = jdbcTemplate.queryForList(
				"select user_id from app_users where email = ?",
				String.class,
				normalizeEmail(email)
		);
		return ids.isEmpty() ? null : ids.getFirst();
	}

	private String clientIp(ServerWebExchange exchange) {
		String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
		if (StringUtils.hasText(forwardedFor)) {
			return forwardedFor.split(",")[0].trim();
		}
		InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
		return remoteAddress == null || remoteAddress.getAddress() == null
				? null
				: remoteAddress.getAddress().getHostAddress();
	}

	private String normalizeEmail(String email) {
		return StringUtils.hasText(email) ? email.trim().toLowerCase(Locale.ROOT) : null;
	}
}
