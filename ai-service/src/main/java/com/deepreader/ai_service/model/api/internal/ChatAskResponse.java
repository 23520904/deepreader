package com.deepreader.ai_service.model.api.internal;

import java.util.List;

public record ChatAskResponse(
		String query,
		String answer,
		List<SourceReference> sources,
		boolean grounded,
		List<String> usedChunkIds
) {
}
