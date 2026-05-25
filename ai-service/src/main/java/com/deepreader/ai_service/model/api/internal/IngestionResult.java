package com.deepreader.ai_service.model.api.internal;

import java.util.List;

public record IngestionResult(
		String documentId,
		String fileName,
		int sectionCount,
		int chunkCount,
		List<String> chunkIds,
		List<String> indexedProviders
) {
}
