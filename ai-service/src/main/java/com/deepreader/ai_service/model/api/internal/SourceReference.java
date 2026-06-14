package com.deepreader.ai_service.model.api.internal;

public record SourceReference(
		int index,
		Integer pageNumber,
		String documentId,
		String chunkId,
		String fileName,
		String sectionId,
		String title,
		Integer chunkIndex,
		String snippet,
		float score
) {
}
