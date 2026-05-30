package com.deepreader.business_service.client;

import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import com.deepreader.business_service.model.BookChatThreadDeleteCommand;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Client used by the business service to call internal data service APIs.
 *
 * <p>This class centralizes all data-service HTTP calls for books, summaries,
 * flashcards, chat history, and reading sessions.
 */
@Component
public class DataServiceClient {

	private final WebClient webClient;

	/**
	 * Creates a WebClient with the configured data service base URL.
	 *
	 * <p>The default localhost URL supports local development when no external
	 * data-service URL is configured.
	 */
	public DataServiceClient(WebClient.Builder builder, @Value("${services.data-service.base-url:http://localhost:8081}") String baseUrl) {
		this.webClient = builder.baseUrl(baseUrl).build();
	}

	/**
	 * Saves a book through the data service.
	 *
	 * <p>The saved Book returned by the service may include generated or updated
	 * fields such as IDs, timestamps, or normalized metadata.
	 */
	public Mono<Book> saveBook(Book book) {
		return webClient.post().uri("/internal/data/v1/books").bodyValue(book).retrieve().bodyToMono(Book.class);
	}

	/**
	 * Lists books, optionally filtered by user ID.
	 *
	 * <p>The userId query parameter is only included when it is provided, so the
	 * data service can decide how to handle unfiltered requests.
	 */
	public Flux<Book> listBooks(String userId) {
		return webClient.get().uri(uriBuilder -> uriBuilder.path("/internal/data/v1/books").queryParamIfPresent("userId", java.util.Optional.ofNullable(userId)).build()).retrieve().bodyToFlux(Book.class);
	}

	/**
	 * Gets a single book by its ID.
	 */
	public Mono<Book> getBook(String bookId) {
		return webClient.get().uri("/internal/data/v1/books/{bookId}", bookId).retrieve().bodyToMono(Book.class);
	}

	/**
	 * Deletes a book by its ID.
	 *
	 * <p>The data service owns the actual delete behavior, including any related
	 * cleanup for records connected to the book.
	 */
	public Mono<Void> deleteBook(String bookId) {
		return webClient.delete().uri("/internal/data/v1/books/{bookId}", bookId).retrieve().bodyToMono(Void.class);
	}

	/**
	 * Saves a chapter summary for a book.
	 *
	 * <p>The returned summary may contain data assigned by the data service,
	 * such as an ID or persisted timestamps.
	 */
	public Mono<ChapterSummary> saveSummary(ChapterSummary summary) {
		return webClient.post().uri("/internal/data/v1/summaries").bodyValue(summary).retrieve().bodyToMono(ChapterSummary.class);
	}

	/**
	 * Lists all summaries for a specific book.
	 */
	public Flux<ChapterSummary> listSummaries(String bookId) {
		return webClient.get().uri("/internal/data/v1/books/{bookId}/summaries", bookId).retrieve().bodyToFlux(ChapterSummary.class);
	}

	/**
	 * Saves a single flashcard.
	 */
	public Mono<Flashcard> saveFlashcard(Flashcard flashcard) {
		return webClient.post().uri("/internal/data/v1/flashcards").bodyValue(flashcard).retrieve().bodyToMono(Flashcard.class);
	}

	/**
	 * Saves multiple flashcards by sending each card through the single-card API.
	 *
	 * <p>This keeps batch behavior simple and reuses the same persistence flow
	 * used when saving one flashcard.
	 */
	public Flux<Flashcard> saveFlashcards(List<Flashcard> flashcards) {
		return Flux.fromIterable(flashcards).flatMap(this::saveFlashcard);
	}

	/**
	 * Lists all visible flashcards for a specific book.
	 */
	public Flux<Flashcard> listFlashcards(String bookId) {
		return webClient.get().uri("/internal/data/v1/books/{bookId}/flashcards", bookId).retrieve().bodyToFlux(Flashcard.class);
	}

	/**
	 * Saves one chat history entry for a book conversation.
	 */
	public Mono<ChatHistory> saveChat(ChatHistory chatHistory) {
		return webClient.post().uri("/internal/data/v1/chats").bodyValue(chatHistory).retrieve().bodyToMono(ChatHistory.class);
	}

	/**
	 * Lists chat history entries for a specific book.
	 */
	public Flux<ChatHistory> listChats(String bookId) {
		return webClient.get().uri("/internal/data/v1/books/{bookId}/chats", bookId).retrieve().bodyToFlux(ChatHistory.class);
	}

	/**
	 * Deletes a chat thread for a book.
	 *
	 * <p>The command object lets the data service decide exactly which thread or
	 * messages should be removed.
	 */
	public Mono<Void> deleteChatThread(String bookId, BookChatThreadDeleteCommand command) {
		return webClient.post()
				.uri("/internal/data/v1/books/{bookId}/chat-threads/delete", bookId)
				.bodyValue(command)
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Edits an existing flashcard.
	 *
	 * <p>The request is kept generic because the business service only forwards
	 * the edit payload to the data service.
	 */
	public Mono<Void> editFlashcard(String cardId, Object request) {
		return webClient.patch()
				.uri("/internal/data/v1/flashcards/{cardId}/edit", cardId)
				.bodyValue(request)
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Hides an existing flashcard without deleting it.
	 *
	 * <p>This supports soft-hide behavior so the card can be excluded from normal
	 * views while still remaining in storage if the data service keeps it.
	 */
	public Mono<Void> hideFlashcard(String cardId, Object request) {
		return webClient.patch()
				.uri("/internal/data/v1/flashcards/{cardId}/hide", cardId)
				.bodyValue(request)
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Adds reading time to a user's reading session for a specific book.
	 *
	 * <p>The values are sent as query parameters because this endpoint records a
	 * small activity update instead of persisting a full request object.
	 */
	public Mono<Void> addReadingSeconds(String userId, String bookId, int seconds) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/data/v1/reading-sessions/add-seconds")
						.queryParam("userId", userId)
						.queryParam("bookId", bookId)
						.queryParam("seconds", seconds)
						.build())
				.retrieve()
				.bodyToMono(Void.class);
	}
}