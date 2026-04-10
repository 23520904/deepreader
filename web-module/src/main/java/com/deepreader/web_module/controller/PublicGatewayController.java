package com.deepreader.web_module.controller;

import com.deepreader.business_service.model.BookFlashcardCommand;
import com.deepreader.business_service.model.BookQueryRequest;
import com.deepreader.business_service.model.BookSummaryCommand;
import com.deepreader.business_service.model.BookUploadResponse;
import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import com.deepreader.web_module.client.BusinessServiceClient;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/web/books", produces = MediaType.APPLICATION_JSON_VALUE)
public class PublicGatewayController {

	private final BusinessServiceClient businessServiceClient;

	public PublicGatewayController(BusinessServiceClient businessServiceClient) {
		this.businessServiceClient = businessServiceClient;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<BookUploadResponse> upload(@RequestParam String userId,
			@RequestParam(required = false) String provider,
			@RequestPart("file") FilePart filePart) {
		return filePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> businessServiceClient.upload(userId, provider, filePart.filename(), out.toByteArray()));
	}

	@GetMapping
	public Flux<Book> listBooks(@RequestParam(required = false) String userId) {
		return businessServiceClient.listBooks(userId);
	}

	@PostMapping(value = "/{bookId}/search", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<String> search(@PathVariable String bookId, @RequestBody BookQueryRequest request) { return businessServiceClient.search(bookId, request); }

	@PostMapping(value = "/{bookId}/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<String> chat(@PathVariable String bookId, @RequestBody BookQueryRequest request) { return businessServiceClient.chat(bookId, request); }

	@PostMapping(value = "/{bookId}/summary", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<String> summary(@PathVariable String bookId, @RequestBody BookSummaryCommand command) { return businessServiceClient.summary(bookId, command); }

	@PostMapping(value = "/{bookId}/flashcards", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<String> flashcards(@PathVariable String bookId, @RequestBody BookFlashcardCommand command) { return businessServiceClient.flashcards(bookId, command); }

	@GetMapping("/{bookId}/summaries")
	public Flux<ChapterSummary> listSummaries(@PathVariable String bookId) { return businessServiceClient.listSummaries(bookId); }

	@GetMapping("/{bookId}/flashcards")
	public Flux<Flashcard> listFlashcards(@PathVariable String bookId) { return businessServiceClient.listFlashcards(bookId); }

	@GetMapping("/{bookId}/chats")
	public Flux<ChatHistory> listChats(@PathVariable String bookId) { return businessServiceClient.listChats(bookId); }
}