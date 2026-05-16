package com.deepreader.business_service.model;

import com.deepreader.core.model.Book;

public record BookUploadResponse(
		Book book,
		String provider,
		String aiDocumentId,
		int sectionCount,
		int chunkCount
) {
}
