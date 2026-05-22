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
	private static final int DEFAULT_OVERVIEW_LIMIT = 10;
	private static final int MAX_LIMIT = 20;
	private static final String STUDY_PROVIDER = "groq";
	private static final List<String> QUERY_STOP_WORDS = List.of(
			"a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "did", "do", "does",
			"document", "file", "for", "from", "give", "go", "i", "in", "is", "it", "key", "main",
			"me", "of", "on", "page", "pages", "please", "point", "points", "show", "slide", "slides",
			"tell", "that", "the", "this", "to", "topic", "topics", "what", "which", "with", "you"
	);

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

		if (tokens.isEmpty() || isDocumentOverviewQuery(query)) {
			int overviewLimit = Math.max(limit, DEFAULT_OVERVIEW_LIMIT);
			return representativeSections(documents, overviewLimit);
		}

		List<RetrievedChunk> matches = new ArrayList<>();
		for (IndexedDocument document : documents) {
			for (DocumentSection section : document.sections()) {
				float score = lexicalScore(tokens, section);
				if (score > 0f) {
					matches.add(toRetrievedChunk(document, section, score));
				}
			}
		}

		if (matches.isEmpty() && asksForExample(query)) {
			return exampleCandidateSections(documents, Math.max(limit, DEFAULT_LIMIT));
		}

		return matches.stream()
				.sorted(Comparator.comparing(RetrievedChunk::score).reversed()
						.thenComparing(RetrievedChunk::chunkIndex, Comparator.nullsLast(Integer::compareTo)))
				.limit(limit)
				.toList();
	}

	private RetrievedChunk toRetrievedChunk(IndexedDocument document, DocumentSection section, float score) {
		return new RetrievedChunk(document.documentId(), section.sectionId(), document.fileName(), section.sectionId(), section.title(), section.pageNumber(), section.content(), score);
	}

	private float lexicalScore(List<String> tokens, DocumentSection section) {
		if (tokens.isEmpty()) {
			return 0f;
		}
		String haystack = (nullSafe(section.title()) + " " + nullSafe(section.summary()) + " " + nullSafe(section.content())).toLowerCase(Locale.ROOT);
		float hits = 0f;
		for (String token : tokens) {
			if (haystack.contains(token)) {
				hits += importantQueryTokenWeight(token);
			}
		}
		return hits / tokens.size();
	}

	private List<String> tokenize(String query) {
		return List.of(query.toLowerCase(Locale.ROOT).split("\\W+"))
				.stream()
				.filter(StringUtils::hasText)
				.filter(token -> token.length() > 1)
				.filter(token -> !QUERY_STOP_WORDS.contains(token))
				.toList();
	}

	private boolean isDocumentOverviewQuery(String query) {
		String normalized = normalizeQuery(query);

		return normalized.matches(".*\\b(about|overview|summarize|summary|key ideas?|key points?|main ideas?|main points?|takeaways?)\\b.*\\b(document|file|slide|slides|deck|presentation)\\b.*")
				|| normalized.matches(".*\\b(what|tell|describe|explain)\\b.*\\b(document|file|slide|slides|deck|presentation)\\b.*\\b(about|cover|covers|discuss|discusses)\\b.*")
				|| normalized.matches(".*\\b(key points?|main ideas?|important points?|takeaways?)\\b.*");
	}

	private boolean asksForExample(String query) {
		String normalized = normalizeQuery(query);

		return normalized.matches(".*\\b(example|examples|sample|instance|demo|illustration)\\b.*");
	}

	private List<RetrievedChunk> representativeSections(List<IndexedDocument> documents, int limit) {
		List<RetrievedChunk> matches = new ArrayList<>();

		for (IndexedDocument document : documents) {
			List<DocumentSection> sections = document.sections() == null ? List.of() : document.sections().stream()
					.filter(section -> StringUtils.hasText(section.content()))
					.toList();

			if (sections.isEmpty()) {
				continue;
			}

			int perDocumentLimit = Math.min(Math.max(limit, 1), sections.size());
			for (int index : representativeIndexes(sections.size(), perDocumentLimit)) {
				DocumentSection section = sections.get(index);
				float score = 1.0f - ((float) index / Math.max(sections.size(), 1)) * 0.25f;
				matches.add(toRetrievedChunk(document, section, score));
			}
		}

		return matches.stream()
				.sorted(Comparator.comparing(RetrievedChunk::score).reversed()
						.thenComparing(RetrievedChunk::chunkIndex, Comparator.nullsLast(Integer::compareTo)))
				.limit(limit)
				.toList();
	}

	private List<Integer> representativeIndexes(int size, int limit) {
		List<Integer> indexes = new ArrayList<>();
		int safeLimit = Math.min(size, Math.max(1, limit));

		indexes.add(0);
		if (safeLimit > 1 && size > 1) {
			indexes.add(size - 1);
		}

		for (int step = 1; indexes.size() < safeLimit && step < size; step += 1) {
			int index = Math.round((float) step * (size - 1) / Math.max(safeLimit - 1, 1));
			if (!indexes.contains(index)) {
				indexes.add(index);
			}
		}

		return indexes.stream().sorted().toList();
	}

	private List<RetrievedChunk> exampleCandidateSections(List<IndexedDocument> documents, int limit) {
		List<RetrievedChunk> matches = new ArrayList<>();
		List<String> exampleHints = List.of("example", "for example", "e.g", "sample", "instance", "demo", "illustration", "vi du", "ví dụ");

		for (IndexedDocument document : documents) {
			for (DocumentSection section : document.sections()) {
				String haystack = (nullSafe(section.title()) + " " + nullSafe(section.summary()) + " " + nullSafe(section.content()))
						.toLowerCase(Locale.ROOT);
				float score = 0f;

				for (String hint : exampleHints) {
					if (haystack.contains(hint)) {
						score += 1f;
					}
				}

				if (score > 0f) {
					matches.add(toRetrievedChunk(document, section, score));
				}
			}
		}

		return matches.stream()
				.sorted(Comparator.comparing(RetrievedChunk::score).reversed()
						.thenComparing(RetrievedChunk::chunkIndex, Comparator.nullsLast(Integer::compareTo)))
				.limit(limit)
				.toList();
	}

	private float importantQueryTokenWeight(String token) {
		return switch (token) {
			case "oop", "java", "class", "object", "constructor", "inheritance", "encapsulation", "polymorphism", "abstraction", "method" -> 2.0f;
			case "example", "examples" -> 1.5f;
			default -> 1.0f;
		};
	}

	private String normalizeQuery(String query) {
		return query == null
				? ""
				: query.toLowerCase(Locale.ROOT)
						.replaceAll("[^a-z0-9 ]", " ")
						.replaceAll("\\s+", " ")
						.trim();
	}

	private String nullSafe(String value) {
		return value == null ? "" : value;
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
