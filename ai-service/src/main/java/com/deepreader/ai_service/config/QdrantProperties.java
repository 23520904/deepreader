package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.qdrant")
public class QdrantProperties {

	private String host;
	private int grpcPort = 6334;
	private String apiKey;
	private boolean useTls = true;
	private String collection = "document_chunks";
	private long timeoutSeconds = 5;
	private long vectorSize = 128;

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

	public String getCollection() {
		return collection;
	}

	public void setCollection(String collection) {
		this.collection = collection;
	}

	public long getTimeoutSeconds() {
		return timeoutSeconds;
	}

	public void setTimeoutSeconds(long timeoutSeconds) {
		this.timeoutSeconds = timeoutSeconds;
	}

	public long getVectorSize() {
		return vectorSize;
	}

	public void setVectorSize(long vectorSize) {
		this.vectorSize = vectorSize;
	}
}