package com.deepreader.ai_service.controller;

import com.deepreader.ai_service.model.IngestionResult;
import com.deepreader.ai_service.model.ChatAskRequest;
import com.deepreader.ai_service.model.ChatAskResponse;
import com.deepreader.ai_service.model.FlashcardRequest;
import com.deepreader.ai_service.model.FlashcardResponse;
import com.deepreader.ai_service.model.IngestionJobResponse;
import com.deepreader.ai_service.model.SearchRequest;
import com.deepreader.ai_service.model.SearchResponse;
import com.deepreader.ai_service.model.SummaryRequest;
import com.deepreader.ai_service.model.SummaryResponse;
import com.deepreader.ai_service.service.ChatService;
import com.deepreader.ai_service.service.AuditLogService;
import com.deepreader.ai_service.service.DocumentIngestionService;
import com.deepreader.ai_service.service.GenerationService;
import com.deepreader.ai_service.service.IngestionJobService;
import com.deepreader.ai_service.service.ObjectStorageService;
import com.deepreader.ai_service.service.RequestUserContext;
import com.deepreader.ai_service.service.RetrievalService;
import com.deepreader.ai_service.config.GuardrailProperties;
import com.deepreader.ai_service.service.GuardrailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Map;

@RestController
@RequestMapping({"/api/documents", "/api/v1/documents"})
@Tag(name = "Documents")
public class DocumentIngestionController {

	private final DocumentIngestionService documentIngestionService;
	private final RetrievalService retrievalService;
	private final ChatService chatService;
	private final GenerationService generationService;
	private final IngestionJobService ingestionJobService;
	private final AuditLogService auditLogService;
	private final ObjectStorageService objectStorageService;
	private final GuardrailService guardrailService;
	private final GuardrailProperties guardrailProperties;

	public DocumentIngestionController(DocumentIngestionService documentIngestionService, RetrievalService retrievalService, ChatService chatService, GenerationService generationService, IngestionJobService ingestionJobService, AuditLogService auditLogService, ObjectStorageService objectStorageService, GuardrailService guardrailService, GuardrailProperties guardrailProperties) {
		this.documentIngestionService = documentIngestionService;
		this.retrievalService = retrievalService;
		this.chatService = chatService;
		this.generationService = generationService;
		this.ingestionJobService = ingestionJobService;
		this.auditLogService = auditLogService;
		this.objectStorageService = objectStorageService;
		this.guardrailService = guardrailService;
		this.guardrailProperties = guardrailProperties;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(summary = "Upload and synchronously ingest a PDF or EPUB")
	public Mono<IngestionResult> uploadDocument(@RequestPart("file") FilePart filePart, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		guardrailService.enforceDailyLimit(userId, "UPLOADS", 1, guardrailProperties.getMaxUploadsPerDay());
		return documentIngestionService.ingestDocument(userId, filePart)
				.doOnSuccess(result -> auditLogService.log(userId, "INGESTION_SYNC_SUCCEEDED", "documentId=" + result.documentId()));
	}

	@PostMapping(value = "/upload/async", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Start async ingestion job for a PDF or EPUB")
	public Mono<IngestionJobResponse> uploadDocumentAsync(@RequestPart("file") FilePart filePart, ServerWebExchange exchange, @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
		String userId = RequestUserContext.requireUserId(exchange);
		String fileName = filePart.filename();
		return filePart.content()
				.collectList()
				.flatMap(buffers -> Mono.fromCallable(() -> {
					int size = buffers.stream().mapToInt(buffer -> buffer.readableByteCount()).sum();
					byte[] bytes = new byte[size];
					int offset = 0;
					for (org.springframework.core.io.buffer.DataBuffer buffer : buffers) {
						int length = buffer.readableByteCount();
						buffer.read(bytes, offset, length);
						offset += length;
						org.springframework.core.io.buffer.DataBufferUtils.release(buffer);
					}
					documentIngestionService.validateUpload(fileName, bytes.length);
					guardrailService.enforceDailyLimit(userId, "UPLOADS", 1, guardrailProperties.getMaxUploadsPerDay());
					String sourceObjectKey = objectStorageService.storeDocument(userId, fileName, bytes);
					if (sourceObjectKey == null || sourceObjectKey.isBlank()) {
						throw new IllegalStateException("Async ingestion requires object storage enabled");
					}
					IngestionJobResponse job = ingestionJobService.createPendingJob(userId, fileName, sourceObjectKey, idempotencyKey);
					auditLogService.log(userId, "INGESTION_ASYNC_REQUESTED", "jobId=" + job.jobId() + ", fileName=" + fileName);
					return job;
				}).subscribeOn(Schedulers.boundedElastic()));
	}

	@GetMapping(value = "/jobs/{jobId}", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Get async ingestion job status")
	public Mono<IngestionJobResponse> getIngestionJob(@PathVariable String jobId, ServerWebExchange exchange) {
		return Mono.fromCallable(() -> ingestionJobService.getJob(RequestUserContext.requireUserId(exchange), jobId))
				.subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/search", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Search indexed chunks")
	public Mono<SearchResponse> searchDocuments(@RequestBody SearchRequest request, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return retrievalService.search(userId, request.query(), request.limit(), request.provider());
	}

	@PostMapping(value = "/chat/ask", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Ask a question with source references")
	public Mono<ChatAskResponse> askQuestion(@RequestBody ChatAskRequest request, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return chatService.ask(userId, request.query(), request.limit(), request.provider());
	}

	@PostMapping(value = "/summary", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Generate a summary for a document")
	public Mono<SummaryResponse> summarize(@RequestBody SummaryRequest request, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return generationService.summarize(userId, request.documentId(), request.provider());
	}

	@PostMapping(value = "/flashcards", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Generate flashcards for a document")
	public Mono<FlashcardResponse> generateFlashcards(@RequestBody FlashcardRequest request, ServerWebExchange exchange) {
		String userId = RequestUserContext.requireUserId(exchange);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return generationService.createFlashcards(userId, request.documentId(), request.provider(), request.count());
	}

	@ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
	public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
		if (ex.getMessage() != null && ex.getMessage().contains("rate limit exceeded")) {
			return ResponseEntity.status(429).body(Map.of("error", ex.getMessage()));
		}
		return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
	}
}