package com.deepreader.ai_service.model;

public record RetrievedChunk(
		String documentId,
		String chunkId,
		String fileName,
		Integer chunkIndex,
		String content,
		float score
) {
}