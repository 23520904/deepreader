package com.deepreader.web_module.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Service for creating, rotating, validating, and revoking refresh-token sessions.
 *
 * <p>Access tokens are short-lived JWTs, while refresh tokens are stored here so
 * sessions can be revoked or rotated when needed.
 */
@Service
public class SessionService {
	private final JdbcTemplate jdbcTemplate;

	public SessionService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Creates a new refresh token session for a user.
	 *
	 * <p>The generated token is stored in the database with an expiration time,
	 * then returned to the client for future refresh requests.
	 */
	public String createRefreshToken(String userId) {
		String token = UUID.randomUUID() + "." + UUID.randomUUID();
		String sessionId = UUID.randomUUID().toString();
		Instant expiresAt = Instant.now().plus(30, ChronoUnit.DAYS);
		jdbcTemplate.update(
				"insert into auth_sessions (session_id, user_id, refresh_token, expires_at, revoked) values (?, ?, ?, ?, false)",
				sessionId,
				userId,
				token,
				Timestamp.from(expiresAt)
		);
		return token;
	}

	/**
	 * Replaces an active refresh token with a new one.
	 *
	 * <p>Rotation helps reduce reuse of older refresh tokens while keeping the
	 * same session record.
	 */
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

	/**
	 * Finds the user ID connected to an active refresh token.
	 */
	public String requireUserIdByRefreshToken(String refreshToken) {
		return requireActive(refreshToken).userId();
	}

	/**
	 * Revokes a refresh token so it can no longer be used.
	 */
	public void revoke(String refreshToken) {
		jdbcTemplate.update("update auth_sessions set revoked = true, updated_at = now() where refresh_token = ?", refreshToken);
	}

	/**
	 * Loads and validates a refresh-token session.
	 *
	 * <p>The token must exist, must not be revoked, and must not be expired.
	 */
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

	// Internal session data needed when validating or rotating refresh tokens.
	private record SessionRecord(String sessionId, String userId, Instant expiresAt, boolean revoked) {}
}