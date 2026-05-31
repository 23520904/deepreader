package com.deepreader.data_service.service;

import com.deepreader.core.model.Book;
import com.deepreader.core.model.Chapter;
import com.deepreader.core.model.ChapterSummary;
import com.deepreader.core.model.ChatHistory;
import com.deepreader.core.model.Flashcard;
import com.deepreader.core.model.ReadingSession;
import com.deepreader.core.model.User;
import com.deepreader.data_service.repository.BookRepository;
import com.deepreader.data_service.repository.ChapterRepository;
import com.deepreader.data_service.repository.ChapterSummaryRepository;
import com.deepreader.data_service.repository.ChatHistoryRepository;
import com.deepreader.data_service.repository.FlashcardRepository;
import com.deepreader.data_service.repository.ReadingSessionRepository;
import com.deepreader.data_service.repository.UserRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Provides reactive persistence operations for library data.
 *
 * <p>This service wraps multiple repositories so controllers and business services
 * can work with users, books, chapters, summaries, flashcards, chats, and reading
 * sessions through one data layer.
 */
@Service
public class LibraryDataService {

	private final UserRepository userRepository;
	private final BookRepository bookRepository;
	private final ChapterRepository chapterRepository;
	private final ChapterSummaryRepository summaryRepository;
	private final FlashcardRepository flashcardRepository;
	private final ChatHistoryRepository chatHistoryRepository;
	private final ReadingSessionRepository readingSessionRepository;

	public LibraryDataService(UserRepository userRepository,
			BookRepository bookRepository,
			ChapterRepository chapterRepository,
			ChapterSummaryRepository summaryRepository,
			FlashcardRepository flashcardRepository,
			ChatHistoryRepository chatHistoryRepository,
			ReadingSessionRepository readingSessionRepository) {
		this.userRepository = userRepository;
		this.bookRepository = bookRepository;
		this.chapterRepository = chapterRepository;
		this.summaryRepository = summaryRepository;
		this.flashcardRepository = flashcardRepository;
		this.chatHistoryRepository = chatHistoryRepository;
		this.readingSessionRepository = readingSessionRepository;
	}

	/**
	 * Saves or updates a user record.
	 */
	public Mono<User> saveUser(User user) {
		return userRepository.save(user);
	}

	public Flux<User> findUsers() {
		return userRepository.findAll();
	}

	public Mono<User> findUserById(String id) {
		return userRepository.findById(id);
	}

	/**
	 * Saves book metadata after upload or update.
	 */
	public Mono<Book> saveBook(Book book) {
		return bookRepository.save(book);
	}

	/**
	 * Finds all books, or only books for a specific user when userId is provided.
	 */
	public Flux<Book> findBooks(String userId) {
		return userId == null || userId.isBlank()
				? bookRepository.findAll()
				: bookRepository.findByUserId(userId);
	}

	public Mono<Book> findBookById(String id) {
		return bookRepository.findById(id);
	}

	/**
	 * Deletes a book and its related child data.
	 *
	 * <p>Related chapters, summaries, flashcards, chat history, and reading sessions
	 * are removed before the book record so no stale book-owned data is left behind.
	 */
	public Mono<Void> deleteBookById(String id) {
		return Mono.when(
						chapterRepository.deleteByBookId(id),
						summaryRepository.deleteByBookId(id),
						flashcardRepository.deleteByBookId(id),
						chatHistoryRepository.deleteByBookId(id),
						readingSessionRepository.deleteByBookId(id))
				.then(bookRepository.deleteById(id));
	}

	public Mono<Chapter> saveChapter(Chapter chapter) {
		return chapterRepository.save(chapter);
	}

	/**
	 * Returns chapters in reading order for a book.
	 */
	public Flux<Chapter> findChaptersByBook(String bookId) {
		return chapterRepository.findByBookIdOrderByChapterNumberAsc(bookId);
	}

	public Mono<ChapterSummary> saveSummary(ChapterSummary summary) {
		return summaryRepository.save(summary);
	}

	public Flux<ChapterSummary> findSummariesByBook(String bookId) {
		return summaryRepository.findByBookId(bookId);
	}

	public Mono<Flashcard> saveFlashcard(Flashcard flashcard) {
		return flashcardRepository.save(flashcard);
	}

	/**
	 * Returns visible flashcards for a book.
	 *
	 * <p>Cards with null isHidden are treated as visible to support older records
	 * that may not have the hidden flag set.
	 */
	public Flux<Flashcard> findFlashcardsByBook(String bookId) {
		return flashcardRepository.findByBookId(bookId)
				.filter(card -> card.getIsHidden() == null || !card.getIsHidden());
	}

	/**
	 * Stores edited question and answer text without replacing the original card fields.
	 */
	public Mono<Flashcard> editFlashcard(String id, String question, String answer) {
		return flashcardRepository.findById(id)
				.flatMap(card -> {
					card.setEditedQuestion(question);
					card.setEditedAnswer(answer);
					return flashcardRepository.save(card);
				});
	}

	/**
	 * Soft-hides or restores a flashcard.
	 */
	public Mono<Flashcard> setFlashcardHidden(String id, boolean isHidden) {
		return flashcardRepository.findById(id)
				.flatMap(card -> {
					card.setIsHidden(isHidden);
					return flashcardRepository.save(card);
				});
	}

	public Mono<ChatHistory> saveChatHistory(ChatHistory chatHistory) {
		return chatHistoryRepository.save(chatHistory);
	}

	/**
	 * Returns chat history in timestamp order so conversations can be displayed correctly.
	 */
	public Flux<ChatHistory> findChatHistoryByBook(String bookId) {
		return chatHistoryRepository.findByBookIdOrderByTimestampAsc(bookId);
	}

	/**
	 * Deletes chat messages by thread ID, message IDs, or both.
	 *
	 * <p>Inputs are normalized before matching so blank values are ignored and
	 * accidental surrounding spaces do not prevent deletion.
	 */
	public Mono<Void> deleteChatThread(String bookId, String threadId, List<String> messageIds) {
		String normalizedThreadId = threadId == null ? "" : threadId.trim();
		Set<String> normalizedMessageIds = new HashSet<>();

		if (messageIds != null) {
			for (String messageId : messageIds) {
				if (messageId != null && !messageId.isBlank()) {
					normalizedMessageIds.add(messageId.trim());
				}
			}
		}

		if (normalizedThreadId.isBlank() && normalizedMessageIds.isEmpty()) {
			return Mono.empty();
		}

		return findChatHistoryByBook(bookId)
				.filter(chatHistory -> {
					boolean matchesThread = !normalizedThreadId.isBlank()
							&& normalizedThreadId.equals(chatHistory.getThreadId());
					boolean matchesMessage = chatHistory.getId() != null
							&& normalizedMessageIds.contains(chatHistory.getId());

					return matchesThread || matchesMessage;
				})
				.collectList()
				.flatMap(chatHistories -> chatHistories.isEmpty()
						? Mono.empty()
						: chatHistoryRepository.deleteAll(chatHistories));
	}

	public Mono<ReadingSession> saveReadingSession(ReadingSession readingSession) {
		return readingSessionRepository.save(readingSession);
	}

	public Flux<ReadingSession> findReadingSessionsByBook(String bookId) {
		return readingSessionRepository.findByBookId(bookId);
	}

	/**
	 * Tracks reading activity by adding seconds to a recent session or creating a new one.
	 *
	 * <p>A session for the same user and book is reused only when it started within
	 * the last hour. This keeps nearby reading activity grouped while still starting
	 * a new session after a longer break.
	 */
	public Mono<Void> addReadingSeconds(String userId, String bookId, int secondsSpent) {
		LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);

		return readingSessionRepository.findByUserId(userId)
				.filter(session -> bookId.equals(session.getBookId())
						&& session.getStartTime() != null
						&& session.getStartTime().isAfter(oneHourAgo))
				.next()
				.flatMap(session -> {
					Long currentSeconds = session.getSecondsSpent();

					session.setSecondsSpent(currentSeconds == null
							? secondsSpent
							: currentSeconds + secondsSpent);
					session.setEndTime(LocalDateTime.now());

					return readingSessionRepository.save(session);
				})
				.switchIfEmpty(Mono.defer(() -> {
					ReadingSession session = new ReadingSession();
					session.setUserId(userId);
					session.setBookId(bookId);
					session.setStartTime(LocalDateTime.now().minusSeconds(secondsSpent));
					session.setEndTime(LocalDateTime.now());
					session.setSecondsSpent((long) secondsSpent);

					return readingSessionRepository.save(session);
				}))
				.then();
	}
}