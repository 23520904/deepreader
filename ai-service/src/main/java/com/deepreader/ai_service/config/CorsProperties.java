package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Holds CORS settings used by the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.cors
 */
@ConfigurationProperties(prefix = "deepreader.cors")
public class CorsProperties {

	// Comma-separated list of allowed origins for cross-origin requests.
	private String allowedOrigins = "http://localhost:3000";

	public String getAllowedOrigins() {
		return allowedOrigins;
	}

	public void setAllowedOrigins(String allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}
}
