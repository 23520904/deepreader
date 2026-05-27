package com.deepreader.business_service.event;

import java.time.Instant;
import java.util.Map;

public record BookDomainEvent(
		String eventType,
		String userId,
		String bookId,
		Instant occurredAt,
		Map<String, Object> metadata) {
}
