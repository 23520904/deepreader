package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;

/**
 * Holds data retention settings used by the AI service.
 *
 * These values are loaded from application config with the prefix:
 * deepreader.retention
 */
@ConfigurationProperties(prefix = "deepreader.retention")
@Validated
public class RetentionProperties {

	// Number of days to retain audit log entries.
	@Min(1)
	private int auditDays = 30;

	// Number of days to retain dead-letter job entries.
	@Min(1)
	private int deadLetterDays = 30;

	// Number of days to retain user session records.
	@Min(1)
	private int sessionDays = 30;

	// Number of days to retain usage tracking records.
	@Min(1)
	private int usageDays = 90;

	// Cron expression that controls when the retention job runs.
	private String cron = "0 0 3 * * *";

	public int getAuditDays() {
		return auditDays;
	}

	public void setAuditDays(int auditDays) {
		this.auditDays = auditDays;
	}

	public int getDeadLetterDays() {
		return deadLetterDays;
	}

	public void setDeadLetterDays(int deadLetterDays) {
		this.deadLetterDays = deadLetterDays;
	}

	public int getSessionDays() {
		return sessionDays;
	}

	public void setSessionDays(int sessionDays) {
		this.sessionDays = sessionDays;
	}

	public int getUsageDays() {
		return usageDays;
	}

	public void setUsageDays(int usageDays) {
		this.usageDays = usageDays;
	}

	public String getCron() {
		return cron;
	}

	public void setCron(String cron) {
		this.cron = cron;
	}
}
