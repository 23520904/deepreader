package com.deepreader.web_module.controller;

import com.deepreader.web_module.service.RequestUserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin")
public class AdminController {
	private final JdbcTemplate jdbcTemplate;

	public AdminController(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@GetMapping(value = "/audit-logs", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "List recent audit logs (admin only)")
	public Mono<List<Map<String, Object>>> auditLogs(@RequestParam(name = "limit", defaultValue = "100") int limit, ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			RequestUserContext.requireAdmin(exchange);
			int safeLimit = Math.min(Math.max(limit, 1), 500);
			return jdbcTemplate.queryForList("select user_id, action, details, created_at from audit_logs order by created_at desc limit ?", safeLimit);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@GetMapping(value = "/dead-letters", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "List ingestion dead letters (admin only)")
	public Mono<List<Map<String, Object>>> deadLetters(@RequestParam(name = "sinceHours", defaultValue = "24") int sinceHours, ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			RequestUserContext.requireAdmin(exchange);
			int safeHours = Math.min(Math.max(sinceHours, 1), 168);
			Instant since = Instant.now().minusSeconds(safeHours * 3600L);
			return jdbcTemplate.queryForList(
					"select job_id, user_id, file_name, error_message, attempts, created_at from ingestion_job_dead_letters where created_at >= ? order by created_at desc",
					java.sql.Timestamp.from(since)
			);
		}).subscribeOn(Schedulers.boundedElastic());
	}
}
