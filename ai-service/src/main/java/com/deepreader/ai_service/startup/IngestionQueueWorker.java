package com.deepreader.ai_service.startup;

import com.deepreader.ai_service.config.WorkerProperties;
import com.deepreader.ai_service.service.IngestionJobService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "deepreader.worker", name = "enabled", havingValue = "true", matchIfMissing = true)
public class IngestionQueueWorker {

	private final IngestionJobService ingestionJobService;
	private final WorkerProperties workerProperties;

	public IngestionQueueWorker(IngestionJobService ingestionJobService, WorkerProperties workerProperties) {
		this.ingestionJobService = ingestionJobService;
		this.workerProperties = workerProperties;
	}

	@Scheduled(fixedDelayString = "${deepreader.worker.poll-interval-ms:5000}")
	public void pollAndProcessPendingJobs() {
		ingestionJobService.processPendingBatch(workerProperties.getBatchSize());
	}
}
