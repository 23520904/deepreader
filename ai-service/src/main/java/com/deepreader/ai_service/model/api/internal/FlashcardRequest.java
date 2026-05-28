package com.deepreader.ai_service.model.api.internal;

public record FlashcardRequest(
		String documentId,
		String provider,
		Integer count,
		String language,
		String type,
		String scope
) {
}
