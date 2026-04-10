package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.OpenAiProperties;
import com.deepreader.ai_service.model.GeminiGenerateContentRequest;
import com.deepreader.ai_service.model.GeminiGenerateContentResponse;
import com.deepreader.ai_service.model.OpenAiChatRequest;
import com.deepreader.ai_service.model.OpenAiChatResponse;
import com.deepreader.ai_service.model.SupportedProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Objects;

@Service
public class LlmClientService {

	private final OpenAiProperties openAiProperties;
	private final GeminiProperties geminiProperties;
	private final WebClient.Builder webClientBuilder;

	public LlmClientService(OpenAiProperties openAiProperties, GeminiProperties geminiProperties, WebClient.Builder webClientBuilder) {
		this.openAiProperties = openAiProperties;
		this.geminiProperties = geminiProperties;
		this.webClientBuilder = webClientBuilder;
	}

	public String generateAnswer(String provider, String prompt) {
		return switch (SupportedProvider.from(provider)) {
			case OPENAI -> generateWithOpenAi(prompt);
			case GEMINI -> generateWithGemini(prompt);
		};
	}

	private String generateWithOpenAi(String prompt) {
		if (!StringUtils.hasText(openAiProperties.getApiKey())) {
			throw new IllegalStateException("Missing required property: deepreader.openai.api-key");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeUrl(openAiProperties.getBaseUrl())).build();
		OpenAiChatRequest request = new OpenAiChatRequest(openAiProperties.getChatModel(), List.of(new OpenAiChatRequest.Message("user", prompt)), 0.2d);
		OpenAiChatResponse response;
		try {
			response = client.post().uri("/chat/completions").header("Authorization", "Bearer " + openAiProperties.getApiKey()).bodyValue(request).retrieve().bodyToMono(OpenAiChatResponse.class).switchIfEmpty(Mono.error(new IllegalStateException("OpenAI generation response was empty"))).block();
		} catch (WebClientResponseException e) {
			throw new IllegalStateException("OpenAI generation request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
		}
		OpenAiChatResponse safe = Objects.requireNonNull(response, "OpenAI generation response must not be null");
		if (safe.choices() == null || safe.choices().isEmpty() || safe.choices().getFirst().message() == null || !StringUtils.hasText(safe.choices().getFirst().message().content())) {
			throw new IllegalStateException("OpenAI generation response did not contain answer text");
		}
		return safe.choices().getFirst().message().content().trim();
	}

	private String generateWithGemini(String prompt) {
		if (!StringUtils.hasText(geminiProperties.getApiKey())) {
			throw new IllegalStateException("Missing required property: deepreader.gemini.api-key");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeGeminiBaseUrl(geminiProperties.getBaseUrl())).build();
		String modelId = normalizeGeminiModel(geminiProperties.getGenerationModel());
		GeminiGenerateContentRequest request = new GeminiGenerateContentRequest(List.of(new GeminiGenerateContentRequest.Content(List.of(new GeminiGenerateContentRequest.Part(prompt)))), new GeminiGenerateContentRequest.GenerationConfig(0.2d, 512));
		GeminiGenerateContentResponse response;
		try {
			response = client.post().uri(uriBuilder -> uriBuilder.path("/models/{model}:generateContent").queryParam("key", geminiProperties.getApiKey()).build(modelId)).bodyValue(request).retrieve().bodyToMono(GeminiGenerateContentResponse.class).switchIfEmpty(Mono.error(new IllegalStateException("Gemini generation response was empty"))).block();
		} catch (WebClientResponseException e) {
			throw new IllegalStateException("Gemini generation request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
		}
		GeminiGenerateContentResponse safe = Objects.requireNonNull(response, "Gemini generation response must not be null");
		if (safe.candidates() == null || safe.candidates().isEmpty() || safe.candidates().getFirst().content() == null || safe.candidates().getFirst().content().parts() == null) {
			throw new IllegalStateException("Gemini generation response did not contain answer text");
		}
		String content = safe.candidates().getFirst().content().parts().stream().map(GeminiGenerateContentResponse.Part::text).filter(StringUtils::hasText).reduce("", String::concat).trim();
		if (!StringUtils.hasText(content)) {
			throw new IllegalStateException("Gemini generation response returned empty answer text");
		}
		return content;
	}

	private String normalizeUrl(String url) {
		String normalized = StringUtils.hasText(url) ? url.trim() : "https://api.openai.com/v1";
		while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
		return normalized;
	}

	private String normalizeGeminiBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl) ? configuredBaseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta";
		int modelsIndex = normalized.indexOf("/models/");
		if (modelsIndex >= 0) normalized = normalized.substring(0, modelsIndex);
		while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
		return normalized;
	}

	private String normalizeGeminiModel(String configuredModel) {
		String normalized = StringUtils.hasText(configuredModel) ? configuredModel.trim() : "gemini-2.0-flash";
		if (normalized.startsWith("models/")) normalized = normalized.substring("models/".length());
		return normalized;
	}
}