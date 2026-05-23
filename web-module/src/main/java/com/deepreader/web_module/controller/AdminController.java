package com.deepreader.web_module.controller;

import com.deepreader.core.model.Book;
import com.deepreader.web_module.client.BusinessServiceClient;
import com.deepreader.web_module.service.RequestUserContext;
import com.deepreader.web_module.service.StudyProgressService;
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
	private final BusinessServiceClient businessServiceClient;
	private final StudyProgressService studyProgressService;

	public AdminController(
			JdbcTemplate jdbcTemplate,
			BusinessServiceClient businessServiceClient,
			StudyProgressService studyProgressService
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.businessServiceClient = businessServiceClient;
		this.studyProgressService = studyProgressService;
	}

	@GetMapping(value = "/summary", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Get dashboard summary metrics (admin only)")
	public Mono<AdminSummaryResponse> summary(ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			RequestUserContext.requireAdmin(exchange);
			return new AdminSummaryResponse(
					queryCount("select count(*) from app_users"),
					queryCount("select count(*) from app_users where role = 'ADMIN'"),
					queryCount("select count(*) from indexed_documents"),
					queryCount("select count(*) from auth_sessions where revoked = false and expires_at > now()"),
					studyProgressService.countRows(),
					studyProgressService.countDueCards(),
					queryCount("select count(*) from audit_logs where created_at >= now() - interval '24 hours'"),
					queryCount("select count(*) from ingestion_job_dead_letters where created_at >= now() - interval '24 hours'")
			);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@GetMapping(value = "/users", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "List user accounts with document counts (admin only)")
	public Mono<List<Map<String, Object>>> users(@RequestParam(name = "limit", defaultValue = "100") int limit, ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			RequestUserContext.requireAdmin(exchange);
			int safeLimit = Math.min(Math.max(limit, 1), 500);
			return jdbcTemplate.queryForList(
					"""
					select u.user_id, u.email, u.username, u.role, u.created_at,
					       count(d.document_id) as document_count
					from app_users u
					left join indexed_documents d on d.user_id = u.user_id
					group by u.user_id, u.email, u.username, u.role, u.created_at
					order by u.created_at desc
					limit ?
					""",
					safeLimit
			);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@GetMapping(value = "/documents", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "List indexed documents across users (admin only)")
	public Mono<List<Map<String, Object>>> documents(@RequestParam(name = "limit", defaultValue = "100") int limit, ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			RequestUserContext.requireAdmin(exchange);
			int safeLimit = Math.min(Math.max(limit, 1), 500);
			return jdbcTemplate.queryForList(
					"""
					select d.document_id, d.file_name, d.created_at, u.email, u.username
					from indexed_documents d
					left join app_users u on u.user_id = d.user_id
					order by d.created_at desc
					limit ?
					""",
					safeLimit
			);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@GetMapping(value = "/library", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "List library books across all users (admin only)")
	public reactor.core.publisher.Flux<Book> library(ServerWebExchange exchange) {
		RequestUserContext.requireAdmin(exchange);
		return businessServiceClient.listBooks(null);
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

	private int queryCount(String sql) {
		Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
		return count == null ? 0 : count;
	}

	public record AdminSummaryResponse(
			int users,
			int admins,
			int indexedDocuments,
			int activeSessions,
			int studyProgressRows,
			int dueCards,
			int auditEventsToday,
			int deadLettersToday
	) {
	}
}
