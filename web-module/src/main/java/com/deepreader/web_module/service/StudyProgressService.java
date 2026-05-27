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

@Service
public class StudyProgressService {
	private static final List<String> VALID_STATUSES = List.of("new", "learning", "mastered", "weak");
	private final JdbcTemplate jdbcTemplate;
	private volatile boolean tableEnsured;

	public StudyProgressService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

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

	public StudyProgressResponse upsertProgress(String userId, String cardId, StudyProgressRequest request) {
		ensureTable();
		String normalizedCardId = normalizeRequired(cardId, "Card id is required");
		String normalizedBookId = normalizeRequired(request.bookId(), "Book id is required");
		String normalizedStatus = normalizeStatus(request.status());
		int reviews = Math.max(request.reviews() == null ? 0 : request.reviews(), 0);
		int attempts = Math.max(request.attempts() == null ? 0 : request.attempts(), 0);
		int correct = Math.max(request.correct() == null ? 0 : request.correct(), 0);
		int intervalDays = Math.max(request.intervalDays() == null ? 0 : request.intervalDays(), 0);
		double easeFactor = request.easeFactor() == null ? 2.5 : Math.max(1.3, request.easeFactor());
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

		return getProgress(userId, normalizedCardId);
	}

	public int countRows() {
		ensureTable();
		Integer count = jdbcTemplate.queryForObject("select count(*) from flashcard_study_progress", Integer.class);
		return count == null ? 0 : count;
	}

	public int countDueCards() {
		ensureTable();
		Integer count = jdbcTemplate.queryForObject(
				"select count(*) from flashcard_study_progress where due_at is not null and due_at <= now()",
				Integer.class
		);
		return count == null ? 0 : count;
	}

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
			jdbcTemplate.execute(
					"create index if not exists idx_flashcard_progress_user_due on flashcard_study_progress(user_id, due_at)"
			);
			jdbcTemplate.execute(
					"create index if not exists idx_flashcard_progress_book on flashcard_study_progress(book_id)"
			);
			tableEnsured = true;
		}
	}

	private String normalizeRequired(String value, String message) {
		if (!StringUtils.hasText(value)) {
			throw new IllegalArgumentException(message);
		}

		return value.trim();
	}

	private String normalizeStatus(String value) {
		String normalizedStatus = StringUtils.hasText(value)
				? value.trim().toLowerCase(Locale.ROOT)
				: "new";

		if (!VALID_STATUSES.contains(normalizedStatus)) {
			return "new";
		}

		return normalizedStatus;
	}

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

	private Timestamp toTimestamp(Instant value) {
		return value == null ? null : Timestamp.from(value);
	}

	private String toIsoString(Timestamp value) {
		return value == null ? null : value.toInstant().toString();
	}
}
