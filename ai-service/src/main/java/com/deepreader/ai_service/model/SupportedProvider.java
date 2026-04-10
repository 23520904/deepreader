package com.deepreader.ai_service.model;

import java.util.Locale;

public enum SupportedProvider {
	OPENAI,
	GEMINI;

	public static SupportedProvider from(String value) {
		if (value == null || value.isBlank()) {
			return GEMINI;
		}
		return SupportedProvider.valueOf(value.trim().toUpperCase(Locale.ROOT));
	}

	public String value() {
		return name().toLowerCase(Locale.ROOT);
	}
}