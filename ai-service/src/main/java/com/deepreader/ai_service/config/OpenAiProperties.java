package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.openai")
public class OpenAiProperties {

	private String apiKey;
	private String baseUrl = "https://api.openai.com/v1";
	private String chatModel = "gpt-4o-mini";
	private String embeddingModel = "text-embedding-3-small";

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

	public String getChatModel() {
		return chatModel;
	}

	public void setChatModel(String chatModel) {
		this.chatModel = chatModel;
	}

	public String getEmbeddingModel() {
		return embeddingModel;
	}

	public void setEmbeddingModel(String embeddingModel) {
		this.embeddingModel = embeddingModel;
	}
}
