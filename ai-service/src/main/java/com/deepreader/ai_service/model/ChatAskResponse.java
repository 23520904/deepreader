package com.deepreader.ai_service.model;

import java.util.List;

public record ChatAskResponse(
		String query,
		String answer,
		List<SourceReference> sources
) {
}