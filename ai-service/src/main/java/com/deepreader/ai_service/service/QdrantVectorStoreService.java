package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.QdrantProperties;
import io.qdrant.client.QdrantClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ExecutionException;

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
}