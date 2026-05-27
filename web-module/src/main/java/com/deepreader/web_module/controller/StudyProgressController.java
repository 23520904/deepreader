package com.deepreader.web_module.controller;

import com.deepreader.web_module.model.StudyProgressRequest;
import com.deepreader.web_module.model.StudyProgressResponse;
import com.deepreader.web_module.service.RequestUserContext;
import com.deepreader.web_module.service.StudyProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@RestController
@RequestMapping("/api/v1/study-progress")
@Tag(name = "Study Progress")
public class StudyProgressController {
	private final StudyProgressService studyProgressService;

	public StudyProgressController(StudyProgressService studyProgressService) {
		this.studyProgressService = studyProgressService;
	}

	@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "List the authenticated user's flashcard study progress")
	public Mono<List<StudyProgressResponse>> listProgress(ServerWebExchange exchange) {
		return Mono.fromCallable(() -> {
			String userId = RequestUserContext.requireUserId(exchange);
			return studyProgressService.listProgress(userId);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	@PutMapping(value = "/{cardId}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Upsert progress for one flashcard")
	public Mono<StudyProgressResponse> upsertProgress(
			@PathVariable String cardId,
			@RequestBody StudyProgressRequest request,
			ServerWebExchange exchange
	) {
		return Mono.fromCallable(() -> {
			String userId = RequestUserContext.requireUserId(exchange);
			return studyProgressService.upsertProgress(userId, cardId, request);
		}).subscribeOn(Schedulers.boundedElastic());
	}
}
