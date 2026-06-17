package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class VisionService {

	/**
	 * Represents one image sent to the AI model.
	 */
	public record ImagePart(String mimeType, byte[] data) {}

	private final GeminiProperties geminiProperties;
	private final WebClient.Builder webClientBuilder;
	private final JdbcTemplate jdbcTemplate;

	public VisionService(
			GeminiProperties geminiProperties,
			WebClient.Builder webClientBuilder,
			JdbcTemplate jdbcTemplate
	) {
		this.geminiProperties = geminiProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Analyzes a single image with a text prompt.
	 */
	public Mono<String> analyzeImage(
			String userId,
			String provider,
			String prompt,
			byte[] imageBytes,
			String mimeType
	) {
		return analyzeMultimodal(
				userId,
				provider,
				prompt,
				List.of(new ImagePart(mimeType, imageBytes))
		);
	}

	/**
	 * Analyzes one or more images with a text prompt.
	 *
	 * Currently this uses the server GEMINI_API_KEY from configuration.
	 * Profile tokens are disabled because the current database schema has no
	 * llm_api_token column yet.
	 */
	public Mono<String> analyzeMultimodal(
			String userId,
			String provider,
			String prompt,
			List<ImagePart> images
	) {
		String userToken = findUserLlmToken(userId);
		List<ImagePart> safeImages = images == null ? List.of() : images;

		return analyzeWithGemini(userToken, prompt, safeImages);
	}

	/**
	 * Sends the prompt and images to Gemini and returns the text response.
	 */
	private Mono<String> analyzeWithGemini(
			String userToken,
			String prompt,
			List<ImagePart> images
	) {
		String apiKey = isGeminiApiKey(userToken)
				? userToken.trim()
				: geminiProperties.getApiKey();

		if (!StringUtils.hasText(apiKey)) {
			return Mono.error(new IllegalStateException(
					"Missing required property: deepreader.gemini.api-key or valid Gemini user token"
			));
		}

		WebClient client = webClientBuilder
				.baseUrl(normalizeGeminiBaseUrl(geminiProperties.getBaseUrl()))
				.build();

		String modelId = normalizeGeminiModel(geminiProperties.getGenerationModel());

		List<Map<String, Object>> parts = new ArrayList<>();

		parts.add(Map.of(
				"text",
				StringUtils.hasText(prompt) ? prompt : "Analyze this image."
		));

		for (ImagePart img : images) {
			if (img == null || img.data() == null || img.data().length == 0) {
				continue;
			}

			String mimeType = StringUtils.hasText(img.mimeType())
					? img.mimeType()
					: "image/png";

			parts.add(Map.of(
					"inline_data",
					Map.of(
							"mime_type", mimeType,
							"data", Base64.getEncoder().encodeToString(img.data())
					)
			));
		}

		Map<String, Object> request = Map.of(
				"contents",
				List.of(Map.of("parts", parts))
		);

		return client.post()
				.uri(uriBuilder -> uriBuilder
						.path("/models/{model}:generateContent")
						.queryParam("key", apiKey)
						.build(modelId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
				.map(this::extractGeminiText)
				.onErrorMap(WebClientResponseException.class, this::geminiVisionException);
	}

	@SuppressWarnings("unchecked")
	private String extractGeminiText(Map<String, Object> response) {
		List<Map<String, Object>> candidates =
				(List<Map<String, Object>>) response.get("candidates");

		if (candidates == null || candidates.isEmpty()) {
			throw new IllegalStateException("Gemini vision response did not contain candidates");
		}

		Map<String, Object> content =
				(Map<String, Object>) candidates.get(0).get("content");

		if (content == null) {
			throw new IllegalStateException("Gemini vision response did not contain content");
		}

		List<Map<String, Object>> responseParts =
				(List<Map<String, Object>>) content.get("parts");

		if (responseParts == null || responseParts.isEmpty()) {
			throw new IllegalStateException("Gemini vision response did not contain parts");
		}

		StringBuilder text = new StringBuilder();

		for (Map<String, Object> part : responseParts) {
			Object fragment = part.get("text");
			if (fragment != null) {
				text.append(fragment);
			}
		}

		String result = text.toString().trim();

		if (!StringUtils.hasText(result)) {
			throw new IllegalStateException("Gemini vision response returned empty text");
		}

		return result;
	}

	/**
	 * Profile tokens are disabled for now because the current database only has
	 * user_accounts without llm_api_token. Returning null makes the service use
	 * GEMINI_API_KEY from environment/configuration.
	 */
	private String findUserLlmToken(String userId) {
		return null;
	}

	/**
	 * Checks whether the provided token looks like a Gemini API key.
	 *
	 * Important:
	 * Do NOT treat every non-Groq token as Gemini.
	 * OpenAI keys start with sk-/sk-proj- and must not be sent to Gemini.
	 */
	private boolean isGeminiApiKey(String value) {
		return StringUtils.hasText(value) && value.trim().startsWith("AIza");
	}

	/**
	 * Cleans the Gemini base URL so requests can safely add the model path later.
	 */
	private String normalizeGeminiBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl)
				? configuredBaseUrl.trim()
				: "https://generativelanguage.googleapis.com/v1beta";

		int modelsIndex = normalized.indexOf("/models/");
		if (modelsIndex >= 0) {
			normalized = normalized.substring(0, modelsIndex);
		}

		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}

		return normalized;
	}

	/**
	 * Normalizes the Gemini model name used in the generation endpoint.
	 */
	private String normalizeGeminiModel(String configuredModel) {
		String normalized = StringUtils.hasText(configuredModel)
				? configuredModel.trim()
				: "gemini-3.5-flash";

		if (normalized.startsWith("models/")) {
			normalized = normalized.substring("models/".length());
		}

		return normalized;
	}

	private IllegalStateException geminiVisionException(WebClientResponseException exception) {
		int status = exception.getStatusCode().value();
		String body = compactBody(exception.getResponseBodyAsString());
		String lowerBody = body.toLowerCase(Locale.ROOT);

		if (status == 401
				|| lowerBody.contains("invalid_api_key")
				|| lowerBody.contains("api_key_invalid")
				|| lowerBody.contains("api key not found")
				|| lowerBody.contains("api key not valid")
				|| lowerBody.contains("invalid api key")
				|| lowerBody.contains("unauthorized")) {
			return new IllegalStateException(
					"Gemini API key is invalid or expired. Update GEMINI_API_KEY, then restart the AI service.",
					exception
			);
		}

		if (status == 403
				|| lowerBody.contains("permission_denied")
				|| lowerBody.contains("permission denied")
				|| lowerBody.contains("model access")) {
			return new IllegalStateException(
					"Gemini rejected the vision request because this API key does not have access to the selected model.",
					exception
			);
		}

		if (status == 429
				|| lowerBody.contains("resource_exhausted")
				|| lowerBody.contains("quota")
				|| lowerBody.contains("rate limit")) {
			return new IllegalStateException(
					"Gemini quota or rate limit was exceeded. Check provider plan, billing, quota, or retry later.",
					exception
			);
		}

		if (status >= 500) {
			return new IllegalStateException(
					"Gemini vision service is temporarily unavailable. Retry later.",
					exception
			);
		}

		return new IllegalStateException(
				"Gemini vision request failed with status " + status + ": " + body,
				exception
		);
	}

	private String compactBody(String responseBody) {
		if (!StringUtils.hasText(responseBody)) {
			return "";
		}

		String body = responseBody.strip();

		if (body.length() > 800) {
			return body.substring(0, 800) + "...";
		}

		return body;
	}
}