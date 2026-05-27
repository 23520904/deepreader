package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.guardrails")
public class GuardrailProperties {

	private long maxLlmRequestsPerDay = 500;
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
