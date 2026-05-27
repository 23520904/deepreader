package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.IngestionJobStatus;
import com.deepreader.ai_service.model.api.internal.IngestionJobResponse;
import com.deepreader.ai_service.model.api.internal.IngestionResult;
import com.deepreader.ai_service.config.IngestionProperties;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class IngestionJobService {

	private final JdbcTemplate jdbcTemplate;
	private final DocumentIngestionService documentIngestionService;
	private final ObjectStorageService objectStorageService;
	private final IngestionProperties ingestionProperties;
	private final AuditLogService auditLogService;
	private final Counter ingestionSuccessCounter;
	private final Counter ingestionFailureCounter;
	private final Counter ingestionRetryCounter;

	public IngestionJobService(
			JdbcTemplate jdbcTemplate,
			DocumentIngestionService documentIngestionService,
			ObjectStorageService objectStorageService,
			IngestionProperties ingestionProperties,
			AuditLogService auditLogService,
			MeterRegistry meterRegistry
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.documentIngestionService = documentIngestionService;
		this.objectStorageService = objectStorageService;
		this.ingestionProperties = ingestionProperties;
		this.auditLogService = auditLogService;
		this.ingestionSuccessCounter = meterRegistry.counter("deepreader.ingestion.jobs.succeeded");
		this.ingestionFailureCounter = meterRegistry.counter("deepreader.ingestion.jobs.failed");
		this.ingestionRetryCounter = meterRegistry.counter("deepreader.ingestion.jobs.retried");
	}

	public IngestionJobResponse createPendingJob(String userId, String fileName, String sourceObjectKey, String idempotencyKey) {
		if (StringUtils.hasText(idempotencyKey)) {
			List<IngestionJobResponse> existing = jdbcTemplate.query(
					"select job_id, file_name, status, document_id, error_message from ingestion_jobs where user_id = ? and idempotency_key = ?",
					(rs, rowNum) -> new IngestionJobResponse(
							rs.getString("job_id"),
							rs.getString("file_name"),
							rs.getString("status"),
							rs.getString("document_id"),
							rs.getString("error_message")
					),
					userId,
					idempotencyKey
			);
			if (!existing.isEmpty()) {
				return existing.getFirst();
			}
		}
		String jobId = UUID.randomUUID().toString();
		jdbcTemplate.update(
				"insert into ingestion_jobs (job_id, user_id, file_name, status, source_object_key, idempotency_key) values (?, ?, ?, ?, ?, ?)",
				jobId,
				userId,
				fileName,
				IngestionJobStatus.PENDING.name(),
				sourceObjectKey,
				StringUtils.hasText(idempotencyKey) ? idempotencyKey : null
		);
		auditLogService.log(userId, "INGESTION_JOB_CREATED", "jobId=" + jobId + ", fileName=" + fileName);
		return new IngestionJobResponse(jobId, fileName, IngestionJobStatus.PENDING.name(), null, null);
	}

	public void processPendingBatch(int batchSize) {
		List<PendingJob> jobs = jdbcTemplate.query(
				"select job_id, user_id, file_name from ingestion_jobs where status = ? order by created_at asc limit ?",
				(rs, rowNum) -> new PendingJob(
						rs.getString("job_id"),
						rs.getString("user_id"),
						rs.getString("file_name")
				),
				IngestionJobStatus.PENDING.name(),
				batchSize
		);
		for (PendingJob job : jobs) {
			processJob(job.userId(), job.jobId(), job.fileName(), null);
		}
	}

	public void processJob(String userId, String jobId, String fileName, byte[] bytes) {
		if (!markProcessingIfPending(jobId)) {
			return;
		}
		byte[] payload = bytes;
		if (payload == null) {
			String objectKey = jdbcTemplate.queryForObject(
					"select source_object_key from ingestion_jobs where job_id = ?",
					String.class,
					jobId
			);
			if (objectKey == null || objectKey.isBlank()) {
				updateStatus(jobId, IngestionJobStatus.FAILED, null, "Missing source object key");
				return;
			}
			payload = objectStorageService.loadDocument(objectKey);
		}
		int maxAttempts = Math.max(1, ingestionProperties.getMaxRetries());
		for (int attempt = 1; attempt <= maxAttempts; attempt++) {
			updateAttempt(jobId, attempt);
			try {
				IngestionResult result = documentIngestionService.ingestBytes(userId, fileName, payload);
				updateStatus(jobId, IngestionJobStatus.SUCCEEDED, result.documentId(), null);
				ingestionSuccessCounter.increment();
				auditLogService.log(userId, "INGESTION_JOB_SUCCEEDED", "jobId=" + jobId + ", documentId=" + result.documentId());
				return;
			} catch (RuntimeException ex) {
				if (attempt < maxAttempts) {
					ingestionRetryCounter.increment();
					continue;
				}
				updateStatus(jobId, IngestionJobStatus.FAILED, null, ex.getMessage());
				writeDeadLetter(jobId, userId, fileName, ex.getMessage(), attempt);
				ingestionFailureCounter.increment();
				auditLogService.log(userId, "INGESTION_JOB_FAILED", "jobId=" + jobId + ", error=" + ex.getMessage());
			}
		}
	}

	public IngestionJobResponse getJob(String userId, String jobId) {
		List<IngestionJobResponse> responses = jdbcTemplate.query(
				"select job_id, file_name, status, document_id, error_message from ingestion_jobs where user_id = ? and job_id = ?",
				(rs, rowNum) -> new IngestionJobResponse(
						rs.getString("job_id"),
						rs.getString("file_name"),
						rs.getString("status"),
						rs.getString("document_id"),
						rs.getString("error_message")
				),
				userId,
				jobId
		);
		if (responses.isEmpty()) {
			throw new IllegalArgumentException("Ingestion job not found: " + jobId);
		}
		return responses.getFirst();
	}

	private void updateStatus(String jobId, IngestionJobStatus status, String documentId, String errorMessage) {
		jdbcTemplate.update(
				"update ingestion_jobs set status = ?, document_id = ?, error_message = ?, updated_at = now() where job_id = ?",
				status.name(),
				documentId,
				errorMessage,
				jobId
		);
	}

	private void updateAttempt(String jobId, int attempt) {
		jdbcTemplate.update(
				"update ingestion_jobs set attempts = ?, updated_at = now() where job_id = ?",
				attempt,
				jobId
		);
	}

	private boolean markProcessingIfPending(String jobId) {
		int updated = jdbcTemplate.update(
				"update ingestion_jobs set status = ?, updated_at = now() where job_id = ? and status = ?",
				IngestionJobStatus.PROCESSING.name(),
				jobId,
				IngestionJobStatus.PENDING.name()
		);
		return updated > 0;
	}

	private void writeDeadLetter(String jobId, String userId, String fileName, String errorMessage, int attempts) {
		jdbcTemplate.update(
				"insert into ingestion_job_dead_letters (job_id, user_id, file_name, error_message, attempts) values (?, ?, ?, ?, ?)",
				jobId,
				userId,
				fileName,
				errorMessage == null ? "Unknown error" : errorMessage,
				attempts
		);
	}

	private record PendingJob(String jobId, String userId, String fileName) {}
}
