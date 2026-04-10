package com.deepreader.ai_service.model;

public record SearchRequest(
		String query,
		Integer limit,
		String provider
) {
}