package com.deepreader.ai_service.model.api.internal;

import com.deepreader.ai_service.model.RetrievedChunk;

import java.util.List;

public record SearchResponse(
		String query,
		int limit,
		String provider,
		List<RetrievedChunk> matches
) {
}
