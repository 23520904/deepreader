package com.deepreader.ai_service.model;

public record SummaryResponse(
		String documentId,
		String provider,
		String summary
) {
}