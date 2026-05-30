package com.deepreader.ai_service.config;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Web filter responsible for adding security-related HTTP headers
 * to every server response.
 *
 * These headers help reduce common browser-based security risks,
 * such as MIME sniffing, clickjacking, referrer leakage, and
 * unauthorized access to sensitive browser features.
 */
@Component
public class SecurityHeadersWebFilter implements WebFilter {

	/**
	 * Adds security headers before continuing the WebFlux filter chain.
	 *
	 * The response headers are configured globally so every API response
	 * receives the same baseline browser security protections.
	 */
	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		HttpHeaders headers = exchange.getResponse().getHeaders();

		// Prevents browsers from trying to guess the content type of responses.
		headers.set("X-Content-Type-Options", "nosniff");

		// Blocks the application from being embedded in frames or iframes.
		headers.set("X-Frame-Options", "DENY");

		// Prevents the browser from sending referrer information to other origins.
		headers.set("Referrer-Policy", "no-referrer");

		// Disables access to selected browser features that are not needed by the API.
		headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

		// Restricts content loading and prevents this application from being framed.
		headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

		return chain.filter(exchange);
	}
}