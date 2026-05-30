package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Holds background worker configuration loaded from application properties.
 *
 * These settings control whether the worker runs, how often it checks
 * for new jobs, and how many jobs it processes in one batch.
 */
@ConfigurationProperties(prefix = "deepreader.worker")
public class WorkerProperties {

	/**
	 * Enables or disables the background worker.
	 */
	private boolean enabled = true;

	/**
	 * Time interval, in milliseconds, between each worker polling cycle.
	 */
	private long pollIntervalMs = 5000;

	/**
	 * Maximum number of jobs the worker processes per polling cycle.
	 */
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