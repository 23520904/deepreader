package com.deepreader.ai_service.model;

import java.util.List;

public record GeminiGenerateContentRequest(
		List<Content> contents,
		GenerationConfig generationConfig
) {
	public record Content(
			List<Part> parts
	) {
	}

	public record Part(
			String text
	) {
	}

	public record GenerationConfig(
			Double temperature,
			Integer maxOutputTokens
	) {
	}
}