package com.deepreader.ai_service.model;

import java.util.Locale;

/**
 * Supported AI providers used by the application.
 *
 * This enum centralizes provider names and keeps request parsing consistent
 * across services that allow users to choose an AI provider.
 */
public enum SupportedProvider {
	GEMINI,
	GROQ;

	/**
	 * Converts a request value into a supported provider.
	 *
	 * If the input is empty, GROQ is used as the default provider.
	 */
	public static SupportedProvider from(String value) {
		if (value == null || value.isBlank()) {
			return GROQ;
		}
		return SupportedProvider.valueOf(value.trim().toUpperCase(Locale.ROOT));
	}

	/**
	 * Returns the provider name in lowercase format for API or service usage.
	 */
	public String value() {
		return name().toLowerCase(Locale.ROOT);
	}
}