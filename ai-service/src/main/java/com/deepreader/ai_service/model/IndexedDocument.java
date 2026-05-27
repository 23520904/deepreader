package com.deepreader.ai_service.model;

import java.util.List;

public record IndexedDocument(
		String userId,
		String documentId,
		String fileName,
		String objectKey,
		List<DocumentSection> sections
) {
}