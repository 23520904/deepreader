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

@Configuration
public class CorsConfig {
	@Bean
	public CorsWebFilter corsWebFilter(@Value("${deepreader.cors.allowed-origins:http://localhost:3000}") String allowedOriginsCsv) {
		CorsConfiguration config = new CorsConfiguration();
		List<String> origins = Arrays.stream(allowedOriginsCsv.split(","))
				.map(String::trim)
				.filter(value -> !value.isEmpty())
				.toList();
		config.setAllowedOrigins(origins);
		config.setAllowedMethods(List.of(
				HttpMethod.GET.name(),
				HttpMethod.POST.name(),
				HttpMethod.PUT.name(),
				HttpMethod.DELETE.name(),
				HttpMethod.OPTIONS.name()
		));
		config.setAllowedHeaders(List.of("*"));
		config.setExposedHeaders(List.of("X-Request-Id"));
		config.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return new CorsWebFilter(source);
	}
}
