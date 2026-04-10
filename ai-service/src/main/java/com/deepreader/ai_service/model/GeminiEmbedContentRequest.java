package com.deepreader.ai_service.model;

import java.util.List;

public record GeminiEmbedContentRequest(
		List<ContentRequest> requests
) {
	public record ContentRequest(
			String model,
			EmbedContent content,
			String taskType
	) {
	}

	public record EmbedContent(
			List<Part> parts
	) {
	}

	public record Part(String text) {
	}
}