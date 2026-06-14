package com.deepreader.ai_service.model.provider.groq;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GroqChatRequest(
		String model,
		List<Message> messages,
		Double temperature,
		@JsonProperty("max_tokens") Integer maxTokens
) {
	public record Message(String role, String content) {}
}
