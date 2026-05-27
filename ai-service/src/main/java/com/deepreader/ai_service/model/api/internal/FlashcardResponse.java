package com.deepreader.ai_service.model.api.internal;

import java.util.List;

public record FlashcardResponse(
		String documentId,
		String provider,
		List<Flashcard> flashcards
) {
}
