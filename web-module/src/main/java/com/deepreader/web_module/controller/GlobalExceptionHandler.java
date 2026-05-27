package com.deepreader.web_module.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.ServerWebInputException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler {
	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex, ServerWebExchange exchange) {
		return badRequest(ex.getMessage(), ex, exchange);
	}

	@ExceptionHandler(WebExchangeBindException.class)
	public ResponseEntity<Map<String, String>> handleValidation(WebExchangeBindException ex, ServerWebExchange exchange) {
		String message = ex.getFieldErrors().stream()
				.map(this::formatFieldError)
				.collect(Collectors.joining("; "));
		if (message.isBlank()) {
			message = "Request validation failed";
		}
		return badRequest(message, ex, exchange);
	}

	@ExceptionHandler(ServerWebInputException.class)
	public ResponseEntity<Map<String, String>> handleServerWebInput(ServerWebInputException ex, ServerWebExchange exchange) {
		String reason = ex.getReason();
		String message = reason == null || reason.isBlank() ? "Request body is invalid" : reason;
		return badRequest(message, ex, exchange);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex, ServerWebExchange exchange) {
		return badRequest(rootCauseMessage(ex), ex, exchange);
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex, ServerWebExchange exchange) {
		HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
		if (status == null) {
			status = HttpStatus.INTERNAL_SERVER_ERROR;
		}
		String reason = ex.getReason();
		String message = reason == null || reason.isBlank() ? status.getReasonPhrase() : reason;
		log.warn("Request failed: path={}, status={}, error={}", exchange.getRequest().getPath().value(), status.value(), message, ex);
		return ResponseEntity.status(status).body(Map.of("error", message));
	}

	private String formatFieldError(FieldError error) {
		String defaultMessage = error.getDefaultMessage();
		String message = defaultMessage == null || defaultMessage.isBlank()
				? "is invalid"
				: defaultMessage;
		return error.getField() + " " + message;
	}

	private ResponseEntity<Map<String, String>> badRequest(String message, Exception ex, ServerWebExchange exchange) {
		String error = message == null || message.isBlank() ? "Bad Request" : message;
		log.warn("Bad request: path={}, error={}", exchange.getRequest().getPath().value(), error, ex);
		return ResponseEntity.badRequest().body(Map.of("error", error));
	}

	private String rootCauseMessage(Throwable throwable) {
		Throwable current = throwable;
		while (current.getCause() != null) {
			current = current.getCause();
		}
		String message = current.getMessage();
		return message == null || message.isBlank() ? "Database rejected the request" : message;
	}
}
