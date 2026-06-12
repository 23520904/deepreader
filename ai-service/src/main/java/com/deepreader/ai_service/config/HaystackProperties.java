package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Holds Haystack service settings used by the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.haystack
 */
@ConfigurationProperties(prefix = "deepreader.haystack")
@Validated
public class HaystackProperties {

	// Base URL for the Haystack service.
	@NotBlank
	private String baseUrl = "http://localhost:8000";

	public String getBaseUrl() {
		return baseUrl;
	}

	public void setBaseUrl(String baseUrl) {
		this.baseUrl = baseUrl;
	}
}
