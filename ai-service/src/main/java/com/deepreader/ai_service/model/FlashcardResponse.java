package com.deepreader.ai_service.model;

import java.util.List;

public record FlashcardResponse(
		String documentId,
		String provider,
		List<Flashcard> flashcards
) {
}