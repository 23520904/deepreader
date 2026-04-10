package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.JwtProperties;
import com.deepreader.ai_service.model.UserRole;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Service
public class JwtService {

	private final JwtProperties jwtProperties;
	private final ObjectMapper objectMapper;

	public JwtService(JwtProperties jwtProperties, ObjectMapper objectMapper) {
		this.jwtProperties = jwtProperties;
		this.objectMapper = objectMapper;
	}

	public String generateAccessToken(String userId, UserRole role) {
		try {
			long issuedAt = Instant.now().getEpochSecond();
			long expiresAt = issuedAt + jwtProperties.getTtlSeconds();
			String header = base64UrlEncode(objectMapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
			String payload = base64UrlEncode(objectMapper.writeValueAsBytes(Map.of(
					"sub", userId,
					"iat", issuedAt,
					"exp", expiresAt,
					"type", "access",
					"role", role == null ? UserRole.USER.name() : role.name()
			)));
			String signature = sign(header + "." + payload);
			return header + "." + payload + "." + signature;
		} catch (Exception ex) {
			throw new IllegalStateException("Failed to generate JWT", ex);
		}
	}

	public AuthPrincipal verifyAndGetPrincipal(String token) {
		try {
			String[] parts = token.split("\\.");
			if (parts.length != 3) {
				throw new IllegalArgumentException("Malformed JWT");
			}
			String expectedSignature = sign(parts[0] + "." + parts[1]);
			if (!constantTimeEquals(expectedSignature, parts[2])) {
				throw new IllegalArgumentException("Invalid JWT signature");
			}
			byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
			Map<String, Object> payload = objectMapper.readValue(payloadBytes, new TypeReference<>() {});
			Object expValue = payload.get("exp");
			Object subValue = payload.get("sub");
			Object typeValue = payload.get("type");
			Object roleValue = payload.get("role");
			if (!(expValue instanceof Number exp) || !(subValue instanceof String sub) || !StringUtils.hasText(sub)) {
				throw new IllegalArgumentException("Invalid JWT payload");
			}
			if (!(typeValue instanceof String type) || !"access".equals(type)) {
				throw new IllegalArgumentException("Unsupported JWT type");
			}
			if (Instant.now().getEpochSecond() >= exp.longValue()) {
				throw new IllegalArgumentException("JWT expired");
			}
			return new AuthPrincipal(sub, UserRole.from(roleValue instanceof String role ? role : null));
		} catch (IllegalArgumentException ex) {
			throw ex;
		} catch (Exception ex) {
			throw new IllegalArgumentException("Invalid JWT", ex);
		}
	}

	private String sign(String content) throws Exception {
		Mac mac = Mac.getInstance("HmacSHA256");
		mac.init(new SecretKeySpec(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
		return base64UrlEncode(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
	}

	private String base64UrlEncode(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private boolean constantTimeEquals(String left, String right) {
		if (left == null || right == null || left.length() != right.length()) {
			return false;
		}
		int result = 0;
		for (int i = 0; i < left.length(); i++) {
			result |= left.charAt(i) ^ right.charAt(i);
		}
		return result == 0;
	}

	public record AuthPrincipal(String userId, UserRole role) {}
}
