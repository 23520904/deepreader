package com.deepreader.ai_service.model;

public record RetrievedChunk(
		String documentId,
		String chunkId,
		String fileName,
		String sectionId,
		String title,
		Integer chunkIndex,
		Integer pageNumber,
		String content,
		float score
) {
}