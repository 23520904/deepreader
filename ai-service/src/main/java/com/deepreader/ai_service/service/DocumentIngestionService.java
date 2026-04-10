package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.IngestionResult;
import com.deepreader.ai_service.config.IngestionProperties;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentIngestionService {

	private final TextExtractionService textExtractionService;
	private final DocumentIndexStoreService documentIndexStoreService;
	private final ChunkingService chunkingService;
	private final EmbeddingService embeddingService;
	private final QdrantVectorStoreService qdrantVectorStoreService;
	private final IngestionProperties ingestionProperties;
	private final ObjectStorageService objectStorageService;

	public DocumentIngestionService(TextExtractionService textExtractionService, DocumentIndexStoreService documentIndexStoreService, ChunkingService chunkingService, EmbeddingService embeddingService, QdrantVectorStoreService qdrantVectorStoreService, IngestionProperties ingestionProperties, ObjectStorageService objectStorageService) {
		this.textExtractionService = textExtractionService;
		this.documentIndexStoreService = documentIndexStoreService;
		this.chunkingService = chunkingService;
		this.embeddingService = embeddingService;
		this.qdrantVectorStoreService = qdrantVectorStoreService;
		this.ingestionProperties = ingestionProperties;
		this.objectStorageService = objectStorageService;
	}

	public Mono<IngestionResult> ingestDocument(String userId, FilePart filePart) {
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
				.flatMap(bytes -> Mono.fromCallable(() -> ingestBytes(userId, fileName, bytes)).subscribeOn(Schedulers.boundedElastic()));
	}

	public IngestionResult ingestBytes(String userId, String fileName, byte[] bytes) {
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
		indexProvider("openai", chunks, providers);
		indexProvider("gemini", chunks, providers);
		return new IngestionResult(documentId, fileName, chunks.size(), chunks.stream().map(DocumentChunk::chunkId).toList(), providers);
	}

	private void indexProvider(String provider, List<DocumentChunk> chunks, List<String> indexedProviders) {
		List<List<Float>> embeddings = embeddingService.embedAll(provider, chunks.stream().map(DocumentChunk::content).toList());
		qdrantVectorStoreService.upsertChunks(provider, chunks, embeddings, embeddingService.embeddingDimensions(provider));
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
}