package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;

/**
 * Holds document ingestion settings for the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.ingestion
 */
@ConfigurationProperties(prefix = "deepreader.ingestion")
@Validated
public class IngestionProperties {

	// Maximum file size allowed for uploaded documents.
	@Min(1024)
	private long maxFileSizeBytes = 25L * 1024 * 1024;

	// Maximum number of retry attempts when document ingestion fails.
	@Min(0)
	private int maxRetries = 3;

	// Maximum number of characters in each generated chunk.
	@Min(100)
	private int chunkSize = 1000;

	// Number of characters reused from the previous chunk to preserve context.
	@Min(0)
	private int chunkOverlap = 150;

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

	public int getChunkSize() {
		return chunkSize;
	}

	public void setChunkSize(int chunkSize) {
		this.chunkSize = chunkSize;
	}

	public int getChunkOverlap() {
		return chunkOverlap;
	}

	public void setChunkOverlap(int chunkOverlap) {
		this.chunkOverlap = chunkOverlap;
	}
}