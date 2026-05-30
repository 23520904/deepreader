package com.deepreader.web_module.controller;

import com.deepreader.web_module.config.AuthWebFilter;
import com.deepreader.web_module.config.RateLimitWebFilter;
import com.deepreader.web_module.model.UserRole;
import com.deepreader.web_module.service.AuditLogService;
import com.deepreader.web_module.service.EmailVerificationService;
import com.deepreader.web_module.service.GoogleAuthService;
import com.deepreader.web_module.service.JwtService;
import com.deepreader.web_module.service.LoginHistoryService;
import com.deepreader.web_module.service.PasswordResetService;
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
import static org.mockito.Mockito.verify;

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

	@MockBean
	private EmailVerificationService emailVerificationService;

	@MockBean
	private GoogleAuthService googleAuthService;

	@MockBean
	private PasswordResetService passwordResetService;

	@MockBean
	@SuppressWarnings("unused")
	private LoginHistoryService loginHistoryService;

	@TestConfiguration
	@SuppressWarnings("unused")
	static class TestMeterRegistryConfig {
		@Bean
		SimpleMeterRegistry meterRegistry() {
			return new SimpleMeterRegistry();
		}
	}

	@Test
	void registerReturnsVerificationMessageOnSuccess() {
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

		webTestClient.post()
				.uri("/api/v1/auth/register")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.bodyValue("{\"username\":\"K6 User\",\"email\":\"k6@example.com\",\"password\":\"password123\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.message").isEqualTo("Registration successful. Please verify your email.")
				.jsonPath("$.email").isEqualTo("k6@example.com");

		verify(emailVerificationService).sendRegistrationOtp("k6@example.com");
	}

	@Test
	void registerReturnsBadRequestWhenBodyIsMissing() {
		webTestClient.post()
				.uri("/api/v1/auth/register")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.exchange()
				.expectStatus().isBadRequest()
				.expectBody()
				.jsonPath("$.error").isEqualTo("No request body");
	}

	@Test
	void registerReturnsBadRequestForInvalidPassword() {
		webTestClient.post()
				.uri("/api/v1/auth/register")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.bodyValue("{\"username\":\"K6 User\",\"email\":\"k6@example.com\",\"password\":\"short\"}")
				.exchange()
				.expectStatus().isBadRequest()
				.expectBody()
				.jsonPath("$.error").isEqualTo("password size must be between 8 and 128");
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

	@Test
	void googleLoginReturnsAuthResponseOnSuccess() {
		GoogleAuthService.GoogleProfile profile = new GoogleAuthService.GoogleProfile(
				"google-subject-1",
				"k6@example.com",
				"K6 User",
				"https://example.com/avatar.png"
		);
		UserAccountService.UserRecord user = new UserAccountService.UserRecord(
				"user-1",
				"k6@example.com",
				"K6 User",
				"https://example.com/avatar.png",
				null,
				null,
				null,
				UserRole.USER,
				null
		);
		when(googleAuthService.verifyIdToken("google-id-token")).thenReturn(profile);
		when(userAccountService.findOrCreateGoogleUser(profile)).thenReturn(user);
		when(jwtService.generateAccessToken("user-1", UserRole.USER)).thenReturn("jwt-token");
		when(sessionService.createRefreshToken("user-1")).thenReturn("refresh-token");

		webTestClient.post()
				.uri("/api/v1/auth/google")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.bodyValue("{\"idToken\":\"google-id-token\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.userId").isEqualTo("user-1")
				.jsonPath("$.token").isEqualTo("jwt-token")
				.jsonPath("$.refreshToken").isEqualTo("refresh-token");
	}

	@Test
	void forgotPasswordReturnsGenericSuccess() {
		webTestClient.post()
				.uri("/api/v1/auth/forgot-password")
				.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
				.bodyValue("{\"email\":\"k6@example.com\"}")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.message").isEqualTo("If this email exists, a reset code has been sent.");
	}
}
