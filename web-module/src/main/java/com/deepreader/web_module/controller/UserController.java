package com.deepreader.web_module.controller;

import com.deepreader.web_module.model.UpdateLlmTokenRequest;
import com.deepreader.web_module.model.UpdateProfileRequest;
import com.deepreader.web_module.model.UserProfileResponse;
import com.deepreader.web_module.service.RequestUserContext;
import com.deepreader.web_module.service.UserAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users")
public class UserController {
	private final UserAccountService userAccountService;

	public UserController(UserAccountService userAccountService) {
		this.userAccountService = userAccountService;
	}

	@GetMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Get current user's profile")
	public Mono<UserProfileResponse> getProfile(ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			String userId = RequestUserContext.requireUserId(exchange);
			UserAccountService.UserRecord user = userAccountService.findById(userId);
			return toProfileResponse(user);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PutMapping(value = "/me", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Update current user's profile")
	public Mono<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request, ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			String userId = RequestUserContext.requireUserId(exchange);
			UserAccountService.UserRecord user = userAccountService.updateProfile(
					userId,
					request.username(),
					request.avatarUrl(),
					request.fullName(),
					request.phoneNumber(),
					request.location()
			);
			return toProfileResponse(user);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PutMapping(value = "/me/llm-token", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Update user's LLM API Token")
	public Mono<Void> updateLlmToken(@Valid @RequestBody UpdateLlmTokenRequest request, ServerWebExchange exchange) {
		return Mono.fromRunnable(() -> {
			String userId = RequestUserContext.requireUserId(exchange);
			userAccountService.updateLlmApiToken(userId, request.llmApiToken());
		}).subscribeOn(Schedulers.boundedElastic()).then();
	}

	private UserProfileResponse toProfileResponse(UserAccountService.UserRecord user) {
		return new UserProfileResponse(
				user.userId(),
				user.email(),
				user.username(),
				user.avatarUrl(),
				user.fullName(),
				user.phoneNumber(),
				user.location(),
				user.role().name()
		);
	}
}
