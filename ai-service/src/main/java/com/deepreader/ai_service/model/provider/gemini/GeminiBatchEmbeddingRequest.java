package com.deepreader.ai_service.model.provider.gemini;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GeminiBatchEmbeddingRequest(
		List<EmbedRequest> requests
) {
	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record EmbedRequest(
			String model,
			GeminiContent content,
			String taskType,
			Integer outputDimensionality
	) {
	}

	public record GeminiContent(
			List<GeminiPart> parts
	) {
	}

	public record GeminiPart(
			String text
	) {
	}
}
