package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Holds Groq API settings used by the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.groq
 */
@ConfigurationProperties(prefix = "deepreader.groq")
@Validated
public class GroqProperties {

	// API key used to call Groq services.
	private String apiKey;

	// Base URL for Groq API requests.
	@NotBlank
	private String baseUrl = "https://api.groq.com/openai/v1";

	// Model used for chat completion requests.
	@NotBlank
	private String chatModel = "llama-3.1-8b-instant";

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
}