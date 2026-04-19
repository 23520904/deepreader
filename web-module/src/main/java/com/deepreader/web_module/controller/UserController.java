package com.deepreader.web_module.controller;

import com.deepreader.web_module.model.UpdateLlmTokenRequest;
import com.deepreader.web_module.service.RequestUserContext;
import com.deepreader.web_module.service.UserAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
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

	@PutMapping(value = "/me/llm-token", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Update user's LLM API Token")
	public Mono<Void> updateLlmToken(@Valid @RequestBody UpdateLlmTokenRequest request, ServerWebExchange exchange) {
		return Mono.fromRunnable(() -> {
			String userId = RequestUserContext.requireUserId(exchange);
			userAccountService.updateLlmApiToken(userId, request.llmApiToken());
		}).subscribeOn(Schedulers.boundedElastic()).then();
	}
}
