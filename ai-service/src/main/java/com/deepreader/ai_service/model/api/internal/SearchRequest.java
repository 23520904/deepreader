package com.deepreader.ai_service.model.api.internal;

public record SearchRequest(
		String documentId,
		String query,
		Integer limit,
		String provider
) {
}
