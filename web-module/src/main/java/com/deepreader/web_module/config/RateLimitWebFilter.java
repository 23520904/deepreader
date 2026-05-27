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

	@Override
	public @NonNull Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull WebFilterChain chain) {
		Duration window = Objects.requireNonNull(Duration.ofMinutes(1), "rate limit window must not be null");
		String path = exchange.getRequest().getPath().value();
		if (path.startsWith("/actuator")
				|| path.startsWith("/swagger")
				|| path.startsWith("/v3/api-docs")
				|| path.startsWith("/api/v1/admin/")) {
			return chain.filter(exchange);
		}
		int requestLimit = path.startsWith("/api/v1/auth/") ? authMaxRequestsPerMinute : maxRequestsPerMinute;

		String userKey = exchange.getAttribute(RequestUserContext.USER_ID_ATTRIBUTE);
		var remoteAddress = exchange.getRequest().getRemoteAddress();
		String ip = remoteAddress == null ? "unknown" : String.valueOf(remoteAddress.getAddress());
		String key = (userKey == null ? "anon" : userKey) + "|" + ip;

		String redisKey = "rate-limit:" + key;
		Mono<Long> requestCount = redisTemplate.opsForValue().increment(redisKey)
				.flatMap(count -> {
					Mono<Boolean> expireUpdate = count != null && count == 1
							? redisTemplate.expire(redisKey, window)
							: Mono.just(Boolean.TRUE);
					return expireUpdate.thenReturn(count);
				})
				.onErrorResume(ex -> Mono.just(0L));
		Mono<Void> pipeline = requestCount.flatMap(count -> {
			if (count != null && count > requestLimit) {
				exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
				return exchange.getResponse().setComplete();
			}
			return chain.filter(exchange);
		});
		return Objects.requireNonNull(pipeline, "rate limit pipeline must not be null");
	}
}
