package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.model.SupportedProvider;
import com.deepreader.ai_service.model.provider.gemini.GeminiBatchEmbeddingRequest;
import com.deepreader.ai_service.model.provider.gemini.GeminiBatchEmbeddingResponse;
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

/**
 * Handles communication with the embedding provider and keeps Gemini batch behavior centralized.
 *
 * <p>This service validates embedding input, sends text batches to Gemini,
 * handles retry behavior for quota errors, and verifies that returned vectors
 * are valid before they are used for document indexing or retrieval.
 */
@Service
public class EmbeddingService {

	/**
	 * Maximum batch size allowed for Gemini embedding requests.
	 */
	private static final int GEMINI_MAX_BATCH_SIZE = 100;

	/**
	 * Provider name used by the ingestion pipeline for vector embeddings.
	 */
	public static final String EMBEDDING_PROVIDER = "gemini";

	/**
	 * Regex used to extract retry delay values from Gemini rate-limit responses.
	 */
	private static final Pattern GEMINI_RETRY_DELAY_PATTERN = Pattern.compile("\"retryDelay\"\\s*:\\s*\"([0-9]+(?:\\.[0-9]+)?)s\"");

	private static final Logger LOGGER = LoggerFactory.getLogger(EmbeddingService.class);

	private final WebClient.Builder webClientBuilder;
	private final GeminiProperties geminiProperties;

	/**
	 * Creates the embedding service with a WebClient builder and Gemini configuration.
	 */
	public EmbeddingService(WebClient.Builder webClientBuilder, GeminiProperties geminiProperties) {
		this.webClientBuilder = webClientBuilder;
		this.geminiProperties = geminiProperties;
	}

	/**
	 * Embeds a single text value and returns its vector representation.
	 *
	 * This method reuses the batch embedding flow to keep validation and provider
	 * behavior consistent for both single-text and multi-text embedding requests.
	 */
	public List<Float> embed(String provider, String text) {
		return embedAll(provider, List.of(requireText(text))).getFirst();
	}

	/**
	 * Embeds a list of texts, validating input and delegating to Gemini batch embedding.
	 *
	 * Blank values are rejected before the request is sent so the embedding provider
	 * only receives valid text content.
	 */
	public List<List<Float>> embedAll(String provider, List<String> texts) {
		if (texts == null || texts.isEmpty()) {
			throw new IllegalArgumentException("Texts to embed must not be empty");
		}

		List<String> sanitized = new ArrayList<>(texts.size());
		for (String text : texts) {
			sanitized.add(requireText(text));
		}

		return embedWithGemini(sanitized);
	}

	/**
	 * Returns the configured embedding vector dimension for the selected provider.
	 */
	public int embeddingDimensions(String provider) {
		validateEmbeddingProvider(provider);
		return geminiProperties.getEmbeddingDimensions();
	}

	/**
	 * Sends sanitized text inputs to Gemini in batches and collects all embeddings.
	 *
	 * The configured batch size is capped by the Gemini maximum, and optional delays
	 * are applied between batches to reduce the risk of hitting free-tier limits.
	 */
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

			// Validate each batch before merging it into the final embedding list.
			validateEmbeddings(batch, batchEmbeddings, "Gemini");
			embeddings.addAll(batchEmbeddings);
		}

		validateEmbeddings(inputs, embeddings, "Gemini");
		return embeddings;
	}

	/**
	 * Sends one batch embedding request to Gemini and retries on rate-limit errors.
	 *
	 * When Gemini returns HTTP 429, the service waits using either the configured
	 * retry delay or the retry delay suggested by the Gemini response.
	 */
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

	/**
	 * Extracts embedding vectors from the Gemini response format.
	 *
	 * Gemini responses may expose vector values directly or inside an embedding
	 * object, so this method supports both shapes.
	 */
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

	/**
	 * Validates that the embedding response matches the original input list.
	 *
	 * The provider must return one non-empty vector for every input text.
	 */
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

	/**
	 * Resolves the effective Gemini embedding batch size.
	 *
	 * The configured value is clamped between 1 and the maximum batch size supported
	 * by this service.
	 */
	private int geminiEmbeddingBatchSize() {
		int configuredBatchSize = geminiProperties.getEmbeddingBatchSize();
		return Math.max(1, Math.min(configuredBatchSize, GEMINI_MAX_BATCH_SIZE));
	}

	/**
	 * Applies the configured delay between Gemini embedding batches.
	 *
	 * This helps avoid quota pressure when many chunks are embedded in one ingestion run.
	 */
	private void sleepBeforeNextGeminiBatch() {
		long delayMs = Math.max(0L, geminiProperties.getEmbeddingBatchDelayMs());

		if (delayMs <= 0) {
			return;
		}

		LOGGER.info("Waiting {} ms before the next Gemini embedding batch to stay under free-tier quota.", delayMs);
		sleep(delayMs, "Interrupted while waiting between Gemini embedding batches");
	}

	/**
	 * Checks whether a provider error is caused by rate limiting.
	 */
	private boolean isRateLimited(WebClientResponseException exception) {
		return exception.getStatusCode().value() == 429;
	}

	/**
	 * Calculates the retry delay after a Gemini rate-limit response.
	 *
	 * The method prefers the larger value between the configured retry delay and
	 * the retry delay returned by Gemini.
	 */
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

	/**
	 * Pauses execution for the requested delay and preserves interrupt status if interrupted.
	 */
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

	/**
	 * Validates that a text value can be embedded.
	 */
	private String requireText(String text) {
		if (!StringUtils.hasText(text)) {
			throw new IllegalArgumentException("Text to embed must not be blank");
		}
		return text;
	}

	/**
	 * Validates the requested provider before returning embedding metadata.
	 *
	 * The current implementation uses Gemini for embeddings, while accepted provider
	 * values are parsed through the shared SupportedProvider enum.
	 */
	private void validateEmbeddingProvider(String provider) {
		SupportedProvider supportedProvider = SupportedProvider.from(provider);
		if (supportedProvider != SupportedProvider.GEMINI && supportedProvider != SupportedProvider.GROQ) {
			throw new IllegalArgumentException("DeepReader supports Gemini embeddings only");
		}
	}

	/**
	 * Normalizes the configured Gemini base URL.
	 *
	 * Missing values fall back to the default Gemini API URL, and trailing slashes
	 * are removed to avoid duplicate separators when building request paths.
	 */
	private String normalizeBaseUrl(String configuredBaseUrl) {
		String normalized = StringUtils.hasText(configuredBaseUrl) ? configuredBaseUrl.trim() : "https://generativelanguage.googleapis.com/v1beta";
		while (normalized.endsWith("/")) {
			normalized = normalized.substring(0, normalized.length() - 1);
		}
		return normalized;
	}

	/**
	 * Normalizes the Gemini embedding model name.
	 *
	 * The API path already adds the models prefix, so this method removes it when
	 * the configured value includes the full model path.
	 */
	private String normalizeModel(String model) {
		String normalized = StringUtils.hasText(model) ? model.trim() : "gemini-embedding-001";
		return normalized.startsWith("models/") ? normalized.substring("models/".length()) : normalized;
	}
}