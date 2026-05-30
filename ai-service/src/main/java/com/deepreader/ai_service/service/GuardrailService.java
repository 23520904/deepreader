package com.deepreader.ai_service.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Service responsible for enforcing usage limits for user actions.
 *
 * This service tracks daily usage counters in the database and prevents users
 * from exceeding configured limits for metrics such as uploads or LLM requests.
 */
@Service
public class GuardrailService {

	private final JdbcTemplate jdbcTemplate;

	/**
	 * Creates the guardrail service with JDBC database access.
	 */
	public GuardrailService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Increments a user's daily usage counter and verifies it against the limit.
	 *
	 * The counter is stored per user, metric key, and current date. If the updated
	 * value is greater than the configured daily maximum, the request is rejected.
	 */
	public void enforceDailyLimit(String userId, String metricKey, long increment, long maxPerDay) {
		jdbcTemplate.update(
				"insert into usage_counters (user_id, metric_key, window_date, value) values (?, ?, current_date, ?) on conflict (user_id, metric_key, window_date) do update set value = usage_counters.value + excluded.value, updated_at = now()",
				userId,
				metricKey,
				increment
		);

		Long value = jdbcTemplate.queryForObject(
				"select value from usage_counters where user_id = ? and metric_key = ? and window_date = current_date",
				Long.class,
				userId,
				metricKey
		);

		if (value != null && value > maxPerDay) {
			throw new IllegalStateException("Usage limit exceeded for " + metricKey + ": " + value + "/" + maxPerDay);
		}
	}
}