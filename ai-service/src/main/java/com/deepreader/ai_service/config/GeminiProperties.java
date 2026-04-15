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

	public String getGenerationModel() {
		return generationModel;
	}

	public void setGenerationModel(String generationModel) {
		this.generationModel = generationModel;
	}
}