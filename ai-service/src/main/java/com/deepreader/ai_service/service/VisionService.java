package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.OpenAiProperties;
import com.deepreader.ai_service.model.SupportedProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class VisionService {

	private final OpenAiProperties openAiProperties;
	private final GeminiProperties geminiProperties;
	private final WebClient.Builder webClientBuilder;
	private final JdbcTemplate jdbcTemplate;

	public VisionService(OpenAiProperties openAiProperties, GeminiProperties geminiProperties, WebClient.Builder webClientBuilder, JdbcTemplate jdbcTemplate) {
		this.openAiProperties = openAiProperties;
		this.geminiProperties = geminiProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	public Mono<String> analyzeImage(String userId, String provider, String prompt, byte[] imageBytes, String mimeType) {
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

		SupportedProvider supported = SupportedProvider.from(provider);
		if (supported == SupportedProvider.OPENAI) {
			return analyzeWithOpenAi(userToken, prompt, imageBytes, mimeType);
		} else {
			return analyzeWithGemini(userToken, prompt, imageBytes, mimeType);
		}
	}

	private Mono<String> analyzeWithOpenAi(String userToken, String prompt, byte[] imageBytes, String mimeType) {
		String apiKey = StringUtils.hasText(userToken) ? userToken : openAiProperties.getApiKey();
		WebClient client = webClientBuilder.baseUrl(normalizeUrl(openAiProperties.getBaseUrl())).build();

		String base64Image = Base64.getEncoder().encodeToString(imageBytes);
		String dataUri = "data:" + mimeType + ";base64," + base64Image;

		Map<String, Object> request = Map.of(
				"model", "gpt-4o", // Must use a vision-capable model
				"messages", List.of(
						Map.of("role", "user", "content", List.of(
								Map.of("type", "text", "text", prompt),
								Map.of("type", "image_url", "image_url", Map.of("url", dataUri))
						))
				),
				"max_tokens", 1000
		);

		return client.post().uri("/chat/completions")
				.header("Authorization", "Bearer " + apiKey)
				.bodyValue(request)
				.retrieve()
				.bodyToMono(Map.class)
				.map(response -> {
					List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
					Map<String, Object> message = (Map<String, Object>) choices.getFirst().get("message");
					return (String) message.get("content");
				});
	}

	private Mono<String> analyzeWithGemini(String userToken, String prompt, byte[] imageBytes, String mimeType) {
		String apiKey = StringUtils.hasText(userToken) ? userToken : geminiProperties.getApiKey();
		WebClient client = webClientBuilder.baseUrl(normalizeGeminiBaseUrl(geminiProperties.getBaseUrl())).build();
		String modelId = "gemini-2.5-flash"; // default vision model

		String base64Image = Base64.getEncoder().encodeToString(imageBytes);

		Map<String, Object> request = Map.of(
				"contents", List.of(
						Map.of("parts", List.of(
								Map.of("text", prompt),
								Map.of("inline_data", Map.of(
										"mime_type", mimeType,
										"data", base64Image
								))
						))
				)
		);

		return client.post()
				.uri(uriBuilder -> uriBuilder.path("/models/{model}:generateContent")
						.queryParam("key", apiKey).build(modelId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(Map.class)
				.map(response -> {
					List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
					Map<String, Object> content = (Map<String, Object>) candidates.getFirst().get("content");
					List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
					return (String) parts.getFirst().get("text");
				});
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
}
