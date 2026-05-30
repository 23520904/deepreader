package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Holds Gemini API settings used by the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.gemini
 */
@ConfigurationProperties(prefix = "deepreader.gemini")
@Validated
public class GeminiProperties {

	// API key used to call Gemini services.
	private String apiKey;

	// Base URL for Gemini API requests.
	@NotBlank
	private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";

	// Model used to create text embeddings.
	@NotBlank
	private String embeddingModel = "gemini-embedding-001";

	// Size of each embedding vector stored in the vector database.
	@NotNull
	@Min(1)
	private Integer embeddingDimensions = 768;

	// Number of texts sent in one embedding request batch.
	@NotNull
	@Min(1)
	private Integer embeddingBatchSize = 50;

	// Delay between embedding batches to reduce rate-limit errors.
	@NotNull
	@Min(0)
	private Long embeddingBatchDelayMs = 32000L;

	// Maximum number of retry attempts when embedding requests fail.
	@NotNull
	@Min(0)
	private Integer embeddingMaxRetries = 5;

	// Delay before retrying a failed embedding request.
	@NotNull
	@Min(0)
	private Long embeddingRetryDelayMs = 15000L;

	// Model used for text generation tasks such as chat or summaries.
	@NotBlank
	private String generationModel = "gemini-2.0-flash";

	public String getApiKey() {
		return apiKey;
	}

	public void setApiKey(String apiKey) {
		this.apiKey = apiKey;
	}

	public String getBaseUrl() {
		return baseUrl;
	}

	public void setBaseUrl(String baseUrl) {
		this.baseUrl = baseUrl;
	}

	public String getEmbeddingModel() {
		return embeddingModel;
	}

	public void setEmbeddingModel(String embeddingModel) {
		this.embeddingModel = embeddingModel;
	}

	public Integer getEmbeddingDimensions() {
		return embeddingDimensions;
	}

	public void setEmbeddingDimensions(Integer embeddingDimensions) {
		this.embeddingDimensions = embeddingDimensions;
	}

	public Integer getEmbeddingBatchSize() {
		return embeddingBatchSize;
	}

	public void setEmbeddingBatchSize(Integer embeddingBatchSize) {
		this.embeddingBatchSize = embeddingBatchSize;
	}

	public Long getEmbeddingBatchDelayMs() {
		return embeddingBatchDelayMs;
	}

	public void setEmbeddingBatchDelayMs(Long embeddingBatchDelayMs) {
		this.embeddingBatchDelayMs = embeddingBatchDelayMs;
	}

	public Integer getEmbeddingMaxRetries() {
		return embeddingMaxRetries;
	}

	public void setEmbeddingMaxRetries(Integer embeddingMaxRetries) {
		this.embeddingMaxRetries = embeddingMaxRetries;
	}

	public Long getEmbeddingRetryDelayMs() {
		return embeddingRetryDelayMs;
	}

	public void setEmbeddingRetryDelayMs(Long embeddingRetryDelayMs) {
		this.embeddingRetryDelayMs = embeddingRetryDelayMs;
	}

	public String getGenerationModel() {
		return generationModel;
	}

	public void setGenerationModel(String generationModel) {
		this.generationModel = generationModel;
	}
}