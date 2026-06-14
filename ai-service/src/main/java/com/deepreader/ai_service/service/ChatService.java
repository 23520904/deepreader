package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.api.internal.ChatAskResponse;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.deepreader.ai_service.model.api.internal.SourceReference;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ChatService {

	private static final int GROQ_CONTEXT_MATCHES = 6;
	private static final int GROQ_CANDIDATE_MATCHES = 12;
	private static final int GROQ_MAX_CONTEXT_CHARS = 12_000;
	private static final int GROQ_MAX_CHUNK_CHARS = 1_100;
	private static final String STUDY_PROVIDER = "groq";
	private static final int MAX_REPAIR_ATTEMPTS = 2;
	private static final double MIN_PRIMARY_CITATION_SCORE = 1.0;
	private static final double MIN_SECONDARY_CITATION_SCORE = 8.0;
	private static final double SECONDARY_CITATION_SCORE_RATIO = 0.72;
	private static final Set<String> CHAT_STOP_WORDS = Set.of(
			"a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "did", "do", "does",
			"document", "file", "for", "from", "give", "i", "in", "is", "it", "key", "main", "me",
			"of", "on", "please", "point", "points", "show", "slide", "slides", "tell", "that",
			"the", "this", "to", "topic", "topics", "what", "which", "with", "you"
	);
	private static final Set<String> CITATION_STOP_WORDS = Set.of(
			"a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "did", "do", "does",
			"document", "file", "for", "from", "give", "i", "in", "is", "it", "key", "main", "me",
			"of", "on", "please", "point", "points", "show", "slide", "slides", "tell", "that",
			"the", "this", "to", "topic", "topics", "what", "which", "with", "you",
			"la", "gi", "cua", "cho", "ve", "va", "hay", "nhu", "nao"
	);

	private final RetrievalService retrievalService;
	private final PromptBuilderService promptBuilderService;
	private final LlmClientService llmClientService;

	public ChatService(
			RetrievalService retrievalService,
			PromptBuilderService promptBuilderService,
			LlmClientService llmClientService
	) {
		this.retrievalService = retrievalService;
		this.promptBuilderService = promptBuilderService;
		this.llmClientService = llmClientService;
	}

	public Mono<ChatAskResponse> ask(String userId, String query, Integer limit) {
		return ask(userId, null, query, limit, null);
	}

	public Mono<ChatAskResponse> ask(String userId, String documentId, String query, Integer limit, String provider) {
		Integer safeLimit = Math.max(normalizeLimit(limit), GROQ_CANDIDATE_MATCHES);
		return retrievalService.searchLexical(userId, documentId, query, safeLimit)
				.flatMap(searchResponse -> Mono.fromCallable(() -> toChatResponse(searchResponse, userId))
						.subscribeOn(Schedulers.boundedElastic()));
	}

	private ChatAskResponse toChatResponse(SearchResponse searchResponse, String userId) {
		List<RetrievedChunk> matches = selectContextChunks(searchResponse.query(), searchResponse.matches());
		String prompt = promptBuilderService.buildAnswerPrompt(
				searchResponse.query(),
				matches,
				GROQ_MAX_CONTEXT_CHARS,
				GROQ_MAX_CHUNK_CHARS
		);
		String answer = cleanAnswer(llmClientService.generateAnswer(userId, STUDY_PROVIDER, prompt));
		for (int attempt = 0; attempt < MAX_REPAIR_ATTEMPTS && needsAnswerRepair(answer); attempt += 1) {
			String repairPrompt = promptBuilderService.buildAnswerRepairPrompt(searchResponse.query(), answer);
			answer = cleanAnswer(llmClientService.generateAnswer(userId, STUDY_PROVIDER, repairPrompt));
		}

		List<SourceReference> sources = buildCitationSources(searchResponse.query(), answer, matches);

		return new ChatAskResponse(searchResponse.query(), answer, sources);
	}

	private List<SourceReference> buildCitationSources(String query, String answer, List<RetrievedChunk> matches) {
		if (matches == null || matches.isEmpty()) {
			return List.of();
		}

		boolean broadSummaryQuery = isBroadCitationSummaryQuery(query);
		int maxCitations = broadSummaryQuery ? 3 : 2;
		List<SourceReference> citations = new ArrayList<>();
		Set<Integer> seenPages = new HashSet<>();
		List<CitationCandidate> candidates = new ArrayList<>();

		for (int i = 0; i < matches.size(); i++) {
			RetrievedChunk chunk = matches.get(i);
			if (chunk.content() == null || chunk.content().isBlank()) {
				continue;
			}

			candidates.add(new CitationCandidate(chunk, citationRelevanceScore(query, answer, chunk), i));
		}

		candidates.sort(Comparator.comparing(CitationCandidate::score).reversed()
				.thenComparing(candidate -> candidate.chunk().score(), Comparator.reverseOrder())
				.thenComparing(CitationCandidate::originalIndex));

		double bestScore = candidates.isEmpty() ? 0.0 : candidates.getFirst().score();

		for (CitationCandidate candidate : candidates) {
			if (citations.size() >= maxCitations) {
				break;
			}

			if (!shouldIncludeCitation(candidate.score(), bestScore, citations.size(), broadSummaryQuery, answer)) {
				continue;
			}

			RetrievedChunk chunk = candidate.chunk();
			Integer pageNumber = normalizePageNumber(chunk.chunkIndex());
			if (pageNumber != null && !seenPages.add(pageNumber)) {
				continue;
			}

			citations.add(new SourceReference(
					citations.size() + 1,
					pageNumber,
					chunk.documentId(),
					chunk.chunkId(),
					chunk.fileName(),
					chunk.sectionId(),
					displayTitle(chunk.title(), pageNumber),
					chunk.chunkIndex(),
					snippet(chunk.content()),
					chunk.score()
			));
		}

		return citations;
	}

	private boolean shouldIncludeCitation(double score, double bestScore, int selectedCount, boolean broadSummaryQuery, String answer) {
		if (selectedCount == 0) {
			return broadSummaryQuery || score >= MIN_PRIMARY_CITATION_SCORE;
		}

		if (broadSummaryQuery) {
			return score >= MIN_PRIMARY_CITATION_SCORE || selectedCount < 3;
		}

		String safeAnswer = answer == null ? "" : answer.trim();
		return safeAnswer.length() > 350
				&& score >= MIN_SECONDARY_CITATION_SCORE
				&& score >= bestScore * SECONDARY_CITATION_SCORE_RATIO;
	}

	private double citationRelevanceScore(String query, String answer, RetrievedChunk chunk) {
		String title = normalizeCitationText(chunk.title());
		String content = normalizeCitationText(chunk.content());
		String haystack = (title + " " + content).trim();
		double score = 0.0;

		for (String phrase : citationPhrases(query)) {
			if (containsPhrase(haystack, phrase)) {
				score += 7.0 + phrase.split(" ").length;
			}
		}

		for (String term : citationTerms(query)) {
			if (containsPhrase(title, term)) {
				score += 3.0;
			}
			if (containsPhrase(content, term)) {
				score += 2.0;
			}
		}

		for (String term : citationTerms(answer)) {
			if (containsPhrase(title, term)) {
				score += 1.5;
			}
			if (containsPhrase(content, term)) {
				score += 1.0;
			}
		}

		return score;
	}

	private List<String> citationTerms(String value) {
		String normalized = normalizeCitationText(value);
		if (normalized.isBlank()) {
			return List.of();
		}

		return List.of(normalized.split("\\W+")).stream()
				.filter(term -> term.length() > 1)
				.filter(term -> !CITATION_STOP_WORDS.contains(term))
				.distinct()
				.toList();
	}

	private List<String> citationPhrases(String value) {
		List<String> terms = citationTerms(value);
		List<String> phrases = new ArrayList<>();

		for (int size = Math.min(4, terms.size()); size >= 2; size--) {
			for (int i = 0; i + size <= terms.size(); i++) {
				phrases.add(String.join(" ", terms.subList(i, i + size)));
			}
		}

		return phrases.stream().distinct().toList();
	}

	private boolean containsPhrase(String value, String phrase) {
		return (" " + value + " ").contains(" " + phrase + " ");
	}

	private boolean isBroadCitationSummaryQuery(String query) {
		String normalized = normalizeCitationText(query);
		return isOverviewQuery(query)
				|| normalized.matches(".*\\b(tom tat|tong quan|noi dung chinh|y chinh|diem chinh)\\b.*\\b(tai lieu|document|file|slide|slides)\\b.*")
				|| normalized.matches(".*\\b(tai lieu|document|file|slide|slides)\\b.*\\b(tom tat|tong quan|noi dung chinh|y chinh|diem chinh)\\b.*");
	}

	private Integer normalizePageNumber(Integer chunkIndex) {
		if (chunkIndex == null || chunkIndex <= 0) {
			return null;
		}
		return chunkIndex;
	}

	private String displayTitle(String title, Integer pageNumber) {
		if (title != null && !title.isBlank()) {
			return title.trim();
		}
		return pageNumber == null ? "Document section" : "Page " + pageNumber;
	}

	private String snippet(String content) {
		if (content == null || content.isBlank()) {
			return "";
		}

		String normalized = content.replaceAll("\\s+", " ").trim();
		if (normalized.length() <= 240) {
			return normalized;
		}

		return normalized.substring(0, 240).trim() + "...";
	}

	private List<RetrievedChunk> selectContextChunks(String query, List<RetrievedChunk> matches) {
		if (matches == null || matches.isEmpty()) {
			return List.of();
		}

		if (isOverviewQuery(query)) {
			return matches.stream()
					.sorted(Comparator.comparing(RetrievedChunk::chunkIndex, Comparator.nullsLast(Integer::compareTo)))
					.limit(GROQ_CONTEXT_MATCHES)
					.toList();
		}

		List<String> queryTerms = queryTerms(query);
		return matches.stream()
				.sorted(Comparator.comparing((RetrievedChunk chunk) -> chatRelevanceScore(query, queryTerms, chunk)).reversed()
						.thenComparing(RetrievedChunk::score, Comparator.reverseOrder())
						.thenComparing(RetrievedChunk::chunkIndex, Comparator.nullsLast(Integer::compareTo)))
				.limit(GROQ_CONTEXT_MATCHES)
				.sorted(Comparator.comparing(RetrievedChunk::chunkIndex, Comparator.nullsLast(Integer::compareTo)))
				.toList();
	}

	private double chatRelevanceScore(String query, List<String> queryTerms, RetrievedChunk chunk) {
		String title = normalizeText(chunk.title());
		String content = normalizeText(chunk.content());
		String haystack = title + " " + content;
		double score = chunk.score();

		for (String term : queryTerms) {
			if (title.contains(term)) {
				score += 2.5;
			}
			if (content.contains(term)) {
				score += importantChatTermWeight(term);
			}
		}

		String normalizedQuery = normalizeText(query);
		if (normalizedQuery.contains("example") && containsAny(haystack, "example", "for example", "sample", "instance")) {
			score += 3.0;
		}
		if (normalizedQuery.contains("constructor") && content.contains("constructor")) {
			score += 2.0;
		}
		if (normalizedQuery.contains("overloading") && containsAny(content, "overload", "overloading", "same name", "parameter")) {
			score += 2.0;
		}
		if (normalizedQuery.contains("public") && content.contains("public")) {
			score += 2.0;
		}
		if (normalizedQuery.contains("private") && content.contains("private")) {
			score += 2.0;
		}

		return score;
	}

	private List<String> queryTerms(String query) {
		return List.of(normalizeText(query).split("\\W+"))
				.stream()
				.filter(term -> term.length() > 1)
				.filter(term -> !CHAT_STOP_WORDS.contains(term))
				.distinct()
				.toList();
	}

	private boolean isOverviewQuery(String query) {
		String normalized = normalizeText(query);
		return normalized.matches(".*\\b(about|overview|summarize|summary|key ideas?|key points?|main ideas?|main points?|takeaways?)\\b.*")
				|| normalized.matches(".*\\b(what|tell|describe|explain)\\b.*\\b(document|file|slide|slides|deck|presentation)\\b.*")
				|| normalized.matches(".*\\b(what|tell|describe|explain)\\b.*\\b(learn|study|review)\\b.*\\b(document|file|slide|slides|deck|presentation)\\b.*");
	}

	private boolean containsAny(String value, String... candidates) {
		for (String candidate : candidates) {
			if (value.contains(candidate)) {
				return true;
			}
		}

		return false;
	}

	private double importantChatTermWeight(String term) {
		return switch (term) {
			case "oop", "java", "class", "object", "constructor", "inheritance", "encapsulation",
					"polymorphism", "abstraction", "overloading", "public", "private", "method" -> 1.8;
			default -> 1.0;
		};
	}

	private String normalizeText(String value) {
		return value == null
				? ""
				: value.toLowerCase(Locale.ROOT)
						.replaceAll("[^a-z0-9 ]", " ")
						.replaceAll("\\s+", " ")
						.trim();
	}

	private String normalizeCitationText(String value) {
		if (value == null) {
			return "";
		}

		String normalized = Normalizer.normalize(value.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "");

		return normalized.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9 ]", " ")
				.replaceAll("\\s+", " ")
				.trim();
	}

	private record CitationCandidate(RetrievedChunk chunk, double score, int originalIndex) {
	}

	private int normalizeLimit(Integer limit) {
		if (limit == null || limit <= 0) {
			return GROQ_CONTEXT_MATCHES;
		}

		return limit;
	}

	private String cleanAnswer(String answer) {
		return answer == null ? "" : answer.trim();
	}

	private boolean needsAnswerRepair(String answer) {
		if (answer == null || answer.isBlank()) {
			return false;
		}

		String normalized = answer.toLowerCase(Locale.ROOT);
		return containsVietnameseUnicodeText(normalized)
				|| containsVietnameseText(normalized)
				|| normalized.contains("provided source")
				|| normalized.contains("provided sources")
				|| normalized.contains("based on the sources")
				|| normalized.contains("based on these sources")
				|| normalized.contains("based on the provided")
				|| normalized.contains("the sources")
				|| normalized.matches("(?s).*\\bsource\\s*\\d+\\b.*")
				|| normalized.matches("(?s).*\\bpage\\s*\\d+\\b.*")
				|| normalized.matches("(?s).*\\bchunk\\s*\\d+\\b.*");
	}

	private boolean containsVietnameseUnicodeText(String answer) {
		String normalized = Normalizer.normalize(answer, Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "")
				.replace('đ', 'd');

		return answer.matches(".*[\\u00e0\\u00e1\\u1ea1\\u1ea3\\u00e3\\u00e2\\u1ea7\\u1ea5\\u1ead\\u1ea9\\u1eab\\u0103\\u1eb1\\u1eaf\\u1eb7\\u1eb3\\u1eb5\\u00e8\\u00e9\\u1eb9\\u1ebb\\u1ebd\\u00ea\\u1ec1\\u1ebf\\u1ec7\\u1ec3\\u1ec5\\u00ec\\u00ed\\u1ecb\\u1ec9\\u0129\\u00f2\\u00f3\\u1ecd\\u1ecf\\u00f5\\u00f4\\u1ed3\\u1ed1\\u1ed9\\u1ed5\\u1ed7\\u01a1\\u1edd\\u1edb\\u1ee3\\u1edf\\u1ee1\\u00f9\\u00fa\\u1ee5\\u1ee7\\u0169\\u01b0\\u1eeb\\u1ee9\\u1ef1\\u1eed\\u1eef\\u1ef3\\u00fd\\u1ef5\\u1ef7\\u1ef9\\u0111].*")
				|| normalized.matches("(?s).*\\b(la|viec|cua|va|hoac|trong|phuong\\s+thuc|tham\\s+so|doi\\s+tuong|ke\\s+thua|kha\\s+nang|lop\\s+con|ghi\\s+de)\\b.*");
	}

	private boolean containsVietnameseText(String answer) {
		return answer.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*")
				|| answer.matches("(?s).*\\b(là|việc|của|và|hoặc|trong|phương\\s+thức|tham\\s+số|đối\\s+tượng)\\b.*");
	}
}
