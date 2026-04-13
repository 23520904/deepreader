package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.api.internal.ChatAskResponse;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.deepreader.ai_service.model.api.internal.SourceReference;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@Service
public class ChatService {

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
		return ask(userId, query, limit, null);
	}

	public Mono<ChatAskResponse> ask(String userId, String query, Integer limit, String provider) {
		return retrievalService.search(userId, query, limit, provider)
				.flatMap(searchResponse -> Mono.fromCallable(() -> toChatResponse(searchResponse))
						.subscribeOn(Schedulers.boundedElastic()));
	}

	private ChatAskResponse toChatResponse(SearchResponse searchResponse) {
		List<RetrievedChunk> matches = searchResponse.matches();
		String prompt = promptBuilderService.buildAnswerPrompt(searchResponse.query(), matches);
		String answer = llmClientService.generateAnswer(searchResponse.provider(), prompt);

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
}