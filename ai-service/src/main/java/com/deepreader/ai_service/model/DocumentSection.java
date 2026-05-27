package com.deepreader.ai_service.model;

public record DocumentSection(
		String sectionId,
		String title,
		int pageNumber,
		String summary,
		String content
) {
}