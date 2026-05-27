package com.deepreader.business_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Optional;

@Component
public class AiServiceClient {

	private final WebClient webClient;

	public AiServiceClient(WebClient.Builder builder, @Value("${services.ai-service.base-url:http://localhost:8080}") String baseUrl) {
		this.webClient = builder.baseUrl(baseUrl).build();
	}

	public Mono<AiUploadResponse> uploadDocument(String userId, String provider, String fileName, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
		bodyBuilder.part("file", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return fileName;
			}
		}).contentType(MediaType.APPLICATION_OCTET_STREAM);

		return webClient.post()
				.uri(uriBuilder -> uriBuilder.path("/internal/ai/v1/documents/upload")
						.queryParamIfPresent("provider", Optional.ofNullable(provider))
						.build())
				.header("X-User-Id", userId)
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(AiUploadResponse.class);
	}

	public Mono<AiDocumentContentResponse> getDocumentContent(String userId, String documentId) {
		return webClient.get()
				.uri("/internal/ai/v1/documents/{documentId}/content", documentId)
				.header("X-User-Id", userId)
				.retrieve()
				.bodyToMono(AiDocumentContentResponse.class);
	}

	public Mono<ResponseEntity<byte[]>> getDocumentSource(String userId, String documentId) {
		return webClient.get()
				.uri("/internal/ai/v1/documents/{documentId}/source", documentId)
				.header("X-User-Id", userId)
				.retrieve()
				.toEntity(byte[].class);
	}

	public Mono<AiSearchResponse> search(String userId, String documentId, String query, Integer limit, String provider) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/search")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiSearchRequest(documentId, query, limit, provider))
				.retrieve()
				.bodyToMono(AiSearchResponse.class);
	}

	public Mono<AiChatResponse> chat(String userId, String documentId, String query, Integer limit, String provider) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/chat/ask")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiChatRequest(documentId, query, limit, provider))
				.retrieve()
				.bodyToMono(AiChatResponse.class);
	}

	public Mono<AiSummaryResponse> summarize(String userId, String documentId, String provider) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/summary")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiSummaryRequest(documentId, provider))
				.retrieve()
				.bodyToMono(AiSummaryResponse.class);
	}

	public Mono<AiFlashcardResponse> flashcards(String userId, String documentId, String provider, Integer count) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/flashcards")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiFlashcardRequest(documentId, provider, count))
				.retrieve()
				.bodyToMono(AiFlashcardResponse.class);
	}

	public Mono<java.util.Map> analyzeImage(String userId, String provider, String prompt, byte[] content, String mimeType) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
		bodyBuilder.part("image", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return "image"; // Dummy filename for multipart
			}
		}).header("Content-Type", mimeType);
		if (prompt != null) {
			bodyBuilder.part("prompt", prompt);
		}
		if (provider != null) {
			bodyBuilder.part("provider", provider);
		}

		return webClient.post()
				.uri("/internal/ai/v1/vision/analyze")
				.header("X-User-Id", userId)
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(java.util.Map.class);
	}

	public Mono<java.util.Map> analyzePdf(String userId, String provider, String prompt, String fileName, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
		String safeName = (fileName != null && !fileName.isBlank()) ? fileName : "document.pdf";
		bodyBuilder.part("file", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return safeName;
			}
		}).contentType(MediaType.APPLICATION_PDF);
		if (prompt != null) {
			bodyBuilder.part("prompt", prompt);
		}
		if (provider != null) {
			bodyBuilder.part("provider", provider);
		}

		return webClient.post()
				.uri("/internal/ai/v1/vision/analyze-pdf")
				.header("X-User-Id", userId)
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(java.util.Map.class);
	}

	public record AiUploadResponse(String documentId, String fileName, int sectionCount, int chunkCount, java.util.List<String> chunkIds, java.util.List<String> indexedProviders) {}
	public record AiDocumentContentResponse(String documentId, String fileName, String provider, java.util.List<AiDocumentSection> sections) {}
	public record AiDocumentSection(String sectionId, String title, Integer pageNumber, String summary, String content) {}
	public record AiSearchRequest(String documentId, String query, Integer limit, String provider) {}
	public record AiSearchResponse(String query, int limit, String provider, java.util.List<AiRetrievedChunk> matches) {}
	public record AiRetrievedChunk(String documentId, String chunkId, String fileName, String sectionId, String title, Integer chunkIndex, String content, float score) {}
	public record AiChatRequest(String documentId, String query, Integer limit, String provider) {}
	public record AiChatResponse(String query, String answer, java.util.List<AiSourceReference> sources, String threadId) {}
	public record AiSourceReference(String documentId, String chunkId, String fileName, String sectionId, String title, Integer chunkIndex, String content, float score) {}
	public record AiSummaryRequest(String documentId, String provider) {}
	public record AiSummaryResponse(String documentId, String provider, String summary) {}
	public record AiFlashcardRequest(String documentId, String provider, Integer count) {}
	public record AiFlashcardResponse(String documentId, String provider, java.util.List<AiFlashcard> flashcards) {}
	public record AiFlashcard(String question, String answer) {}
}
