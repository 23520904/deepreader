package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@ConfigurationProperties(prefix = "deepreader.gemini")
@Validated
public class GeminiProperties {

	private String apiKey;
	@NotBlank
	private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
	@NotBlank
	private String embeddingModel = "gemini-embedding-001";
	@NotNull
	@Min(1)
	private Integer embeddingDimensions = 768;
	@NotNull
	@Min(1)
	private Integer embeddingBatchSize = 50;
	@NotNull
	@Min(0)
	private Long embeddingBatchDelayMs = 32000L;
	@NotNull
	@Min(0)
	private Integer embeddingMaxRetries = 5;
	@NotNull
	@Min(0)
	private Long embeddingRetryDelayMs = 15000L;
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
