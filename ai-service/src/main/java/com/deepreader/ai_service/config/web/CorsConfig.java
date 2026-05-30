package com.deepreader.ai_service.config.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configures CORS for the AI service.
 *
 * CORS allows the frontend, such as http://localhost:3000,
 * to call this service from a browser.
 */
@Configuration
public class CorsConfig {
	/**
	 * Creates a CORS filter for all AI service APIs.
	 *
	 * The allowed origins are read from:
	 * deepreader.cors.allowed-origins
	 *
	 * If this value is not set, the service allows http://localhost:3000 by default.
	 */
	@Bean
	public CorsWebFilter corsWebFilter(@Value("${deepreader.cors.allowed-origins:http://localhost:3000}") String allowedOriginsCsv) {
		CorsConfiguration config = new CorsConfiguration();

		// Split the origin list by comma so multiple frontend URLs can be configured.
		List<String> origins = Arrays.stream(allowedOriginsCsv.split(","))
				.map(String::trim)
				.filter(value -> !value.isEmpty())
				.toList();

		config.setAllowedOrigins(origins);

		// Allow the HTTP methods that the frontend may use when calling the API.
		config.setAllowedMethods(List.of(
				HttpMethod.GET.name(),
				HttpMethod.POST.name(),
				HttpMethod.PUT.name(),
				HttpMethod.DELETE.name(),
				HttpMethod.OPTIONS.name()
		));

		// Allow common request headers such as Authorization and Content-Type.
		config.setAllowedHeaders(List.of("*"));

		// Let the frontend read X-Request-Id for easier error tracing.
		config.setExposedHeaders(List.of("X-Request-Id"));

		// Allow credentials such as cookies or auth-related browser data.
		config.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

		// Apply this CORS config to every endpoint in the AI service.
		source.registerCorsConfiguration("/**", config);

		return new CorsWebFilter(source);
	}
}