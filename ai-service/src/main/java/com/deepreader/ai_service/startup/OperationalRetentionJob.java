package com.deepreader.ai_service.startup;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OperationalRetentionJob {

	private static final Logger log = LoggerFactory.getLogger(OperationalRetentionJob.class);

	private final JdbcTemplate jdbcTemplate;
	private final int auditDays;
	private final int deadLetterDays;
	private final int sessionDays;
	private final int usageDays;

	public OperationalRetentionJob(
			JdbcTemplate jdbcTemplate,
			@Value("${deepreader.retention.audit-days:30}") int auditDays,
			@Value("${deepreader.retention.dead-letter-days:30}") int deadLetterDays,
			@Value("${deepreader.retention.session-days:30}") int sessionDays,
			@Value("${deepreader.retention.usage-days:90}") int usageDays) {
		this.jdbcTemplate = jdbcTemplate;
		this.auditDays = auditDays;
		this.deadLetterDays = deadLetterDays;
		this.sessionDays = sessionDays;
		this.usageDays = usageDays;
	}

	@Scheduled(cron = "${deepreader.retention.cron:0 0 3 * * *}")
	public void cleanup() {
		jdbcTemplate.update("select cleanup_old_operational_data(?, ?, ?, ?)",
				auditDays, deadLetterDays, sessionDays, usageDays);
		log.info("Operational retention cleanup executed");
	}
}
