package com.deepreader.web_module.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configures web security and CORS behavior for the web module.
 *
 * <p>Authentication is handled by custom filters, so this configuration allows
 * requests through Spring Security while still applying CORS rules.
 */
@Configuration
public class SecurityConfig {

	// Comma-separated list of frontend origins allowed to call this API.
	@Value("${deepreader.cors.allowed-origins:http://localhost:3000}")
	private String allowedOrigins;

	/**
	 * Builds the reactive Spring Security filter chain.
	 *
	 * <p>CSRF is disabled because this API is intended for token-based access,
	 * and authorization is handled by application-level filters.
	 */
	@Bean
	SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
		return http.csrf(ServerHttpSecurity.CsrfSpec::disable)
				.cors(cors -> cors.configurationSource(corsConfigurationSource()))
				.authorizeExchange(exchange -> exchange.anyExchange().permitAll())
				.build();
	}

	/**
	 * Defines CORS settings used by Spring Security.
	 *
	 * <p>Allowed origins are read from configuration so local development and
	 * deployed frontend URLs can be configured without changing code.
	 */
	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("*"));
		configuration.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}
}