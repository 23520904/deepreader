package com.deepreader.web_module.client;

import com.deepreader.business_service.model.BookFlashcardCommand;
import com.deepreader.business_service.model.BookQueryRequest;
import com.deepreader.business_service.model.BookSummaryCommand;
import com.deepreader.business_service.model.BookUploadResponse;
import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class BusinessServiceClient {

	private final WebClient webClient;

	public BusinessServiceClient(WebClient.Builder builder, @Value("${services.business-service.base-url:http://localhost:8082}") String baseUrl) {
		this.webClient = builder.baseUrl(baseUrl).build();
	}

	public Mono<BookUploadResponse> upload(String userId, String provider, String filename, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
		bodyBuilder.part("file", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return filename;
			}
		}).contentType(MediaType.APPLICATION_OCTET_STREAM);
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/api/business/books/upload").queryParam("userId", userId).queryParamIfPresent("provider", java.util.Optional.ofNullable(provider)).build())
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(BookUploadResponse.class);
	}

	public Flux<Book> listBooks(String userId) {
		return webClient.get().uri(uriBuilder -> uriBuilder.path("/api/business/books").queryParamIfPresent("userId", java.util.Optional.ofNullable(userId)).build()).retrieve().bodyToFlux(Book.class);
	}

	public Mono<String> search(String bookId, BookQueryRequest request) {
		return webClient.post().uri("/api/business/books/{bookId}/search", bookId).bodyValue(request).retrieve().bodyToMono(String.class);
	}

	public Mono<String> chat(String bookId, BookQueryRequest request) {
		return webClient.post().uri("/api/business/books/{bookId}/chat", bookId).bodyValue(request).retrieve().bodyToMono(String.class);
	}

	public Mono<String> summary(String bookId, BookSummaryCommand command) {
		return webClient.post().uri("/api/business/books/{bookId}/summary", bookId).bodyValue(command).retrieve().bodyToMono(String.class);
	}

	public Mono<String> flashcards(String bookId, BookFlashcardCommand command) {
		return webClient.post().uri("/api/business/books/{bookId}/flashcards", bookId).bodyValue(command).retrieve().bodyToMono(String.class);
	}

	public Flux<ChapterSummary> listSummaries(String bookId) { return webClient.get().uri("/api/business/books/{bookId}/summaries", bookId).retrieve().bodyToFlux(ChapterSummary.class); }
	public Flux<Flashcard> listFlashcards(String bookId) { return webClient.get().uri("/api/business/books/{bookId}/flashcards", bookId).retrieve().bodyToFlux(Flashcard.class); }
	public Flux<ChatHistory> listChats(String bookId) { return webClient.get().uri("/api/business/books/{bookId}/chats", bookId).retrieve().bodyToFlux(ChatHistory.class); }
}