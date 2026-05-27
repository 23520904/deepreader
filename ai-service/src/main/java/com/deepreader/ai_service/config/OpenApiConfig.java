package com.deepreader.ai_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI deepReaderOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("DeepReader API")
						.description("Backend API for upload, search, chat, summary, and flashcards")
						.version("v1"));
	}
}
