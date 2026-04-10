package com.deepreader.ai_service.model;

import java.util.List;

public record GeminiEmbedContentResponse(
		List<EmbeddingResult> embeddings
) {
	public record EmbeddingResult(ContentEmbedding embedding) {
	}

	public record ContentEmbedding(List<Float> values) {
	}
}