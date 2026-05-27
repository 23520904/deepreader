package com.deepreader.ai_service.model.api.internal;

public record ChatAskRequest(
		String documentId,
		String query,
		Integer limit,
		String provider
) {
}
