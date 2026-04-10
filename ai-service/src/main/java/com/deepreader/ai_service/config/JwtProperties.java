package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.auth.jwt")
public class JwtProperties {

	private String secret = "dev-change-me-secret-32-bytes-minimum";
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
