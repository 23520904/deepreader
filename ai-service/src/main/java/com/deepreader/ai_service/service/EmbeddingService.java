package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.OpenAiProperties;
import com.deepreader.ai_service.model.GeminiEmbedContentRequest;
import com.deepreader.ai_service.model.GeminiEmbedContentResponse;
import com.deepreader.ai_service.model.OpenAiEmbeddingRequest;
import com.deepreader.ai_service.model.OpenAiEmbeddingResponse;
import com.deepreader.ai_service.model.SupportedProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class EmbeddingService {

	private final WebClient.Builder webClientBuilder;
	private final OpenAiProperties openAiProperties;
	private final GeminiProperties geminiProperties;

	public EmbeddingService(WebClient.Builder webClientBuilder, OpenAiProperties openAiProperties, GeminiProperties geminiProperties) {
		this.webClientBuilder = webClientBuilder;
		this.openAiProperties = openAiProperties;
		this.geminiProperties = geminiProperties;
	}

	public List<Float> embed(String provider, String text) {
		return embedAll(provider, List.of(requireText(text))).getFirst();
	}

	public List<List<Float>> embedAll(String provider, List<String> texts) {
		if (texts == null || texts.isEmpty()) {
			throw new IllegalArgumentException("Texts to embed must not be empty");
		}
		List<String> sanitized = new ArrayList<>(texts.size());
		for (String text : texts) {
			sanitized.add(requireText(text));
		}
		return switch (SupportedProvider.from(provider)) {
			case OPENAI -> embedWithOpenAi(sanitized);
			case GEMINI -> embedWithGemini(sanitized);
		};
	}

	public int embeddingDimensions(String provider) {
		return switch (SupportedProvider.from(provider)) {
			case OPENAI -> 1536;
			case GEMINI -> geminiProperties.getEmbeddingDimensions();
		};
	}

	private List<List<Float>> embedWithOpenAi(List<String> inputs) {
		if (!StringUtils.hasText(openAiProperties.getApiKey())) {
			throw new IllegalStateException("Missing required property: deepreader.openai.api-key");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeBaseUrl(openAiProperties.getBaseUrl())).build();
		OpenAiEmbeddingResponse response;
		try {
			response = client.post()
					.uri("/embeddings")
					.header("Authorization", "Bearer " + openAiProperties.getApiKey())
					.bodyValue(new OpenAiEmbeddingRequest(openAiProperties.getEmbeddingModel(), inputs))
					.retrieve()
					.bodyToMono(OpenAiEmbeddingResponse.class)
					.switchIfEmpty(Mono.error(new IllegalStateException("OpenAI embedding response was empty")))
					.block();
		} catch (WebClientResponseException e) {
			throw new IllegalStateException("OpenAI embeddings request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
		}
		OpenAiEmbeddingResponse safeResponse = Objects.requireNonNull(response, "OpenAI embedding response must not be null");
		List<List<Float>> embeddings = safeResponse.data() == null ? List.of() : safeResponse.data().stream().map(OpenAiEmbeddingResponse.EmbeddingData::embedding).toList();
		validateEmbeddings(inputs, embeddings, "OpenAI");
		return embeddings;
	}

	private List<List<Float>> embedWithGemini(List<String> inputs) {
		if (!StringUtils.hasText(geminiProperties.getApiKey())) {
			throw new IllegalStateException("Missing required property: deepreader.gemini.api-key");
		}
		WebClient client = webClientBuilder.baseUrl(normalizeBaseUrl(geminiProperties.getBaseUrl())).build();
		GeminiEmbedContentResponse response;
		try {
			response = client.post()
					.uri(uriBuilder -> uriBuilder.path("/models/{model}:batchEmbedContents").queryParam("key", geminiProperties.getApiKey()).build(normalizeModel(geminiProperties.getEmbeddingModel())))
					.bodyValue(new GeminiEmbedContentRequest(inputs.stream().map(text -> new GeminiEmbedContentRequest.ContentRequest(
							"models/" + normalizeModel(geminiProperties.getEmbeddingModel()),
							new GeminiEmbedContentRequest.EmbedContent(List.of(new GeminiEmbedContentRequest.Part(text))),
							"RETRIEVAL_DOCUMENT"
					)).toList()))
					.retrieve()
					.bodyToMono(GeminiEmbedContentResponse.class)
					.switchIfEmpty(Mono.error(new IllegalStateException("Gemini embedding response was empty")))
					.block();
		} catch (WebClientResponseException e) {
			throw new IllegalStateException("Gemini embeddings request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
		}
		GeminiEmbedContentResponse safeResponse = Objects.requireNonNull(response, "Gemini embedding response must not be null");
		List<List<Float>> embeddings = safeResponse.embeddings() == null ? List.of() : safeResponse.embeddings().stream().map(result -> result.embedding().values()).toList();
		validateEmbeddings(inputs, embeddings, "Gemini");
		return embeddings;
	}

	private void validateEmbeddings(List<String> inputs, List<List<Float>> embeddings, String provider) {
		if (embeddings == null || embeddings.isEmpty()) {
			throw new IllegalStateException(provider + " embedding response did not contain embedding data");
		}
		if (embeddings.size() != inputs.size()) {
			throw new IllegalStateException(provider + " embedding response count does not match input count");
		}
		if (embeddings.stream().anyMatch(embedding -> embedding == null || embedding.isEmpty())) {
			throw new IllegalStateException(provider + " embedding response contained an empty embedding vector");
		}
	}

	private String requireText(String text) {
		if (!StringUtils.hasText(text)) {
			throw new IllegalArgumentException("Text to embed must not be blank");
		}
		return text;
	}

	private String normalizeBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl) ? configuredBaseUrl.trim() : "https://api.openai.com/v1";
		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}
		return normalized;
	}

	private String normalizeModel(String model) {
		String normalized = StringUtils.hasText(model) ? model.trim() : "gemini-embedding-001";
		return normalized.startsWith("models/") ? normalized.substring("models/".length()) : normalized;
	}
}