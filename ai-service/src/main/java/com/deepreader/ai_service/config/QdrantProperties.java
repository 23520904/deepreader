package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Holds Qdrant configuration values loaded from application properties.
 *
 * These properties are used to connect to Qdrant and define default
 * vector collection settings for document chunks.
 */
@ConfigurationProperties(prefix = "deepreader.qdrant")
public class QdrantProperties {

	private String host;
	private int grpcPort = 6334;
	private String apiKey;
	private boolean useTls = true;
	private String collectionPrefix = "document_chunks";
	private long timeoutSeconds = 5;

	public String getHost() {
		return host;
	}

	public void setHost(String host) {
		this.host = host;
	}

	public int getGrpcPort() {
		return grpcPort;
	}

	public void setGrpcPort(int grpcPort) {
		this.grpcPort = grpcPort;
	}

	public String getApiKey() {
		return apiKey;
	}

	public void setApiKey(String apiKey) {
		this.apiKey = apiKey;
	}

	public boolean isUseTls() {
		return useTls;
	}

	public void setUseTls(boolean useTls) {
		this.useTls = useTls;
	}

	public String getCollectionPrefix() {
		return collectionPrefix;
	}

	public void setCollectionPrefix(String collectionPrefix) {
		this.collectionPrefix = collectionPrefix;
	}

	public long getTimeoutSeconds() {
		return timeoutSeconds;
	}

	public void setTimeoutSeconds(long timeoutSeconds) {
		this.timeoutSeconds = timeoutSeconds;
	}

}