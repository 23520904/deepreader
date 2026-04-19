package com.deepreader.business_service.controller;

import com.deepreader.business_service.client.AiServiceClient;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/internal/business/v1/vision")
public class VisionBusinessController {

	private final AiServiceClient aiServiceClient;

	public VisionBusinessController(AiServiceClient aiServiceClient) {
		this.aiServiceClient = aiServiceClient;
	}

	@PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
	public Mono<Map> analyzeImage(
			@RequestParam("userId") String userId,
			@RequestParam(value = "provider", required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("image") FilePart imagePart
	) {
		String mimeType = imagePart.headers().getContentType() != null ? imagePart.headers().getContentType().toString() : "image/jpeg";
		return DataBufferUtils.join(imagePart.content())
				.flatMap(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);
					DataBufferUtils.release(dataBuffer);
					return aiServiceClient.analyzeImage(userId, provider, prompt, bytes, mimeType);
				});
	}
}
