package com.deepreader.web_module.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Holds JWT configuration values loaded from application properties.
 */
@ConfigurationProperties(prefix = "deepreader.auth.jwt")
public class JwtProperties {

	// Default secret is for development only and should be replaced in real environments.
	private String secret = "dev-change-me-secret-32-bytes-minimum";

	// Default token lifetime is one day.
	private long ttlSeconds = 86400;

	public String getSecret() {
		return secret;
	}

	public void setSecret(String secret) {
		this.secret = secret;
	}

	public long getTtlSeconds() {
		return ttlSeconds;
	}

	public void setTtlSeconds(long ttlSeconds) {
		this.ttlSeconds = ttlSeconds;
	}
}