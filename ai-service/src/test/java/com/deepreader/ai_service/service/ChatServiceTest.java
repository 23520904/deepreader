package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatServiceTest {

	private final RetrievalService retrievalService = mock(RetrievalService.class);
	private final PromptBuilderService promptBuilderService = mock(PromptBuilderService.class);
	private final LlmClientService llmClientService = mock(LlmClientService.class);
	private final ChatService chatService = new ChatService(retrievalService, promptBuilderService, llmClientService);

	@Test
	void askKeepsPromptContextAndAddsOneCitationForShortAnswer() {
		List<RetrievedChunk> chunks = List.of(
				chunk("chunk-1", "section-1", "Page 1", 1, "Present simple formula content.", 0.9f),
				chunk("chunk-2", "section-2", "Page 2", 2, "Another relevant document section.", 0.8f)
		);
		when(retrievalService.searchLexical("user-1", "doc-1", "cong thuc hien tai don", 12))
				.thenReturn(Mono.just(new SearchResponse("cong thuc hien tai don", 12, "groq", chunks)));
		when(promptBuilderService.buildAnswerPrompt(eq("cong thuc hien tai don"), org.mockito.ArgumentMatchers.anyList(), anyInt(), anyInt()))
				.thenReturn("stable prompt");
		when(llmClientService.generateAnswer("user-1", "groq", "stable prompt"))
				.thenReturn("The present simple uses the base verb, with s/es for third-person singular.");

		StepVerifier.create(chatService.ask("user-1", "doc-1", "cong thuc hien tai don", 4, null))
				.assertNext(response -> {
					assertEquals("The present simple uses the base verb, with s/es for third-person singular.", response.answer());
					assertEquals(1, response.sources().size());
					assertEquals(1, response.sources().getFirst().index());
					assertEquals(1, response.sources().getFirst().pageNumber());
					assertEquals("section-1", response.sources().getFirst().sectionId());
					assertEquals("chunk-1", response.sources().getFirst().chunkId());
				})
				.verifyComplete();

		ArgumentCaptor<List<RetrievedChunk>> contextCaptor = ArgumentCaptor.forClass(List.class);
		verify(promptBuilderService).buildAnswerPrompt(eq("cong thuc hien tai don"), contextCaptor.capture(), eq(12_000), eq(1_100));
		assertEquals(2, contextCaptor.getValue().size());
		assertSame(chunks.get(0), contextCaptor.getValue().get(0));
		assertSame(chunks.get(1), contextCaptor.getValue().get(1));
		verify(retrievalService).searchLexical("user-1", "doc-1", "cong thuc hien tai don", 12);
	}

	@Test
	void askReturnsOnlyHighestRankedCitationForShortAnswer() {
		List<RetrievedChunk> chunks = List.of(
				chunk("chunk-1", "section-1", "Page 1", 1, "SIMPLE PRESENT uses V-s or V-es for facts.", 0.9f),
				chunk("chunk-2", "section-2", "Page 2", 2, "PAST CONTINUOUS uses was/were + V-ing.", 0.8f),
				chunk("chunk-3", "section-3", "Page 3", 3, "PRESENT CONTINUOUS uses am/is/are + V-ing.", 0.7f)
		);
		when(retrievalService.searchLexical("user-1", "doc-1", "thi hien tai tiep dien la gi", 12))
				.thenReturn(Mono.just(new SearchResponse("thi hien tai tiep dien la gi", 12, "groq", chunks)));
		when(promptBuilderService.buildAnswerPrompt(eq("thi hien tai tiep dien la gi"), org.mockito.ArgumentMatchers.anyList(), anyInt(), anyInt()))
				.thenReturn("stable prompt");
		when(llmClientService.generateAnswer("user-1", "groq", "stable prompt"))
				.thenReturn("The present continuous uses am/is/are + V-ing.");

		StepVerifier.create(chatService.ask("user-1", "doc-1", "thi hien tai tiep dien la gi", 4, null))
				.assertNext(response -> {
					assertEquals(1, response.sources().size());
					assertEquals(3, response.sources().getFirst().pageNumber());
					assertEquals("chunk-3", response.sources().getFirst().chunkId());
				})
				.verifyComplete();
	}

	@Test
	void askKeepsMediumAnswerToOneCitationWhenSecondSourceIsWeak() {
		List<RetrievedChunk> chunks = List.of(
				chunk("chunk-1", "section-1", "Page 1", 1, "This page introduces future tense vocabulary.", 0.9f),
				chunk("chunk-2", "section-2", "Page 2", 2, "SIMPLE FUTURE uses will plus the base verb for future plans.", 0.8f),
				chunk("chunk-3", "section-3", "Page 3", 3, "This page lists unrelated review exercises.", 0.7f)
		);
		String answer = "The simple future uses will plus the base verb for future plans. ".repeat(8);
		when(retrievalService.searchLexical("user-1", "doc-1", "thi tuong lai don la gi", 12))
				.thenReturn(Mono.just(new SearchResponse("thi tuong lai don la gi", 12, "groq", chunks)));
		when(promptBuilderService.buildAnswerPrompt(eq("thi tuong lai don la gi"), org.mockito.ArgumentMatchers.anyList(), anyInt(), anyInt()))
				.thenReturn("stable prompt");
		when(llmClientService.generateAnswer("user-1", "groq", "stable prompt"))
				.thenReturn(answer);

		StepVerifier.create(chatService.ask("user-1", "doc-1", "thi tuong lai don la gi", 4, null))
				.assertNext(response -> {
					assertEquals(1, response.sources().size());
					assertEquals(2, response.sources().getFirst().pageNumber());
					assertEquals("chunk-2", response.sources().getFirst().chunkId());
				})
				.verifyComplete();
	}

	@Test
	void askAllowsSecondCitationOnlyWhenBothPagesHaveStrongOverlap() {
		List<RetrievedChunk> chunks = List.of(
				chunk("chunk-1", "section-1", "Page 1", 1, "SIMPLE PRESENT describes habits and facts.", 0.9f),
				chunk("chunk-2", "section-2", "Page 2", 2, "PRESENT CONTINUOUS describes actions happening now.", 0.8f),
				chunk("chunk-3", "section-3", "Page 3", 3, "This page is a general practice page.", 0.7f)
		);
		String answer = "Simple present describes habits and facts. Present continuous describes actions happening now. ".repeat(5);
		when(retrievalService.searchLexical("user-1", "doc-1", "compare simple present and present continuous", 12))
				.thenReturn(Mono.just(new SearchResponse("compare simple present and present continuous", 12, "groq", chunks)));
		when(promptBuilderService.buildAnswerPrompt(eq("compare simple present and present continuous"), org.mockito.ArgumentMatchers.anyList(), anyInt(), anyInt()))
				.thenReturn("stable prompt");
		when(llmClientService.generateAnswer("user-1", "groq", "stable prompt"))
				.thenReturn(answer);

		StepVerifier.create(chatService.ask("user-1", "doc-1", "compare simple present and present continuous", 4, null))
				.assertNext(response -> {
					assertEquals(2, response.sources().size());
					List<Integer> pageNumbers = response.sources().stream()
							.map(source -> source.pageNumber())
							.toList();
					assertTrue(pageNumbers.contains(1));
					assertTrue(pageNumbers.contains(2));
				})
				.verifyComplete();
	}

	@Test
	void askAllowsUpToThreeCitationsForBroadSummaryQuestions() {
		List<RetrievedChunk> chunks = List.of(
				chunk("chunk-1", "section-1", "Page 1", 1, "Opening topic.", 0.9f),
				chunk("chunk-2", "section-2", "Page 2", 2, "Middle topic.", 0.8f),
				chunk("chunk-3", "section-3", "Page 3", 3, "Final topic.", 0.7f),
				chunk("chunk-4", "section-4", "Page 4", 4, "Extra topic.", 0.6f)
		);
		when(retrievalService.searchLexical("user-1", "doc-1", "tom tat tai lieu", 12))
				.thenReturn(Mono.just(new SearchResponse("tom tat tai lieu", 12, "groq", chunks)));
		when(promptBuilderService.buildAnswerPrompt(eq("tom tat tai lieu"), org.mockito.ArgumentMatchers.anyList(), anyInt(), anyInt()))
				.thenReturn("stable prompt");
		when(llmClientService.generateAnswer("user-1", "groq", "stable prompt"))
				.thenReturn("This document introduces several topics across the selected pages.");

		StepVerifier.create(chatService.ask("user-1", "doc-1", "tom tat tai lieu", 4, null))
				.assertNext(response -> {
					assertEquals(3, response.sources().size());
					assertEquals(1, response.sources().get(0).index());
					assertEquals(2, response.sources().get(1).index());
					assertEquals(3, response.sources().get(2).index());
				})
				.verifyComplete();
	}

	private RetrievedChunk chunk(String chunkId, String sectionId, String title, Integer pageNumber, String content, float score) {
		return new RetrievedChunk("doc-1", chunkId, "grammar.pdf", sectionId, title, pageNumber, content, score);
	}
}
