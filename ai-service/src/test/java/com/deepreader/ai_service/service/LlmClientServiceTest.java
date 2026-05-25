package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.GeminiProperties;
import com.deepreader.ai_service.config.GroqProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LlmClientServiceTest {

	@Test
	void fallsBackToGeminiWhenGroqQuotaIsExceeded() {
		GroqProperties groqProperties = new GroqProperties();
		groqProperties.setApiKey("gsk_test");
		GeminiProperties geminiProperties = new GeminiProperties();
		geminiProperties.setApiKey("AIza-test");

		WebClient.Builder builder = WebClient.builder().exchangeFunction(request -> {
			String path = request.url().getPath();
			if (path.endsWith("/chat/completions")) {
				return Mono.just(ClientResponse.create(HttpStatus.TOO_MANY_REQUESTS)
						.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
						.body("{\"error\":{\"message\":\"quota exceeded\"}}")
						.build());
			}

			return Mono.just(ClientResponse.create(HttpStatus.OK)
					.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
					.body("""
							{"candidates":[{"content":{"parts":[{"text":"Gemini fallback answer"}]}}]}
							""")
					.build());
		});

		LlmClientService service = new LlmClientService(geminiProperties, groqProperties, builder, null);

		LlmClientService.GeneratedAnswer answer = service.generateAnswer(null, "Summarize this.");

		assertEquals("gemini", answer.provider());
		assertEquals("Gemini fallback answer", answer.answer());
	}
}
