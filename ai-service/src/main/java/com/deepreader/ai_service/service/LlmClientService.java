package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.OpenAiProperties;
import com.deepreader.ai_service.model.SupportedProvider;
import com.deepreader.ai_service.model.provider.gemini.GeminiGenerateContentRequest;
import com.deepreader.ai_service.model.provider.gemini.GeminiGenerateContentResponse;
import com.deepreader.ai_service.model.provider.openai.OpenAiChatRequest;
import com.deepreader.ai_service.model.provider.openai.OpenAiChatResponse;
import org.springframework.jdbc.core.JdbcTemplate;
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
	private final JdbcTemplate jdbcTemplate;

	public LlmClientService(OpenAiProperties openAiProperties, GeminiProperties geminiProperties, WebClient.Builder webClientBuilder, JdbcTemplate jdbcTemplate) {
		this.openAiProperties = openAiProperties;
		this.geminiProperties = geminiProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	public String generateAnswer(String userId, String provider, String prompt) {
		String userToken = null;
		if (StringUtils.hasText(userId)) {
			List<String> tokens = jdbcTemplate.query(
					"select llm_api_token from app_users where user_id = ?",
					(rs, rowNum) -> rs.getString("llm_api_token"),
					userId
			);
			if (!tokens.isEmpty() && StringUtils.hasText(tokens.getFirst())) {
				userToken = tokens.getFirst();
			}
		}
		
		return switch (SupportedProvider.from(provider)) {
			case OPENAI -> generateWithOpenAi(userToken, prompt);
			case GEMINI -> generateWithGemini(userToken, prompt);
		};
	}

	private String generateWithOpenAi(String userToken, String prompt) {
		String apiKey = StringUtils.hasText(userToken) ? userToken : openAiProperties.getApiKey();
		if (!StringUtils.hasText(apiKey)) {
			throw new IllegalStateException("Missing required property: deepreader.openai.api-key or User LLM API Token");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeUrl(openAiProperties.getBaseUrl())).build();
		OpenAiChatRequest request = new OpenAiChatRequest(openAiProperties.getChatModel(), List.of(new OpenAiChatRequest.Message("user", prompt)), 0.2d);
		OpenAiChatResponse response;
		try {
			response = client.post().uri("/chat/completions").header("Authorization", "Bearer " + apiKey).bodyValue(request).retrieve().bodyToMono(OpenAiChatResponse.class).switchIfEmpty(Mono.error(new IllegalStateException("OpenAI generation response was empty"))).block();
		} catch (WebClientResponseException e) {
			throw providerGenerationException("OpenAI", "OPENAI_API_KEY", e);
		}
		OpenAiChatResponse safe = Objects.requireNonNull(response, "OpenAI generation response must not be null");
		if (safe.choices() == null || safe.choices().isEmpty() || safe.choices().getFirst().message() == null || !StringUtils.hasText(safe.choices().getFirst().message().content())) {
			throw new IllegalStateException("OpenAI generation response did not contain answer text");
		}
		return safe.choices().getFirst().message().content().trim();
	}

	private String generateWithGemini(String userToken, String prompt) {
		String apiKey = StringUtils.hasText(userToken) ? userToken : geminiProperties.getApiKey();
		if (!StringUtils.hasText(apiKey)) {
			throw new IllegalStateException("Missing required property: deepreader.gemini.api-key or User LLM API Token");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeGeminiBaseUrl(geminiProperties.getBaseUrl())).build();
		String modelId = normalizeGeminiModel(geminiProperties.getGenerationModel());
		GeminiGenerateContentRequest request = new GeminiGenerateContentRequest(List.of(new GeminiGenerateContentRequest.Content(List.of(new GeminiGenerateContentRequest.Part(prompt)))), new GeminiGenerateContentRequest.GenerationConfig(0.2d, 512));
		GeminiGenerateContentResponse response;
		try {
			response = client.post().uri(uriBuilder -> uriBuilder.path("/models/{model}:generateContent").queryParam("key", apiKey).build(modelId)).bodyValue(request).retrieve().bodyToMono(GeminiGenerateContentResponse.class).switchIfEmpty(Mono.error(new IllegalStateException("Gemini generation response was empty"))).block();
		} catch (WebClientResponseException e) {
			throw providerGenerationException("Gemini", "GEMINI_API_KEY", e);
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

	private IllegalStateException providerGenerationException(String provider, String envName, WebClientResponseException exception) {
		int status = exception.getStatusCode().value();
		String responseBody = exception.getResponseBodyAsString();

		if (status == 401 || responseBody.contains("invalid_api_key")) {
			return new IllegalStateException(provider + " API key is invalid or expired. Update " + envName + " or the LLM API token saved in your profile, then restart the AI service.", exception);
		}

		if (status == 429 || responseBody.contains("RESOURCE_EXHAUSTED") || responseBody.toLowerCase().contains("quota")) {
			return new IllegalStateException(provider + " quota or rate limit was exceeded. Check the provider plan, billing, and quota settings, or retry later" + retryDelaySuffix(responseBody) + ".", exception);
		}

		if (status >= 500) {
			return new IllegalStateException(provider + " generation service is temporarily unavailable. Retry later.", exception);
		}

		return new IllegalStateException(provider + " generation request failed with status " + status + ". Check provider credentials and model access.", exception);
	}

	private String retryDelaySuffix(String responseBody) {
		int retryDelayIndex = responseBody.indexOf("\"retryDelay\"");

		if (retryDelayIndex < 0) {
			return "";
		}

		int secondsIndex = responseBody.indexOf("s\"", retryDelayIndex);
		int quoteIndex = responseBody.lastIndexOf('"', Math.max(retryDelayIndex, secondsIndex - 1));

		if (secondsIndex < 0 || quoteIndex < 0 || quoteIndex >= secondsIndex) {
			return "";
		}

		String delaySeconds = responseBody.substring(quoteIndex + 1, secondsIndex).trim();

		if (!StringUtils.hasText(delaySeconds)) {
			return "";
		}

		return " after " + delaySeconds + "s";
	}
}
