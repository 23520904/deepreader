package com.deepreader.web_module.controller;

import com.deepreader.web_module.model.AuthLoginRequest;
import com.deepreader.web_module.model.AuthRegisterRequest;
import com.deepreader.web_module.model.AuthResponse;
import com.deepreader.web_module.model.LogoutRequest;
import com.deepreader.web_module.model.RefreshTokenRequest;
import com.deepreader.web_module.service.AuditLogService;
import com.deepreader.web_module.service.JwtService;
import com.deepreader.web_module.service.SessionService;
import com.deepreader.web_module.service.UserAccountService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication")
public class AuthController {
	private final UserAccountService userAccountService;
	private final JwtService jwtService;
	private final SessionService sessionService;
	private final AuditLogService auditLogService;
	private final Counter registerCounter;
	private final Counter loginCounter;

	public AuthController(UserAccountService userAccountService, JwtService jwtService, SessionService sessionService, AuditLogService auditLogService, MeterRegistry meterRegistry) {
		this.userAccountService = userAccountService;
		this.jwtService = jwtService;
		this.sessionService = sessionService;
		this.auditLogService = auditLogService;
		this.registerCounter = meterRegistry.counter("deepreader.auth.register.success");
		this.loginCounter = meterRegistry.counter("deepreader.auth.login.success");
	}

	@PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Register a new user")
	public Mono<AuthResponse> register(@Valid @RequestBody AuthRegisterRequest request) {
		return Mono.fromCallable(() -> {
			UserAccountService.UserRecord user = userAccountService.register(request.email(), request.password());
			String token = jwtService.generateAccessToken(user.userId(), user.role());
			String refreshToken = sessionService.createRefreshToken(user.userId());
			registerCounter.increment();
			auditLogService.log(user.userId(), "AUTH_REGISTER", "email=" + user.email());
			return new AuthResponse(user.userId(), user.email(), token, refreshToken, user.role().name());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Login and get JWT")
	public Mono<AuthResponse> login(@Valid @RequestBody AuthLoginRequest request) {
		return Mono.fromCallable(() -> {
			UserAccountService.UserRecord user = userAccountService.login(request.email(), request.password());
			String token = jwtService.generateAccessToken(user.userId(), user.role());
			String refreshToken = sessionService.createRefreshToken(user.userId());
			loginCounter.increment();
			auditLogService.log(user.userId(), "AUTH_LOGIN", "email=" + user.email());
			return new AuthResponse(user.userId(), user.email(), token, refreshToken, user.role().name());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/refresh", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Rotate refresh token and issue a new access token")
	public Mono<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
		return Mono.fromCallable(() -> {
			String userId = sessionService.requireUserIdByRefreshToken(request.refreshToken());
			UserAccountService.UserRecord user = userAccountService.findById(userId);
			String newRefreshToken = sessionService.rotateRefreshToken(request.refreshToken());
			String accessToken = jwtService.generateAccessToken(user.userId(), user.role());
			auditLogService.log(user.userId(), "AUTH_REFRESH", "session refreshed");
			return new AuthResponse(user.userId(), user.email(), accessToken, newRefreshToken, user.role().name());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/logout", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Revoke refresh token/session")
	public Mono<Void> logout(@Valid @RequestBody LogoutRequest request) {
		return Mono.fromRunnable(() -> sessionService.revoke(request.refreshToken()))
				.subscribeOn(Schedulers.boundedElastic())
				.then();
	}

	@PostMapping(value = "/revoke", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Alias for logout to revoke refresh token/session")
	public Mono<Void> revoke(@Valid @RequestBody LogoutRequest request) {
		return logout(request);
	}
}
