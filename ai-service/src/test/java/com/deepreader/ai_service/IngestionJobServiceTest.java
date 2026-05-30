package com.deepreader.ai_service;

import com.deepreader.ai_service.config.IngestionProperties;
import com.deepreader.ai_service.model.api.internal.IngestionResult;
import com.deepreader.ai_service.service.AuditLogService;
import com.deepreader.ai_service.service.DocumentIngestionService;
import com.deepreader.ai_service.service.IngestionJobService;
import com.deepreader.ai_service.service.ObjectStorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests retry behavior in IngestionJobService.
 *
 * <p>This test makes sure an ingestion job is retried after temporary failures
 * and is not moved to the dead-letter table when it finally succeeds.
 */
class IngestionJobServiceTest {

	/**
	 * Checks that a job is retried until it succeeds within the allowed retry limit.
	 *
	 * <p>The mocked ingestion service fails twice, then succeeds on the third try.
	 * Since the job succeeds before maxRetries is reached, it should not be marked
	 * as a dead-letter job.
	 */
	@Test
	void processJobRetriesUntilSuccess() {
		JdbcTemplate jdbcTemplate = org.mockito.Mockito.mock(JdbcTemplate.class);
		DocumentIngestionService ingestionService = org.mockito.Mockito.mock(DocumentIngestionService.class);
		ObjectStorageService objectStorageService = org.mockito.Mockito.mock(ObjectStorageService.class);
		AuditLogService auditLogService = org.mockito.Mockito.mock(AuditLogService.class);

		IngestionProperties props = new IngestionProperties();
		props.setMaxRetries(3);

		// Mock database updates so the job service can move through each job status step.
		when(jdbcTemplate.update(anyString(), any(), any(), any(), any())).thenReturn(1);
		when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any())).thenReturn(1);
		when(jdbcTemplate.update(anyString(), any(), any())).thenReturn(1);
		when(jdbcTemplate.update(anyString(), any(), any(), any())).thenReturn(1);

		// Simulate two failed ingestion attempts followed by one successful attempt.
		when(ingestionService.ingestBytes(anyString(), anyString(), any(byte[].class)))
				.thenThrow(new IllegalStateException("try1"))
				.thenThrow(new IllegalStateException("try2"))
				.thenReturn(new IngestionResult("doc-1", "book.pdf", 1, 1, List.of("c1"), List.of("groq")));

		IngestionJobService jobService = new IngestionJobService(
				jdbcTemplate,
				ingestionService,
				objectStorageService,
				props,
				auditLogService,
				new SimpleMeterRegistry()
		);

		jobService.processJob("user-1", "job-1", "book.pdf", "data".getBytes());

		// The service should try ingestion three times: two failures and one success.
		verify(ingestionService, times(3)).ingestBytes(anyString(), anyString(), any(byte[].class));

		// Capture executed SQL updates so the test can verify database behavior.
		ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
		verify(jdbcTemplate, atLeast(1)).update(sqlCaptor.capture(), any(), any(), any(), any());

		// A successful retry should not create a dead-letter record.
		verify(jdbcTemplate, never()).update(org.mockito.ArgumentMatchers.contains("ingestion_job_dead_letters"), any(), any(), any(), any(), any());
	}
}