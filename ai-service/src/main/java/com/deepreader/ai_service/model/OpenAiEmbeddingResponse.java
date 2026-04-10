package com.deepreader.ai_service.model;

import java.util.List;

public record OpenAiEmbeddingResponse(
		List<EmbeddingData> data
) {
	public record EmbeddingData(
			List<Float> embedding,
			Integer index
	) {
	}
}