package com.deepreader.ai_service.config;

import com.deepreader.ai_service.service.RequestUserContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.data.redis.core.StringRedisTemplate;
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

@Component
public class RateLimitWebFilter implements WebFilter {

	private static final int LIMIT_PER_MINUTE = 60;

	private final StringRedisTemplate redisTemplate;
	private final AntPathMatcher matcher = new AntPathMatcher();
	private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

	public RateLimitWebFilter(org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
		this.redisTemplate = redisTemplateProvider.getIfAvailable();
	}

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		String path = exchange.getRequest().getPath().value();
		boolean documentsPath = matcher.match("/api/documents/**", path) || matcher.match("/api/v1/documents/**", path);
		if (!documentsPath) {
			return chain.filter(exchange);
		}
		String userId = exchange.getAttribute(RequestUserContext.USER_ID_ATTRIBUTE);
		if (userId == null || userId.isBlank()) {
			return chain.filter(exchange);
		}
		long currentMinute = Instant.now().getEpochSecond() / 60;
		String key = userId + ":" + currentMinute;
		int current = incrementCount(key, currentMinute);
		if (current > LIMIT_PER_MINUTE) {
			return tooManyRequests(exchange);
		}
		return chain.filter(exchange);
	}

	private int incrementCount(String key, long currentMinute) {
		if (redisTemplate != null) {
			try {
				Long value = redisTemplate.opsForValue().increment("rl:" + key);
				redisTemplate.expire("rl:" + key, 70, TimeUnit.SECONDS);
				return value == null ? 1 : value.intValue();
			} catch (RuntimeException ignored) {
				// fallback to in-memory limiter when Redis is unavailable
			}
		}
		WindowCounter counter = counters.computeIfAbsent(key, ignored -> new WindowCounter(currentMinute));
		return counter.counter().incrementAndGet();
	}

	private Mono<Void> tooManyRequests(ServerWebExchange exchange) {
		exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
		exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
		byte[] bytes = "{\"error\":\"rate limit exceeded\"}".getBytes(StandardCharsets.UTF_8);
		return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
	}

	private record WindowCounter(long minute, AtomicInteger counter) {
		WindowCounter(long minute) {
			this(minute, new AtomicInteger(0));
		}
	}
}
