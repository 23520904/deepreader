package com.deepreader.ai_service.config.web;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class RequestIdWebFilter implements WebFilter {
	public static final String REQUEST_ID_HEADER = "X-Request-Id";

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID_HEADER);
		if (!StringUtils.hasText(requestId)) {
			requestId = UUID.randomUUID().toString();
		}
		exchange.getResponse().getHeaders().set(REQUEST_ID_HEADER, requestId);
		exchange.getAttributes().put(REQUEST_ID_HEADER, requestId);
		return chain.filter(exchange);
	}
}
