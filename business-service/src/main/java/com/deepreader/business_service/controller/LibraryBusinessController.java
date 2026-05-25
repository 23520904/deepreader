package com.deepreader.business_service.controller;

import com.deepreader.business_service.client.AiServiceClient;
import com.deepreader.business_service.model.BookChatThreadDeleteCommand;
import com.deepreader.business_service.model.BookFlashcardCommand;
import com.deepreader.business_service.model.BookQueryRequest;
import com.deepreader.business_service.model.BookSummaryCommand;
import com.deepreader.business_service.model.BookUploadResponse;
import com.deepreader.business_service.service.LibraryOrchestrationService;
import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping(path = "/internal/business/v1/books", produces = MediaType.APPLICATION_JSON_VALUE)
public class LibraryBusinessController {

	private final LibraryOrchestrationService libraryOrchestrationService;

	public LibraryBusinessController(LibraryOrchestrationService libraryOrchestrationService) {
		this.libraryOrchestrationService = libraryOrchestrationService;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<BookUploadResponse> uploadBook(@RequestParam String userId,
			@RequestParam(required = false) String provider,
			@RequestPart("file") FilePart file) {
		return libraryOrchestrationService.uploadBook(userId, file, provider);
	}

	@GetMapping
	public Flux<Book> listBooks(@RequestParam(required = false) String userId) {
		return libraryOrchestrationService.listBooks(userId);
	}

	@DeleteMapping("/{bookId}")
	public Mono<ResponseEntity<Void>> deleteBook(@PathVariable String bookId, @RequestParam String userId) {
		return libraryOrchestrationService.deleteBook(userId, bookId)
				.thenReturn(ResponseEntity.noContent().build());
	}

	@GetMapping("/{bookId}/content")
	public Mono<AiServiceClient.AiDocumentContentResponse> getBookContent(@PathVariable String bookId, @RequestParam String userId) {
		return libraryOrchestrationService.getBookContent(userId, bookId);
	}

	@GetMapping(value = "/{bookId}/source", produces = {
			MediaType.APPLICATION_PDF_VALUE,
			MediaType.APPLICATION_OCTET_STREAM_VALUE,
			"application/epub+zip"
	})
	public Mono<ResponseEntity<byte[]>> getBookSource(@PathVariable String bookId, @RequestParam String userId) {
		return libraryOrchestrationService.getBookSource(userId, bookId);
	}

	@PostMapping(value = "/{bookId}/search", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiSearchResponse> search(@PathVariable String bookId, @RequestParam String userId, @Valid @RequestBody BookQueryRequest request) {
		return libraryOrchestrationService.searchBook(userId, bookId, request);
	}

	@PostMapping(value = "/{bookId}/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiChatResponse> chat(@PathVariable String bookId, @RequestParam String userId, @Valid @RequestBody BookQueryRequest request) {
		return libraryOrchestrationService.chatWithBook(userId, bookId, request);
	}

	@PostMapping(value = "/{bookId}/summary", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiSummaryResponse> summary(@PathVariable String bookId, @RequestParam String userId, @Valid @RequestBody BookSummaryCommand command) {
		return libraryOrchestrationService.summarizeBook(userId, bookId, command);
	}

	@PostMapping(value = "/{bookId}/flashcards", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiFlashcardResponse> flashcards(@PathVariable String bookId, @RequestParam String userId, @Valid @RequestBody BookFlashcardCommand command) {
		return libraryOrchestrationService.generateFlashcards(userId, bookId, command);
	}

	@GetMapping("/{bookId}/summaries")
	public Flux<ChapterSummary> listSummaries(@PathVariable String bookId, @RequestParam String userId) { return libraryOrchestrationService.listSummaries(userId, bookId); }

	@GetMapping("/{bookId}/flashcards")
	public Flux<Flashcard> listFlashcards(@PathVariable String bookId, @RequestParam String userId) { return libraryOrchestrationService.listFlashcards(userId, bookId); }

	@GetMapping("/{bookId}/chats")
	public Flux<ChatHistory> listChats(@PathVariable String bookId, @RequestParam String userId) { return libraryOrchestrationService.listChats(userId, bookId); }

	@PostMapping(value = "/{bookId}/chat-threads/delete", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<ResponseEntity<Void>> deleteChatThread(
			@PathVariable String bookId,
			@RequestParam String userId,
			@RequestBody BookChatThreadDeleteCommand command
	) {
		return libraryOrchestrationService.deleteChatThread(userId, bookId, command)
				.thenReturn(ResponseEntity.noContent().build());
	}

	@ExceptionHandler(WebClientResponseException.class)
	public ResponseEntity<Map<String, String>> handleUpstreamWebClientError(WebClientResponseException ex) {
		String responseBody = ex.getResponseBodyAsString();
		String message = StringUtils.hasText(responseBody) ? responseBody : ex.getMessage();
		HttpStatus status = ex.getStatusCode().is2xxSuccessful()
				? HttpStatus.BAD_GATEWAY
				: HttpStatus.valueOf(ex.getStatusCode().value());

		return ResponseEntity.status(status).body(Map.of("error", message));
	}
}
