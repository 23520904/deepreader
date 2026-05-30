package com.deepreader.business_service.service;

import com.deepreader.business_service.client.AiServiceClient;
import com.deepreader.business_service.client.DataServiceClient;
import com.deepreader.business_service.event.BookEventPublisher;
import com.deepreader.business_service.model.BookQueryRequest;
import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests ownership and provider behavior in LibraryOrchestrationService.
 *
 * <p>These tests focus on important security and orchestration rules, especially
 * making sure users cannot access another user's book data.
 */
class LibraryOrchestrationServiceTest {

	private final AiServiceClient aiServiceClient = mock(AiServiceClient.class);
	private final DataServiceClient dataServiceClient = mock(DataServiceClient.class);
	private final BookEventPublisher bookEventPublisher = mock(BookEventPublisher.class);
	private final LibraryOrchestrationService service = new LibraryOrchestrationService(
			aiServiceClient,
			dataServiceClient,
			bookEventPublisher
	);

	/**
	 * Verifies that chat requests are rejected when the book belongs to another user.
	 *
	 * <p>This is important because chat calls can expose book content through the AI service,
	 * so ownership must be checked before any downstream AI request is made.
	 */
	@Test
	void chatRejectsBooksOwnedByAnotherUser() {
		when(dataServiceClient.getBook("book-1")).thenReturn(Mono.just(book("book-1", "owner-1", "doc-1")));

		StepVerifier.create(service.chatWithBook(
						"intruder-1",
						"book-1",
						new BookQueryRequest("What is this about?", 5, "gemini", "thread-1")
				))
				.expectErrorSatisfies(error -> {
					ResponseStatusException statusException = assertInstanceOf(ResponseStatusException.class, error);
					assertEquals(HttpStatus.FORBIDDEN, statusException.getStatusCode());
				})
				.verify();

		// The AI service must not be called when ownership validation fails.
		verify(aiServiceClient, never()).chat(eq("intruder-1"), eq("doc-1"), eq("What is this about?"), eq(5), isNull());
	}

	/**
	 * Verifies that search uses the authenticated owner and does not trust the requested provider.
	 *
	 * <p>The request includes a provider value, but the orchestration service currently passes null
	 * so the downstream AI service can apply its configured default behavior.
	 */
	@Test
	void searchUsesAuthenticatedOwnerAndIgnoresRequestedProvider() {
		when(dataServiceClient.getBook("book-1")).thenReturn(Mono.just(book("book-1", "owner-1", "doc-1")));
		when(aiServiceClient.search("owner-1", "doc-1", "What is this about?", 5, null))
				.thenReturn(Mono.just(new AiServiceClient.AiSearchResponse("What is this about?", 5, "gemini", List.of())));

		StepVerifier.create(service.searchBook(
						"owner-1",
						"book-1",
						new BookQueryRequest("What is this about?", 5, "openai", null)
				))
				.expectNextMatches(response -> "gemini".equals(response.provider()))
				.verifyComplete();

		// Provider is intentionally null here, even though the request contains "openai".
		verify(aiServiceClient).search("owner-1", "doc-1", "What is this about?", 5, null);
	}

	/**
	 * Verifies that saved summaries cannot be listed by a user who does not own the book.
	 *
	 * <p>This protects previously generated study data, not only live AI operations.
	 */
	@Test
	void savedSummariesRequireBookOwnership() {
		when(dataServiceClient.getBook("book-1")).thenReturn(Mono.just(book("book-1", "owner-1", "doc-1")));
		when(dataServiceClient.listSummaries("book-1")).thenReturn(Flux.just(new ChapterSummary()));

		StepVerifier.create(service.listSummaries("intruder-1", "book-1"))
				.expectErrorSatisfies(error -> {
					ResponseStatusException statusException = assertInstanceOf(ResponseStatusException.class, error);
					assertEquals(HttpStatus.FORBIDDEN, statusException.getStatusCode());
				})
				.verify();

		// Summary lookup should not happen after the ownership check fails.
		verify(dataServiceClient, never()).listSummaries("book-1");
	}

	/**
	 * Creates a minimal ready book for ownership-related test cases.
	 */
	private Book book(String bookId, String userId, String documentId) {
		Book book = new Book();
		book.setId(bookId);
		book.setUserId(userId);
		book.setAiDocumentId(documentId);
		book.setTitle("oop.pdf");
		book.setStatus("READY");
		return book;
	}
}