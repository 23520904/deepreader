package com.deepreader.web_module.model;

public record AuthResponse(
		String userId,
		String email,
		String token,
		String refreshToken,
		String role
) {
}
