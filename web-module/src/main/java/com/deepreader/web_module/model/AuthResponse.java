package com.deepreader.web_module.model;

public record AuthResponse(
		String userId,
		String email,
		String username,
		String avatarUrl,
		String token,
		String refreshToken,
		String role
) {
}
