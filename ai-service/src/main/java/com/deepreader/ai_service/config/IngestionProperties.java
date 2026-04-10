package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.ingestion")
public class IngestionProperties {

	private long maxFileSizeBytes = 25L * 1024 * 1024;
	private int maxRetries = 3;

	public long getMaxFileSizeBytes() {
		return maxFileSizeBytes;
	}

	public void setMaxFileSizeBytes(long maxFileSizeBytes) {
		this.maxFileSizeBytes = maxFileSizeBytes;
	}

	public int getMaxRetries() {
		return maxRetries;
	}

	public void setMaxRetries(int maxRetries) {
		this.maxRetries = maxRetries;
	}
}
