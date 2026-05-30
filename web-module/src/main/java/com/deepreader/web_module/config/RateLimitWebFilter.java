package com.deepreader.web_module.config;

import com.deepreader.web_module.service.RequestUserContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Objects;

/**
 * Applies Redis-backed rate limiting to incoming web requests.
 *
 * <p>The limit is tracked by user ID when available, together with the client IP,
 * so authenticated and anonymous traffic can be controlled consistently.
 */
@Component
public class RateLimitWebFilter implements WebFilter {

	private final int maxRequestsPerMinute;
	private final int authMaxRequestsPerMinute;
	private final ReactiveStringRedisTemplate redisTemplate;

	public RateLimitWebFilter(
			@Value("${deepreader.rate-limit.requests-per-minute:120}") int maxRequestsPerMinute,
			@Value("${deepreader.rate-limit.auth-requests-per-minute:600}") int authMaxRequestsPerMinute,
			ReactiveStringRedisTemplate redisTemplate) {
		this.maxRequestsPerMinute = maxRequestsPerMinute;
		this.authMaxRequestsPerMinute = authMaxRequestsPerMinute;
		this.redisTemplate = redisTemplate;
	}

	/**
	 * Checks whether the current request is still within the allowed per-minute limit.
	 *
	 * <p>Some internal or documentation endpoints are skipped. If Redis fails,
	 * the request is allowed to continue so rate limiting does not block the app completely.
	 */
	@Override
	public @NonNull Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull WebFilterChain chain) {
		Duration window = Objects.requireNonNull(Duration.ofMinutes(1), "rate limit window must not be null");
		String path = exchange.getRequest().getPath().value();

		// Skip endpoints that should not be rate-limited, such as health checks and API docs.
		if (path.startsWith("/actuator")
				|| path.startsWith("/swagger")
				|| path.startsWith("/v3/api-docs")
				|| path.startsWith("/api/v1/admin/")) {
			return chain.filter(exchange);
		}

		// Authentication endpoints have a separate limit because login/register traffic can differ from normal API usage.
		int requestLimit = path.startsWith("/api/v1/auth/") ? authMaxRequestsPerMinute : maxRequestsPerMinute;

		String userKey = exchange.getAttribute(RequestUserContext.USER_ID_ATTRIBUTE);
		var remoteAddress = exchange.getRequest().getRemoteAddress();
		String ip = remoteAddress == null ? "unknown" : String.valueOf(remoteAddress.getAddress());

		// Use both user ID and IP to avoid sharing one counter across different clients too broadly.
		String key = (userKey == null ? "anon" : userKey) + "|" + ip;

		String redisKey = "rate-limit:" + key;
		Mono<Void> pipeline = redisTemplate.opsForValue().increment(redisKey)
				.flatMap(count -> {
					// Set the expiration only when the counter is first created for this window.
					Mono<Boolean> expireUpdate = count != null && count == 1
							? redisTemplate.expire(redisKey, window)
							: Mono.just(Boolean.TRUE);
					return expireUpdate.thenReturn(count);
				})
				.flatMap(count -> {
					if (count != null && count > requestLimit) {
						exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
						return exchange.getResponse().setComplete();
					}
					return chain.filter(exchange);
				})
				// Fail open if Redis is unavailable, so users are not blocked by rate-limit infrastructure errors.
				.onErrorResume(ex -> chain.filter(exchange));

		return Objects.requireNonNull(pipeline, "rate limit pipeline must not be null");
	}
}