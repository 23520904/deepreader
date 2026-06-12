package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
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

	public VisionService(GeminiProperties geminiProperties, WebClient.Builder webClientBuilder, JdbcTemplate jdbcTemplate) {
		this.geminiProperties = geminiProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Analyzes a single image with a text prompt.
	 */
	public Mono<String> analyzeImage(String userId, String provider, String prompt, byte[] imageBytes, String mimeType) {
		return analyzeMultimodal(userId, provider, prompt, List.of(new ImagePart(mimeType, imageBytes)));
	}

	/**
	 * Analyzes one or more images with a text prompt.
	 *
	 * <p>If the user has a saved Gemini API token, that token will be used.
	 * Otherwise, the default API key from configuration will be used.
	 */
	public Mono<String> analyzeMultimodal(String userId, String provider, String prompt, List<ImagePart> images) {
		String userToken = null;

		// Try to load the user's saved LLM API token from the database.
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

		// Use an empty image list when the input is null.
		List<ImagePart> safeImages = images == null ? List.of() : images;
		return analyzeWithGemini(userToken, prompt, safeImages);
	}

	/**
	 * Sends the prompt and images to Gemini and returns the text response.
	 */
	@SuppressWarnings("unchecked")
	private Mono<String> analyzeWithGemini(String userToken, String prompt, List<ImagePart> images) {
		String apiKey = isGeminiApiKey(userToken) ? userToken : geminiProperties.getApiKey();
		WebClient client = webClientBuilder.baseUrl(normalizeGeminiBaseUrl(geminiProperties.getBaseUrl())).build();
		String modelId = geminiProperties.getGenerationModel();

		List<Map<String, Object>> parts = new ArrayList<>();

		// Add the text prompt as the first part of the request.
		parts.add(Map.of("text", prompt));

		// Add each image as Base64 inline data.
		for (ImagePart img : images) {
			parts.add(Map.of(
					"inline_data", Map.of(
							"mime_type", img.mimeType(),
							"data", Base64.getEncoder().encodeToString(img.data())
					)
			));
		}

		Map<String, Object> request = Map.of("contents", List.of(Map.of("parts", parts)));

		return client.post()
				.uri(uriBuilder -> uriBuilder.path("/models/{model}:generateContent")
						.queryParam("key", apiKey).build(modelId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
				.map(response -> {
					List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
					Map<String, Object> content = (Map<String, Object>) candidates.getFirst().get("content");
					List<Map<String, Object>> responseParts = (List<Map<String, Object>>) content.get("parts");
					StringBuilder text = new StringBuilder();

					// Join all text fragments returned by Gemini into one response string.
					for (Map<String, Object> p : responseParts) {
						Object fragment = p.get("text");
						if (fragment != null) {
							text.append(fragment);
						}
					}

					return text.toString();
				});
	}

	/**
	 * Checks whether the provided token looks like a Gemini API key.
	 */
	private boolean isGeminiApiKey(String value) {
		return StringUtils.hasText(value) && !value.trim().startsWith("gsk_");
	}

	/**
	 * Cleans the Gemini base URL so requests can safely add the model path later.
	 */
	private String normalizeGeminiBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl) ? configuredBaseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta";

		// Remove the model path if it was included in the configured base URL.
		int modelsIndex = normalized.indexOf("/models/");
		if (modelsIndex >= 0) {
			normalized = normalized.substring(0, modelsIndex);
		}

		// Remove trailing slashes to avoid duplicate slashes in request URLs.
		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}

		return normalized;
	}
}