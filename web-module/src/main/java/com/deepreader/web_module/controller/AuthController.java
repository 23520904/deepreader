package com.deepreader.web_module.controller;

import com.deepreader.web_module.model.AuthLoginRequest;
import com.deepreader.web_module.model.AuthMessageResponse;
import com.deepreader.web_module.model.AuthRegisterRequest;
import com.deepreader.web_module.model.AuthResponse;
import com.deepreader.web_module.model.EmailOtpRequest;
import com.deepreader.web_module.model.LogoutRequest;
import com.deepreader.web_module.model.PasswordResetRequest;
import com.deepreader.web_module.model.RefreshTokenRequest;
import com.deepreader.web_module.service.AuditLogService;
import com.deepreader.web_module.service.EmailOtpService;
import com.deepreader.web_module.service.GoogleOAuthService;
import com.deepreader.web_module.service.JwtService;
import com.deepreader.web_module.service.SessionService;
import com.deepreader.web_module.service.UserAccountService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Handles authentication flows for email/password login, OTP verification,
 * refresh tokens, logout, and Google OAuth.
 *
 * <p>Most service calls are blocking, so endpoint logic runs on boundedElastic.
 */
@RestController
@Tag(name = "Authentication")
public class AuthController {
	private final UserAccountService userAccountService;
	private final JwtService jwtService;
	private final SessionService sessionService;
	private final EmailOtpService emailOtpService;
	private final GoogleOAuthService googleOAuthService;
	private final AuditLogService auditLogService;
	private final Counter registerCounter;
	private final Counter loginCounter;
	private final String frontendBaseUrl;
	private final List<String> allowedFrontendOrigins;

	public AuthController(
			UserAccountService userAccountService,
			JwtService jwtService,
			SessionService sessionService,
			EmailOtpService emailOtpService,
			GoogleOAuthService googleOAuthService,
			AuditLogService auditLogService,
			MeterRegistry meterRegistry,
			@Value("${deepreader.frontend.base-url:http://localhost:3000}") String frontendBaseUrl,
			@Value("${deepreader.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001}") String allowedOrigins
	) {
		this.userAccountService = userAccountService;
		this.jwtService = jwtService;
		this.sessionService = sessionService;
		this.emailOtpService = emailOtpService;
		this.googleOAuthService = googleOAuthService;
		this.auditLogService = auditLogService;
		this.registerCounter = meterRegistry.counter("deepreader.auth.register.success");
		this.loginCounter = meterRegistry.counter("deepreader.auth.login.success");
		this.frontendBaseUrl = trimTrailingSlash(frontendBaseUrl);
		this.allowedFrontendOrigins = parseAllowedOrigins(allowedOrigins);
	}

	/**
	 * Sends an OTP for new account registration.
	 *
	 * <p>The email must be available before sending the code to avoid registering
	 * duplicate accounts.
	 */
	@PostMapping(value = "/api/v1/auth/register/request-otp", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Send a sign up OTP to the user's email")
	public Mono<AuthMessageResponse> requestRegistrationOtp(@Valid @RequestBody EmailOtpRequest request) {
		return Mono.fromCallable(() -> {
			userAccountService.assertEmailAvailable(request.email());
			emailOtpService.sendRegistrationCode(request.email());
			return new AuthMessageResponse("Verification code sent to your email.");
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Registers a user after the registration OTP is verified.
	 *
	 * <p>Successful registration also creates access and refresh tokens.
	 */
	@PostMapping(value = "/api/v1/auth/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Register a new user after email OTP verification")
	public Mono<AuthResponse> register(@Valid @RequestBody AuthRegisterRequest request) {
		return Mono.fromCallable(() -> {
			emailOtpService.verifyRegistrationCode(request.email(), request.verificationCode());
			UserAccountService.UserRecord user = userAccountService.register(request.email(), request.password(), request.username());
			registerCounter.increment();
			auditLogService.log(user.userId(), "AUTH_REGISTER", "email=" + user.email());
			return issueAuthResponse(user);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Logs in a user with email and password.
	 *
	 * <p>On success, the user receives a JWT access token and a refresh token.
	 */
	@PostMapping(value = "/api/v1/auth/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Login and get JWT")
	public Mono<AuthResponse> login(@Valid @RequestBody AuthLoginRequest request) {
		return Mono.fromCallable(() -> {
			UserAccountService.UserRecord user = userAccountService.login(request.email(), request.password());
			loginCounter.increment();
			auditLogService.log(user.userId(), "AUTH_LOGIN", "email=" + user.email());
			return issueAuthResponse(user);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Sends a password reset OTP to a registered email address.
	 */
	@PostMapping(value = "/api/v1/auth/forgot-password", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Send password reset OTP")
	public Mono<AuthMessageResponse> forgotPassword(@Valid @RequestBody EmailOtpRequest request) {
		return Mono.fromCallable(() -> {
			userAccountService.assertEmailRegistered(request.email());
			emailOtpService.sendPasswordResetCode(request.email());
			return new AuthMessageResponse("Password reset code sent to your email.");
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Resets the user's password after OTP verification.
	 *
	 * <p>The audit log does not include a user ID here because the flow starts
	 * from an email address before the user is authenticated.
	 */
	@PostMapping(value = "/api/v1/auth/reset-password", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Reset password after email OTP verification")
	public Mono<AuthMessageResponse> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
		return Mono.fromCallable(() -> {
			emailOtpService.verifyPasswordResetCode(request.email(), request.verificationCode());
			userAccountService.resetPassword(request.email(), request.password());
			auditLogService.log(null, "AUTH_PASSWORD_RESET", "email=" + request.email());
			return new AuthMessageResponse("Password updated. You can log in with your new password.");
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Starts Google OAuth login by redirecting the browser to Google's authorization URL.
	 *
	 * <p>The encoded state keeps the selected frontend origin and next path so
	 * the callback can safely return the user to the correct frontend page.
	 */
	@GetMapping("/api/v1/auth/google/authorize")
	@Operation(summary = "Start Google OAuth login")
	public Mono<ResponseEntity<Void>> googleAuthorize(
			@RequestParam(required = false) String origin,
			@RequestParam(name = "next", required = false) String next
	) {
		return Mono.fromCallable(() -> {
			String frontendOrigin = resolveFrontendOrigin(origin);
			String nextPath = normalizeNextPath(next);
			URI location = googleOAuthService.buildAuthorizationUri(encodeState(frontendOrigin, nextPath));
			return ResponseEntity.status(HttpStatus.FOUND).location(location).<Void>build();
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Completes Google OAuth login after Google redirects back with a code.
	 *
	 * <p>Errors are redirected back to the frontend callback route so the UI can
	 * display a friendly login failure message.
	 */
	@GetMapping({"/api/v1/auth/google/callback", "/login/oauth2/code/google"})
	@Operation(summary = "Complete Google OAuth login")
	public Mono<ResponseEntity<Void>> googleCallback(
			@RequestParam(required = false) String code,
			@RequestParam(required = false) String state,
			@RequestParam(required = false) String error
	) {
		return Mono.fromCallable(() -> {
			OAuthState oauthState = decodeState(state);
			if (StringUtils.hasText(error)) {
				return redirectToGoogleCallbackError(oauthState.origin(), "Google login was cancelled.");
			}
			if (!StringUtils.hasText(code)) {
				return redirectToGoogleCallbackError(oauthState.origin(), "Google authorization code is missing.");
			}

			try {
				GoogleOAuthService.GoogleProfile profile = googleOAuthService.exchangeCodeForProfile(code);
				UserAccountService.UserRecord user = userAccountService.findOrCreateGoogleUser(
						profile.subject(),
						profile.email(),
						profile.name(),
						profile.picture()
				);
				loginCounter.increment();
				auditLogService.log(user.userId(), "AUTH_GOOGLE_LOGIN", "email=" + user.email());
				return redirectToGoogleCallbackSuccess(oauthState.origin(), oauthState.nextPath(), issueAuthResponse(user));
			} catch (IllegalArgumentException ex) {
				return redirectToGoogleCallbackError(oauthState.origin(), ex.getMessage());
			}
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Rotates a refresh token and returns a new access token.
	 *
	 * <p>Token rotation reduces the risk of reusing old refresh tokens for long periods.
	 */
	@PostMapping(value = "/api/v1/auth/refresh", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Rotate refresh token and issue a new access token")
	public Mono<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
		return Mono.fromCallable(() -> {
			String userId = sessionService.requireUserIdByRefreshToken(request.refreshToken());
			UserAccountService.UserRecord user = userAccountService.findById(userId);
			String newRefreshToken = sessionService.rotateRefreshToken(request.refreshToken());
			String accessToken = jwtService.generateAccessToken(user.userId(), user.role());
			auditLogService.log(user.userId(), "AUTH_REFRESH", "session refreshed");
			return new AuthResponse(user.userId(), user.email(), user.username(), user.avatarUrl(), accessToken, newRefreshToken, user.role().name());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	/**
	 * Revokes a refresh token so the session can no longer be refreshed.
	 */
	@PostMapping(value = "/api/v1/auth/logout", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Revoke refresh token/session")
	public Mono<Void> logout(@Valid @RequestBody LogoutRequest request) {
		return Mono.fromRunnable(() -> sessionService.revoke(request.refreshToken()))
				.subscribeOn(Schedulers.boundedElastic())
				.then();
	}

	/**
	 * Alias for logout to support clients that call the action "revoke".
	 */
	@PostMapping(value = "/api/v1/auth/revoke", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Alias for logout to revoke refresh token/session")
	public Mono<Void> revoke(@Valid @RequestBody LogoutRequest request) {
		return logout(request);
	}

	/**
	 * Creates the standard authentication response for login and registration flows.
	 */
	private AuthResponse issueAuthResponse(UserAccountService.UserRecord user) {
		String token = jwtService.generateAccessToken(user.userId(), user.role());
		String refreshToken = sessionService.createRefreshToken(user.userId());
		return new AuthResponse(user.userId(), user.email(), user.username(), user.avatarUrl(), token, refreshToken, user.role().name());
	}

	/**
	 * Redirects the browser to the frontend Google callback route after successful login.
	 *
	 * <p>Tokens and user profile fields are placed in the URL fragment so they are
	 * handled by the browser-side app instead of being sent as query parameters.
	 */
	private ResponseEntity<Void> redirectToGoogleCallbackSuccess(String origin, String nextPath, AuthResponse response) {
		Map<String, String> fragmentValues = new LinkedHashMap<>();
		fragmentValues.put("token", response.token());
		fragmentValues.put("refreshToken", response.refreshToken());
		fragmentValues.put("userId", response.userId());
		fragmentValues.put("email", response.email());
		fragmentValues.put("username", response.username());
		fragmentValues.put("avatarUrl", response.avatarUrl());
		fragmentValues.put("role", response.role());
		fragmentValues.put("next", nextPath);
		return redirectToFrontendCallback(origin, fragmentValues);
	}

	/**
	 * Redirects the browser to the frontend callback route with an OAuth error message.
	 */
	private ResponseEntity<Void> redirectToGoogleCallbackError(String origin, String message) {
		return redirectToFrontendCallback(origin, Map.of("error", message));
	}

	/**
	 * Builds the final frontend callback redirect with URL-encoded fragment values.
	 */
	private ResponseEntity<Void> redirectToFrontendCallback(String origin, Map<String, String> fragmentValues) {
		String fragment = fragmentValues.entrySet().stream()
				.filter(entry -> StringUtils.hasText(entry.getValue()))
				.map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
				.reduce((left, right) -> left + "&" + right)
				.orElse("");
		return ResponseEntity.status(HttpStatus.FOUND)
				.location(URI.create(origin + "/auth/google/callback#" + fragment))
				.build();
	}

	/**
	 * Encodes OAuth state containing the frontend origin and next path.
	 *
	 * <p>URL-safe Base64 is used so the state can be passed through the OAuth redirect.
	 */
	private String encodeState(String origin, String nextPath) {
		String raw = origin + "\n" + nextPath;
		return Base64.getUrlEncoder()
				.withoutPadding()
				.encodeToString(raw.getBytes(StandardCharsets.UTF_8));
	}

	/**
	 * Decodes OAuth state and falls back to safe defaults when state is missing or invalid.
	 */
	private OAuthState decodeState(String encodedState) {
		if (!StringUtils.hasText(encodedState)) {
			return new OAuthState(resolveFrontendOrigin(null), "/");
		}

		try {
			String raw = new String(Base64.getUrlDecoder().decode(encodedState), StandardCharsets.UTF_8);
			String[] parts = raw.split("\n", 2);
			return new OAuthState(
					resolveFrontendOrigin(parts.length > 0 ? parts[0] : null),
					normalizeNextPath(parts.length > 1 ? parts[1] : null)
			);
		} catch (IllegalArgumentException ex) {
			// Invalid state should not break the login flow; use the configured frontend instead.
			return new OAuthState(resolveFrontendOrigin(null), "/");
		}
	}

	/**
	 * Chooses a safe frontend origin for redirects.
	 *
	 * <p>Only configured allowed origins are accepted to avoid open redirect issues.
	 */
	private String resolveFrontendOrigin(String requestedOrigin) {
		String normalizedRequested = trimTrailingSlash(requestedOrigin);
		if (StringUtils.hasText(normalizedRequested) && allowedFrontendOrigins.contains(normalizedRequested)) {
			return normalizedRequested;
		}
		return frontendBaseUrl;
	}

	/**
	 * Parses configured frontend origins and normalizes trailing slashes.
	 */
	private List<String> parseAllowedOrigins(String allowedOrigins) {
		List<String> parsed = Arrays.stream(allowedOrigins.split(","))
				.map(this::trimTrailingSlash)
				.filter(StringUtils::hasText)
				.toList();
		if (!parsed.isEmpty()) {
			return parsed;
		}
		return List.of(frontendBaseUrl);
	}

	/**
	 * Normalizes the post-login destination path.
	 *
	 * <p>Only local absolute paths are allowed. External URLs and protocol-relative
	 * paths are replaced with "/" for redirect safety.
	 */
	private String normalizeNextPath(String nextPath) {
		if (!StringUtils.hasText(nextPath)) {
			return "/";
		}
		String trimmed = nextPath.trim();
		if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
			return "/";
		}
		return trimmed;
	}

	/**
	 * Removes trailing slashes from configured origins.
	 */
	private String trimTrailingSlash(String value) {
		if (!StringUtils.hasText(value)) {
			return "";
		}
		String trimmed = value.trim();
		while (trimmed.endsWith("/") && trimmed.length() > "https://".length()) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}

	/**
	 * URL-encodes values placed in the frontend callback fragment.
	 */
	private String urlEncode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	// Holds the safe redirect origin and local path restored from OAuth state.
	private record OAuthState(String origin, String nextPath) {
	}
}