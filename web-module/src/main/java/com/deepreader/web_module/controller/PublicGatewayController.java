package com.deepreader.web_module.controller;

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
import com.deepreader.web_module.client.BusinessServiceClient;
import com.deepreader.web_module.service.RequestUserContext;
import com.deepreader.web_module.service.UserAccountService;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping(path = "/api/v1/books", produces = MediaType.APPLICATION_JSON_VALUE)
public class PublicGatewayController {

	private final BusinessServiceClient businessServiceClient;
	private final UserAccountService userAccountService;

	public PublicGatewayController(BusinessServiceClient businessServiceClient,
			UserAccountService userAccountService) {
		this.businessServiceClient = businessServiceClient;
		this.userAccountService = userAccountService;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<BookUploadResponse> upload(@RequestParam(required = false) String provider,
			ServerWebExchange exchange,
			@RequestPart("file") FilePart filePart) {
		String userId = RequestUserContext.requireUserId(exchange);
		return filePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> businessServiceClient.upload(userId, provider, filePart.filename(), out.toByteArray()));
	}

	@GetMapping
	public Flux<Book> listBooks(ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.listBooks(userId);
	}

	@DeleteMapping("/{bookId}")
	public Mono<ResponseEntity<Void>> deleteBook(@PathVariable String bookId, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.deleteBook(userId, bookId)
				.thenReturn(ResponseEntity.noContent().build());
	}

	@GetMapping("/{bookId}/content")
	public Mono<AiServiceClient.AiDocumentContentResponse> getBookContent(@PathVariable String bookId, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.getBookContent(userId, bookId);
	}

	@GetMapping(value = "/{bookId}/source", produces = {
			MediaType.APPLICATION_PDF_VALUE,
			MediaType.APPLICATION_OCTET_STREAM_VALUE,
			"application/epub+zip"
	})
	public Mono<ResponseEntity<byte[]>> getBookSource(@PathVariable String bookId, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.getBookSource(userId, bookId);
	}

	@GetMapping("/admin-library")
	public Flux<Book> listAdminBooks(ServerWebExchange exchange) {
		RequestUserContext.requireAdmin(exchange);
		return Flux.fromIterable(userAccountService.findAdminUserIds())
				.flatMap(businessServiceClient::listBooks);
	}

	@PostMapping(value = "/{bookId}/search", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiSearchResponse> search(@PathVariable String bookId, @RequestBody BookQueryRequest request) { return businessServiceClient.search(bookId, request); }

	@PostMapping(value = "/{bookId}/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiChatResponse> chat(@PathVariable String bookId, @RequestBody BookQueryRequest request) { return businessServiceClient.chat(bookId, request); }

	@PostMapping(value = "/{bookId}/summary", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiSummaryResponse> summary(@PathVariable String bookId, @RequestBody BookSummaryCommand command) { return businessServiceClient.summary(bookId, command); }

	@PostMapping(value = "/{bookId}/flashcards", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<AiServiceClient.AiFlashcardResponse> flashcards(@PathVariable String bookId, @RequestBody BookFlashcardCommand command) { return businessServiceClient.flashcards(bookId, command); }

	@GetMapping("/{bookId}/summaries")
	public Flux<ChapterSummary> listSummaries(@PathVariable String bookId) { return businessServiceClient.listSummaries(bookId); }

	@GetMapping("/{bookId}/flashcards")
	public Flux<Flashcard> listFlashcards(@PathVariable String bookId) { return businessServiceClient.listFlashcards(bookId); }

	@GetMapping("/{bookId}/chats")
	public Flux<ChatHistory> listChats(@PathVariable String bookId) { return businessServiceClient.listChats(bookId); }

	@PostMapping(value = "/{bookId}/chat-threads/delete", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<ResponseEntity<Void>> deleteChatThread(
			@PathVariable String bookId,
			@RequestBody BookChatThreadDeleteCommand command,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.deleteChatThread(userId, bookId, command)
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
