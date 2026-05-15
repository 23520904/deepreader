package com.deepreader.ai_service.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.SupportedProvider;
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

@Service
public class DocumentIngestionService {
	private static final Logger log = LoggerFactory.getLogger(DocumentIngestionService.class);

	private final TextExtractionService textExtractionService;
	private final DocumentIndexStoreService documentIndexStoreService;
	private final ChunkingService chunkingService;
	private final EmbeddingService embeddingService;
	private final IngestionProperties ingestionProperties;
	private final ObjectStorageService objectStorageService;
	private final WebClient haystackClient;

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

	public Mono<IngestionResult> ingestDocument(String userId, FilePart filePart) {
		return ingestDocument(userId, filePart, null);
	}

	public Mono<IngestionResult> ingestDocument(String userId, FilePart filePart, String provider) {
		String fileName = StringUtils.hasText(filePart.filename()) ? filePart.filename() : "uploaded.pdf";
		validateUpload(fileName, -1);

		return DataBufferUtils.join(filePart.content())
				.map(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);
					DataBufferUtils.release(dataBuffer);
					validateUpload(fileName, bytes.length);
					return bytes;
				})
				.flatMap(bytes -> Mono.fromCallable(() -> ingestBytes(userId, fileName, bytes, provider)).subscribeOn(Schedulers.boundedElastic()));
	}

	public IngestionResult ingestBytes(String userId, String fileName, byte[] bytes) {
		return ingestBytes(userId, fileName, bytes, null);
	}

	public IngestionResult ingestBytes(String userId, String fileName, byte[] bytes, String provider) {
		String documentId = UUID.randomUUID().toString();
		List<DocumentSection> extractedSections = textExtractionService.extractSections(fileName, bytes);
		if (extractedSections.isEmpty()) {
			throw new IllegalStateException("No readable text found in file: " + fileName);
		}

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

		String objectKey = objectStorageService.storeDocument(userId, fileName, bytes);
		documentIndexStoreService.save(new IndexedDocument(userId, documentId, fileName, objectKey, sections));
		List<DocumentChunk> chunks = chunkingService.chunkDocument(documentId, fileName, sections);
		if (chunks.isEmpty()) {
			throw new IllegalStateException("No chunks produced for file: " + fileName);
		}
		List<String> providers = new ArrayList<>();
		List<String> providerErrors = new ArrayList<>();
		for (String providerToIndex : providersToIndex(provider)) {
			indexProviderSafely(providerToIndex, chunks, providers, providerErrors);
		}
		if (providers.isEmpty()) {
			throw new IllegalStateException("All embedding providers failed. " + String.join(" | ", providerErrors));
		}
		return new IngestionResult(documentId, fileName, chunks.size(), chunks.stream().map(DocumentChunk::chunkId).toList(), providers);
	}

	private List<String> providersToIndex(String provider) {
		if (StringUtils.hasText(provider)) {
			return List.of(SupportedProvider.from(provider).value());
		}
		return List.of("openai", "gemini");
	}

	private void indexProviderSafely(String provider, List<DocumentChunk> chunks, List<String> indexedProviders, List<String> providerErrors) {
		try {
			indexProvider(provider, chunks, indexedProviders);
		} catch (RuntimeException ex) {
			String reason = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
			providerErrors.add(provider + ": " + reason);
			log.warn("Skipping failed provider '{}' during ingestion: {}", provider, reason);
		}
	}

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
		haystackClient.post()
				.uri("/ingest")
				.bodyValue(new HaystackIngestRequest(provider, payloadChunks, embeddings))
				.retrieve()
				.toBodilessEntity()
				.block();
		indexedProviders.add(provider);
	}

	public void validateUpload(String fileName, long fileSizeBytes) {
		String normalized = fileName == null ? "" : fileName.toLowerCase();
		if (!normalized.endsWith(".pdf") && !normalized.endsWith(".epub")) {
			throw new IllegalArgumentException("Only PDF and EPUB files are supported");
		}
		if (fileSizeBytes > 0 && fileSizeBytes > ingestionProperties.getMaxFileSizeBytes()) {
			throw new IllegalArgumentException("File exceeds max size of " + ingestionProperties.getMaxFileSizeBytes() + " bytes");
		}
	}

	private record HaystackIngestRequest(String provider, List<HaystackChunk> chunks, List<List<Float>> embeddings) {
	}

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
