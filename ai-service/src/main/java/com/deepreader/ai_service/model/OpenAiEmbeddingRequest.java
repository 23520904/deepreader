package com.deepreader.ai_service.model;

import java.util.List;

public record OpenAiEmbeddingRequest(
		String model,
		List<String> input
) {
}