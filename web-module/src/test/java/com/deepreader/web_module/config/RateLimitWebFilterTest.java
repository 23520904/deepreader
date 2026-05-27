package com.deepreader.web_module.config;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.ReactiveValueOperations;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RateLimitWebFilterTest {

	@Test
	void downstreamErrorsAreNotRetriedWithConsumedRequestBody() {
		ReactiveStringRedisTemplate redisTemplate = mock(ReactiveStringRedisTemplate.class);
		ReactiveValueOperations<String, String> valueOperations = mock(ReactiveValueOperations.class);
		when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		when(valueOperations.increment(anyString())).thenReturn(Mono.just(1L));
		when(redisTemplate.expire(anyString(), any(Duration.class))).thenReturn(Mono.just(Boolean.TRUE));

		RateLimitWebFilter filter = new RateLimitWebFilter(120, 600, redisTemplate);
		MockServerWebExchange exchange = MockServerWebExchange.from(
				MockServerHttpRequest.post("/api/v1/auth/register")
						.header("Content-Type", "application/json")
						.body("{\"username\":\"curltest01\",\"email\":\"curltest01@gmail.com\",\"password\":\"Admin@123456\"}")
		);
		AtomicInteger chainInvocations = new AtomicInteger();

		assertThatThrownBy(() -> filter.filter(exchange, next -> {
					chainInvocations.incrementAndGet();
					return Mono.error(new IllegalArgumentException("downstream boom"));
				}).block())
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessage("downstream boom");

		assertThat(chainInvocations).hasValue(1);
	}
}
