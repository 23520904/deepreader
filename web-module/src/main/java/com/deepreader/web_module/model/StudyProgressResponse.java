package com.deepreader.web_module.model;

public record StudyProgressResponse(
		String cardId,
		String bookId,
		String status,
		int reviews,
		int attempts,
		int correct,
		String lastReviewed,
		String dueAt,
		int intervalDays,
		double easeFactor,
		String updatedAt
) {
}
