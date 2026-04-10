package com.deepreader.ai_service.model;

public record AuthLoginRequest(
		String email,
		String password
) {
}
