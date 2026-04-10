package com.deepreader.business_service.client;

import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
public class DataServiceClient {

	private final WebClient webClient;

	public DataServiceClient(WebClient.Builder builder, @Value("${services.data-service.base-url:http://localhost:8081}") String baseUrl) {
		this.webClient = builder.baseUrl(baseUrl).build();
	}

	public Mono<Book> saveBook(Book book) {
		return webClient.post().uri("/api/data/books").bodyValue(book).retrieve().bodyToMono(Book.class);
	}

	public Flux<Book> listBooks(String userId) {
		return webClient.get().uri(uriBuilder -> uriBuilder.path("/api/data/books").queryParamIfPresent("userId", java.util.Optional.ofNullable(userId)).build()).retrieve().bodyToFlux(Book.class);
	}

	public Mono<Book> getBook(String bookId) {
		return webClient.get().uri("/api/data/books/{bookId}", bookId).retrieve().bodyToMono(Book.class);
	}

	public Mono<ChapterSummary> saveSummary(ChapterSummary summary) {
		return webClient.post().uri("/api/data/summaries").bodyValue(summary).retrieve().bodyToMono(ChapterSummary.class);
	}

	public Flux<ChapterSummary> listSummaries(String bookId) {
		return webClient.get().uri("/api/data/books/{bookId}/summaries", bookId).retrieve().bodyToFlux(ChapterSummary.class);
	}

	public Mono<Flashcard> saveFlashcard(Flashcard flashcard) {
		return webClient.post().uri("/api/data/flashcards").bodyValue(flashcard).retrieve().bodyToMono(Flashcard.class);
	}

	public Flux<Flashcard> saveFlashcards(List<Flashcard> flashcards) {
		return Flux.fromIterable(flashcards).flatMap(this::saveFlashcard);
	}

	public Flux<Flashcard> listFlashcards(String bookId) {
		return webClient.get().uri("/api/data/books/{bookId}/flashcards", bookId).retrieve().bodyToFlux(Flashcard.class);
	}

	public Mono<ChatHistory> saveChat(ChatHistory chatHistory) {
		return webClient.post().uri("/api/data/chats").bodyValue(chatHistory).retrieve().bodyToMono(ChatHistory.class);
	}

	public Flux<ChatHistory> listChats(String bookId) {
		return webClient.get().uri("/api/data/books/{bookId}/chats", bookId).retrieve().bodyToFlux(ChatHistory.class);
	}
}