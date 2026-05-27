package com.deepreader.web_module.model;

public record StudyProgressRequest(
		String bookId,
		String status,
		Integer reviews,
		Integer attempts,
		Integer correct,
		String lastReviewed,
		String dueAt,
		Integer intervalDays,
		Double easeFactor
) {
}
