package com.deepreader.web_module.model;

public record AuthLoginRequest(
		String email,
		String password
) {
}
