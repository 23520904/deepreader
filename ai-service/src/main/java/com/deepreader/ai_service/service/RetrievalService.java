package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.SearchResponse;
import com.deepreader.ai_service.model.SupportedProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
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

	private final DocumentIndexStoreService documentIndexStoreService;
	private final EmbeddingService embeddingService;
	private final QdrantVectorStoreService qdrantVectorStoreService;

	public RetrievalService(DocumentIndexStoreService documentIndexStoreService, EmbeddingService embeddingService, QdrantVectorStoreService qdrantVectorStoreService) {
		this.documentIndexStoreService = documentIndexStoreService;
		this.embeddingService = embeddingService;
		this.qdrantVectorStoreService = qdrantVectorStoreService;
	}

	public Mono<SearchResponse> search(String userId, String query, Integer requestedLimit, String provider) {
		return Mono.fromCallable(() -> doSearch(userId, query, requestedLimit, provider)).subscribeOn(Schedulers.boundedElastic());
	}

	private SearchResponse doSearch(String userId, String query, Integer requestedLimit, String provider) {
		if (!StringUtils.hasText(query)) {
			throw new IllegalArgumentException("Query must not be blank");
		}
		int limit = normalizeLimit(requestedLimit);
		String normalizedProvider = SupportedProvider.from(provider).value();
		List<IndexedDocument> documents = documentIndexStoreService.findAll(userId);
		if (documents.isEmpty()) {
			throw new IllegalStateException("No indexed documents available. Upload a PDF first.");
		}

		List<RetrievedChunk> lexicalMatches = lexicalFallback(query, documents, limit);
		try {
			List<Float> queryVector = embeddingService.embed(normalizedProvider, query);
			List<RetrievedChunk> semanticMatches = qdrantVectorStoreService.search(normalizedProvider, queryVector, limit);
			if (!semanticMatches.isEmpty()) {
				return new SearchResponse(query, limit, normalizedProvider, semanticMatches);
			}
		} catch (RuntimeException ex) {
			return new SearchResponse(query, limit, normalizedProvider, lexicalMatches);
		}
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
}