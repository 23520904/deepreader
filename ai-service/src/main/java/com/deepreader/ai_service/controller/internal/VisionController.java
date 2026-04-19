package com.deepreader.ai_service.controller.internal;

import com.deepreader.ai_service.service.VisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/internal/ai/v1/vision")
@Tag(name = "Vision")
public class VisionController {

	private final VisionService visionService;

	public VisionController(VisionService visionService) {
		this.visionService = visionService;
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
	
	@ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
	public ResponseEntity<Map<String, String>> handleBadRequest(RuntimeException ex) {
		return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
	}
}
