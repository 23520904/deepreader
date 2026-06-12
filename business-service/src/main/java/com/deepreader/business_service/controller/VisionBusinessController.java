package com.deepreader.business_service.controller;

import com.deepreader.business_service.client.AiServiceClient;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Handles vision-related business APIs and forwards image or PDF analysis
 * requests to the AI service.
 */
@RestController
@RequestMapping("/internal/business/v1/vision")
public class VisionBusinessController {

	private final AiServiceClient aiServiceClient;

	public VisionBusinessController(AiServiceClient aiServiceClient) {
		this.aiServiceClient = aiServiceClient;
	}

	/**
	 * Receives an uploaded image and sends its bytes to the AI vision service.
	 *
	 * <p>The prompt and provider are optional so callers can either customize
	 * the analysis or let the AI service use its default behavior.
	 */
	@PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	public Mono<Map<String, Object>> analyzeImage(
			@RequestParam("userId") String userId,
			@RequestParam(value = "provider", required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("image") FilePart imagePart
	) {
		// Use a safe default MIME type when the uploaded image does not include one.
		String mimeType = imagePart.headers().getContentType() != null ? imagePart.headers().getContentType().toString() : "image/jpeg";

		return DataBufferUtils.join(imagePart.content())
				.flatMap(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);

					// Release the joined buffer after copying its content to avoid memory leaks.
					DataBufferUtils.release(dataBuffer);

					return aiServiceClient.analyzeImage(userId, provider, prompt, bytes, mimeType);
				});
	}

	/**
	 * Receives an uploaded PDF and sends it to the AI service for PDF analysis.
	 *
	 * <p>The original filename is preserved so the downstream service can use it
	 * when building the multipart request.
	 */
	@PostMapping(value = "/analyze-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	public Mono<Map<String, Object>> analyzePdf(
			@RequestParam("userId") String userId,
			@RequestParam(value = "provider", required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("file") FilePart filePart
	) {
		String name = filePart.filename();

		return DataBufferUtils.join(filePart.content())
				.flatMap(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);

					// Release the buffer after reading the PDF bytes into memory.
					DataBufferUtils.release(dataBuffer);

					return aiServiceClient.analyzePdf(userId, provider, prompt, name, bytes);
				});
	}
}