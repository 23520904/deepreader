package com.deepreader.web_module.controller;

import com.deepreader.web_module.client.BusinessServiceClient;
import com.deepreader.web_module.service.JwtService;
import com.deepreader.web_module.service.RequestUserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/reading-sessions")
@Tag(name = "Reading Sessions Gateway")
public class ReadingSessionGatewayController {

	private final BusinessServiceClient businessServiceClient;
	private final JwtService jwtService;

	public ReadingSessionGatewayController(BusinessServiceClient businessServiceClient, JwtService jwtService) {
		this.businessServiceClient = businessServiceClient;
		this.jwtService = jwtService;
	}

	@PostMapping(value = "/sync", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Regular heartbeat read session sync using Authorization Header")
	public Mono<ResponseEntity<Void>> syncSession(
			@RequestBody ReadingSessionSyncRequest body,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		return businessServiceClient.addReadingSeconds(userId, body.bookId(), body.secondsSpent())
				.thenReturn(ResponseEntity.noContent().build());
	}

	@PostMapping(value = "/sync-beacon", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Unload beacon read session sync with manual JWT validation in body")
	public Mono<ResponseEntity<Void>> syncBeacon(
			@RequestBody ReadingSessionBeaconRequest body
	) {
		if (body.token() == null || body.token().isBlank()) {
			return Mono.just(ResponseEntity.badRequest().build());
		}
		try {
			JwtService.AuthPrincipal principal = jwtService.verifyAndGetPrincipal(body.token());
			return businessServiceClient.addReadingSeconds(principal.userId(), body.bookId(), body.secondsSpent())
					.thenReturn(ResponseEntity.noContent().build());
		} catch (Exception e) {
			return Mono.just(ResponseEntity.status(401).build());
		}
	}

	public record ReadingSessionSyncRequest(String bookId, int secondsSpent) {}
	public record ReadingSessionBeaconRequest(String bookId, int secondsSpent, String token) {}
}
