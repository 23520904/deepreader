package com.deepreader.ai_service.model.api.internal;

public record SummaryRequest(
		String documentId,
		String provider
) {
}
