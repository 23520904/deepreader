package com.deepreader.ai_service.model;

import java.util.List;

public record OpenAiChatRequest(
		String model,
		List<Message> messages,
		Double temperature
) {
	public record Message(String role, String content) {}
}