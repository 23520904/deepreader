package com.deepreader.web_module.controller;

import com.deepreader.web_module.model.AuthLoginRequest;
import com.deepreader.web_module.model.AuthMessageResponse;
import com.deepreader.web_module.model.AuthRegisterRequest;
import com.deepreader.web_module.model.AuthResponse;
import com.deepreader.web_module.model.ForgotPasswordRequest;
import com.deepreader.web_module.model.GoogleAuthRequest;
import com.deepreader.web_module.model.LogoutRequest;
import com.deepreader.web_module.model.RefreshTokenRequest;
import com.deepreader.web_module.model.ResendOtpRequest;
import com.deepreader.web_module.model.ResetPasswordRequest;
import com.deepreader.web_module.model.VerifyEmailRequest;
import com.deepreader.web_module.service.AuditLogService;
import com.deepreader.web_module.service.EmailVerificationService;
import com.deepreader.web_module.service.GoogleAuthService;
import com.deepreader.web_module.service.JwtService;
import com.deepreader.web_module.service.PasswordResetService;
import com.deepreader.web_module.service.SessionService;
import com.deepreader.web_module.service.UserAccountService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
	private static final Logger log = LoggerFactory.getLogger(AuthController.class);

	private final UserAccountService userAccountService;
	private final JwtService jwtService;
	private final SessionService sessionService;
	private final AuditLogService auditLogService;
	private final EmailVerificationService emailVerificationService;
	private final GoogleAuthService googleAuthService;
	private final PasswordResetService passwordResetService;
	private final Counter registerCounter;
	private final Counter loginCounter;

	public AuthController(
			UserAccountService userAccountService,
			JwtService jwtService,
			SessionService sessionService,
			AuditLogService auditLogService,
			EmailVerificationService emailVerificationService,
			GoogleAuthService googleAuthService,
			PasswordResetService passwordResetService,
			MeterRegistry meterRegistry
	) {
		this.userAccountService = userAccountService;
		this.jwtService = jwtService;
		this.sessionService = sessionService;
		this.auditLogService = auditLogService;
		this.emailVerificationService = emailVerificationService;
		this.googleAuthService = googleAuthService;
		this.passwordResetService = passwordResetService;
		this.registerCounter = meterRegistry.counter("deepreader.auth.register.success");
		this.loginCounter = meterRegistry.counter("deepreader.auth.login.success");
	}

	@PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Register a new user")
	public Mono<AuthMessageResponse> register(@Valid @RequestBody AuthRegisterRequest request) {
		log.info("Register request received: email={}, username={}", request.email(), request.username());
		return Mono.fromCallable(() -> {
			UserAccountService.UserRecord user = userAccountService.register(request.email(), request.password(), request.username());
			emailVerificationService.sendRegistrationOtp(user.email());
			registerCounter.increment();
			auditLogService.log(user.userId(), "AUTH_REGISTER_PENDING_EMAIL_VERIFICATION", "email=" + user.email());
			log.info("Register request completed: userId={}, email={}, role={}, emailVerified=false", user.userId(), user.email(), user.role());
			return new AuthMessageResponse("Registration successful. Please verify your email.", user.email());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/verify-email", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Verify signup email with OTP")
	public Mono<AuthMessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
		return Mono.fromCallable(() -> {
			emailVerificationService.verifyEmail(request.email(), request.otp());
			auditLogService.log(null, "AUTH_EMAIL_VERIFIED", "email=" + request.email());
			return new AuthMessageResponse("Email verified successfully. You can now log in.", request.email());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/resend-otp", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Resend signup email verification OTP")
	public Mono<AuthMessageResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
		return Mono.fromCallable(() -> {
			emailVerificationService.resendOtp(request.email());
			auditLogService.log(null, "AUTH_EMAIL_VERIFICATION_OTP_RESENT", "email=" + request.email());
			return new AuthMessageResponse("Verification code sent.", request.email());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Login and get JWT")
	public Mono<AuthResponse> login(@Valid @RequestBody AuthLoginRequest request) {
		return Mono.fromCallable(() -> {
			UserAccountService.UserRecord user = userAccountService.login(request.email(), request.password());
			auditLogService.log(user.userId(), "AUTH_LOGIN", "email=" + user.email());
			return issueAuthResponse(user);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/google", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Login or register with Google idToken")
	public Mono<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request) {
		return Mono.fromCallable(() -> {
			GoogleAuthService.GoogleProfile profile = googleAuthService.verifyIdToken(request.idToken());
			UserAccountService.UserRecord user = userAccountService.findOrCreateGoogleUser(profile);
			auditLogService.log(user.userId(), "AUTH_GOOGLE_LOGIN", "email=" + user.email());
			return issueAuthResponse(user);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/forgot-password", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Send password reset OTP when the account exists")
	public Mono<AuthMessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		return Mono.fromCallable(() -> {
			try {
				passwordResetService.requestReset(request.email());
			} catch (Exception ex) {
				log.warn("Password reset request could not be completed for email={}", request.email(), ex);
			}
			return new AuthMessageResponse("If this email exists, a reset code has been sent.", request.email());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/reset-password", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Reset password with email OTP")
	public Mono<AuthMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		return Mono.fromCallable(() -> {
			passwordResetService.resetPassword(request.email(), request.otp(), request.newPassword());
			auditLogService.log(null, "AUTH_PASSWORD_RESET", "email=" + request.email());
			return new AuthMessageResponse("Password reset successful. You can now log in.", request.email());
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
			return new AuthResponse(user.userId(), user.email(), user.username(), user.avatarUrl(), accessToken, newRefreshToken, user.role().name());
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

	private AuthResponse issueAuthResponse(UserAccountService.UserRecord user) {
		String token = jwtService.generateAccessToken(user.userId(), user.role());
		String refreshToken = sessionService.createRefreshToken(user.userId());
		loginCounter.increment();
		return new AuthResponse(user.userId(), user.email(), user.username(), user.avatarUrl(), token, refreshToken, user.role().name());
	}
}
