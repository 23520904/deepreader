package com.deepreader.ai_service.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.model.GeminiBatchEmbeddingRequest;
import com.deepreader.ai_service.model.GeminiBatchEmbeddingRequest.EmbedRequest;
import com.deepreader.ai_service.model.GeminiBatchEmbeddingRequest.GeminiContent;
import com.deepreader.ai_service.model.GeminiBatchEmbeddingRequest.GeminiPart;
import com.deepreader.ai_service.model.GeminiBatchEmbeddingResponse;

import reactor.core.publisher.Mono;

@Service
public class EmbeddingService {

	private final WebClient webClient;
	private final GeminiProperties geminiProperties;
	private final String modelId;

	public EmbeddingService(WebClient.Builder webClientBuilder, GeminiProperties geminiProperties) {
		this.webClient = webClientBuilder.baseUrl(normalizeBaseUrl(geminiProperties.getBaseUrl())).build();
		this.geminiProperties = geminiProperties;
		this.modelId = normalizeModelId(geminiProperties.getEmbeddingModel());
	}

	public List<Float> embed(String text) {
		return embedInternal(text).getFirst();
	}

	public List<List<Float>> embedAll(List<String> texts) {
		if (texts == null || texts.isEmpty()) {
			throw new IllegalArgumentException("Texts to embed must not be empty");
		}
		List<String> sanitized = new ArrayList<>(texts.size());
		for (String text : texts) {
			if (!StringUtils.hasText(text)) {
				throw new IllegalArgumentException("Texts to embed must not contain blank values");
			}
			sanitized.add(text);
		}
		return embedInternal(sanitized);
	}

	private List<List<Float>> embedInternal(Object input) {
		if (input instanceof String text && !StringUtils.hasText(text)) {
			throw new IllegalArgumentException("Text to embed must not be blank");
		}
		if (input == null) {
			throw new IllegalArgumentException("Embedding input must not be null");
		}
		if (!StringUtils.hasText(geminiProperties.getApiKey())) {
			throw new IllegalStateException("Missing required property: deepreader.gemini.api-key");
		}

		GeminiBatchEmbeddingRequest request = new GeminiBatchEmbeddingRequest(buildRequests(input));

		GeminiBatchEmbeddingResponse response;
		try {
			response = webClient.post()
					.uri(uriBuilder -> uriBuilder
							.path("/models/{model}:batchEmbedContents")
							.queryParam("key", geminiProperties.getApiKey())
							.build(modelId))
					.header("Content-Type", "application/json")
					.bodyValue(request)
					.retrieve()
					.bodyToMono(GeminiBatchEmbeddingResponse.class)
					.switchIfEmpty(Mono.error(new IllegalStateException("Gemini embedding response was empty")))
					.block();
		} catch (WebClientResponseException.TooManyRequests e) {
			throw new IllegalStateException("Gemini rate limit exceeded while creating embeddings. Please retry in a moment or check your Gemini API quota.", e);
		} catch (WebClientResponseException e) {
			throw new IllegalStateException("Gemini embeddings request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
		}

		GeminiBatchEmbeddingResponse safeResponse = Objects.requireNonNull(response, "Gemini embedding response must not be null");
		if (safeResponse.embeddings() == null || safeResponse.embeddings().isEmpty()) {
			throw new IllegalStateException("Gemini embedding response did not contain embedding data");
		}

		List<List<Float>> embeddings = safeResponse.embeddings().stream()
				.map(result -> {
					if (result == null) {
						throw new IllegalStateException("Gemini embedding response contained a null embedding entry");
					}
					if (result.values() != null) {
						return result.values();
					}
					if (result.embedding() != null && result.embedding().values() != null) {
						return result.embedding().values();
					}
					throw new IllegalStateException("Gemini embedding response contained an embedding entry without values");
				})
				.toList();
		if (embeddings.isEmpty() || embeddings.stream().anyMatch(embedding -> embedding == null || embedding.isEmpty())) {
			throw new IllegalStateException("Gemini embedding response contained an empty embedding vector");
		}
		return embeddings;
	}

	private List<EmbedRequest> buildRequests(Object input) {
		if (input instanceof String text) {
			return List.of(toRequest(text));
		}
		if (input instanceof List<?> list) {
			return list.stream()
					.map(String.class::cast)
					.map(this::toRequest)
					.toList();
		}
		String typeName = (input == null) ? "null" : input.getClass().getName();
		throw new IllegalArgumentException("Unsupported embedding input type: " + typeName);
	}

	private EmbedRequest toRequest(String text) {
		return new EmbedRequest(
				"models/" + modelId,
				new GeminiContent(List.of(new GeminiPart(text))),
				"RETRIEVAL_DOCUMENT",
				geminiProperties.getEmbeddingDimensions()
		);
	}

	private String normalizeBaseUrl(String configuredBaseUrl) {
		if (!StringUtils.hasText(configuredBaseUrl)) {
			return "https://generativelanguage.googleapis.com/v1beta";
		}
		String normalized = configuredBaseUrl.trim();
		int modelsIndex = normalized.indexOf("/models/");
		if (modelsIndex >= 0) {
			normalized = normalized.substring(0, modelsIndex);
		}
		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}
		return normalized;
	}

	private String normalizeModelId(String configuredModel) {
		if (!StringUtils.hasText(configuredModel)) {
			return "gemini-embedding-001";
		}
		String normalized = configuredModel.trim();
		if (normalized.startsWith("models/")) {
			normalized = normalized.substring("models/".length());
		}
		if ("text-embedding-004".equals(normalized)) {
			return "gemini-embedding-001";
		}
		return normalized;
	}
}