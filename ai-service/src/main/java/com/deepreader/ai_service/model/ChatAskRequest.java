package com.deepreader.ai_service.model;

public record ChatAskRequest(
		String query,
		Integer limit,
		String provider
) {
}