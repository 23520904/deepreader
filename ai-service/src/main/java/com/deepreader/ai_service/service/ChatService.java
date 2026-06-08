package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.api.internal.ChatAskResponse;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.deepreader.ai_service.model.api.internal.SourceReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service responsible for answering user questions based on retrieved document chunks.
 *
 * This service combines lexical retrieval, context selection, prompt construction,
 * LLM answer generation, and answer cleanup into one chat-oriented workflow.
 */
@Service
public class ChatService {

	private static final String UNSUPPORTED_DOCUMENT_ANSWER = "I could not find this information in the document.";

	/**
	 * Maximum number of chunks used as final context for the LLM answer.
	 */
	private static final int GROQ_CONTEXT_MATCHES = 6;

	/**
	 * Number of candidate chunks retrieved before relevance filtering is applied.
	 */
	private static final int GROQ_CANDIDATE_MATCHES = 12;

	/**
	 * Maximum number of characters allowed in the full context sent to the LLM.
	 */
	private static final int GROQ_MAX_CONTEXT_CHARS = 12_000;

	/**
	 * Maximum number of characters included from each individual chunk.
	 */
	private static final int GROQ_MAX_CHUNK_CHARS = 1_100;

	/**
	 * Default provider used for study-oriented chat answers.
	 */
	private static final String STUDY_PROVIDER = "groq";

	/**
	 * Maximum number of times the service attempts to repair an unsuitable answer.
	 */
	private static final int MAX_REPAIR_ATTEMPTS = 2;

	/**
	 * Common words ignored when extracting meaningful query terms for relevance scoring.
	 */
	private static final Set<String> CHAT_STOP_WORDS = Set.of(
			"a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "did", "do", "does",
			"document", "file", "for", "from", "give", "i", "in", "is", "it", "key", "main", "me",
			"of", "on", "please", "point", "points", "show", "slide", "slides", "tell", "that",
			"the", "this", "to", "topic", "topics", "what", "which", "with", "you"
	);

	private final RetrievalService retrievalService;
	private final PromptBuilderService promptBuilderService;
	private final LlmClientService llmClientService;
	private final ObjectMapper objectMapper = new ObjectMapper();

	/**
	 * Creates the chat service with retrieval, prompt building, and LLM client dependencies.
	 */
	public ChatService(
			RetrievalService retrievalService,
			PromptBuilderService promptBuilderService,
			LlmClientService llmClientService
	) {
		this.retrievalService = retrievalService;
		this.promptBuilderService = promptBuilderService;
		this.llmClientService = llmClientService;
	}

	/**
	 * Answers a question across the user's available indexed content.
	 *
	 * This overload is used when no specific document id or provider is supplied.
	 */
	public Mono<ChatAskResponse> ask(String userId, String query, Integer limit) {
		return ask(userId, null, query, limit, null);
	}

	/**
	 * Answers a question using retrieved chunks from a specific document or user scope.
	 *
	 * The requested limit is normalized, but the service always retrieves enough
	 * candidates to allow additional relevance filtering before building the prompt.
	 */
	public Mono<ChatAskResponse> ask(String userId, String documentId, String query, Integer limit, String provider) {
		Integer safeLimit = Math.max(normalizeLimit(limit), GROQ_CANDIDATE_MATCHES);
		return retrievalService.searchLexical(userId, documentId, query, safeLimit)
				.flatMap(searchResponse -> Mono.fromCallable(() -> toChatResponse(searchResponse, userId))
						.subscribeOn(Schedulers.boundedElastic()));
	}

	/**
	 * Converts a search response into a final chat answer with source references.
	 *
	 * The method selects the best chunks, builds the LLM prompt, generates an answer,
	 * repairs unsuitable answers when needed, and maps the selected chunks into
	 * source references for the API response.
	 */
	private ChatAskResponse toChatResponse(SearchResponse searchResponse, String userId) {
		List<RetrievedChunk> matches = selectContextChunks(searchResponse.query(), searchResponse.matches());
		String prompt = promptBuilderService.buildAnswerPrompt(
				searchResponse.query(),
				matches,
				GROQ_MAX_CONTEXT_CHARS,
				GROQ_MAX_CHUNK_CHARS
		);

		String rawAnswer = llmClientService.generateAnswer(userId, STUDY_PROVIDER, prompt);
		StructuredChatAnswer structuredAnswer = parseStructuredChatAnswer(rawAnswer);

		for (int attempt = 0; attempt < MAX_REPAIR_ATTEMPTS && structuredAnswer == null; attempt += 1) {
			String repairPrompt = promptBuilderService.buildAnswerRepairPrompt(searchResponse.query(), rawAnswer);
			rawAnswer = llmClientService.generateAnswer(userId, STUDY_PROVIDER, repairPrompt);
			structuredAnswer = parseStructuredChatAnswer(rawAnswer);
		}

		if (structuredAnswer == null || !Boolean.TRUE.equals(structuredAnswer.grounded()) || !StringUtils.hasText(structuredAnswer.answer())) {
			return new ChatAskResponse(
				searchResponse.query(),
				UNSUPPORTED_DOCUMENT_ANSWER,
				List.of(),
				false,
				List.of()
			);
		}

		List<String> usedChunkIds = structuredAnswer.usedChunkIds() == null
			? List.of()
			: structuredAnswer.usedChunkIds();

		List<SourceReference> sources = usedChunkIds.stream()
				.map(chunkId -> chunkId == null ? null : chunkById(matches).get(chunkId))
				.filter(Objects::nonNull)
				.map(chunk -> new SourceReference(
						chunk.documentId(),
						chunk.chunkId(),
						chunk.fileName(),
						chunk.sectionId(),
						chunk.title(),
						chunk.chunkIndex(),
						chunk.content(),
						chunk.score()
				))
				.toList();

		return new ChatAskResponse(
				searchResponse.query(),
				cleanAnswer(structuredAnswer.answer()),
				sources,
				true,
				structuredAnswer.usedChunkIds()
			);
	}

	/**
	 * Selects the most useful chunks to include in the answer context.
	 *
	 * Overview-style questions keep the original document order, while specific
	 * questions are first ranked by chat relevance and then reordered by chunk index
	 * so the final context remains readable.
	 */
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

	/**
	 * Calculates a chat-specific relevance score for a retrieved chunk.
	 *
	 * The score combines the original retrieval score with additional boosts for
	 * matching query terms, important technical topics, and common study-related
	 * concepts such as examples, constructors, and access modifiers.
	 */
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

	/**
	 * Extracts meaningful query terms used for chunk relevance scoring.
	 *
	 * The query is normalized, split into terms, filtered by length and stop words,
	 * and deduplicated before scoring.
	 */
	private List<String> queryTerms(String query) {
		return List.of(normalizeText(query).split("\\W+"))
				.stream()
				.filter(term -> term.length() > 1)
				.filter(term -> !CHAT_STOP_WORDS.contains(term))
				.distinct()
				.toList();
	}

	/**
	 * Detects broad overview questions that should preserve document order.
	 *
	 * Overview queries usually ask for summaries, key points, takeaways,
	 * or a general explanation of the uploaded document.
	 */
	private boolean isOverviewQuery(String query) {
		String normalized = normalizeText(query);
		return normalized.matches(".*\\b(about|overview|summarize|summary|key ideas?|key points?|main ideas?|main points?|takeaways?)\\b.*")
				|| normalized.matches(".*\\b(what|tell|describe|explain)\\b.*\\b(document|file|slide|slides|deck|presentation)\\b.*")
				|| normalized.matches(".*\\b(what|tell|describe|explain)\\b.*\\b(learn|study|review)\\b.*\\b(document|file|slide|slides|deck|presentation)\\b.*");
	}

	/**
	 * Checks whether a text value contains at least one of the provided candidates.
	 */
	private boolean containsAny(String value, String... candidates) {
		for (String candidate : candidates) {
			if (value.contains(candidate)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Gives extra weight to important programming and OOP terms.
	 *
	 * These boosts help technical chunks rank higher when the user asks about
	 * Java or object-oriented programming concepts.
	 */
	private double importantChatTermWeight(String term) {
		return switch (term) {
			case "oop", "java", "class", "object", "constructor", "inheritance", "encapsulation",
					"polymorphism", "abstraction", "overloading", "public", "private", "method" -> 1.8;
			default -> 1.0;
		};
	}

	/**
	 * Normalizes text for consistent matching and scoring.
	 *
	 * The method lowercases text, removes non-alphanumeric characters,
	 * collapses whitespace, and safely handles null values.
	 */
	private String normalizeText(String value) {
		return value == null
				? ""
				: value.toLowerCase(Locale.ROOT)
						.replaceAll("[^a-z0-9 ]", " ")
						.replaceAll("\\s+", " ")
						.trim();
	}

	/**
	 * Normalizes the requested retrieval limit.
	 *
	 * Invalid or missing limits fall back to the default context match count.
	 */
	private int normalizeLimit(Integer limit) {
		if (limit == null || limit <= 0) {
			return GROQ_CONTEXT_MATCHES;
		}

		return limit;
	}

	/**
	 * Trims the generated answer and converts null output into an empty string.
	 */
	private String cleanAnswer(String answer) {
		return answer == null ? "" : answer.trim();
	}

	/**
	 * Determines whether an answer should be regenerated with a repair prompt.
	 *
	 * Repair is triggered when the answer appears to use Vietnamese text,
	 * mentions internal source wording, or exposes page/chunk/source references
	 * that should not appear in the final response.
	 */
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

	/**
	 * Detects Vietnamese text by checking Unicode characters and normalized keywords.
	 *
	 * This helper catches both accented Vietnamese text and normalized Vietnamese
	 * words that may remain after diacritic removal.
	 */
	private boolean containsVietnameseUnicodeText(String answer) {
		String normalized = Normalizer.normalize(answer, Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "")
				.replace('đ', 'd');

		return answer.matches(".*[\\u00e0\\u00e1\\u1ea1\\u1ea3\\u00e3\\u00e2\\u1ea7\\u1ea5\\u1ead\\u1ea9\\u1eab\\u0103\\u1eb1\\u1eaf\\u1eb7\\u1eb3\\u1eb5\\u00e8\\u00e9\\u1eb9\\u1ebb\\u1ebd\\u00ea\\u1ec1\\u1ebf\\u1ec7\\u1ec3\\u1ec5\\u00ec\\u00ed\\u1ecb\\u1ec9\\u0129\\u00f2\\u00f3\\u1ecd\\u1ecf\\u00f5\\u00f4\\u1ed3\\u1ed1\\u1ed9\\u1ed5\\u1ed7\\u01a1\\u1edd\\u1edb\\u1ee3\\u1edf\\u1ee1\\u00f9\\u00fa\\u1ee5\\u1ee7\\u0169\\u01b0\\u1eeb\\u1ee9\\u1ef1\\u1eed\\u1eef\\u1ef3\\u00fd\\u1ef5\\u1ef7\\u1ef9\\u0111].*")
				|| normalized.matches("(?s).*\\b(la|viec|cua|va|hoac|trong|phuong\\s+thuc|tham\\s+so|doi\\s+tuong|ke\\s+thua|kha\\s+nang|lop\\s+con|ghi\\s+de)\\b.*");
	}

	/**
	 * Detects Vietnamese text using accented characters and common Vietnamese words.
	 *
	 * This is used as an additional safeguard before deciding whether the answer
	 * needs to be repaired.
	 */
	private boolean containsVietnameseText(String answer) {
		return answer.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*")
				|| answer.matches("(?s).*\\b(là|việc|của|và|hoặc|trong|phương\\s+thức|tham\\s+số|đối\\s+tượng)\\b.*");
	}

	private Map<String, RetrievedChunk> chunkById(List<RetrievedChunk> matches) {
		return matches.stream()
				.filter(chunk -> chunk.chunkId() != null && !chunk.chunkId().isBlank())
				.collect(Collectors.toMap(RetrievedChunk::chunkId, chunk -> chunk, (first, second) -> first));
	}

	private StructuredChatAnswer parseStructuredChatAnswer(String rawAnswer) {
		if (rawAnswer == null || rawAnswer.isBlank()) {
			return null;
		}

		String json = extractJson(rawAnswer);
		if (json == null) {
			return null;
		}

		try {
			return objectMapper.readValue(json, StructuredChatAnswer.class);
		} catch (JsonProcessingException e) {
			return null;
		}
	}

	private String extractJson(String rawAnswer) {
		String trimmed = rawAnswer.trim();
		int start = trimmed.indexOf('{');
		int end = trimmed.lastIndexOf('}');
		if (start < 0 || end <= start) {
			return null;
		}
		return trimmed.substring(start, end + 1);
	}

	private record StructuredChatAnswer(String answer, Boolean grounded, List<String> usedChunkIds) {}
}