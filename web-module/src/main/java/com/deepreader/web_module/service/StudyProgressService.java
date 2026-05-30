package com.deepreader.web_module.service;

import com.deepreader.web_module.model.StudyProgressRequest;
import com.deepreader.web_module.model.StudyProgressResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Service for storing and reading flashcard study progress.
 *
 * <p>Each progress row belongs to one user and one flashcard. The service keeps
 * review status, review counts, correctness counts, due time, interval days,
 * and ease factor for spaced-repetition style review.
 *
 * <p>The table is created lazily on first use so this feature can work even when
 * the progress table has not been created by a separate migration yet.
 */
@Service
public class StudyProgressService {
	// Allowed learning states for a flashcard.
	private static final List<String> VALID_STATUSES = List.of("new", "learning", "mastered", "weak");

	private final JdbcTemplate jdbcTemplate;

	// Prevents running the table creation logic on every service call.
	private volatile boolean tableEnsured;

	public StudyProgressService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Lists all flashcard progress records for one user.
	 *
	 * <p>Results are ordered by latest update first so the client can show the
	 * most recently reviewed or changed cards near the top.
	 */
	public List<StudyProgressResponse> listProgress(String userId) {
		ensureTable();
		return jdbcTemplate.query(
				"""
				select card_id, book_id, status, reviews, attempts, correct,
				       last_reviewed, due_at, interval_days, ease_factor, updated_at
				from flashcard_study_progress
				where user_id = ?
				order by updated_at desc
				""",
				(rs, rowNum) -> new StudyProgressResponse(
						rs.getString("card_id"),
						rs.getString("book_id"),
						rs.getString("status"),
						rs.getInt("reviews"),
						rs.getInt("attempts"),
						rs.getInt("correct"),
						toIsoString(rs.getTimestamp("last_reviewed")),
						toIsoString(rs.getTimestamp("due_at")),
						rs.getInt("interval_days"),
						rs.getDouble("ease_factor"),
						toIsoString(rs.getTimestamp("updated_at"))
				),
				userId
		);
	}

	/**
	 * Creates or updates progress for one flashcard.
	 *
	 * <p>The pair of {@code user_id} and {@code card_id} is unique, so the same
	 * request can insert a new row or update the existing one.
	 *
	 * <p>Incoming values are normalized before saving. This avoids invalid empty IDs,
	 * negative counters, unsupported statuses, and too-small ease factors.
	 */
	public StudyProgressResponse upsertProgress(String userId, String cardId, StudyProgressRequest request) {
		ensureTable();

		// Required IDs are trimmed and rejected if blank.
		String normalizedCardId = normalizeRequired(cardId, "Card id is required");
		String normalizedBookId = normalizeRequired(request.bookId(), "Book id is required");

		// Invalid or missing status falls back to "new".
		String normalizedStatus = normalizeStatus(request.status());

		// Counters should never be negative, even if the client sends invalid values.
		int reviews = Math.max(request.reviews() == null ? 0 : request.reviews(), 0);
		int attempts = Math.max(request.attempts() == null ? 0 : request.attempts(), 0);
		int correct = Math.max(request.correct() == null ? 0 : request.correct(), 0);
		int intervalDays = Math.max(request.intervalDays() == null ? 0 : request.intervalDays(), 0);

		// Ease factor defaults to 2.5 and is kept above 1.3 to avoid extreme scheduling values.
		double easeFactor = request.easeFactor() == null ? 2.5 : Math.max(1.3, request.easeFactor());

		// Invalid date strings are treated as missing instead of failing the whole update.
		Instant lastReviewed = parseInstant(request.lastReviewed());
		Instant dueAt = parseInstant(request.dueAt());

		jdbcTemplate.update(
				"""
				insert into flashcard_study_progress
				       (user_id, card_id, book_id, status, reviews, attempts, correct,
				        last_reviewed, due_at, interval_days, ease_factor, updated_at)
				values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
				on conflict (user_id, card_id) do update
				set book_id = excluded.book_id,
				    status = excluded.status,
				    reviews = excluded.reviews,
				    attempts = excluded.attempts,
				    correct = excluded.correct,
				    last_reviewed = excluded.last_reviewed,
				    due_at = excluded.due_at,
				    interval_days = excluded.interval_days,
				    ease_factor = excluded.ease_factor,
				    updated_at = now()
				""",
				userId,
				normalizedCardId,
				normalizedBookId,
				normalizedStatus,
				reviews,
				attempts,
				correct,
				toTimestamp(lastReviewed),
				toTimestamp(dueAt),
				intervalDays,
				easeFactor
		);

		// Read the saved row back so the response matches the database state.
		return getProgress(userId, normalizedCardId);
	}

	/**
	 * Counts all study progress rows.
	 *
	 * <p>This is used by admin dashboard metrics.
	 */
	public int countRows() {
		ensureTable();
		Integer count = jdbcTemplate.queryForObject("select count(*) from flashcard_study_progress", Integer.class);
		return count == null ? 0 : count;
	}

	/**
	 * Counts cards that are due for review.
	 *
	 * <p>A card is due when it has a due date and that date is earlier than or
	 * equal to the current database time.
	 */
	public int countDueCards() {
		ensureTable();
		Integer count = jdbcTemplate.queryForObject(
				"select count(*) from flashcard_study_progress where due_at is not null and due_at <= now()",
				Integer.class
		);
		return count == null ? 0 : count;
	}

	/**
	 * Loads one saved progress record after insert or update.
	 */
	private StudyProgressResponse getProgress(String userId, String cardId) {
		return jdbcTemplate.queryForObject(
				"""
				select card_id, book_id, status, reviews, attempts, correct,
				       last_reviewed, due_at, interval_days, ease_factor, updated_at
				from flashcard_study_progress
				where user_id = ? and card_id = ?
				""",
				(rs, rowNum) -> new StudyProgressResponse(
						rs.getString("card_id"),
						rs.getString("book_id"),
						rs.getString("status"),
						rs.getInt("reviews"),
						rs.getInt("attempts"),
						rs.getInt("correct"),
						toIsoString(rs.getTimestamp("last_reviewed")),
						toIsoString(rs.getTimestamp("due_at")),
						rs.getInt("interval_days"),
						rs.getDouble("ease_factor"),
						toIsoString(rs.getTimestamp("updated_at"))
				),
				userId,
				cardId
		);
	}

	/**
	 * Creates the study progress table and indexes if they do not already exist.
	 *
	 * <p>The method uses a volatile flag and synchronized block so multiple requests
	 * do not repeatedly run the same DDL at the same time.
	 *
	 * <p>The table cascades when a user is deleted, so that user's progress data
	 * is removed automatically with the account.
	 */
	public void ensureTable() {
		if (tableEnsured) {
			return;
		}

		synchronized (this) {
			if (tableEnsured) {
				return;
			}

			jdbcTemplate.execute(
					"""
					create table if not exists flashcard_study_progress (
					    user_id varchar(100) not null references app_users(user_id) on delete cascade,
					    card_id varchar(160) not null,
					    book_id varchar(160) not null,
					    status varchar(32) not null default 'new',
					    reviews integer not null default 0,
					    attempts integer not null default 0,
					    correct integer not null default 0,
					    last_reviewed timestamptz,
					    due_at timestamptz,
					    interval_days integer not null default 0,
					    ease_factor double precision not null default 2.5,
					    updated_at timestamptz not null default now(),
					    primary key (user_id, card_id)
					)
					"""
			);

			// Speeds up queries that load a user's due cards.
			jdbcTemplate.execute(
					"create index if not exists idx_flashcard_progress_user_due on flashcard_study_progress(user_id, due_at)"
			);

			// Speeds up queries grouped or filtered by book.
			jdbcTemplate.execute(
					"create index if not exists idx_flashcard_progress_book on flashcard_study_progress(book_id)"
			);

			tableEnsured = true;
		}
	}

	/**
	 * Trims and validates a required string value.
	 */
	private String normalizeRequired(String value, String message) {
		if (!StringUtils.hasText(value)) {
			throw new IllegalArgumentException(message);
		}

		return value.trim();
	}

	/**
	 * Normalizes the review status sent by the client.
	 *
	 * <p>Unsupported statuses fall back to "new" instead of being stored directly.
	 */
	private String normalizeStatus(String value) {
		String normalizedStatus = StringUtils.hasText(value)
				? value.trim().toLowerCase(Locale.ROOT)
				: "new";

		if (!VALID_STATUSES.contains(normalizedStatus)) {
			return "new";
		}

		return normalizedStatus;
	}

	/**
	 * Parses an ISO-8601 timestamp string.
	 *
	 * <p>Blank or invalid values return null so optional timestamps can be omitted safely.
	 */
	private Instant parseInstant(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}

		try {
			return Instant.parse(value.trim());
		} catch (RuntimeException ex) {
			return null;
		}
	}

	/**
	 * Converts an Instant to a SQL Timestamp for database writes.
	 */
	private Timestamp toTimestamp(Instant value) {
		return value == null ? null : Timestamp.from(value);
	}

	/**
	 * Converts a SQL Timestamp to an ISO string for API responses.
	 */
	private String toIsoString(Timestamp value) {
		return value == null ? null : value.toInstant().toString();
	}
}