package com.deepreader.ai_service.controller;

import com.deepreader.ai_service.model.IngestionResult;
import com.deepreader.ai_service.service.DocumentIngestionService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.ExceptionHandler;
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

	public DocumentIngestionController(DocumentIngestionService documentIngestionService) {
		this.documentIngestionService = documentIngestionService;
	}

	@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<IngestionResult> uploadPdf(@RequestPart("file") FilePart filePart) {
		return documentIngestionService.ingestPdf(filePart);
	}

	@ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
	public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
		return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
	}
}