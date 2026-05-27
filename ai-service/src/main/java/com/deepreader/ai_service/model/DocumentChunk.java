package com.deepreader.ai_service.model;

public record DocumentChunk(
		String chunkId,
		String documentId,
		String fileName,
		String sectionId,
		String sectionTitle,
		int chunkIndex,
		String content
) {
}