package com.deepreader.ai_service.model;

public record AuthRegisterRequest(
		String email,
		String password
) {
}
