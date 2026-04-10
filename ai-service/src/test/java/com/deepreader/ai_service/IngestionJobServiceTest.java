package com.deepreader.ai_service;

import com.deepreader.ai_service.config.IngestionProperties;
import com.deepreader.ai_service.model.IngestionResult;
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

class IngestionJobServiceTest {

	@Test
	void processJobRetriesUntilSuccess() {
		JdbcTemplate jdbcTemplate = org.mockito.Mockito.mock(JdbcTemplate.class);
		DocumentIngestionService ingestionService = org.mockito.Mockito.mock(DocumentIngestionService.class);
		ObjectStorageService objectStorageService = org.mockito.Mockito.mock(ObjectStorageService.class);
		AuditLogService auditLogService = org.mockito.Mockito.mock(AuditLogService.class);
		IngestionProperties props = new IngestionProperties();
		props.setMaxRetries(3);
		when(jdbcTemplate.update(anyString(), any(), any(), any(), any())).thenReturn(1);
		when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any())).thenReturn(1);
		when(jdbcTemplate.update(anyString(), any(), any())).thenReturn(1);
		when(jdbcTemplate.update(anyString(), any(), any(), any())).thenReturn(1);
		when(ingestionService.ingestBytes(anyString(), anyString(), any(byte[].class)))
				.thenThrow(new IllegalStateException("try1"))
				.thenThrow(new IllegalStateException("try2"))
				.thenReturn(new IngestionResult("doc-1", "book.pdf", 1, List.of("c1"), List.of("gemini")));

		IngestionJobService jobService = new IngestionJobService(
				jdbcTemplate,
				ingestionService,
				objectStorageService,
				props,
				auditLogService,
				new SimpleMeterRegistry()
		);

		jobService.processJob("user-1", "job-1", "book.pdf", "data".getBytes());

		verify(ingestionService, times(3)).ingestBytes(anyString(), anyString(), any(byte[].class));
		ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
		verify(jdbcTemplate, atLeast(1)).update(sqlCaptor.capture(), any(), any(), any(), any());
		verify(jdbcTemplate, never()).update(org.mockito.ArgumentMatchers.contains("ingestion_job_dead_letters"), any(), any(), any(), any(), any());
	}
}
