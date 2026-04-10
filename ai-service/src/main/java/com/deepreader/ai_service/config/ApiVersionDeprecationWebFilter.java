package com.deepreader.ai_service.config;

import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
public class ApiVersionDeprecationWebFilter implements WebFilter {

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		String path = exchange.getRequest().getPath().value();
		if (path.startsWith("/api/") && !path.startsWith("/api/v1/")) {
			exchange.getResponse().getHeaders().add("Deprecation", "true");
			exchange.getResponse().getHeaders().add("Sunset", "Wed, 31 Dec 2026 23:59:59 GMT");
			exchange.getResponse().getHeaders().add("Link", "</docs/api-versioning-policy.md>; rel=\"deprecation\"");
		}
		return chain.filter(exchange);
	}
}
