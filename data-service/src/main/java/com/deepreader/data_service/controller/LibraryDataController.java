package com.deepreader.data_service.controller;

import com.deepreader.core.model.Book;
import com.deepreader.core.model.Chapter;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import com.deepreader.core.model.ReadingSession;
import com.deepreader.core.model.User;
import com.deepreader.data_service.service.LibraryDataService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping(path = "/internal/data/v1", produces = MediaType.APPLICATION_JSON_VALUE)
public class LibraryDataController {

	private final LibraryDataService libraryDataService;

	public LibraryDataController(LibraryDataService libraryDataService) {
		this.libraryDataService = libraryDataService;
	}

	@PostMapping("/users")
	public Mono<User> saveUser(@RequestBody User user) { return libraryDataService.saveUser(user); }

	@GetMapping("/users")
	public Flux<User> listUsers() { return libraryDataService.findUsers(); }

	@PostMapping("/books")
	public Mono<Book> saveBook(@RequestBody Book book) { return libraryDataService.saveBook(book); }

	@GetMapping("/books")
	public Flux<Book> listBooks(@RequestParam(required = false) String userId) { return libraryDataService.findBooks(userId); }

	@GetMapping("/books/{bookId}")
	public Mono<Book> getBook(@PathVariable String bookId) { return libraryDataService.findBookById(bookId); }

	@DeleteMapping("/books/{bookId}")
	public Mono<ResponseEntity<Void>> deleteBook(@PathVariable String bookId) {
		return libraryDataService.deleteBookById(bookId)
				.thenReturn(ResponseEntity.noContent().build());
	}

	@PostMapping("/chapters")
	public Mono<Chapter> saveChapter(@RequestBody Chapter chapter) { return libraryDataService.saveChapter(chapter); }

	@GetMapping("/books/{bookId}/chapters")
	public Flux<Chapter> listChapters(@PathVariable String bookId) { return libraryDataService.findChaptersByBook(bookId); }

	@PostMapping("/summaries")
	public Mono<ChapterSummary> saveSummary(@RequestBody ChapterSummary summary) { return libraryDataService.saveSummary(summary); }

	@GetMapping("/books/{bookId}/summaries")
	public Flux<ChapterSummary> listSummaries(@PathVariable String bookId) { return libraryDataService.findSummariesByBook(bookId); }

	@PostMapping("/flashcards")
	public Mono<Flashcard> saveFlashcard(@RequestBody Flashcard flashcard) { return libraryDataService.saveFlashcard(flashcard); }

	@GetMapping("/books/{bookId}/flashcards")
	public Flux<Flashcard> listFlashcards(@PathVariable String bookId) { return libraryDataService.findFlashcardsByBook(bookId); }

	@PostMapping("/chats")
	public Mono<ChatHistory> saveChat(@RequestBody ChatHistory chatHistory) { return libraryDataService.saveChatHistory(chatHistory); }

	@GetMapping("/books/{bookId}/chats")
	public Flux<ChatHistory> listChats(@PathVariable String bookId) { return libraryDataService.findChatHistoryByBook(bookId); }

	@PostMapping(value = "/books/{bookId}/chat-threads/delete", consumes = MediaType.APPLICATION_JSON_VALUE)
	public Mono<ResponseEntity<Void>> deleteChatThread(
			@PathVariable String bookId,
			@RequestBody ChatThreadDeleteRequest request
	) {
		return libraryDataService.deleteChatThread(bookId, request.threadId(), request.messageIds())
				.thenReturn(ResponseEntity.noContent().build());
	}

	@PostMapping("/reading-sessions")
	public Mono<ReadingSession> saveReadingSession(@RequestBody ReadingSession readingSession) { return libraryDataService.saveReadingSession(readingSession); }

	@GetMapping("/books/{bookId}/reading-sessions")
	public Flux<ReadingSession> listReadingSessions(@PathVariable String bookId) { return libraryDataService.findReadingSessionsByBook(bookId); }

	@PostMapping("/reading-sessions/add-seconds")
	public Mono<ResponseEntity<Void>> addReadingSeconds(
			@RequestParam String userId,
			@RequestParam String bookId,
			@RequestParam int seconds
	) {
		return libraryDataService.addReadingSeconds(userId, bookId, seconds)
				.thenReturn(ResponseEntity.noContent().build());
	}

	@PatchMapping("/flashcards/{cardId}/edit")
	public Mono<Flashcard> editFlashcard(@PathVariable String cardId, @RequestBody EditCardRequest request) {
		return libraryDataService.editFlashcard(cardId, request.question(), request.answer());
	}

	@PatchMapping("/flashcards/{cardId}/hide")
	public Mono<Flashcard> hideFlashcard(@PathVariable String cardId, @RequestBody HideCardRequest request) {
		return libraryDataService.setFlashcardHidden(cardId, request.hidden());
	}

	public record EditCardRequest(String question, String answer) {}
	public record HideCardRequest(boolean hidden) {}
	public record ChatThreadDeleteRequest(String threadId, List<String> messageIds) {}
}
