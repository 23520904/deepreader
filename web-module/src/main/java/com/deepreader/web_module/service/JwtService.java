package com.deepreader.web_module.service;

import com.deepreader.web_module.config.JwtProperties;
import com.deepreader.web_module.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Date;
import java.util.Objects;
import javax.crypto.SecretKey;

/**
 * Generates and validates JWT access tokens for authenticated web clients.
 *
 * <p>Only tokens with claim type "access" are accepted by the application gateway.
 */
@Service
public class JwtService {
	private final JwtProperties jwtProperties;

	public JwtService(JwtProperties jwtProperties) {
		this.jwtProperties = jwtProperties;
	}

	/**
	 * Builds a signed JWT access token containing user id and role claims.
	 */
	public String generateAccessToken(String userId, UserRole role) {
		Instant issuedAt = Instant.now();
		Instant expiresAt = issuedAt.plusSeconds(jwtProperties.getTtlSeconds());
		return Jwts.builder()
				.setSubject(userId)
				.setIssuedAt(Date.from(issuedAt))
				.setExpiration(Date.from(expiresAt))
				.claim("type", "access")
				.claim("role", role == null ? UserRole.USER.name() : role.name())
				.signWith(signingKey(), SignatureAlgorithm.HS256)
				.compact();
	}

	/**
	 * Verifies a token signature and returns the resolved authenticated principal.
	 */
	public AuthPrincipal verifyAndGetPrincipal(String token) {
		try {
			Claims claims = Jwts.parserBuilder()
					.setSigningKey(signingKey())
					.build()
					.parseClaimsJws(token)
					.getBody();
			String sub = claims.getSubject();
			String type = claims.get("type", String.class);
			String role = claims.get("role", String.class);
			if (!StringUtils.hasText(sub)) {
				throw new IllegalArgumentException("Invalid JWT payload");
			}
			if (!"access".equals(type)) {
				throw new IllegalArgumentException("Unsupported JWT type");
			}
			return new AuthPrincipal(sub, UserRole.from(role));
		} catch (IllegalArgumentException | io.jsonwebtoken.JwtException ex) {
			throw new IllegalArgumentException("Invalid JWT", ex);
		} catch (Exception ex) {
			throw new IllegalArgumentException("Invalid JWT", ex);
		}
	}

	private SecretKey signingKey() {
		String secret = Objects.requireNonNull(jwtProperties.getSecret(), "JWT secret must not be null");
		return Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
	}

	public record AuthPrincipal(String userId, UserRole role) {}
}
