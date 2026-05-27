package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.ObjectStorageProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;

@Service
public class ObjectStorageService {

	private static final String LOCAL_KEY_PREFIX = "local:";

	private final ObjectStorageProperties properties;

	public ObjectStorageService(ObjectStorageProperties properties) {
		this.properties = properties;
	}

	public String storeDocument(String userId, String fileName, byte[] bytes) {
		String safeFileName = StringUtils.hasText(fileName) ? fileName.replaceAll("[^a-zA-Z0-9._-]", "_") : "uploaded.bin";

		if (!properties.isEnabled()) {
			return storeLocalDocument(userId, safeFileName, bytes);
		}
		if (!StringUtils.hasText(properties.getEndpoint())
				|| !StringUtils.hasText(properties.getAccessKey())
				|| !StringUtils.hasText(properties.getSecretKey())
				|| !StringUtils.hasText(properties.getBucket())) {
			throw new IllegalStateException("Object storage is enabled but configuration is incomplete");
		}
		String key = userId + "/" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + safeFileName;
		try (S3Client s3 = buildClient()) {
			ensureBucketExists(s3);
			s3.putObject(
					PutObjectRequest.builder()
							.bucket(properties.getBucket())
							.key(key)
							.contentType(contentTypeByName(safeFileName))
							.build(),
					RequestBody.fromBytes(bytes)
			);
		}
		return key;
	}

	public byte[] loadDocument(String objectKey) {
		if (objectKey != null && objectKey.startsWith(LOCAL_KEY_PREFIX)) {
			return loadLocalDocument(objectKey.substring(LOCAL_KEY_PREFIX.length()));
		}

		if (!properties.isEnabled()) {
			throw new IllegalStateException("Object storage is disabled");
		}
		try (S3Client s3 = buildClient()) {
			return s3.getObjectAsBytes(
					GetObjectRequest.builder()
							.bucket(properties.getBucket())
							.key(objectKey)
							.build()
			).asByteArray();
		}
	}

	private String storeLocalDocument(String userId, String safeFileName, byte[] bytes) {
		String safeUserId = safePathSegment(userId, "anonymous");
		String relativeKey = safeUserId + "/" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + safeFileName;
		Path path = resolveLocalPath(relativeKey);

		try {
			Files.createDirectories(path.getParent());
			Files.write(path, bytes);
			return LOCAL_KEY_PREFIX + relativeKey.replace('\\', '/');
		} catch (IOException e) {
			throw new IllegalStateException("Failed to store document locally", e);
		}
	}

	private byte[] loadLocalDocument(String relativeKey) {
		Path path = resolveLocalPath(relativeKey);

		try {
			return Files.readAllBytes(path);
		} catch (IOException e) {
			throw new IllegalStateException("Failed to load local document", e);
		}
	}

	private Path resolveLocalPath(String relativeKey) {
		String localDirectory = StringUtils.hasText(properties.getLocalDirectory())
				? properties.getLocalDirectory()
				: "data/documents";
		Path root = Path.of(localDirectory).toAbsolutePath().normalize();
		Path path = root.resolve(relativeKey.replace('\\', '/')).normalize();

		if (!path.startsWith(root)) {
			throw new IllegalArgumentException("Invalid local document path");
		}

		return path;
	}

	private String safePathSegment(String value, String fallback) {
		String safe = StringUtils.hasText(value)
				? value.replaceAll("[^a-zA-Z0-9._-]", "_")
				: fallback;

		return safe.isBlank() ? fallback : safe;
	}

	private S3Client buildClient() {
		Region region = Region.of(properties.getRegion());
		URI endpoint = URI.create(properties.getEndpoint());
		AwsBasicCredentials credentials = AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretKey());
		return S3Client.builder()
				.region(region)
				.endpointOverride(endpoint)
				.credentialsProvider(StaticCredentialsProvider.create(credentials))
				.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(properties.isPathStyle()).build())
				.build();
	}

	private void ensureBucketExists(S3Client s3) {
		try {
			s3.headBucket(HeadBucketRequest.builder().bucket(properties.getBucket()).build());
		} catch (NoSuchBucketException e) {
			s3.createBucket(CreateBucketRequest.builder().bucket(properties.getBucket()).build());
		} catch (S3Exception e) {
			if (e.statusCode() == 404) {
				s3.createBucket(CreateBucketRequest.builder().bucket(properties.getBucket()).build());
				return;
			}
			throw e;
		}
	}

	private String contentTypeByName(String fileName) {
		String lower = fileName.toLowerCase();
		if (lower.endsWith(".pdf")) {
			return "application/pdf";
		}
		if (lower.endsWith(".epub")) {
			return "application/epub+zip";
		}
		return "application/octet-stream";
	}
}
