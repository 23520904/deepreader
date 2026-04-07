package com.deepreader.ai_service.model;

public record DocumentChunk(
		String chunkId,
		String documentId,
		String fileName,
		int chunkIndex,
		String content
) {
}