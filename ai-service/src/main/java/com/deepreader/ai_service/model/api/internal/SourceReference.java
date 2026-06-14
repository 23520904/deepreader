package com.deepreader.ai_service.model.api.internal;

public record SourceReference(
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
