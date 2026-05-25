package com.deepreader.ai_service.model.provider.gemini;

import java.util.List;

public record GeminiEmbedContentResponse(
		List<EmbeddingResult> embeddings
) {
	public record EmbeddingResult(ContentEmbedding embedding) {
	}

	public record ContentEmbedding(List<Float> values) {
	}
}
