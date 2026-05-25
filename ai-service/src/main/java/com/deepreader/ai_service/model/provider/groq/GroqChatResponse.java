package com.deepreader.ai_service.model.provider.groq;

import java.util.List;

public record GroqChatResponse(
		List<Choice> choices
) {
	public record Choice(Message message) {}
	public record Message(String role, String content) {}
}
