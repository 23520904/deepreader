package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class VisionService {

	public record ImagePart(String mimeType, byte[] data) {}

	private final GeminiProperties geminiProperties;
	private final WebClient.Builder webClientBuilder;
	private final JdbcTemplate jdbcTemplate;

	public VisionService(GeminiProperties geminiProperties, WebClient.Builder webClientBuilder, JdbcTemplate jdbcTemplate) {
		this.geminiProperties = geminiProperties;
		this.webClientBuilder = webClientBuilder;
		this.jdbcTemplate = jdbcTemplate;
	}

	public Mono<String> analyzeImage(String userId, String provider, String prompt, byte[] imageBytes, String mimeType) {
		return analyzeMultimodal(userId, provider, prompt, List.of(new ImagePart(mimeType, imageBytes)));
	}

	public Mono<String> analyzeMultimodal(String userId, String provider, String prompt, List<ImagePart> images) {
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

		List<ImagePart> safeImages = images == null ? List.of() : images;
		return analyzeWithGemini(userToken, prompt, safeImages);
	}

	private Mono<String> analyzeWithGemini(String userToken, String prompt, List<ImagePart> images) {
		String apiKey = isGeminiApiKey(userToken) ? userToken : geminiProperties.getApiKey();
		WebClient client = webClientBuilder.baseUrl(normalizeGeminiBaseUrl(geminiProperties.getBaseUrl())).build();
		String modelId = geminiProperties.getGenerationModel();

		List<Map<String, Object>> parts = new ArrayList<>();
		parts.add(Map.of("text", prompt));
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
				.bodyToMono(Map.class)
				.map(response -> {
					List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
					Map<String, Object> content = (Map<String, Object>) candidates.getFirst().get("content");
					List<Map<String, Object>> responseParts = (List<Map<String, Object>>) content.get("parts");
					StringBuilder text = new StringBuilder();
					for (Map<String, Object> p : responseParts) {
						Object fragment = p.get("text");
						if (fragment != null) {
							text.append(fragment);
						}
					}
					return text.toString();
				});
	}

	private boolean isGeminiApiKey(String value) {
		return StringUtils.hasText(value) && !value.trim().startsWith("gsk_");
	}

	private String normalizeGeminiBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl) ? configuredBaseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta";
		int modelsIndex = normalized.indexOf("/models/");
		if (modelsIndex >= 0) {
			normalized = normalized.substring(0, modelsIndex);
		}
		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}
		return normalized;
	}
}
