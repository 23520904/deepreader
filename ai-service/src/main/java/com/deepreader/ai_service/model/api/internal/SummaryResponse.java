package com.deepreader.ai_service.model.api.internal;

public record SummaryResponse(
		String documentId,
		String provider,
		String summary
) {
}
