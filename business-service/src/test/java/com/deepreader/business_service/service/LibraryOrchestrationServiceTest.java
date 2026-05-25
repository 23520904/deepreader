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

class LibraryOrchestrationServiceTest {

	private final AiServiceClient aiServiceClient = mock(AiServiceClient.class);
	private final DataServiceClient dataServiceClient = mock(DataServiceClient.class);
	private final BookEventPublisher bookEventPublisher = mock(BookEventPublisher.class);
	private final LibraryOrchestrationService service = new LibraryOrchestrationService(
			aiServiceClient,
			dataServiceClient,
			bookEventPublisher
	);

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

		verify(aiServiceClient, never()).chat(eq("intruder-1"), eq("doc-1"), eq("What is this about?"), eq(5), isNull());
	}

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

		verify(aiServiceClient).search("owner-1", "doc-1", "What is this about?", 5, null);
	}

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

		verify(dataServiceClient, never()).listSummaries("book-1");
	}

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
