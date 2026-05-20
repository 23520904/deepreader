package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class RetrievalService {

	private static final int DEFAULT_LIMIT = 5;
	private static final int MAX_LIMIT = 20;
	private static final String STUDY_PROVIDER = "groq";

	private final DocumentIndexStoreService documentIndexStoreService;
	private final EmbeddingService embeddingService;
	private final WebClient haystackClient;

	public RetrievalService(
			DocumentIndexStoreService documentIndexStoreService,
			EmbeddingService embeddingService,
			WebClient.Builder webClientBuilder,
			@Value("${deepreader.haystack.base-url}") String haystackBaseUrl
	) {
		this.documentIndexStoreService = documentIndexStoreService;
		this.embeddingService = embeddingService;
		this.haystackClient = webClientBuilder.baseUrl(haystackBaseUrl).build();
	}

	public Mono<SearchResponse> search(String userId, String query, Integer requestedLimit, String provider) {
		return search(userId, null, query, requestedLimit, provider);
	}

	public Mono<SearchResponse> search(String userId, String documentId, String query, Integer requestedLimit, String provider) {
		return Mono.fromCallable(() -> doSearch(userId, documentId, query, requestedLimit, provider)).subscribeOn(Schedulers.boundedElastic());
	}

	private SearchResponse doSearch(String userId, String documentId, String query, Integer requestedLimit, String provider) {
		if (!StringUtils.hasText(query)) {
			throw new IllegalArgumentException("Query must not be blank");
		}
		int limit = normalizeLimit(requestedLimit);
		String normalizedProvider = STUDY_PROVIDER;
		List<IndexedDocument> documents = StringUtils.hasText(documentId)
				? List.of(documentIndexStoreService.requireById(userId, documentId))
				: documentIndexStoreService.findAll(userId);
		if (documents.isEmpty()) {
			throw new IllegalStateException("No indexed documents available. Upload a PDF first.");
		}

		List<RetrievedChunk> lexicalMatches = lexicalFallback(query, documents, limit);
		return new SearchResponse(query, limit, normalizedProvider, lexicalMatches);
	}

	private List<RetrievedChunk> lexicalFallback(String query, List<IndexedDocument> documents, int limit) {
		List<String> tokens = tokenize(query);
		List<RetrievedChunk> matches = new ArrayList<>();
		for (IndexedDocument document : documents) {
			for (DocumentSection section : document.sections()) {
				float score = lexicalScore(tokens, section);
				if (score > 0f) {
					matches.add(toRetrievedChunk(document, section, score));
				}
			}
		}
		return matches.stream().sorted(Comparator.comparing(RetrievedChunk::score).reversed()).limit(limit).toList();
	}

	private RetrievedChunk toRetrievedChunk(IndexedDocument document, DocumentSection section, float score) {
		return new RetrievedChunk(document.documentId(), section.sectionId(), document.fileName(), section.sectionId(), section.title(), section.pageNumber(), section.content(), score);
	}

	private float lexicalScore(List<String> tokens, DocumentSection section) {
		if (tokens.isEmpty()) {
			return 0f;
		}
		String haystack = (section.title() + " " + section.summary() + " " + section.content()).toLowerCase(Locale.ROOT);
		int hits = 0;
		for (String token : tokens) {
			if (haystack.contains(token)) {
				hits++;
			}
		}
		return (float) hits / tokens.size();
	}

	private List<String> tokenize(String query) {
		return List.of(query.toLowerCase(Locale.ROOT).split("\\W+"))
				.stream()
				.filter(StringUtils::hasText)
				.toList();
	}

	private int normalizeLimit(Integer requestedLimit) {
		if (requestedLimit == null || requestedLimit <= 0) {
			return DEFAULT_LIMIT;
		}
		return Math.min(requestedLimit, MAX_LIMIT);
	}

	private List<RetrievedChunk> searchViaHaystack(String provider, List<Float> queryVector, int limit) {
		HaystackSearchResponse response = haystackClient.post()
				.uri("/search")
				.bodyValue(new HaystackSearchRequest(provider, queryVector, limit))
				.retrieve()
				.bodyToMono(HaystackSearchResponse.class)
				.block();
		if (response == null || response.matches() == null) {
			return List.of();
		}
		return response.matches().stream()
				.map(match -> new RetrievedChunk(
						match.documentId(),
						match.chunkId(),
						match.fileName(),
						match.sectionId(),
						match.title(),
						match.chunkIndex(),
						match.content(),
						match.score() == null ? 0f : match.score()
				))
				.toList();
	}

	private record HaystackSearchRequest(String provider, List<Float> query_embedding, int limit) {
	}

	private record HaystackSearchResponse(List<HaystackSearchMatch> matches) {
	}

	private record HaystackSearchMatch(
			@JsonProperty("document_id") String documentId,
			@JsonProperty("chunk_id") String chunkId,
			@JsonProperty("file_name") String fileName,
			@JsonProperty("section_id") String sectionId,
			String title,
			@JsonProperty("chunk_index") Integer chunkIndex,
			String content,
			Float score
	) {
	}
}
