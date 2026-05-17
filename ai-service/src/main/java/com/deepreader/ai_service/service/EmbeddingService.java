package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.OpenAiProperties;
import com.deepreader.ai_service.model.SupportedProvider;
import com.deepreader.ai_service.model.provider.gemini.GeminiBatchEmbeddingRequest;
import com.deepreader.ai_service.model.provider.gemini.GeminiBatchEmbeddingResponse;
import com.deepreader.ai_service.model.provider.openai.OpenAiEmbeddingRequest;
import com.deepreader.ai_service.model.provider.openai.OpenAiEmbeddingResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class EmbeddingService {

	private static final int GEMINI_MAX_BATCH_SIZE = 100;
	private static final Pattern GEMINI_RETRY_DELAY_PATTERN = Pattern.compile("\"retryDelay\"\\s*:\\s*\"([0-9]+(?:\\.[0-9]+)?)s\"");
	private static final Logger LOGGER = LoggerFactory.getLogger(EmbeddingService.class);

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
			case GROQ -> throw new IllegalArgumentException("Groq does not support embeddings in DeepReader yet");
		};
	}

	public int embeddingDimensions(String provider) {
		return switch (SupportedProvider.from(provider)) {
			case OPENAI -> 1536;
			case GEMINI -> geminiProperties.getEmbeddingDimensions();
			case GROQ -> throw new IllegalArgumentException("Groq does not support embeddings in DeepReader yet");
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
		List<List<Float>> embeddings = new ArrayList<>(inputs.size());
		int batchSize = geminiEmbeddingBatchSize();

		for (int start = 0; start < inputs.size(); start += batchSize) {
			if (start > 0) {
				sleepBeforeNextGeminiBatch();
			}

			List<String> batch = inputs.subList(start, Math.min(start + batchSize, inputs.size()));
			GeminiBatchEmbeddingResponse response = requestGeminiEmbeddingBatch(client, batch);
			List<List<Float>> batchEmbeddings = extractGeminiEmbeddings(response);
			validateEmbeddings(batch, batchEmbeddings, "Gemini");
			embeddings.addAll(batchEmbeddings);
		}

		validateEmbeddings(inputs, embeddings, "Gemini");
		return embeddings;
	}

	private GeminiBatchEmbeddingResponse requestGeminiEmbeddingBatch(WebClient client, List<String> inputs) {
		String model = normalizeModel(geminiProperties.getEmbeddingModel());
		int maxRetries = Math.max(0, geminiProperties.getEmbeddingMaxRetries());

		for (int attempt = 0; attempt <= maxRetries; attempt += 1) {
			GeminiBatchEmbeddingResponse response;
			try {
				response = client.post()
						.uri(uriBuilder -> uriBuilder.path("/models/{model}:batchEmbedContents").queryParam("key", geminiProperties.getApiKey()).build(model))
						.bodyValue(new GeminiBatchEmbeddingRequest(inputs.stream().map(text -> new GeminiBatchEmbeddingRequest.EmbedRequest(
								"models/" + model,
								new GeminiBatchEmbeddingRequest.GeminiContent(List.of(new GeminiBatchEmbeddingRequest.GeminiPart(text))),
								"RETRIEVAL_DOCUMENT",
								geminiProperties.getEmbeddingDimensions()
						)).toList()))
						.retrieve()
						.bodyToMono(GeminiBatchEmbeddingResponse.class)
						.switchIfEmpty(Mono.error(new IllegalStateException("Gemini embedding response was empty")))
						.block();
				return Objects.requireNonNull(response, "Gemini embedding response must not be null");
			} catch (WebClientResponseException e) {
				if (!isRateLimited(e) || attempt >= maxRetries) {
					throw new IllegalStateException("Gemini embeddings request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
				}

				long retryDelayMs = geminiRetryDelayMs(e);
				LOGGER.warn("Gemini embedding quota was hit for a batch of {} chunks. Retrying in {} ms ({}/{}).",
						inputs.size(), retryDelayMs, attempt + 1, maxRetries);
				sleep(retryDelayMs, "Interrupted while waiting for Gemini embedding quota retry");
			}
		}

		throw new IllegalStateException("Gemini embedding retry loop exited unexpectedly");
	}

	private List<List<Float>> extractGeminiEmbeddings(GeminiBatchEmbeddingResponse response) {
		List<List<Float>> embeddings = new ArrayList<>();
		if (response.embeddings() != null) {
			for (GeminiBatchEmbeddingResponse.EmbeddingResult result : response.embeddings()) {
				if (result == null) {
					embeddings.add(List.of());
				} else if (result.values() != null) {
					embeddings.add(result.values());
				} else {
					embeddings.add(result.embedding() == null ? List.of() : result.embedding().values());
				}
			}
		}
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

	private int geminiEmbeddingBatchSize() {
		int configuredBatchSize = geminiProperties.getEmbeddingBatchSize();
		return Math.max(1, Math.min(configuredBatchSize, GEMINI_MAX_BATCH_SIZE));
	}

	private void sleepBeforeNextGeminiBatch() {
		long delayMs = Math.max(0L, geminiProperties.getEmbeddingBatchDelayMs());

		if (delayMs <= 0) {
			return;
		}

		LOGGER.info("Waiting {} ms before the next Gemini embedding batch to stay under free-tier quota.", delayMs);
		sleep(delayMs, "Interrupted while waiting between Gemini embedding batches");
	}

	private boolean isRateLimited(WebClientResponseException exception) {
		return exception.getStatusCode().value() == 429;
	}

	private long geminiRetryDelayMs(WebClientResponseException exception) {
		long configuredDelayMs = Math.max(0L, geminiProperties.getEmbeddingRetryDelayMs());
		Matcher matcher = GEMINI_RETRY_DELAY_PATTERN.matcher(exception.getResponseBodyAsString());

		if (!matcher.find()) {
			return configuredDelayMs;
		}

		double retrySeconds = Double.parseDouble(matcher.group(1));
		long responseDelayMs = (long) Math.ceil(retrySeconds * 1000) + 1000L;
		return Math.max(configuredDelayMs, responseDelayMs);
	}

	private void sleep(long delayMs, String interruptMessage) {
		if (delayMs <= 0) {
			return;
		}

		try {
			Thread.sleep(delayMs);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException(interruptMessage, e);
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
