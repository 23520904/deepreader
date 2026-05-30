package com.deepreader.web_module.controller;

import com.deepreader.web_module.client.BusinessServiceClient;
import com.deepreader.web_module.service.AdminManagementService;
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
	private final AdminManagementService adminManagementService;

	public VisionPublicController(BusinessServiceClient businessServiceClient, AdminManagementService adminManagementService) {
		this.businessServiceClient = businessServiceClient;
		this.adminManagementService = adminManagementService;
	}

	@PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<Map> analyzeImage(
			@RequestParam(required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("image") FilePart imagePart,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		int promptTokens = estimateTokens(prompt);
		adminManagementService.enforceAiQuota(userId, promptTokens);
		long startedAt = System.nanoTime();
		String mimeType = imagePart.headers().getContentType() != null ? imagePart.headers().getContentType().toString() : "image/jpeg";
		return imagePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> businessServiceClient.analyzeImage(userId, provider, prompt, out.toByteArray(), mimeType))
				.doOnSuccess(response -> adminManagementService.recordAiUsage(userId, providerOrAuto(provider), null, promptTokens, estimateTokens(String.valueOf(response)), elapsedMillis(startedAt), true));
	}

	@PostMapping(value = "/analyze-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public Mono<Map> analyzePdf(
			@RequestParam(required = false) String provider,
			@RequestPart(value = "prompt", required = false) String prompt,
			@RequestPart("file") FilePart filePart,
			ServerWebExchange exchange
	) {
		String userId = RequestUserContext.requireUserId(exchange);
		int promptTokens = estimateTokens(prompt);
		adminManagementService.enforceAiQuota(userId, promptTokens);
		long startedAt = System.nanoTime();
		String fileName = filePart.filename();
		return filePart.content().reduce(new java.io.ByteArrayOutputStream(), (out, dataBuffer) -> {
			byte[] bytes = new byte[dataBuffer.readableByteCount()];
			dataBuffer.read(bytes);
			org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
			out.write(bytes, 0, bytes.length);
			return out;
		}).flatMap(out -> businessServiceClient.analyzePdf(userId, provider, prompt, fileName, out.toByteArray()))
				.doOnSuccess(response -> adminManagementService.recordAiUsage(userId, providerOrAuto(provider), null, promptTokens, estimateTokens(String.valueOf(response)), elapsedMillis(startedAt), true));
	}

	private int estimateTokens(String value) {
		return value == null || value.isBlank() ? 0 : Math.max(1, (int) Math.ceil(value.length() / 4.0d));
	}

	private long elapsedMillis(long startedAt) {
		return Math.max(0L, (System.nanoTime() - startedAt) / 1_000_000L);
	}

	private String providerOrAuto(String provider) {
		return provider == null || provider.isBlank() ? "AUTO" : provider;
	}
}
