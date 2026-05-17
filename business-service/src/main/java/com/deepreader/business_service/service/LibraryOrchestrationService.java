package com.deepreader.business_service.service;

import com.deepreader.business_service.client.AiServiceClient;
import com.deepreader.business_service.client.DataServiceClient;
import com.deepreader.business_service.model.BookFlashcardCommand;
import com.deepreader.business_service.model.BookQueryRequest;
import com.deepreader.business_service.model.BookSummaryCommand;
import com.deepreader.business_service.model.BookUploadResponse;
import com.deepreader.business_service.event.BookEventPublisher;
import com.deepreader.core.model.Book;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Locale;

@Service
public class LibraryOrchestrationService {

	private final AiServiceClient aiServiceClient;
	private final DataServiceClient dataServiceClient;
	private final BookEventPublisher bookEventPublisher;

	public LibraryOrchestrationService(AiServiceClient aiServiceClient,
			DataServiceClient dataServiceClient,
			BookEventPublisher bookEventPublisher) {
		this.aiServiceClient = aiServiceClient;
		this.dataServiceClient = dataServiceClient;
		this.bookEventPublisher = bookEventPublisher;
	}

	public Mono<BookUploadResponse> uploadBook(String userId, FilePart filePart, String provider) {
		return filePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> aiServiceClient.uploadDocument(userId, provider, filePart.filename(), out.toByteArray()))
				.flatMap(upload -> {
					Book book = new Book();
					book.setUserId(userId);
					book.setAiDocumentId(upload.documentId());
					book.setTitle(upload.fileName());
					book.setStatus("READY");
					book.setTotalChapters(upload.sectionCount());
					book.setFormat(resolveFormat(upload.fileName()));
					book.setCreatedAt(LocalDateTime.now());
					return dataServiceClient.saveBook(book)
							.map(saved -> {
								bookEventPublisher.publish("BOOK_UPLOADED", userId, saved.getId(),
										Map.of("provider", provider == null ? "gemini" : provider,
												"chunkCount", upload.chunkCount()));
								return new BookUploadResponse(saved, provider == null ? "gemini" : provider, upload.documentId(), upload.sectionCount(), upload.chunkCount());
							});
				});
	}

	public Flux<Book> listBooks(String userId) {
		return dataServiceClient.listBooks(userId);
	}

	public Mono<Void> deleteBook(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot delete this book"));
					}

					return dataServiceClient.deleteBook(bookId)
							.doOnSuccess(ignored -> bookEventPublisher.publish("BOOK_DELETED",
									userId,
									bookId,
									Map.of("aiDocumentId", book.getAiDocumentId() == null ? "" : book.getAiDocumentId())));
				});
	}

	public Mono<AiServiceClient.AiDocumentContentResponse> getBookContent(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot read this book"));
					}

					if (book.getAiDocumentId() == null || book.getAiDocumentId().isBlank()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Indexed document not found"));
					}

					return aiServiceClient.getDocumentContent(userId, book.getAiDocumentId());
				});
	}

	public Mono<ResponseEntity<byte[]>> getBookSource(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot read this book"));
					}

					if (book.getAiDocumentId() == null || book.getAiDocumentId().isBlank()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Indexed document not found"));
					}

					return aiServiceClient.getDocumentSource(userId, book.getAiDocumentId());
				});
	}

	public Mono<AiServiceClient.AiSearchResponse> searchBook(String bookId, BookQueryRequest request) {
		return dataServiceClient.getBook(bookId)
				.flatMap(book -> aiServiceClient.search(book.getUserId(), request.query(), request.limit(), request.provider()));
	}

	public Mono<AiServiceClient.AiChatResponse> chatWithBook(String bookId, BookQueryRequest request) {
		return dataServiceClient.getBook(bookId)
				.flatMap(book -> aiServiceClient.chat(book.getUserId(), request.query(), request.limit(), request.provider())
						.flatMap(response -> {
							ChatHistory userMessage = new ChatHistory();
							userMessage.setBookId(bookId);
							userMessage.setUserId(book.getUserId());
							userMessage.setRole("user");
							userMessage.setContent(request.query());
							userMessage.setTimestamp(LocalDateTime.now());
							ChatHistory assistantMessage = new ChatHistory();
							assistantMessage.setBookId(bookId);
							assistantMessage.setUserId(book.getUserId());
							assistantMessage.setRole("assistant");
							assistantMessage.setContent(response.answer());
							assistantMessage.setTimestamp(LocalDateTime.now());
							return dataServiceClient.saveChat(userMessage)
									.then(dataServiceClient.saveChat(assistantMessage))
									.thenReturn(response);
						}));
	}

	public Mono<AiServiceClient.AiSummaryResponse> summarizeBook(String bookId, BookSummaryCommand command) {
		return dataServiceClient.getBook(bookId)
				.flatMap(book -> aiServiceClient.summarize(book.getUserId(), book.getAiDocumentId(), command.provider())
						.flatMap(summary -> {
							ChapterSummary entity = new ChapterSummary();
							entity.setBookId(bookId);
							entity.setChapterId(bookId + ":full-summary");
							entity.setContent(summary.summary());
							entity.setModel(summary.provider());
							entity.setCreatedAt(LocalDateTime.now());
							return dataServiceClient.saveSummary(entity)
									.doOnSuccess(ignored -> bookEventPublisher.publish("BOOK_SUMMARIZED",
											book.getUserId(),
											bookId,
											Map.of("provider", summary.provider())))
									.thenReturn(summary);
						}));
	}

	public Mono<AiServiceClient.AiFlashcardResponse> generateFlashcards(String bookId, BookFlashcardCommand command) {
		return dataServiceClient.getBook(bookId)
				.flatMap(book -> aiServiceClient.flashcards(book.getUserId(), book.getAiDocumentId(), command.provider(), command.count())
						.flatMap(response -> dataServiceClient.saveFlashcards(response.flashcards().stream().map(card -> {
									Flashcard flashcard = new Flashcard();
									flashcard.setBookId(bookId);
									flashcard.setUserId(book.getUserId());
									flashcard.setQuestion(card.question());
									flashcard.setAnswer(card.answer());
									flashcard.setCreatedAt(LocalDateTime.now());
									return flashcard;
								}).toList())
								.then()
								.doOnSuccess(ignored -> bookEventPublisher.publish("FLASHCARDS_GENERATED",
										book.getUserId(),
										bookId,
										Map.of("count", response.flashcards().size())))
								.thenReturn(response)));
	}

	public Flux<ChapterSummary> listSummaries(String bookId) {
		return dataServiceClient.listSummaries(bookId);
	}

	public Flux<Flashcard> listFlashcards(String bookId) {
		return dataServiceClient.listFlashcards(bookId);
	}

	public Flux<ChatHistory> listChats(String bookId) {
		return dataServiceClient.listChats(bookId);
	}

	private String resolveFormat(String fileName) {
		if (fileName == null) return "UNKNOWN";
		String lower = fileName.toLowerCase(Locale.ROOT);
		if (lower.endsWith(".pdf")) return "PDF";
		if (lower.endsWith(".epub")) return "EPUB";
		return "UNKNOWN";
	}
}
