package com.deepreader.web_module.controller;

import com.deepreader.web_module.client.BusinessServiceClient;
import com.deepreader.web_module.service.RequestUserContext;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping(path = "/api/v1/vision", produces = MediaType.APPLICATION_JSON_VALUE)
public class VisionPublicController {

	private final BusinessServiceClient businessServiceClient;

	public VisionPublicController(BusinessServiceClient businessServiceClient) {
		this.businessServiceClient = businessServiceClient;
	}

	@PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<Map> analyzeImage(
			@RequestParam(required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("image") FilePart imagePart,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		String mimeType = imagePart.headers().getContentType() != null ? imagePart.headers().getContentType().toString() : "image/jpeg";
		return imagePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> businessServiceClient.analyzeImage(userId, provider, prompt, out.toByteArray(), mimeType));
	}

	@PostMapping(value = "/analyze-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<Map> analyzePdf(
			@RequestParam(required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("file") FilePart filePart,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		String fileName = filePart.filename();
		return filePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> businessServiceClient.analyzePdf(userId, provider, prompt, fileName, out.toByteArray()));
	}
}
