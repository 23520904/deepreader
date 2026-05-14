package com.deepreader.web_module.controller;

import com.deepreader.web_module.config.AuthWebFilter;
import com.deepreader.web_module.config.RateLimitWebFilter;
import com.deepreader.web_module.model.UserRole;
import com.deepreader.web_module.service.AuditLogService;
import com.deepreader.web_module.service.JwtService;
import com.deepreader.web_module.service.SessionService;
import com.deepreader.web_module.service.UserAccountService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveUserDetailsServiceAutoConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

import static org.mockito.Mockito.when;

@WebFluxTest(
		controllers = AuthController.class,
		excludeAutoConfiguration = {
				ReactiveSecurityAutoConfiguration.class,
				ReactiveUserDetailsServiceAutoConfiguration.class
		},
		excludeFilters = {
				@ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = RateLimitWebFilter.class),
				@ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = AuthWebFilter.class)
		}
)
@Import(GlobalExceptionHandler.class)
@SuppressWarnings({"removal", "unused"})
class AuthControllerWebFluxTest {

	@Autowired
	private WebTestClient webTestClient;

	@MockBean
	private UserAccountService userAccountService;

	@MockBean
	private JwtService jwtService;

	@MockBean
	private SessionService sessionService;

	@MockBean
	@SuppressWarnings("unused")
	private AuditLogService auditLogService;

	@TestConfiguration
	@SuppressWarnings("unused")
	static class TestMeterRegistryConfig {
		@Bean
		SimpleMeterRegistry meterRegistry() {
			return new SimpleMeterRegistry();
		}
	}

	@Test
	void registerReturnsAuthResponseOnSuccess() {
		UserAccountService.UserRecord user = new UserAccountService.UserRecord(
				"user-1",
				"k6@example.com",
				"K6 User",
				null,
				null,
				null,
				null,
				UserRole.USER,
				null
		);
		when(userAccountService.register("k6@example.com", "password123", "K6 User")).thenReturn(user);
		when(jwtService.generateAccessToken("user-1", UserRole.USER)).thenReturn("jwt-token");
		when(sessionService.createRefreshToken("user-1")).thenReturn("refresh-token");

		webTestClient.post()
				.uri("/api/v1/auth/register")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.bodyValue("{\"username\":\"K6 User\",\"email\":\"k6@example.com\",\"password\":\"password123\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.userId").isEqualTo("user-1")
				.jsonPath("$.token").isEqualTo("jwt-token")
				.jsonPath("$.refreshToken").isEqualTo("refresh-token");
	}

	@Test
	void loginReturnsBadRequestForInvalidEmailFormat() {
		webTestClient.post()
				.uri("/api/v1/auth/login")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.bodyValue("{\"email\":\"bad-email\",\"password\":\"password123\"}")
				.exchange()
				.expectStatus().isBadRequest();
	}
}
