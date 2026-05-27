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
import org.springframework.util.StringUtils;

import com.deepreader.ai_service.config.QdrantProperties;
import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.RetrievedChunk;

import io.qdrant.client.PointIdFactory;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.ValueFactory;
import io.qdrant.client.VectorsFactory;
import io.qdrant.client.WithPayloadSelectorFactory;
import io.qdrant.client.grpc.Collections;
import io.qdrant.client.grpc.JsonWithInt;
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
	public void createCollectionIfNotExists(String provider, int vectorSize) {
		String collectionName = collectionName(provider);
		try {
			boolean exists = qdrantClient.collectionExistsAsync(
					collectionName,
					Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
			).get();

			if (!exists) {
				Collections.VectorParams vectorParams = Collections.VectorParams.newBuilder()
						.setSize(vectorSize)
						.setDistance(Collections.Distance.Cosine)
						.build();

				qdrantClient.createCollectionAsync(
						collectionName,
						Objects.requireNonNull(vectorParams, "vectorParams must not be null"),
						Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
				).get();
				log.info("Created Qdrant collection '{}'", collectionName);
			} else {
				Collections.CollectionInfo collectionInfo = qdrantClient.getCollectionInfoAsync(
						collectionName,
						Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
				).get();
				long existingVectorSize = collectionInfo.getConfig().getParams().getVectorsConfig().getParams().getSize();
				if (existingVectorSize != vectorSize) {
					throw new IllegalStateException(
							"Qdrant collection '" + collectionName + "' has vector size " + existingVectorSize
								+ " but current embedding configuration uses " + vectorSize
								+ ". Delete and recreate the collection, or set QDRANT_VECTOR_SIZE to match the existing collection."
					);
				}
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Qdrant collection creation was interrupted", e);
		} catch (ExecutionException e) {
			throw new IllegalStateException("Failed to create or verify Qdrant collection", e.getCause());
		}
	}

	@SuppressWarnings("null")
	public void upsertChunks(String provider, List<DocumentChunk> chunks, List<List<Float>> embeddings, int vectorSize) {
		createCollectionIfNotExists(provider, vectorSize);
		String collectionName = collectionName(provider);
		if (chunks.size() != embeddings.size()) {
			throw new IllegalArgumentException("Chunks count must match embeddings count");
		}
		List<Points.PointStruct> points = new java.util.ArrayList<>(chunks.size());
		for (int i = 0; i < chunks.size(); i++) {
			points.add(toPoint(chunks.get(i), embeddings.get(i)));
		}

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

	@SuppressWarnings("null")
	public List<RetrievedChunk> search(String provider, List<Float> queryVector, int limit) {
		String collectionName = collectionName(provider);
		try {
			Points.SearchPoints request = Points.SearchPoints.newBuilder()
					.setCollectionName(collectionName)
					.addAllVector(Objects.requireNonNull(queryVector, "queryVector must not be null"))
					.setLimit(limit)
					.setWithPayload(WithPayloadSelectorFactory.enable(true))
					.build();

			List<Points.ScoredPoint> points = qdrantClient.searchAsync(
					request,
					Duration.ofSeconds(qdrantProperties.getTimeoutSeconds())
			).get();

			return points.stream().map(this::toRetrievedChunk).toList();
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Qdrant search was interrupted", e);
		} catch (ExecutionException e) {
			throw new IllegalStateException("Failed to search chunk vectors in Qdrant", e.getCause());
		}
	}

	private Points.PointStruct toPoint(DocumentChunk chunk, List<Float> vector) {
		Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload = new LinkedHashMap<>();
		payload.put("documentId", ValueFactory.value(Objects.requireNonNull(chunk.documentId(), "documentId must not be null")));
		payload.put("chunkId", ValueFactory.value(Objects.requireNonNull(chunk.chunkId(), "chunkId must not be null")));
		payload.put("fileName", ValueFactory.value(Objects.requireNonNull(chunk.fileName(), "fileName must not be null")));
		payload.put("sectionId", ValueFactory.value(Objects.requireNonNull(chunk.sectionId(), "sectionId must not be null")));
		payload.put("title", ValueFactory.value(Objects.requireNonNull(chunk.sectionTitle(), "sectionTitle must not be null")));
		payload.put("chunkIndex", ValueFactory.value(chunk.chunkIndex()));
		payload.put("content", ValueFactory.value(Objects.requireNonNull(chunk.content(), "content must not be null")));

		UUID pointId = UUID.nameUUIDFromBytes(Objects.requireNonNull(chunk.chunkId(), "chunkId must not be null").getBytes());

		return Points.PointStruct.newBuilder()
				.setId(PointIdFactory.id(Objects.requireNonNull(pointId, "pointId must not be null")))
				.putAllPayload(payload)
				.setVectors(VectorsFactory.vectors(Objects.requireNonNull(vector, "vector must not be null")))
				.build();
	}

	private RetrievedChunk toRetrievedChunk(Points.ScoredPoint scoredPoint) {
		Map<String, JsonWithInt.Value> payload = scoredPoint.getPayloadMap();
		return new RetrievedChunk(
				readString(payload, "documentId"),
				readString(payload, "chunkId"),
				readString(payload, "fileName"),
				readString(payload, "sectionId"),
				readString(payload, "title"),
				readInteger(payload, "chunkIndex"),
				readString(payload, "content"),
				scoredPoint.getScore()
		);
	}

	private String readString(Map<String, JsonWithInt.Value> payload, String key) {
		JsonWithInt.Value value = payload.get(key);
		if (value == null || !value.hasStringValue()) {
			return null;
		}
		return value.getStringValue();
	}

	private Integer readInteger(Map<String, JsonWithInt.Value> payload, String key) {
		JsonWithInt.Value value = payload.get(key);
		if (value == null) {
			return null;
		}
		if (value.hasIntegerValue()) {
			return Math.toIntExact(value.getIntegerValue());
		}
		if (value.hasDoubleValue()) {
			return (int) value.getDoubleValue();
		}
		return null;
	}

	private String collectionName(String provider) {
		String prefix = StringUtils.hasText(qdrantProperties.getCollectionPrefix()) ? qdrantProperties.getCollectionPrefix() : "document_chunks";
		return prefix + "_" + provider;
	}
}