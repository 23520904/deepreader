package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Holds safety limits for user actions in the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.guardrails
 */
@ConfigurationProperties(prefix = "deepreader.guardrails")
public class GuardrailProperties {

	// Maximum number of LLM requests one user can make in a day.
	private long maxLlmRequestsPerDay = 500;

	// Maximum number of document uploads one user can make in a day.
	private long maxUploadsPerDay = 100;

	public long getMaxLlmRequestsPerDay() {
		return maxLlmRequestsPerDay;
	}

	public void setMaxLlmRequestsPerDay(long maxLlmRequestsPerDay) {
		this.maxLlmRequestsPerDay = maxLlmRequestsPerDay;
	}

	public long getMaxUploadsPerDay() {
		return maxUploadsPerDay;
	}

	public void setMaxUploadsPerDay(long maxUploadsPerDay) {
		this.maxUploadsPerDay = maxUploadsPerDay;
	}
}