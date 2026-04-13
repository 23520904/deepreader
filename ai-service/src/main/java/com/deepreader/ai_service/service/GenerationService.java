package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.Flashcard;
import com.deepreader.ai_service.model.api.internal.FlashcardResponse;
import com.deepreader.ai_service.model.api.internal.SummaryResponse;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;

@Service
public class GenerationService {

	private final DocumentIndexStoreService documentIndexStoreService;
	private final PromptBuilderService promptBuilderService;
	private final LlmClientService llmClientService;

	public GenerationService(DocumentIndexStoreService documentIndexStoreService, PromptBuilderService promptBuilderService, LlmClientService llmClientService) {
		this.documentIndexStoreService = documentIndexStoreService;
		this.promptBuilderService = promptBuilderService;
		this.llmClientService = llmClientService;
	}

	public Mono<SummaryResponse> summarize(String userId, String documentId, String provider) {
		return Mono.fromCallable(() -> {
			IndexedDocument document = documentIndexStoreService.requireById(userId, documentId);
			String prompt = promptBuilderService.buildSummaryPrompt(document.fileName(), combinedContent(document));
			String summary = llmClientService.generateAnswer(provider, prompt);
			return new SummaryResponse(documentId, provider == null ? "gemini" : provider, summary);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	public Mono<FlashcardResponse> createFlashcards(String userId, String documentId, String provider, Integer requestedCount) {
		return Mono.fromCallable(() -> {
			int count = requestedCount == null || requestedCount <= 0 ? 10 : Math.min(requestedCount, 25);
			IndexedDocument document = documentIndexStoreService.requireById(userId, documentId);
			String prompt = promptBuilderService.buildFlashcardPrompt(document.fileName(), combinedContent(document), count);
			String response = llmClientService.generateAnswer(provider, prompt);
			return new FlashcardResponse(documentId, provider == null ? "gemini" : provider, parseFlashcards(response));
		}).subscribeOn(Schedulers.boundedElastic());
	}

	private String combinedContent(IndexedDocument document) {
		return document.sections().stream()
				.limit(20)
				.map(section -> section.title() + "\n" + section.content())
				.reduce("", (left, right) -> left + "\n\n" + right)
				.trim();
	}

	private List<Flashcard> parseFlashcards(String response) {
		List<Flashcard> flashcards = new ArrayList<>();
		for (String line : response.split("\\r?\\n")) {
			String trimmed = line.trim();
			if (!trimmed.startsWith("Q:")) {
				continue;
			}
			String[] parts = trimmed.split("\\|", 2);
			if (parts.length != 2) {
				continue;
			}
			String question = parts[0].replaceFirst("^Q:\\s*", "").trim();
			String answer = parts[1].replaceFirst("^A:\\s*", "").trim();
			if (!question.isBlank() && !answer.isBlank()) {
				flashcards.add(new Flashcard(question, answer));
			}
		}
		return flashcards;
	}
}