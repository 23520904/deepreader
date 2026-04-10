package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.gemini")
public class GeminiProperties {

	private String apiKey;
	private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
	private String embeddingModel = "gemini-embedding-001";
	private Integer embeddingDimensions = 768;
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