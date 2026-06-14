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

/**
 * Service responsible for sending generation requests to supported LLM providers.
 *
 * This service selects the best available provider, loads user-specific API tokens
 * when available, falls back to application-level provider keys, and converts
 * provider errors into clearer application exceptions.
 */
@Service
public class LlmClientService {

	/**
	 * Maximum prompt size sent to Groq before truncation is applied.
	 */
	private static final int GROQ_MAX_PROMPT_CHARS = 20_000;

	/**
	 * Provider order used for generation fallback.
	 */
	private static final List<String> GENERATION_PRIORITY = List.of("groq", "gemini");

	private final GeminiProperties geminiProperties;
	private final GroqProperties groqProperties;
	private final WebClient.Builder webClientBuilder;
	private final JdbcTemplate jdbcTemplate;

	/**
	 * Creates the LLM client service with provider configuration, HTTP client,
	 * and database access for user-level LLM tokens.
	 */
	public LlmClientService(GeminiProperties geminiProperties, GroqProperties groqProperties, WebClient.Builder webClientBuilder, JdbcTemplate jdbcTemplate) {
		this.geminiProperties = geminiProperties;
		this.groqProperties = groqProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Generates an answer and returns only the answer text.
	 *
	 * The provider argument is accepted for compatibility with callers, while
	 * generation still uses the configured provider priority and fallback flow.
	 */
	public String generateAnswer(String userId, String provider, String prompt) {
		return generateAnswer(userId, prompt).answer();
	}

	/**
	 * Generates an answer using the first available provider in priority order.
	 *
	 * If one provider fails due to configuration, quota, or API errors, the next
	 * provider is attempted before the final combined failure is returned.
	 */
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

	/**
	 * Sends a generation request to Gemini.
	 *
	 * A user-provided Gemini token is preferred when available; otherwise the
	 * configured application Gemini API key is used.
	 */
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

	/**
	 * Sends a chat completion request to Groq.
	 *
	 * A user-provided Groq token is preferred when available; otherwise the
	 * configured application Groq API key is used.
	 */
	private String generateWithGroq(String userToken, String prompt) {
		String apiKey = isGroqApiKey(userToken) ? userToken : groqProperties.getApiKey();
		if (!StringUtils.hasText(apiKey)) {
			throw new IllegalStateException("Missing required property: deepreader.groq.api-key or Groq user LLM API Token");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeUrl(groqProperties.getBaseUrl())).build();
		String model = isGroqApiKey(userToken) ? "llama-3.3-70b-versatile" : groqProperties.getChatModel();
		GroqChatRequest request = new GroqChatRequest(model, List.of(new GroqChatRequest.Message("user", fitGroqPrompt(prompt))), 0.2d, null);
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

	/**
	 * Trims prompts that exceed Groq's configured maximum prompt size.
	 *
	 * This prevents oversized requests from being rejected before the provider can
	 * generate an answer.
	 */
	private String fitGroqPrompt(String prompt) {
		if (prompt == null || prompt.length() <= GROQ_MAX_PROMPT_CHARS) {
			return prompt;
		}

		return prompt.substring(0, GROQ_MAX_PROMPT_CHARS).trim()
				+ "\n\n[Prompt truncated because Groq rejected overly large requests.]";
	}

	/**
	 * Normalizes a provider base URL by applying a default and removing trailing slashes.
	 */
	private String normalizeUrl(String url) {
		String normalized = StringUtils.hasText(url) ? url.trim() : "https://api.groq.com/openai/v1";
		while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
		return normalized;
	}

	/**
	 * Normalizes the Gemini base URL before request paths are appended.
	 */
	private String normalizeGeminiBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl) ? configuredBaseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta";
		int modelsIndex = normalized.indexOf("/models/");
		if (modelsIndex >= 0) normalized = normalized.substring(0, modelsIndex);
		while (normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
		return normalized;
	}

	/**
	 * Normalizes the Gemini model name used in the generation endpoint.
	 */
	private String normalizeGeminiModel(String configuredModel) {
		String normalized = StringUtils.hasText(configuredModel) ? configuredModel.trim() : "gemini-2.0-flash";
		if (normalized.startsWith("models/")) normalized = normalized.substring("models/".length());
		return normalized;
	}

	/**
	 * Checks whether a token looks like a Groq API key.
	 */
	private boolean isGroqApiKey(String value) {
		return StringUtils.hasText(value) && value.trim().startsWith("gsk_");
	}

	/**
	 * Checks whether a token should be treated as a Gemini API key.
	 */
	private boolean isGeminiApiKey(String value) {
		return StringUtils.hasText(value) && !isGroqApiKey(value);
	}

	/**
	 * Loads the user's saved LLM API token from the database.
	 */
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

	/**
	 * Converts provider HTTP errors into clear application-level exceptions.
	 */
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

	/**
	 * Extracts a retry delay suffix from a provider error response when available.
	 */
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

	/**
	 * Result wrapper containing the provider that succeeded and the generated answer.
	 */
	public record GeneratedAnswer(String provider, String answer) {
	}
}
