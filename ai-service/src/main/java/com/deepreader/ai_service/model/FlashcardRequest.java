package com.deepreader.ai_service.model;

public record FlashcardRequest(
		String documentId,
		String provider,
		Integer count
) {
}