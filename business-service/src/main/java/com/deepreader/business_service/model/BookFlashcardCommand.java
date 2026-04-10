package com.deepreader.business_service.model;

public record BookFlashcardCommand(
		String provider,
		Integer count
) {
}