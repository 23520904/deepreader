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

/**
 * Client used by the business service to call internal AI service APIs.
 *
 * <p>This class keeps all AI-service HTTP calls in one place so other business
 * components do not need to know endpoint paths, headers, or request formats.
 */
@Component
public class AiServiceClient {

	private final WebClient webClient;

	/**
	 * Creates a WebClient with the AI service base URL.
	 *
	 * <p>The default URL is useful for local development when no external
	 * service URL is configured.
	 */
	public AiServiceClient(WebClient.Builder builder, @Value("${services.ai-service.base-url:http://localhost:8080}") String baseUrl) {
		this.webClient = builder.baseUrl(baseUrl).build();
	}

	/**
	 * Uploads a document to the AI service for ingestion and indexing.
	 *
	 * <p>The file is sent as multipart data because the AI service needs the
	 * original file bytes. The provider query parameter is optional, allowing
	 * the AI service to use its default provider when none is specified.
	 */
	public Mono<AiUploadResponse> uploadDocument(String userId, String provider, String fileName, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

		// ByteArrayResource is used because the file content is already loaded in memory.
		// getFilename() is overridden so the multipart part keeps the original filename.
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
				// The AI service uses this header to associate the request with the correct user.
				.header("X-User-Id", userId)
				.contentType(MediaType.MULTIPART_FORM_DATA)
				.body(BodyInserters.fromMultipartData(bodyBuilder.build()))
				.retrieve()
				.bodyToMono(AiUploadResponse.class);
	}

	/**
	 * Gets the parsed content of a document from the AI service.
	 *
	 * <p>This is used when the business service needs sections, summaries, or
	 * extracted text that were produced during ingestion.
	 */
	public Mono<AiDocumentContentResponse> getDocumentContent(String userId, String documentId) {
		return webClient.get()
				.uri("/internal/ai/v1/documents/{documentId}/content", documentId)
				.header("X-User-Id", userId)
				.retrieve()
				.bodyToMono(AiDocumentContentResponse.class);
	}

	/**
	 * Downloads the original source document as raw bytes.
	 *
	 * <p>ResponseEntity is returned so callers can preserve response metadata
	 * such as headers, content type, or status when forwarding the file.
	 */
	public Mono<ResponseEntity<byte[]>> getDocumentSource(String userId, String documentId) {
		return webClient.get()
				.uri("/internal/ai/v1/documents/{documentId}/source", documentId)
				.header("X-User-Id", userId)
				.retrieve()
				.toEntity(byte[].class);
	}

	/**
	 * Searches for relevant chunks inside a document.
	 *
	 * <p>The request contains the query, optional limit, and optional provider
	 * so the AI service can control retrieval and ranking behavior.
	 */
	public Mono<AiSearchResponse> search(String userId, String documentId, String query, Integer limit, String provider) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/search")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiSearchRequest(documentId, query, limit, provider))
				.retrieve()
				.bodyToMono(AiSearchResponse.class);
	}

	/**
	 * Sends a document question to the AI service and receives an answer.
	 *
	 * <p>The response may include source references so the UI can show which
	 * document chunks were used to support the generated answer.
	 */
	public Mono<AiChatResponse> chat(String userId, String documentId, String query, Integer limit, String provider) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/chat/ask")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiChatRequest(documentId, query, limit, provider))
				.retrieve()
				.bodyToMono(AiChatResponse.class);
	}

	/**
	 * Requests a summary for a document.
	 *
	 * <p>The provider is passed through so callers can choose a specific AI
	 * backend, while the AI service can still apply its own defaults.
	 */
	public Mono<AiSummaryResponse> summarize(String userId, String documentId, String provider) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/summary")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiSummaryRequest(documentId, provider))
				.retrieve()
				.bodyToMono(AiSummaryResponse.class);
	}

	/**
	 * Generates flashcards from a document.
	 *
	 * <p>The optional fields allow the caller to control how many cards are
	 * generated, which language is used, what card type is created, and which
	 * part of the document should be considered.
	 */
	public Mono<AiFlashcardResponse> flashcards(String userId, String documentId, String provider, Integer count, String language, String type, String scope) {
		return webClient.post()
				.uri("/internal/ai/v1/documents/flashcards")
				.header("X-User-Id", userId)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(new AiFlashcardRequest(documentId, provider, count, language, type, scope))
				.retrieve()
				.bodyToMono(AiFlashcardResponse.class);
	}

	/**
	 * Sends an image to the AI vision endpoint for analysis.
	 *
	 * <p>The image is sent as multipart data. Prompt and provider are only added
	 * when they are provided, which keeps the request compatible with default
	 * AI-service behavior.
	 */
	public Mono<java.util.Map> analyzeImage(String userId, String provider, String prompt, byte[] content, String mimeType) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

		// The image content is in memory, but multipart still needs a filename value.
		bodyBuilder.part("image", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return "image"; // Dummy filename for multipart
			}
		}).header("Content-Type", mimeType);

		// Optional prompt gives the vision model extra instructions for the analysis.
		if (prompt != null) {
			bodyBuilder.part("prompt", prompt);
		}

		// Optional provider lets callers route the request to a specific AI backend.
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

	/**
	 * Sends a PDF to the vision-based PDF analysis endpoint.
	 *
	 * <p>This is different from normal document upload because it directly asks
	 * the AI service to analyze the PDF content through its vision flow.
	 */
	public Mono<java.util.Map> analyzePdf(String userId, String provider, String prompt, String fileName, byte[] content) {
		MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();

		// Fallback filename prevents an empty multipart filename when the caller does not provide one.
		String safeName = (fileName != null && !fileName.isBlank()) ? fileName : "document.pdf";

		// The PDF bytes are sent from memory while preserving a safe filename for the server.
		bodyBuilder.part("file", new ByteArrayResource(content) {
			@Override
			public String getFilename() {
				return safeName;
			}
		}).contentType(MediaType.APPLICATION_PDF);

		// Optional prompt gives more context about what should be analyzed in the PDF.
		if (prompt != null) {
			bodyBuilder.part("prompt", prompt);
		}

		// Optional provider lets callers choose the AI backend for this analysis.
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

	// Upload result returned after the AI service ingests and indexes a document.
	public record AiUploadResponse(String documentId, String fileName, int sectionCount, int chunkCount, java.util.List<String> chunkIds, java.util.List<String> indexedProviders) {}

	// Parsed document content returned by the AI service.
	public record AiDocumentContentResponse(String documentId, String fileName, String provider, java.util.List<AiDocumentSection> sections) {}

	// One logical section extracted from a document.
	public record AiDocumentSection(String sectionId, String title, Integer pageNumber, String summary, String content) {}

	// Request body for document search.
	public record AiSearchRequest(String documentId, String query, Integer limit, String provider) {}

	// Search response containing matched chunks for the query.
	public record AiSearchResponse(String query, int limit, String provider, java.util.List<AiRetrievedChunk> matches) {}

	// A document chunk returned by search with its relevance score.
	public record AiRetrievedChunk(String documentId, String chunkId, String fileName, String sectionId, String title, Integer chunkIndex, String content, float score) {}

	// Request body for asking a question about a document.
	public record AiChatRequest(String documentId, String query, Integer limit, String provider) {}

	// Chat response containing the generated answer, grounding metadata, and supporting sources.
	public record AiChatResponse(String query, String answer, java.util.List<AiSourceReference> sources, boolean grounded, java.util.List<String> usedChunkIds, String threadId) {}

	// Source chunk used to explain or support a chat answer.
	public record AiSourceReference(String documentId, String chunkId, String fileName, String sectionId, String title, Integer chunkIndex, String content, float score) {}

	// Request body for document summary generation.
	public record AiSummaryRequest(String documentId, String provider) {}

	// Summary returned for a document.
	public record AiSummaryResponse(String documentId, String provider, String summary) {}

	// Request body for flashcard generation options.
	public record AiFlashcardRequest(String documentId, String provider, Integer count, String language, String type, String scope) {}

	// Flashcard response returned by the AI service.
	public record AiFlashcardResponse(String documentId, String provider, java.util.List<AiFlashcard> flashcards) {}

	// One generated flashcard with a question and answer.
	public record AiFlashcard(String question, String answer) {}
}