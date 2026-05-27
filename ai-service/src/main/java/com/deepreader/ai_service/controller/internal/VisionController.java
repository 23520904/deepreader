package com.deepreader.ai_service.controller.internal;

import com.deepreader.ai_service.config.IngestionProperties;
import com.deepreader.ai_service.service.PdfVisionService;
import com.deepreader.ai_service.service.VisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/internal/ai/v1/vision")
@Tag(name = "Vision")
public class VisionController {

	private final VisionService visionService;
	private final PdfVisionService pdfVisionService;
	private final IngestionProperties ingestionProperties;

	public VisionController(VisionService visionService, PdfVisionService pdfVisionService, IngestionProperties ingestionProperties) {
		this.visionService = visionService;
		this.pdfVisionService = pdfVisionService;
		this.ingestionProperties = ingestionProperties;
	}

	@PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Analyze an image using a multimodal LLM")
	public Mono<Map<String, String>> analyzeImage(
			@RequestPart("image") FilePart imagePart,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart(value = "provider", required = false) String provider,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		if (userIdHeader == null || userIdHeader.isBlank()) {
			return Mono.error(new IllegalArgumentException("Missing X-User-Id header"));
		}
		
		String finalPrompt = prompt != null && !prompt.isBlank() ? prompt : "Analyze this image and describe it in detail.";
		String finalProvider = provider != null && !provider.isBlank() ? provider : "gemini";
		String mimeType = imagePart.headers().getContentType() != null ? imagePart.headers().getContentType().toString() : "image/jpeg";

		return DataBufferUtils.join(imagePart.content())
				.flatMap(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);
					DataBufferUtils.release(dataBuffer);
					
					return visionService.analyzeImage(userIdHeader.trim(), finalProvider, finalPrompt, bytes, mimeType);
				})
				.map(result -> Map.of("result", result));
	}

	@PostMapping(value = "/analyze-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Extract PDF text and embedded images, then analyze with a multimodal LLM")
	public Mono<Map<String, String>> analyzePdf(
			@RequestPart("file") FilePart filePart,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart(value = "provider", required = false) String provider,
			@RequestHeader(name = "X-User-Id", required = false) String userIdHeader
	) {
		if (userIdHeader == null || userIdHeader.isBlank()) {
			return Mono.error(new IllegalArgumentException("Missing X-User-Id header"));
		}
		String fileName = filePart.filename();
		if (fileName == null || !fileName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
			return Mono.error(new IllegalArgumentException("Only PDF files are supported"));
		}
		String finalPrompt = prompt != null && !prompt.isBlank() ? prompt : null;
		String finalProvider = provider != null && !provider.isBlank() ? provider : "gemini";

		return DataBufferUtils.join(filePart.content())
				.flatMap(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);
					DataBufferUtils.release(dataBuffer);
					if (bytes.length > ingestionProperties.getMaxFileSizeBytes()) {
						return Mono.error(new IllegalArgumentException("PDF exceeds maximum upload size"));
					}
					return pdfVisionService.analyzePdf(userIdHeader.trim(), finalProvider, finalPrompt, bytes);
				})
				.map(outcome -> {
					Map<String, String> body = new LinkedHashMap<>();
					body.put("result", outcome.result());
					body.put("embeddedImageCount", Integer.toString(outcome.embeddedImageCount()));
					body.put("renderedPageCount", Integer.toString(outcome.renderedPageCount()));
					return body;
				});
	}

	@ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
	public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
		return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
	}
}
