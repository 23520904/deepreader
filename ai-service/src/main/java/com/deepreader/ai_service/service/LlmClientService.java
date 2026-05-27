package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.GroqProperties;
import com.deepreader.ai_service.model.provider.gemini.GeminiGenerateContentRequest;
import com.deepreader.ai_service.model.provider.gemini.GeminiGenerateContentResponse;
import com.deepreader.ai_service.model.provider.groq.GroqChatRequest;
import com.deepreader.ai_service.model.provider.groq.GroqChatResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class LlmClientService {

	private static final int GROQ_MAX_PROMPT_CHARS = 16_000;
	private static final List<String> GENERATION_PRIORITY = List.of("groq", "gemini");

	private final GeminiProperties geminiProperties;
	private final GroqProperties groqProperties;
	private final WebClient.Builder webClientBuilder;
	private final JdbcTemplate jdbcTemplate;

	public LlmClientService(GeminiProperties geminiProperties, GroqProperties groqProperties, WebClient.Builder webClientBuilder, JdbcTemplate jdbcTemplate) {
		this.geminiProperties = geminiProperties;
		this.groqProperties = groqProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	public String generateAnswer(String userId, String provider, String prompt) {
		return generateAnswer(userId, prompt).answer();
	}

	public GeneratedAnswer generateAnswer(String userId, String prompt) {
		String userToken = findUserLlmToken(userId);
		List<String> failures = new ArrayList<>();

		for (String provider : GENERATION_PRIORITY) {
			try {
				String answer = "groq".equals(provider)
						? generateWithGroq(userToken, prompt)
						: generateWithGemini(userToken, prompt);
				return new GeneratedAnswer(provider, answer);
			} catch (IllegalStateException ex) {
				String reason = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
				failures.add(provider + ": " + reason);
			}
		}

		throw new IllegalStateException("Groq and Gemini generation failed. " + String.join(" | ", failures));
	}

	private String generateWithGemini(String userToken, String prompt) {
		String apiKey = isGeminiApiKey(userToken) ? userToken : geminiProperties.getApiKey();
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

	private String generateWithGroq(String userToken, String prompt) {
		String apiKey = isGroqApiKey(userToken) ? userToken : groqProperties.getApiKey();
		if (!StringUtils.hasText(apiKey)) {
			throw new IllegalStateException("Missing required property: deepreader.groq.api-key or Groq user LLM API Token");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeUrl(groqProperties.getBaseUrl())).build();
		GroqChatRequest request = new GroqChatRequest(groqProperties.getChatModel(), List.of(new GroqChatRequest.Message("user", fitGroqPrompt(prompt))), 0.2d);
		GroqChatResponse response;
		try {
			response = client.post()
					.uri("/chat/completions")
					.header("Authorization", "Bearer " + apiKey)
					.bodyValue(request)
					.retrieve()
					.bodyToMono(GroqChatResponse.class)
					.switchIfEmpty(Mono.error(new IllegalStateException("Groq generation response was empty")))
					.block();
		} catch (WebClientResponseException e) {
			throw providerGenerationException("Groq", "GROQ_API_KEY", e);
		}
		GroqChatResponse safe = Objects.requireNonNull(response, "Groq generation response must not be null");
		if (safe.choices() == null || safe.choices().isEmpty() || safe.choices().getFirst().message() == null || !StringUtils.hasText(safe.choices().getFirst().message().content())) {
			throw new IllegalStateException("Groq generation response did not contain answer text");
		}
		return safe.choices().getFirst().message().content().trim();
	}

	private String fitGroqPrompt(String prompt) {
		if (prompt == null || prompt.length() <= GROQ_MAX_PROMPT_CHARS) {
			return prompt;
		}

		return prompt.substring(0, GROQ_MAX_PROMPT_CHARS).trim()
				+ "\n\n[Prompt truncated because Groq rejected overly large requests.]";
	}

	private String normalizeUrl(String url) {
		String normalized = StringUtils.hasText(url) ? url.trim() : "https://api.groq.com/openai/v1";
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

	private boolean isGroqApiKey(String value) {
		return StringUtils.hasText(value) && value.trim().startsWith("gsk_");
	}

	private boolean isGeminiApiKey(String value) {
		return StringUtils.hasText(value) && !isGroqApiKey(value);
	}

	private String findUserLlmToken(String userId) {
		if (!StringUtils.hasText(userId) || jdbcTemplate == null) {
			return null;
		}

		List<String> tokens = jdbcTemplate.query(
				"select llm_api_token from app_users where user_id = ?",
				(rs, rowNum) -> rs.getString("llm_api_token"),
				userId
		);
		if (!tokens.isEmpty() && StringUtils.hasText(tokens.getFirst())) {
			return tokens.getFirst();
		}
		return null;
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

		if (status == 413) {
			return new IllegalStateException(provider + " rejected this request because the prompt was too large. Try again with fewer sources, a shorter question, or a smaller document section.", exception);
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

	public record GeneratedAnswer(String provider, String answer) {
	}
}
