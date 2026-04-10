package com.deepreader.ai_service.model;

public record SummaryRequest(
		String documentId,
		String provider
) {
}