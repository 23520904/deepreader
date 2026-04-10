package com.deepreader.ai_service.model;

import java.util.List;

public record SearchResponse(
		String query,
		int limit,
		String provider,
		List<RetrievedChunk> matches
) {
}