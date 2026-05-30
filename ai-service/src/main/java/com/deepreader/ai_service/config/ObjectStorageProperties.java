package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Holds storage settings for uploaded documents.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.storage
 */
@ConfigurationProperties(prefix = "deepreader.storage")
public class ObjectStorageProperties {

	// Enables external object storage when set to true.
	private boolean enabled = false;

	// Object storage endpoint, such as an S3-compatible service URL.
	private String endpoint;

	// Region used by the object storage provider.
	private String region = "us-east-1";

	// Access key used to connect to object storage.
	private String accessKey;

	// Secret key used to connect to object storage.
	private String secretKey;

	// Bucket where uploaded documents are stored.
	private String bucket = "deepreader-documents";

	// Uses path-style access for S3-compatible storage services.
	private boolean pathStyle = true;

	// Local folder used when external object storage is disabled.
	private String localDirectory = "data/documents";

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public String getEndpoint() {
		return endpoint;
	}

	public void setEndpoint(String endpoint) {
		this.endpoint = endpoint;
	}

	public String getRegion() {
		return region;
	}

	public void setRegion(String region) {
		this.region = region;
	}

	public String getAccessKey() {
		return accessKey;
	}

	public void setAccessKey(String accessKey) {
		this.accessKey = accessKey;
	}

	public String getSecretKey() {
		return secretKey;
	}

	public void setSecretKey(String secretKey) {
		this.secretKey = secretKey;
	}

	public String getBucket() {
		return bucket;
	}

	public void setBucket(String bucket) {
		this.bucket = bucket;
	}

	public boolean isPathStyle() {
		return pathStyle;
	}

	public void setPathStyle(boolean pathStyle) {
		this.pathStyle = pathStyle;
	}

	public String getLocalDirectory() {
		return localDirectory;
	}

	public void setLocalDirectory(String localDirectory) {
		this.localDirectory = localDirectory;
	}
}