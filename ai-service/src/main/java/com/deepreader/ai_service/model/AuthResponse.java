package com.deepreader.ai_service.model;

public record AuthResponse(
		String userId,
		String email,
		String token,
		String refreshToken,
		String role
) {
}
