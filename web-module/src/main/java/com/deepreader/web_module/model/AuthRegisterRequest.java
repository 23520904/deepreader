package com.deepreader.web_module.model;

public record AuthRegisterRequest(
		String email,
		String password
) {
}
