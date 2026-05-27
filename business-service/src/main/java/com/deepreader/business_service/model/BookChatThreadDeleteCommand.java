package com.deepreader.business_service.model;

import java.util.List;

public record BookChatThreadDeleteCommand(
		String threadId,
		List<String> messageIds
) {
}
