package com.deepreader.ai_service.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class SessionService {

	private final JdbcTemplate jdbcTemplate;

	public SessionService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public String createRefreshToken(String userId) {
		String token = UUID.randomUUID() + "." + UUID.randomUUID();
		String sessionId = UUID.randomUUID().toString();
		Instant expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
		jdbcTemplate.update(
				"insert into auth_sessions (session_id, user_id, refresh_token, expires_at, revoked) values (?, ?, ?, ?, false)",
				sessionId,
				userId,
				token,
				expiresAt
		);
		return token;
	}

	public String rotateRefreshToken(String refreshToken) {
		SessionRecord session = requireActive(refreshToken);
		String newToken = UUID.randomUUID() + "." + UUID.randomUUID();
		jdbcTemplate.update(
				"update auth_sessions set refresh_token = ?, updated_at = now() where session_id = ?",
				newToken,
				session.sessionId()
		);
		return newToken;
	}

	public String requireUserIdByRefreshToken(String refreshToken) {
		return requireActive(refreshToken).userId();
	}

	public void revoke(String refreshToken) {
		jdbcTemplate.update("update auth_sessions set revoked = true, updated_at = now() where refresh_token = ?", refreshToken);
	}

	private SessionRecord requireActive(String refreshToken) {
		List<SessionRecord> sessions = jdbcTemplate.query(
				"select session_id, user_id, expires_at, revoked from auth_sessions where refresh_token = ?",
				(rs, rowNum) -> new SessionRecord(
						rs.getString("session_id"),
						rs.getString("user_id"),
						rs.getTimestamp("expires_at").toInstant(),
						rs.getBoolean("revoked")
				),
				refreshToken
		);
		if (sessions.isEmpty()) {
			throw new IllegalArgumentException("Invalid refresh token");
		}
		SessionRecord session = sessions.getFirst();
		if (session.revoked() || Instant.now().isAfter(session.expiresAt())) {
			throw new IllegalArgumentException("Refresh token expired or revoked");
		}
		return session;
	}

	private record SessionRecord(String sessionId, String userId, Instant expiresAt, boolean revoked) {}
}
