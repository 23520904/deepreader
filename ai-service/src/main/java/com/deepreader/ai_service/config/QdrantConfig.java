package com.deepreader.ai_service.config;

import io.qdrant.client.QdrantClient;
import io.qdrant.client.QdrantGrpcClient;

import java.util.Objects;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties(QdrantProperties.class)
public class QdrantConfig {

	/**
	 * Creates and configures the Qdrant client used to connect to the vector database.
	 *
	 * The client is built from application properties such as host, gRPC port,
	 * TLS setting, and optional API key.
	 */
	@Bean(destroyMethod = "close")
	public QdrantClient qdrantClient(QdrantProperties properties) {
		validate(properties);
		String host = Objects.requireNonNull(properties.getHost(), "deepreader.qdrant.host must not be null");

		QdrantGrpcClient.Builder builder = QdrantGrpcClient.newBuilder(
			host,
			properties.getGrpcPort(),
			properties.isUseTls(),
			false
		);

		// Adds API key authentication when it is provided.
		if (StringUtils.hasText(properties.getApiKey())) {
			builder.withApiKey(Objects.requireNonNull(properties.getApiKey(), "deepreader.qdrant.api-key must not be null"));
		}

		return new QdrantClient(Objects.requireNonNull(builder.build(), "Qdrant gRPC client must not be null"));
	}

	/**
	 * Validates required Qdrant configuration before creating the client.
	 */
	private void validate(QdrantProperties properties) {
		if (!StringUtils.hasText(properties.getHost())) {
			throw new IllegalStateException("Missing required property: deepreader.qdrant.host");
		}
	}
}