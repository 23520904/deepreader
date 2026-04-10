package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.storage")
public class ObjectStorageProperties {

	private boolean enabled = false;
	private String endpoint;
	private String region = "us-east-1";
	private String accessKey;
	private String secretKey;
	private String bucket = "deepreader-documents";
	private boolean pathStyle = true;

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
}
