package com.deepreader.ai_service.model.provider.groq;

import java.util.List;

public record GroqChatRequest(
		String model,
		List<Message> messages,
		Double temperature
) {
	public record Message(String role, String content) {}
}
