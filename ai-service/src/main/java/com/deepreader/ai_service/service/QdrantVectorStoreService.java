package com.deepreader.ai_service.service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.deepreader.ai_service.config.QdrantProperties;
import com.deepreader.ai_service.model.DocumentChunk;

import io.qdrant.client.PointIdFactory;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.ValueFactory;
import io.qdrant.client.VectorsFactory;
import io.qdrant.client.grpc.Collections;
import io.qdrant.client.grpc.Points;

@Service
public class QdrantVectorStoreService {

	private static final Logger log = LoggerFactory.getLogger(QdrantVectorStoreService.class);

	private final QdrantClient qdrantClient;
	private final QdrantProperties qdrantProperties;

	public QdrantVectorStoreService(QdrantClient qdrantClient, QdrantProperties qdrantProperties) {
		this.qdrantClient = qdrantClient;
		this.qdrantProperties = qdrantProperties;
	}

	public List<String> listCollections() {
		try {
			return qdrantClient.listCollectionsAsync(Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())).get();
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Qdrant collection listing was interrupted", e);
		} catch (ExecutionException e) {
			throw new IllegalStateException("Failed to list Qdrant collections", e.getCause());
		}
	}

	public void logCollections() {
		log.info("Connected to Qdrant collection set: {}", listCollections());
	}

	@SuppressWarnings("null")
	public void createCollectionIfNotExists() {
		String collectionName = requireCollectionName();
		try {
			boolean exists = qdrantClient.collectionExistsAsync(
					collectionName,
					Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
			).get();

			if (!exists) {
				Collections.VectorParams vectorParams = Collections.VectorParams.newBuilder()
						.setSize(qdrantProperties.getVectorSize())
						.setDistance(Collections.Distance.Cosine)
						.build();

				qdrantClient.createCollectionAsync(
						collectionName,
						Objects.requireNonNull(vectorParams, "vectorParams must not be null"),
						Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
				).get();
				log.info("Created Qdrant collection '{}'", collectionName);
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Qdrant collection creation was interrupted", e);
		} catch (ExecutionException e) {
			throw new IllegalStateException("Failed to create or verify Qdrant collection", e.getCause());
		}
	}

	@SuppressWarnings("null")
	public void upsertChunks(List<DocumentChunk> chunks, EmbeddingService embeddingService) {
		String collectionName = requireCollectionName();
		List<Points.PointStruct> points = chunks.stream()
				.map(chunk -> toPoint(chunk, embeddingService.embed(chunk.content())))
				.toList();

		try {
			qdrantClient.upsertAsync(
					collectionName,
					Objects.requireNonNull(points, "points must not be null"),
					Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
			).get();
			log.info("Upserted {} chunks into Qdrant collection '{}'", points.size(), collectionName);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Qdrant upsert was interrupted", e);
		} catch (ExecutionException e) {
			throw new IllegalStateException("Failed to upsert chunk vectors to Qdrant", e.getCause());
		}
	}

	private Points.PointStruct toPoint(DocumentChunk chunk, List<Float> vector) {
		Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload = new LinkedHashMap<>();
		payload.put("documentId", ValueFactory.value(Objects.requireNonNull(chunk.documentId(), "documentId must not be null")));
		payload.put("chunkId", ValueFactory.value(Objects.requireNonNull(chunk.chunkId(), "chunkId must not be null")));
		payload.put("fileName", ValueFactory.value(Objects.requireNonNull(chunk.fileName(), "fileName must not be null")));
		payload.put("chunkIndex", ValueFactory.value(chunk.chunkIndex()));
		payload.put("content", ValueFactory.value(Objects.requireNonNull(chunk.content(), "content must not be null")));

		UUID pointId = UUID.nameUUIDFromBytes(Objects.requireNonNull(chunk.chunkId(), "chunkId must not be null").getBytes());

		return Points.PointStruct.newBuilder()
				.setId(PointIdFactory.id(Objects.requireNonNull(pointId, "pointId must not be null")))
				.putAllPayload(payload)
				.setVectors(VectorsFactory.vectors(Objects.requireNonNull(vector, "vector must not be null")))
				.build();
	}

	private String requireCollectionName() {
		return Objects.requireNonNull(qdrantProperties.getCollection(), "qdrant collection must not be null");
	}
}