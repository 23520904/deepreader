package com.deepreader.ai_service.controller.internal;

import com.deepreader.ai_service.config.GuardrailProperties;
import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.ChatAskRequest;
import com.deepreader.ai_service.model.api.internal.ChatAskResponse;
import com.deepreader.ai_service.model.api.internal.FlashcardRequest;
import com.deepreader.ai_service.model.api.internal.FlashcardResponse;
import com.deepreader.ai_service.model.api.internal.IngestionJobResponse;
import com.deepreader.ai_service.model.api.internal.IngestionResult;
import com.deepreader.ai_service.model.api.internal.SearchRequest;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.deepreader.ai_service.model.api.internal.SummaryRequest;
import com.deepreader.ai_service.model.api.internal.SummaryResponse;
import com.deepreader.ai_service.service.AuditLogService;
import com.deepreader.ai_service.service.ChatService;
import com.deepreader.ai_service.service.DocumentIndexStoreService;
import com.deepreader.ai_service.service.DocumentIngestionService;
import com.deepreader.ai_service.service.GenerationService;
import com.deepreader.ai_service.service.GuardrailService;
import com.deepreader.ai_service.service.IngestionJobService;
import com.deepreader.ai_service.service.ObjectStorageService;
import com.deepreader.ai_service.service.RetrievalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/ai/v1/documents")
@Tag(name = "Documents")
public class DocumentIngestionController {
	private final DocumentIngestionService documentIngestionService;
	private final DocumentIndexStoreService documentIndexStoreService;
	private final RetrievalService retrievalService;
	private final ChatService chatService;
	private final GenerationService generationService;
	private final IngestionJobService ingestionJobService;
	private final AuditLogService auditLogService;
	private final ObjectStorageService objectStorageService;
	private final GuardrailService guardrailService;
	private final GuardrailProperties guardrailProperties;

	public DocumentIngestionController(DocumentIngestionService documentIngestionService, DocumentIndexStoreService documentIndexStoreService, RetrievalService retrievalService, ChatService chatService, GenerationService generationService, IngestionJobService ingestionJobService, AuditLogService auditLogService, ObjectStorageService objectStorageService, GuardrailService guardrailService, GuardrailProperties guardrailProperties) {
		this.documentIngestionService = documentIngestionService;
		this.documentIndexStoreService = documentIndexStoreService;
		this.retrievalService = retrievalService;
		this.chatService = chatService;
		this.generationService = generationService;
		this.ingestionJobService = ingestionJobService;
		this.auditLogService = auditLogService;
		this.objectStorageService = objectStorageService;
		this.guardrailService = guardrailService;
		this.guardrailProperties = guardrailProperties;
	}

	@GetMapping(value = "/{documentId}/content", produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Return indexed sections for a document")
	public Mono<DocumentContentResponse> getDocumentContent(
			@PathVariable String documentId,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
		return Mono.fromCallable(() -> toContentResponse(documentIndexStoreService.requireById(userId, documentId)))
				.subscribeOn(Schedulers.boundedElastic());
	}

	@GetMapping(value = "/{documentId}/source", produces = {
			MediaType.APPLICATION_PDF_VALUE,
			MediaType.APPLICATION_OCTET_STREAM_VALUE,
			"application/epub+zip"
	})
	@Operation(summary = "Return the original uploaded document")
	public Mono<ResponseEntity<byte[]>> getDocumentSource(
			@PathVariable String documentId,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
		return Mono.fromCallable(() -> {
					IndexedDocument document = documentIndexStoreService.requireById(userId, documentId);
					String objectKey = document.objectKey();

					if (objectKey == null || objectKey.isBlank()) {
						throw new IllegalStateException("Original file is not available for this document.");
					}

					byte[] bytes = objectStorageService.loadDocument(objectKey);

					return ResponseEntity.ok()
							.contentType(mediaTypeByFileName(document.fileName()))
							.header(
									HttpHeaders.CONTENT_DISPOSITION,
									ContentDisposition.inline()
											.filename(document.fileName() == null ? "document.pdf" : document.fileName())
											.build()
											.toString()
							)
							.contentLength(bytes.length)
							.body(bytes);
				})
				.subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(summary = "Upload and synchronously ingest a PDF or EPUB")
	public Mono<IngestionResult> uploadDocument(
			@RequestPart("file") FilePart filePart,
			@RequestParam(required = false) String provider,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
		guardrailService.enforceDailyLimit(userId, "UPLOADS", 1, guardrailProperties.getMaxUploadsPerDay());
		return documentIngestionService.ingestDocument(userId, filePart, provider)
				.doOnSuccess(result -> auditLogService.log(userId, "INGESTION_SYNC_SUCCEEDED", "documentId=" + result.documentId()));
	}

	@PostMapping(value = "/upload/async", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Start async ingestion job for a PDF or EPUB")
	public Mono<IngestionJobResponse> uploadDocumentAsync(
			@RequestPart("file") FilePart filePart,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader,
			@RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
	) {
		String userId = requireUserId(userIdHeader);
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
	public Mono<IngestionJobResponse> getIngestionJob(
			@PathVariable String jobId,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		return Mono.fromCallable(() -> ingestionJobService.getJob(requireUserId(userIdHeader), jobId))
				.subscribeOn(Schedulers.boundedElastic());
	}

	@PostMapping(value = "/search", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Search indexed chunks")
	public Mono<SearchResponse> searchDocuments(
			@RequestBody SearchRequest request,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return retrievalService.search(userId, request.documentId(), request.query(), request.limit(), request.provider());
	}

	@PostMapping(value = "/chat/ask", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Ask a question with source references")
	public Mono<ChatAskResponse> askQuestion(
			@RequestBody ChatAskRequest request,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return chatService.ask(userId, request.documentId(), request.query(), request.limit(), request.provider());
	}

	@PostMapping(value = "/summary", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Generate a summary for a document")
	public Mono<SummaryResponse> summarize(
			@RequestBody SummaryRequest request,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
		guardrailService.enforceDailyLimit(userId, "LLM_REQUESTS", 1, guardrailProperties.getMaxLlmRequestsPerDay());
		return generationService.summarize(userId, request.documentId(), request.provider());
	}

	@PostMapping(value = "/flashcards", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Generate flashcards for a document")
	public Mono<FlashcardResponse> generateFlashcards(
			@RequestBody FlashcardRequest request,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		String userId = requireUserId(userIdHeader);
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

	private DocumentContentResponse toContentResponse(IndexedDocument document) {
		return new DocumentContentResponse(
				document.documentId(),
				document.fileName(),
				document.sections().stream().map(this::toContentSection).toList()
		);
	}

	private DocumentContentSection toContentSection(DocumentSection section) {
		return new DocumentContentSection(
				section.sectionId(),
				section.title(),
				section.pageNumber(),
				section.summary(),
				section.content()
		);
	}

	private String requireUserId(String userIdHeader) {
		if (userIdHeader == null || userIdHeader.isBlank()) {
			throw new IllegalArgumentException("Missing X-User-Id header");
		}
		return userIdHeader.trim();
	}

	private MediaType mediaTypeByFileName(String fileName) {
		String lower = fileName == null ? "" : fileName.toLowerCase();

		if (lower.endsWith(".pdf")) {
			return MediaType.APPLICATION_PDF;
		}

		if (lower.endsWith(".epub")) {
			return MediaType.parseMediaType("application/epub+zip");
		}

		return MediaType.APPLICATION_OCTET_STREAM;
	}

	public record DocumentContentResponse(String documentId, String fileName, List<DocumentContentSection> sections) {}
	public record DocumentContentSection(String sectionId, String title, Integer pageNumber, String summary, String content) {}
}
