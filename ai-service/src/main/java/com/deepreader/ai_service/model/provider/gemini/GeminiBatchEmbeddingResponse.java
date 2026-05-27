package com.deepreader.ai_service.model.provider.gemini;

import java.util.List;

public record GeminiBatchEmbeddingResponse(
		List<EmbeddingResult> embeddings
) {
	public record EmbeddingResult(
			ContentEmbedding embedding,
			List<Float> values
	) {
	}

	public record ContentEmbedding(
			List<Float> values
	) {
	}
}
