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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/upload").queryParam("userId", userId).queryParamIfPresent("provider", java.util.Optional.ofNullable(provider)).build())
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(BookUploadResponse.class);
	}

	public Flux<Book> listBooks(String userId) {
		return webClient.get().uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books").queryParamIfPresent("userId", java.util.Optional.ofNullable(userId)).build()).retrieve().bodyToFlux(Book.class);
	}

	public Mono<Void> deleteBook(String userId, String bookId) {
		return webClient.delete()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToMono(Void.class);
	}

	public Mono<AiServiceClient.AiDocumentContentResponse> getBookContent(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/content")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToMono(AiServiceClient.AiDocumentContentResponse.class);
	}

	public Mono<ResponseEntity<byte[]>> getBookSource(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/source")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.toEntity(byte[].class);
	}

	public Mono<AiServiceClient.AiSearchResponse> search(String userId, String bookId, BookQueryRequest request) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/search")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(AiServiceClient.AiSearchResponse.class);
	}

	public Mono<AiServiceClient.AiChatResponse> chat(String userId, String bookId, BookQueryRequest request) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/chat")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(request)
				.retrieve()
				.bodyToMono(AiServiceClient.AiChatResponse.class);
	}

	public Mono<AiServiceClient.AiSummaryResponse> summary(String userId, String bookId, BookSummaryCommand command) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/summary")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(command)
				.retrieve()
				.bodyToMono(AiServiceClient.AiSummaryResponse.class);
	}

	public Mono<AiServiceClient.AiFlashcardResponse> flashcards(String userId, String bookId, BookFlashcardCommand command) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/flashcards")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(command)
				.retrieve()
				.bodyToMono(AiServiceClient.AiFlashcardResponse.class);
	}

	public Flux<ChapterSummary> listSummaries(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/summaries")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToFlux(ChapterSummary.class);
	}

	public Flux<Flashcard> listFlashcards(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/flashcards")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToFlux(Flashcard.class);
	}

	public Flux<ChatHistory> listChats(String userId, String bookId) {
		return webClient.get()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/chats")
						.queryParam("userId", userId)
						.build(bookId))
				.retrieve()
				.bodyToFlux(ChatHistory.class);
	}
	public Mono<Void> deleteChatThread(String userId, String bookId, BookChatThreadDeleteCommand command) {
		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/business/v1/books/{bookId}/chat-threads/delete")
						.queryParam("userId", userId)
						.build(bookId))
				.bodyValue(command)
				.retrieve()
				.bodyToMono(Void.class);
	}

	public Mono<java.util.Map> analyzeImage(String userId, String provider, String prompt, byte[] content, String mimeType) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
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
				.bodyToMono(java.util.Map.class);
	}

	public Mono<java.util.Map> analyzePdf(String userId, String provider, String prompt, String fileName, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
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
				.bodyToMono(java.util.Map.class);
	}
}
