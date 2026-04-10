package com.deepreader.ai_service.model;

public enum UserRole {
	USER,
	ADMIN;

	public static UserRole from(String value) {
		if (value == null || value.isBlank()) {
			return USER;
		}
		try {
			return UserRole.valueOf(value.trim().toUpperCase());
		} catch (IllegalArgumentException ex) {
			return USER;
		}
	}
}
