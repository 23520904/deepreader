package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.QdrantProperties;
import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.IngestionResult;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.core.io.buffer.DataBufferUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentIngestionService {

	private final TextExtractionService textExtractionService;
	private final ChunkingService chunkingService;
	private final EmbeddingService embeddingService;
	private final QdrantVectorStoreService qdrantVectorStoreService;
	private final QdrantProperties qdrantProperties;

	public DocumentIngestionService(
			TextExtractionService textExtractionService,
			ChunkingService chunkingService,
			EmbeddingService embeddingService,
			QdrantVectorStoreService qdrantVectorStoreService,
			QdrantProperties qdrantProperties
	) {
		this.textExtractionService = textExtractionService;
		this.chunkingService = chunkingService;
		this.embeddingService = embeddingService;
		this.qdrantVectorStoreService = qdrantVectorStoreService;
		this.qdrantProperties = qdrantProperties;
	}

	public Mono<IngestionResult> ingestPdf(FilePart filePart) {
		String fileName = StringUtils.hasText(filePart.filename()) ? filePart.filename() : "uploaded.pdf";
		if (!fileName.toLowerCase().endsWith(".pdf")) {
			return Mono.error(new IllegalArgumentException("Only PDF files are supported right now"));
		}

		return DataBufferUtils.join(filePart.content())
				.map(dataBuffer -> {
					byte[] bytes = new byte[dataBuffer.readableByteCount()];
					dataBuffer.read(bytes);
					DataBufferUtils.release(dataBuffer);
					return bytes;
				})
				.flatMap(bytes -> Mono.fromCallable(() -> ingestBytes(fileName, bytes))
						.subscribeOn(Schedulers.boundedElastic()));
	}

	private IngestionResult ingestBytes(String fileName, byte[] bytes) {
		String documentId = UUID.randomUUID().toString();
		String extractedText = textExtractionService.extractPdfText(bytes);
		if (!StringUtils.hasText(extractedText)) {
			throw new IllegalStateException("No readable text found in PDF: " + fileName);
		}

		List<DocumentChunk> chunks = chunkingService.chunkDocument(documentId, fileName, extractedText);
		if (chunks.isEmpty()) {
			throw new IllegalStateException("No chunks were produced for PDF: " + fileName);
		}

		List<List<Float>> embeddings = embeddingService.embedAll(chunks.stream().map(DocumentChunk::content).toList());
		qdrantVectorStoreService.createCollectionIfNotExists();
		qdrantVectorStoreService.upsertChunks(chunks, embeddings);

		return new IngestionResult(
				documentId,
				fileName,
				chunks.size(),
				chunks.stream().map(DocumentChunk::chunkId).toList(),
				qdrantProperties.getCollection()
		);
	}
}