package com.deepreader.ai_service.model;

public record IngestionJobResponse(
		String jobId,
		String fileName,
		String status,
		String documentId,
		String errorMessage
) {
}
