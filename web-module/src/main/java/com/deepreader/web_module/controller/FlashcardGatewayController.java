package com.deepreader.web_module.controller;

import com.deepreader.web_module.client.BusinessServiceClient;
import com.deepreader.web_module.service.RequestUserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/flashcards")
@Tag(name = "Flashcards Gateway")
public class FlashcardGatewayController {

	private final BusinessServiceClient businessServiceClient;

	public FlashcardGatewayController(BusinessServiceClient businessServiceClient) {
		this.businessServiceClient = businessServiceClient;
	}

	@PatchMapping(value = "/{cardId}/edit", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Edit a flashcard's question and/or answer")
	public Mono<ResponseEntity<Void>> editFlashcard(
			@PathVariable String cardId,
			@RequestBody EditRequest request,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.editFlashcard(userId, cardId, request)
				.thenReturn(ResponseEntity.noContent().build());
	}

	@PatchMapping(value = "/{cardId}/hide", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Hide or unhide a flashcard")
	public Mono<ResponseEntity<Void>> hideFlashcard(
			@PathVariable String cardId,
			@RequestBody HideRequest request,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.hideFlashcard(userId, cardId, request)
				.thenReturn(ResponseEntity.noContent().build());
	}

	public record EditRequest(String question, String answer) {}
	public record HideRequest(boolean hidden) {}
}
