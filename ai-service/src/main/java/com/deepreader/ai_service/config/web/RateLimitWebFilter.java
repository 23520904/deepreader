package com.deepreader.ai_service.config.web;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limits how many document-related requests a user can send in one minute.
 *
 * This helps protect the AI service from too many upload or document requests
 * from the same user in a short time.
 */
@Component
public class RateLimitWebFilter implements WebFilter {
	private static final int LIMIT_PER_MINUTE = 60;

	private final StringRedisTemplate redisTemplate;
	private final AntPathMatcher matcher = new AntPathMatcher();

	// Used as a local fallback when Redis is not available.
	private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

	public RateLimitWebFilter(org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
		this.redisTemplate = redisTemplateProvider.getIfAvailable();
	}

	/**
	 * Checks each request and applies rate limiting only to document APIs.
	 *
	 * Requests without a user id are skipped because the limit is tracked per user.
	 */
	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		String path = exchange.getRequest().getPath().value();

		// Only limit document-related endpoints.
		boolean documentsPath = matcher.match("/internal/ai/v1/documents/**", path);
		if (!documentsPath) {
			return chain.filter(exchange);
		}

		// The caller must provide the user id so each user has a separate limit.
		String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
		if (userId == null || userId.isBlank()) {
			return chain.filter(exchange);
		}

		// Group requests by the current minute.
		long currentMinute = Instant.now().getEpochSecond() / 60;
		String key = userId + ":" + currentMinute;

		int current = incrementCount(key, currentMinute);
		if (current > LIMIT_PER_MINUTE) {
			return tooManyRequests(exchange);
		}

		return chain.filter(exchange);
	}

	/**
	 * Increases the request count for the current user and time window.
	 *
	 * Redis is used when available so the limit works across multiple service instances.
	 * If Redis fails, the service falls back to an in-memory counter.
	 */
	private int incrementCount(String key, long currentMinute) {
		if (redisTemplate != null) {
			try {
				Long value = redisTemplate.opsForValue().increment("rl:" + key);

				// Expire the Redis key shortly after the one-minute window ends.
				redisTemplate.expire("rl:" + key, 70, TimeUnit.SECONDS);

				return value == null ? 1 : value.intValue();
			} catch (RuntimeException ignored) {
				// fallback to in-memory limiter when Redis is unavailable
			}
		}

		WindowCounter counter = counters.computeIfAbsent(key, ignored -> new WindowCounter(currentMinute));
		return counter.counter().incrementAndGet();
	}

	/**
	 * Sends a 429 response when the user exceeds the allowed request limit.
	 */
	private Mono<Void> tooManyRequests(ServerWebExchange exchange) {
		exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
		exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
		byte[] bytes = "{\"error\":\"rate limit exceeded\"}".getBytes(StandardCharsets.UTF_8);
		return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
	}

	/**
	 * Stores the request count for one user during one minute.
	 */
	private record WindowCounter(long minute, AtomicInteger counter) {
		WindowCounter(long minute) {
			this(minute, new AtomicInteger(0));
		}
	}
}