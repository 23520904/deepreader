package com.deepreader.ai_service.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.IngestionResult;
import com.deepreader.ai_service.config.IngestionProperties;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Coordinates document ingestion from upload through text extraction, chunking, embedding,
 * object storage and indexing in the external Haystack vector search service.
 *
 * <p>This service is responsible for preserving the document metadata, creating chunk payloads,
 * and gracefully skipping provider indexing failures while still saving the uploaded document.
 */
@Service
public class DocumentIngestionService {
	private static final Logger log = LoggerFactory.getLogger(DocumentIngestionService.class);

	/**
	 * Vector embedding provider used when indexing document chunks.
	 */
	private static final String VECTOR_PROVIDER = EmbeddingService.EMBEDDING_PROVIDER;

	private final TextExtractionService textExtractionService;
	private final DocumentIndexStoreService documentIndexStoreService;
	private final ChunkingService chunkingService;
	private final EmbeddingService embeddingService;
	private final IngestionProperties ingestionProperties;
	private final ObjectStorageService objectStorageService;
	private final WebClient haystackClient;

	/**
	 * Creates the document ingestion service with all required dependencies.
	 *
	 * The service uses text extraction for readable document content, chunking for
	 * retrieval-ready units, embedding generation for vector search, object storage
	 * for original files, and Haystack for external vector indexing.
	 */
	public DocumentIngestionService(
			TextExtractionService textExtractionService,
			DocumentIndexStoreService documentIndexStoreService,
			ChunkingService chunkingService,
			EmbeddingService embeddingService,
			IngestionProperties ingestionProperties,
			ObjectStorageService objectStorageService,
			WebClient.Builder webClientBuilder,
			@Value("${deepreader.haystack.base-url}") String haystackBaseUrl
	) {
		this.textExtractionService = textExtractionService;
		this.documentIndexStoreService = documentIndexStoreService;
		this.chunkingService = chunkingService;
		this.embeddingService = embeddingService;
		this.ingestionProperties = ingestionProperties;
		this.objectStorageService = objectStorageService;
		this.haystackClient = webClientBuilder.baseUrl(haystackBaseUrl).build();
	}

	/**
	 * Starts asynchronous ingestion of a multipart upload by buffering the file and delegating to {@link #ingestBytes}.
	 */
	public Mono<IngestionResult> ingestDocument(String userId, FilePart filePart) {
		return ingestDocument(userId, filePart, null);
	}

	/**
	 * Starts asynchronous ingestion of a multipart upload with an optional embedding provider override.
	 *
	 * The uploaded file is first validated by name, then fully read into memory so
	 * the blocking ingestion pipeline can process it on a bounded elastic scheduler.
	 */
	public Mono<IngestionResult> ingestDocument(String userId, FilePart filePart, String provider) {
		String fileName = StringUtils.hasText(filePart.filename()) ? filePart.filename() : "uploaded.pdf";
		validateUpload(fileName, -1);

		return DataBufferUtils.join(filePart.content())
				.map(dataBuffer -> {
					// Copy the uploaded file content from the reactive buffer into a byte array.
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);

					// Release the buffer after reading to avoid memory leaks in WebFlux.
					DataBufferUtils.release(dataBuffer);

					validateUpload(fileName, bytes.length);
					return bytes;
				})
				.flatMap(bytes -> Mono.fromCallable(() -> ingestBytes(userId, fileName, bytes, provider)).subscribeOn(Schedulers.boundedElastic()));
	}

	/**
	 * Ingests raw document bytes using the default indexing provider.
	 */
	public IngestionResult ingestBytes(String userId, String fileName, byte[] bytes) {
		return ingestBytes(userId, fileName, bytes, null);
	}

	/**
	 * Runs the full ingestion pipeline for a document already loaded as bytes.
	 *
	 * The pipeline creates a document id, extracts readable sections, stores the
	 * original file, saves indexed metadata, chunks the extracted text, generates
	 * embeddings, and sends chunk payloads to Haystack for vector search.
	 */
	public IngestionResult ingestBytes(String userId, String fileName, byte[] bytes, String provider) {
		String documentId = UUID.randomUUID().toString();

		// Extract readable sections from the uploaded PDF or EPUB.
		List<DocumentSection> extractedSections = textExtractionService.extractSections(fileName, bytes);
		if (extractedSections.isEmpty()) {
			throw new IllegalStateException("No readable text found in file: " + fileName);
		}

		// Prefix section ids with the generated document id to keep them globally unique.
		List<DocumentSection> sections = new ArrayList<>();
		for (DocumentSection extracted : extractedSections) {
			sections.add(new DocumentSection(
					documentId + ":" + extracted.sectionId(),
					extracted.title(),
					extracted.pageNumber(),
					extracted.summary(),
					extracted.content()
			));
		}

		if (sections.isEmpty()) {
			throw new IllegalStateException("No indexed sections were produced for PDF: " + fileName);
		}

		// Store the original document and persist its extracted index metadata.
		String objectKey = objectStorageService.storeDocument(userId, fileName, bytes);
		documentIndexStoreService.save(new IndexedDocument(userId, documentId, fileName, objectKey, sections));

		// Split extracted sections into smaller chunks for embedding and retrieval.
		List<DocumentChunk> chunks = chunkingService.chunkDocument(documentId, fileName, sections);
		if (chunks.isEmpty()) {
			throw new IllegalStateException("No chunks produced for file: " + fileName);
		}

		List<String> providers = new ArrayList<>();
		List<String> providerErrors = new ArrayList<>();

		// Try indexing each configured provider without failing the whole ingestion.
		for (String providerToIndex : providersToIndex()) {
			indexProviderSafely(providerToIndex, chunks, providers, providerErrors);
		}

		if (providers.isEmpty()) {
			// Preserve ingest result even when vector indexing is unavailable so document metadata remains searchable.
			log.warn("Document {} was stored without vector embeddings. Search will use lexical fallback until Gemini vector indexing succeeds. {}", documentId, String.join(" | ", providerErrors));
		}

		return new IngestionResult(documentId, fileName, sections.size(), chunks.size(), chunks.stream().map(DocumentChunk::chunkId).toList(), providers);
	}

	/**
	 * Returns the list of vector providers that should receive document chunks.
	 */
	private List<String> providersToIndex() {
		return List.of(VECTOR_PROVIDER);
	}

	/**
	 * Indexes chunks for one provider while protecting the ingestion flow from provider failures.
	 *
	 * Any runtime exception is captured, logged, and stored in the provider error list
	 * instead of stopping the document from being saved.
	 */
	private void indexProviderSafely(String provider, List<DocumentChunk> chunks, List<String> indexedProviders, List<String> providerErrors) {
		try {
			indexProvider(provider, chunks, indexedProviders);
		} catch (RuntimeException ex) {
			String reason = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
			providerErrors.add(provider + ": " + reason);
			log.warn("Skipping failed provider '{}' during ingestion: {}", provider, reason);
		}
	}

	/**
	 * Generates embeddings and sends chunk data to the Haystack ingestion endpoint.
	 *
	 * The provider is added to the indexed provider list only after Haystack accepts
	 * the ingestion request successfully.
	 */
	private void indexProvider(String provider, List<DocumentChunk> chunks, List<String> indexedProviders) {
		List<List<Float>> embeddings = embeddingService.embedAll(provider, chunks.stream().map(DocumentChunk::content).toList());
		List<HaystackChunk> payloadChunks = chunks.stream()
				.map(chunk -> new HaystackChunk(
						chunk.chunkId(),
						chunk.documentId(),
						chunk.fileName(),
						chunk.sectionId(),
						chunk.sectionTitle(),
						chunk.chunkIndex(),
						chunk.content()
				))
				.toList();

		callHaystackIngest(new HaystackIngestRequest(provider, payloadChunks, embeddings));
		indexedProviders.add(provider);
	}

	private void callHaystackIngest(HaystackIngestRequest body) {
		int maxRetries = ingestionProperties.getMaxRetries();
		for (int attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				haystackClient.post()
						.uri("/ingest")
						.bodyValue(body)
						.retrieve()
						.toBodilessEntity()
						.block();
				return;
			} catch (Exception ex) {
				if (attempt == maxRetries) throw ex;
				log.warn("Haystack ingest attempt {}/{} failed: {}", attempt + 1, maxRetries, ex.getMessage());
				try {
					Thread.sleep(1000L << attempt);
				} catch (InterruptedException ie) {
					Thread.currentThread().interrupt();
					throw new RuntimeException(ie);
				}
			}
		}
	}

	/**
	 * Validates uploaded document type and size.
	 *
	 * Only PDF and EPUB files are accepted. File size validation is skipped when
	 * the size is unknown or passed as a negative value.
	 */
	public void validateUpload(String fileName, long fileSizeBytes) {
		String normalized = fileName == null ? "" : fileName.toLowerCase();
		if (!normalized.endsWith(".pdf") && !normalized.endsWith(".epub")) {
			throw new IllegalArgumentException("Only PDF and EPUB files are supported");
		}
		if (fileSizeBytes > 0 && fileSizeBytes > ingestionProperties.getMaxFileSizeBytes()) {
			throw new IllegalArgumentException("File exceeds max size of " + ingestionProperties.getMaxFileSizeBytes() + " bytes");
		}
	}

	/**
	 * Request body sent to Haystack for vector indexing.
	 */
	private record HaystackIngestRequest(String provider, List<HaystackChunk> chunks, List<List<Float>> embeddings) {
	}

	/**
	 * Chunk payload format expected by the Haystack ingestion API.
	 */
	private record HaystackChunk(
			@JsonProperty("chunk_id") String chunkId,
			@JsonProperty("document_id") String documentId,
			@JsonProperty("file_name") String fileName,
			@JsonProperty("section_id") String sectionId,
			String title,
			@JsonProperty("chunk_index") int chunkIndex,
			String content
	) {
	}
}