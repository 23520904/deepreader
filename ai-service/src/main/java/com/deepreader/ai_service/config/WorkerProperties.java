package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.worker")
public class WorkerProperties {

	private boolean enabled = true;
	private long pollIntervalMs = 5000;
	private int batchSize = 5;

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public long getPollIntervalMs() {
		return pollIntervalMs;
	}

	public void setPollIntervalMs(long pollIntervalMs) {
		this.pollIntervalMs = pollIntervalMs;
	}

	public int getBatchSize() {
		return batchSize;
	}

	public void setBatchSize(int batchSize) {
		this.batchSize = batchSize;
	}
}
