package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.SearchResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@Service
public class RetrievalService {

	private static final int DEFAULT_LIMIT = 5;
	private static final int MAX_LIMIT = 20;

	private final EmbeddingService embeddingService;
	private final QdrantVectorStoreService qdrantVectorStoreService;

	public RetrievalService(EmbeddingService embeddingService, QdrantVectorStoreService qdrantVectorStoreService) {
		this.embeddingService = embeddingService;
		this.qdrantVectorStoreService = qdrantVectorStoreService;
	}

	public Mono<SearchResponse> search(String query, Integer requestedLimit) {
		return Mono.fromCallable(() -> {
			if (!StringUtils.hasText(query)) {
				throw new IllegalArgumentException("Query must not be blank");
			}

			int limit = normalizeLimit(requestedLimit);
			List<Float> queryVector = embeddingService.embed(query);
			List<RetrievedChunk> matches = qdrantVectorStoreService.search(queryVector, limit);

			return new SearchResponse(query, limit, matches);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	private int normalizeLimit(Integer requestedLimit) {
		if (requestedLimit == null || requestedLimit <= 0) {
			return DEFAULT_LIMIT;
		}
		return Math.min(requestedLimit, MAX_LIMIT);
	}
}