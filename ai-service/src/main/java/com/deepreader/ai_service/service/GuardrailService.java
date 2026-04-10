package com.deepreader.ai_service.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class GuardrailService {

	private final JdbcTemplate jdbcTemplate;

	public GuardrailService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

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
