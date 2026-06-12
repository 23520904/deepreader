package com.deepreader.web_module.client;

import com.deepreader.business_service.model.BookFlashcardCommand;
import com.deepreader.business_service.model.BookQueryRequest;
import com.deepreader.business_service.model.BookSummaryCommand;
import com.deepreader.business_service.model.BookUploadResponse;
import com.deepreader.business_service.model.BookChatThreadDeleteCommand;
import com.deepreader.business_service.client.AiServiceClient;
import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Client used by the web module to call internal business-service APIs.
 *
 * <p>This keeps endpoint paths and WebClient request details out of web controllers.
 */
@Component
public class BusinessServiceClient {

	private final WebClient webClient;

	/**
	 * Creates a WebClient configured with the business service base URL.
	 *
	 * <p>The default localhost URL is useful for local development.
	 */
	public BusinessServiceClient(WebClient.Builder builder, @Value("${services.business-service.base-url:http://localhost:8082}") String baseUrl) {
		this.webClient = builder.baseUrl(baseUrl).build();
	}

	/**
	 * Uploads a book file to the business service.
	 *
	 * <p>The file is sent as multipart data because the business service needs
	 * the original bytes and filename for ingestion.
	 */
	public Mono<BookUploadResponse> upload(String userId, String provider, String filename, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

		// ByteArrayResource is used because the uploaded file is already available in memory.
		bodyBuilder.part("file", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return filename;
			}
		}).contentType(MediaType.APPLICATION_OCTET_STREAM);

		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/upload").queryParam("userId", userId).queryParamIfPresent("provider", java.util.Optional.ofNullable(provider)).build())
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(BookUploadResponse.class);
	}

	/**
	 * Lists books, optionally filtered by user ID.
	 */
	public Flux<Book> listBooks(String userId) {
		return webClient.get().uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books").queryParamIfPresent("userId", java.util.Optional.ofNullable(userId)).build()).retrieve().bodyToFlux(Book.class);
	}

	/**
	 * Deletes a book for the current user.
	 */
	public Mono<Void> deleteBook(String userId, String bookId) {
		return webClient.delete()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Gets parsed book content from the business service.
	 */
	public Mono<AiServiceClient.AiDocumentContentResponse> getBookContent(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/content")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToMono(AiServiceClient.AiDocumentContentResponse.class);
	}

	/**
	 * Downloads the original source file for a book.
	 *
	 * <p>ResponseEntity is kept so callers can preserve response headers and file bytes.
	 */
	public Mono<ResponseEntity<byte[]>> getBookSource(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/source")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.toEntity(byte[].class);
	}

	/**
	 * Searches inside a book using a query request.
	 */
	public Mono<AiServiceClient.AiSearchResponse> search(String userId, String bookId, BookQueryRequest request) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/search")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(AiServiceClient.AiSearchResponse.class);
	}

	/**
	 * Sends a chat question about a book to the business service.
	 */
	public Mono<AiServiceClient.AiChatResponse> chat(String userId, String bookId, BookQueryRequest request) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/chat")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(AiServiceClient.AiChatResponse.class);
	}

	/**
	 * Requests a summary for a book.
	 */
	public Mono<AiServiceClient.AiSummaryResponse> summary(String userId, String bookId, BookSummaryCommand command) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/summary")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(command)
				.retrieve()
				.bodyToMono(AiServiceClient.AiSummaryResponse.class);
	}

	/**
	 * Requests flashcard generation for a book.
	 */
	public Mono<AiServiceClient.AiFlashcardResponse> flashcards(String userId, String bookId, BookFlashcardCommand command) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/flashcards")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(command)
				.retrieve()
				.bodyToMono(AiServiceClient.AiFlashcardResponse.class);
	}

	/**
	 * Lists saved summaries for a book.
	 */
	public Flux<ChapterSummary> listSummaries(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/summaries")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToFlux(ChapterSummary.class);
	}

	/**
	 * Lists saved flashcards for a book.
	 */
	public Flux<Flashcard> listFlashcards(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/flashcards")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToFlux(Flashcard.class);
	}

	/**
	 * Lists saved chat history for a book.
	 */
	public Flux<ChatHistory> listChats(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/chats")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToFlux(ChatHistory.class);
	}

	/**
	 * Deletes a chat thread or selected messages from a book conversation.
	 */
	public Mono<Void> deleteChatThread(String userId, String bookId, BookChatThreadDeleteCommand command) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/chat-threads/delete")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(command)
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Sends an image to the business-service vision endpoint for analysis.
	 *
	 * <p>Prompt and provider are optional so the caller can customize the request
	 * only when needed.
	 */
	public Mono<Map<String, Object>> analyzeImage(String userId, String provider, String prompt, byte[] content, String mimeType) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

		// Multipart requires a filename even when the image is represented only as bytes.
		bodyBuilder.part("image", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return "image"; // Dummy filename for multipart
			}
		}).header("Content-Type", mimeType);

		if (prompt != null) {
			bodyBuilder.part("prompt", prompt);
		}
		if (provider != null) {
			bodyBuilder.part("provider", provider);
		}

		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/vision/analyze")
						.queryParam("userId", userId)
						.queryParamIfPresent("provider", java.util.Optional.ofNullable(provider))
						.build())
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
	}

	/**
	 * Sends a PDF file to the business-service vision PDF analysis endpoint.
	 */
	public Mono<Map<String, Object>> analyzePdf(String userId, String provider, String prompt, String fileName, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

		// Use a safe fallback name when the caller does not provide a valid filename.
		String safeName = (fileName != null && !fileName.isBlank()) ? fileName : "document.pdf";

		bodyBuilder.part("file", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return safeName;
			}
		}).contentType(MediaType.APPLICATION_PDF);

		if (prompt != null) {
			bodyBuilder.part("prompt", prompt);
		}
		if (provider != null) {
			bodyBuilder.part("provider", provider);
		}

		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/vision/analyze-pdf")
						.queryParam("userId", userId)
						.queryParamIfPresent("provider", java.util.Optional.ofNullable(provider))
						.build())
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
	}

	/**
	 * Sends a flashcard edit request to the business service.
	 */
	public Mono<Void> editFlashcard(String userId, String cardId, Object request) {
		return webClient.patch()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/flashcards/{cardId}/edit")
						.queryParam("userId", userId)
						.build(cardId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Sends a flashcard hide request to the business service.
	 *
	 * <p>This supports soft hiding instead of deleting the flashcard.
	 */
	public Mono<Void> hideFlashcard(String userId, String cardId, Object request) {
		return webClient.patch()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/flashcards/{cardId}/hide")
						.queryParam("userId", userId)
						.build(cardId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(Void.class);
	}

	/**
	 * Adds reading time for a user and book.
	 */
	public Mono<Void> addReadingSeconds(String userId, String bookId, int seconds) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/reading-sessions/add-seconds")
						.queryParam("userId", userId)
						.queryParam("bookId", bookId)
						.queryParam("seconds", seconds)
						.build())
				.retrieve()
				.bodyToMono(Void.class);
	}
}