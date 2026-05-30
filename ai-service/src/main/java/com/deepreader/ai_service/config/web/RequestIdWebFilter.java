package com.deepreader.ai_service.config.web;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Adds a request id to every request handled by the AI service.
 *
 * The request id is useful for tracking one request across logs,
 * responses, and service-to-service calls.
 */
@Component
public class RequestIdWebFilter implements WebFilter {
	public static final String REQUEST_ID_HEADER = "X-Request-Id";

	/**
	 * Reuses the request id from the caller when it exists.
	 * If the caller does not provide one, this filter creates a new id.
	 */
	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID_HEADER);

		// Create a new id when the request does not already contain one.
		if (!StringUtils.hasText(requestId)) {
			requestId = UUID.randomUUID().toString();
		}

		// Return the request id to the caller so client-side errors can be traced.
		exchange.getResponse().getHeaders().set(REQUEST_ID_HEADER, requestId);

		// Store the id in the exchange so other filters or handlers can reuse it.
		exchange.getAttributes().put(REQUEST_ID_HEADER, requestId);

		return chain.filter(exchange);
	}
}