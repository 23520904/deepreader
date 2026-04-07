package com.deepreader.ai_service.controller;

import com.deepreader.ai_service.model.IngestionResult;
import com.deepreader.ai_service.model.SearchRequest;
import com.deepreader.ai_service.model.SearchResponse;
import com.deepreader.ai_service.service.DocumentIngestionService;
import com.deepreader.ai_service.service.RetrievalService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentIngestionController {

	private final DocumentIngestionService documentIngestionService;
	private final RetrievalService retrievalService;

	public DocumentIngestionController(DocumentIngestionService documentIngestionService, RetrievalService retrievalService) {
		this.documentIngestionService = documentIngestionService;
		this.retrievalService = retrievalService;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<IngestionResult> uploadPdf(@RequestPart("file") FilePart filePart) {
		return documentIngestionService.ingestPdf(filePart);
	}

	@PostMapping(value = "/search", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	public Mono<SearchResponse> searchDocuments(@RequestBody SearchRequest request) {
		return retrievalService.search(request.query(), request.limit());
	}

	@ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
	public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
		if (ex.getMessage() != null && ex.getMessage().contains("rate limit exceeded")) {
			return ResponseEntity.status(429).body(Map.of("error", ex.getMessage()));
		}
		return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
	}
}