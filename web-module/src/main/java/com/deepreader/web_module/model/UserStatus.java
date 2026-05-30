package com.deepreader.web_module.model;

public enum UserStatus {
	ACTIVE,
	BANNED;

	public static UserStatus from(String value) {
		if (value == null || value.isBlank()) {
			return ACTIVE;
		}
		try {
			return UserStatus.valueOf(value.trim().toUpperCase());
		} catch (IllegalArgumentException ex) {
			return ACTIVE;
		}
	}
}
