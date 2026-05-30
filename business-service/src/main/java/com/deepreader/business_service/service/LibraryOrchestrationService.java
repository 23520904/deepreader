package com.deepreader.business_service.service;

import com.deepreader.business_service.client.AiServiceClient;
import com.deepreader.business_service.client.DataServiceClient;
import com.deepreader.business_service.model.BookChatThreadDeleteCommand;
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
import java.util.UUID;

/**
 * Coordinates high-level library workflows across AI service, data service, and event publishing.
 *
 * <p>This service is the main orchestration layer for book upload, content access,
 * search, chat, summaries, flashcards, and reading progress.
 */
@Service
public class LibraryOrchestrationService {

	private static final String STUDY_PROVIDER = "groq";

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

	/**
	 * Uploads a book file, sends it to the AI service for ingestion, saves book metadata,
	 * and publishes a domain event after the book is persisted.
	 */
	public Mono<BookUploadResponse> uploadBook(String userId, FilePart filePart, String provider) {
		return filePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);

			// Release each data buffer after copying its bytes to avoid memory leaks.
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);

			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> aiServiceClient.uploadDocument(userId, null, filePart.filename(), out.toByteArray()))
				.flatMap(upload -> {
					// Keep the stored study provider consistent with the provider used by study features.
					String documentProvider = STUDY_PROVIDER;

					// Build the local book record from the AI ingestion result.
					Book book = new Book();
					book.setUserId(userId);
					book.setAiDocumentId(upload.documentId());
					book.setTitle(upload.fileName());
					book.setStatus("READY");
					book.setTotalChapters(upload.sectionCount());
					book.setFormat(resolveFormat(upload.fileName()));
					book.setProvider(documentProvider);
					book.setCreatedAt(LocalDateTime.now());

					return dataServiceClient.saveBook(book)
							.map(saved -> {
								// Publish only after saving so the event contains the real persisted book ID.
								bookEventPublisher.publish("BOOK_UPLOADED", userId, saved.getId(),
										Map.of("provider", documentProvider,
												"chunkCount", upload.chunkCount()));
								return new BookUploadResponse(saved, documentProvider, upload.documentId(), upload.sectionCount(), upload.chunkCount());
							});
				});
	}

	/**
	 * Lists books from the data service.
	 *
	 * <p>The optional userId filter is handled by the downstream data service.
	 */
	public Flux<Book> listBooks(String userId) {
		return dataServiceClient.listBooks(userId);
	}

	/**
	 * Deletes a book after verifying that the requesting user owns it.
	 *
	 * <p>This prevents one user from deleting another user's book and publishes
	 * a delete event after the data service finishes the delete operation.
	 */
	public Mono<Void> deleteBook(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					// Ownership check is required before any destructive action.
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot delete this book"));
					}

					return dataServiceClient.deleteBook(bookId)
							.doOnSuccess(ignored -> bookEventPublisher.publish("BOOK_DELETED",
									userId,
									bookId,
									// Use an empty string when aiDocumentId is missing so the event payload stays safe.
									Map.of("aiDocumentId", book.getAiDocumentId() == null ? "" : book.getAiDocumentId())));
				});
	}

	/**
	 * Gets parsed content for a book from the AI service.
	 *
	 * <p>The method validates ownership first, then checks whether the book has
	 * an indexed AI document before calling the AI service.
	 */
	public Mono<AiServiceClient.AiDocumentContentResponse> getBookContent(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot read this book"));
					}

					// Without an AI document ID, there is no indexed content to retrieve.
					if (book.getAiDocumentId() == null || book.getAiDocumentId().isBlank()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Indexed document not found"));
					}

					return aiServiceClient.getDocumentContent(userId, book.getAiDocumentId())
							.map(content -> new AiServiceClient.AiDocumentContentResponse(
									content.documentId(),
									content.fileName(),
									STUDY_PROVIDER,
									content.sections()
							));
				});
	}

	/**
	 * Downloads the original uploaded source file for a book.
	 *
	 * <p>Access is only allowed when the book belongs to the requesting user and
	 * the book has a linked AI document.
	 */
	public Mono<ResponseEntity<byte[]>> getBookSource(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot read this book"));
					}

					// The AI document ID points to the stored source file in the AI service.
					if (book.getAiDocumentId() == null || book.getAiDocumentId().isBlank()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Indexed document not found"));
					}

					return aiServiceClient.getDocumentSource(userId, book.getAiDocumentId());
				});
	}

	/**
	 * Searches inside a user's book using the AI service.
	 *
	 * <p>The shared ownership helper keeps authorization behavior consistent with
	 * other read and study operations.
	 */
	public Mono<AiServiceClient.AiSearchResponse> searchBook(String userId, String bookId, BookQueryRequest request) {
		return requireOwnedBook(userId, bookId)
				.flatMap(book -> {
					if (book.getAiDocumentId() == null || book.getAiDocumentId().isBlank()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Indexed document not found"));
					}

					return aiServiceClient.search(userId, book.getAiDocumentId(), request.query(), request.limit(), null);
				});
	}

	/**
	 * Sends a user's question to the AI service and saves the conversation history.
	 *
	 * <p>Both the user message and assistant response are stored under the same
	 * thread ID so the chat can be displayed later as one conversation.
	 */
	public Mono<AiServiceClient.AiChatResponse> chatWithBook(String userId, String bookId, BookQueryRequest request) {
		return requireOwnedBook(userId, bookId)
				.flatMap(book -> {
					if (book.getAiDocumentId() == null || book.getAiDocumentId().isBlank()) {
						return Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Indexed document not found"));
					}

					// Reuse an existing thread when provided, otherwise start a new chat thread.
					String threadId = normalizeThreadId(request.threadId());

					return aiServiceClient.chat(userId, book.getAiDocumentId(), request.query(), request.limit(), null)
						.flatMap(response -> {
							// Store the user's question as the first chat history entry.
							ChatHistory userMessage = new ChatHistory();
							userMessage.setBookId(bookId);
							userMessage.setUserId(userId);
							userMessage.setThreadId(threadId);
							userMessage.setRole("user");
							userMessage.setContent(request.query());
							userMessage.setTimestamp(LocalDateTime.now());

							// Store the AI answer as the assistant message in the same thread.
							ChatHistory assistantMessage = new ChatHistory();
							assistantMessage.setBookId(bookId);
							assistantMessage.setUserId(userId);
							assistantMessage.setThreadId(threadId);
							assistantMessage.setRole("assistant");
							assistantMessage.setContent(response.answer());
							assistantMessage.setTimestamp(LocalDateTime.now());

							return dataServiceClient.saveChat(userMessage)
									.then(dataServiceClient.saveChat(assistantMessage))
									.thenReturn(new AiServiceClient.AiChatResponse(response.query(), response.answer(), response.sources(), threadId));
						});
				});
	}

	/**
	 * Generates a book summary using the AI service and saves it in the data service.
	 *
	 * <p>The saved summary allows future requests to list summaries without having
	 * to regenerate the content every time.
	 */
	public Mono<AiServiceClient.AiSummaryResponse> summarizeBook(String userId, String bookId, BookSummaryCommand command) {
		return requireOwnedBook(userId, bookId)
				.flatMap(book -> aiServiceClient.summarize(userId, book.getAiDocumentId(), null)
						.flatMap(summary -> {
							// Store the full-book summary as a synthetic chapter summary record.
							ChapterSummary entity = new ChapterSummary();
							entity.setBookId(bookId);
							entity.setChapterId(bookId + ":full-summary");
							entity.setContent(summary.summary());
							entity.setModel(summary.provider());
							entity.setCreatedAt(LocalDateTime.now());

							return dataServiceClient.saveSummary(entity)
									.doOnSuccess(ignored -> bookEventPublisher.publish("BOOK_SUMMARIZED",
											userId,
											bookId,
											Map.of("provider", summary.provider())))
									.thenReturn(summary);
						}));
	}

	/**
	 * Generates flashcards from a book and persists each generated card.
	 *
	 * <p>The AI service returns lightweight card content, then this service maps
	 * each item to the core Flashcard model before saving it.
	 */
	public Mono<AiServiceClient.AiFlashcardResponse> generateFlashcards(String userId, String bookId, BookFlashcardCommand command) {
		return requireOwnedBook(userId, bookId)
				.flatMap(book -> aiServiceClient.flashcards(userId, book.getAiDocumentId(), null, command.count(), command.language(), command.type(), command.scope())
						.flatMap(response -> dataServiceClient.saveFlashcards(response.flashcards().stream().map(card -> {
									Flashcard flashcard = new Flashcard();
									flashcard.setBookId(bookId);
									flashcard.setUserId(userId);
									flashcard.setQuestion(card.question());
									flashcard.setAnswer(card.answer());
									flashcard.setCreatedAt(LocalDateTime.now());
									return flashcard;
								}).toList())
								.then()
								.doOnSuccess(ignored -> bookEventPublisher.publish("FLASHCARDS_GENERATED",
										userId,
										bookId,
										Map.of("count", response.flashcards().size())))
								.thenReturn(response)));
	}

	/**
	 * Forwards a flashcard edit request to the data service.
	 */
	public Mono<Void> editFlashcard(String userId, String cardId, Object request) {
		return dataServiceClient.editFlashcard(cardId, request);
	}

	/**
	 * Forwards a flashcard hide request to the data service.
	 */
	public Mono<Void> hideFlashcard(String userId, String cardId, Object request) {
		return dataServiceClient.hideFlashcard(cardId, request);
	}

	/**
	 * Adds reading time for a user and book.
	 */
	public Mono<Void> addReadingSeconds(String userId, String bookId, int seconds) {
		return dataServiceClient.addReadingSeconds(userId, bookId, seconds);
	}

	/**
	 * Lists saved summaries after confirming the book belongs to the user.
	 */
	public Flux<ChapterSummary> listSummaries(String userId, String bookId) {
		return requireOwnedBook(userId, bookId).flatMapMany(book -> dataServiceClient.listSummaries(bookId));
	}

	/**
	 * Lists saved flashcards after confirming the book belongs to the user.
	 */
	public Flux<Flashcard> listFlashcards(String userId, String bookId) {
		return requireOwnedBook(userId, bookId).flatMapMany(book -> dataServiceClient.listFlashcards(bookId));
	}

	/**
	 * Lists saved chat messages after confirming the book belongs to the user.
	 */
	public Flux<ChatHistory> listChats(String userId, String bookId) {
		return requireOwnedBook(userId, bookId).flatMapMany(book -> dataServiceClient.listChats(bookId));
	}

	/**
	 * Deletes a chat thread after validating that the user owns the book.
	 */
	public Mono<Void> deleteChatThread(String userId, String bookId, BookChatThreadDeleteCommand command) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot edit this book"));
					}

					return dataServiceClient.deleteChatThread(bookId, command);
				});
	}

	/**
	 * Resolves the stored book format from the uploaded filename.
	 *
	 * <p>Unknown is used as a safe fallback when the filename is missing or the
	 * extension is not one of the supported formats.
	 */
	private String resolveFormat(String fileName) {
		if (fileName == null) return "UNKNOWN";
		String lower = fileName.toLowerCase(Locale.ROOT);
		if (lower.endsWith(".pdf")) return "PDF";
		if (lower.endsWith(".epub")) return "EPUB";
		return "UNKNOWN";
	}

	/**
	 * Normalizes the chat thread ID.
	 *
	 * <p>An existing non-blank thread ID is reused. Otherwise, a new UUID is
	 * generated so new conversations always have a stable thread identifier.
	 */
	private String normalizeThreadId(String threadId) {
		if (threadId != null && !threadId.isBlank()) {
			return threadId.trim();
		}

		return UUID.randomUUID().toString();
	}

	/**
	 * Loads a book and verifies that it belongs to the requesting user.
	 *
	 * <p>This helper keeps ownership validation consistent for operations that
	 * read book-related data or call AI features.
	 */
	private Mono<Book> requireOwnedBook(String userId, String bookId) {
		return dataServiceClient.getBook(bookId)
				.switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Book not found")))
				.flatMap(book -> {
					if (!userId.equals(book.getUserId())) {
						return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this book"));
					}
					return Mono.just(book);
				});
	}
}