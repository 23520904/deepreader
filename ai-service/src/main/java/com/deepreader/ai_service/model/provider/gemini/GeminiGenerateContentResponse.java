package com.deepreader.ai_service.model.provider.gemini;

import java.util.List;

public record GeminiGenerateContentResponse(
		List<Candidate> candidates
) {
	public record Candidate(
			Content content
	) {
	}

	public record Content(
			List<Part> parts
	) {
	}

	public record Part(
			String text
	) {
	}
}
