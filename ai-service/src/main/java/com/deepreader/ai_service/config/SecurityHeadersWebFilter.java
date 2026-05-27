package com.deepreader.ai_service.config;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
public class SecurityHeadersWebFilter implements WebFilter {

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		HttpHeaders headers = exchange.getResponse().getHeaders();
		headers.set("X-Content-Type-Options", "nosniff");
		headers.set("X-Frame-Options", "DENY");
		headers.set("Referrer-Policy", "no-referrer");
		headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
		headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
		return chain.filter(exchange);
	}
}
