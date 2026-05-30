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

/**
 * Service responsible for managing asynchronous document ingestion jobs.
 *
 * This service creates pending jobs, processes queued jobs in batches,
 * tracks retry attempts, updates job status, writes failed jobs to a
 * dead-letter table, and records ingestion metrics.
 */
@Service
public class IngestionJobService {

	private final JdbcTemplate jdbcTemplate;
	private final DocumentIngestionService documentIngestionService;
	private final ObjectStorageService objectStorageService;
	private final IngestionProperties ingestionProperties;
	private final AuditLogService auditLogService;

	/**
	 * Counter for successfully completed ingestion jobs.
	 */
	private final Counter ingestionSuccessCounter;

	/**
	 * Counter for ingestion jobs that failed after all retry attempts.
	 */
	private final Counter ingestionFailureCounter;

	/**
	 * Counter for ingestion jobs that required at least one retry attempt.
	 */
	private final Counter ingestionRetryCounter;

	/**
	 * Creates the ingestion job service with database, ingestion, storage,
	 * configuration, audit logging, and metrics dependencies.
	 */
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

	/**
	 * Creates a new pending ingestion job for a previously stored uploaded file.
	 *
	 * When an idempotency key is provided, the method first checks whether a job
	 * already exists for the same user and key. This prevents duplicate jobs from
	 * being created when clients retry the same request.
	 */
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

	/**
	 * Processes the oldest pending ingestion jobs up to the requested batch size.
	 *
	 * Jobs are selected in creation order so older queued uploads are handled first.
	 */
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

	/**
	 * Processes a single ingestion job and updates its final status.
	 *
	 * The job is marked as PROCESSING only if it is still pending. The document
	 * bytes are loaded from object storage when they are not passed directly,
	 * then the ingestion pipeline is executed with retry support.
	 */
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

	/**
	 * Returns the current status and result information for a user's ingestion job.
	 *
	 * The query is scoped by user id so users can only access their own jobs.
	 */
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

	/**
	 * Updates the status and result fields of an ingestion job.
	 *
	 * Successful jobs store the generated document id, while failed jobs store
	 * the error message that explains why processing did not complete.
	 */
	private void updateStatus(String jobId, IngestionJobStatus status, String documentId, String errorMessage) {
		jdbcTemplate.update(
				"update ingestion_jobs set status = ?, document_id = ?, error_message = ?, updated_at = now() where job_id = ?",
				status.name(),
				documentId,
				errorMessage,
				jobId
		);
	}

	/**
	 * Stores the current processing attempt number for a job.
	 */
	private void updateAttempt(String jobId, int attempt) {
		jdbcTemplate.update(
				"update ingestion_jobs set attempts = ?, updated_at = now() where job_id = ?",
				attempt,
				jobId
		);
	}

	/**
	 * Atomically marks a pending job as processing.
	 *
	 * This prevents multiple workers from processing the same job at the same time.
	 */
	private boolean markProcessingIfPending(String jobId) {
		int updated = jdbcTemplate.update(
				"update ingestion_jobs set status = ?, updated_at = now() where job_id = ? and status = ?",
				IngestionJobStatus.PROCESSING.name(),
				jobId,
				IngestionJobStatus.PENDING.name()
		);

		return updated > 0;
	}

	/**
	 * Writes a permanently failed ingestion job to the dead-letter table.
	 *
	 * Dead-letter records make it easier to inspect failed jobs after all retry
	 * attempts have been exhausted.
	 */
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

	/**
	 * Lightweight internal representation of a pending ingestion job.
	 */
	private record PendingJob(String jobId, String userId, String fileName) {}
}