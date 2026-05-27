package com.deepreader.ai_service.model;

public record RetrievedChunk(
		String documentId,
		String chunkId,
		String fileName,
		String sectionId,
		String title,
		Integer chunkIndex,
		String content,
		float score
) {
}