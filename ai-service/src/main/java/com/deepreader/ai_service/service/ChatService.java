package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.api.internal.ChatAskResponse;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.deepreader.ai_service.model.api.internal.SourceReference;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Locale;

@Service
public class ChatService {

	private static final int GROQ_MAX_MATCHES = 4;
	private static final int GROQ_MAX_CONTEXT_CHARS = 12_000;
	private static final int GROQ_MAX_CHUNK_CHARS = 1_100;
	private static final String STUDY_PROVIDER = "groq";

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
		Integer safeLimit = Math.min(normalizeLimit(limit), GROQ_MAX_MATCHES);
		return retrievalService.search(userId, documentId, query, safeLimit, STUDY_PROVIDER)
				.flatMap(searchResponse -> Mono.fromCallable(() -> toChatResponse(searchResponse, userId))
						.subscribeOn(Schedulers.boundedElastic()));
	}

	private ChatAskResponse toChatResponse(SearchResponse searchResponse, String userId) {
		List<RetrievedChunk> matches = searchResponse.matches();
		String prompt = promptBuilderService.buildAnswerPrompt(
				searchResponse.query(),
				matches,
				GROQ_MAX_CONTEXT_CHARS,
				GROQ_MAX_CHUNK_CHARS
		);
		String answer = cleanAnswer(llmClientService.generateAnswer(userId, STUDY_PROVIDER, prompt));
		if (needsAnswerRepair(answer)) {
			String repairPrompt = promptBuilderService.buildAnswerRepairPrompt(searchResponse.query(), answer);
			answer = cleanAnswer(llmClientService.generateAnswer(userId, STUDY_PROVIDER, repairPrompt));
		}

		List<SourceReference> sources = matches.stream()
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

		return new ChatAskResponse(searchResponse.query(), answer, sources);
	}

	private int normalizeLimit(Integer limit) {
		if (limit == null || limit <= 0) {
			return GROQ_MAX_MATCHES;
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
		return containsVietnameseText(normalized)
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

	private boolean containsVietnameseText(String answer) {
		return answer.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*")
				|| answer.matches("(?s).*\\b(là|việc|của|và|hoặc|trong|phương\\s+thức|tham\\s+số|đối\\s+tượng)\\b.*");
	}
}
