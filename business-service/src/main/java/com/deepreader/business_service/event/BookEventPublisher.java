package com.deepreader.business_service.event;

import com.deepreader.business_service.config.KafkaTopicsProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Component
public class BookEventPublisher {

	private final KafkaTemplate<String, BookDomainEvent> kafkaTemplate;
	private final KafkaTopicsProperties topicsProperties;
	private final boolean publisherEnabled;

	public BookEventPublisher(KafkaTemplate<String, BookDomainEvent> kafkaTemplate,
			KafkaTopicsProperties topicsProperties,
			@Value("${deepreader.kafka.publisher-enabled:true}") boolean publisherEnabled) {
		this.kafkaTemplate = kafkaTemplate;
		this.topicsProperties = topicsProperties;
		this.publisherEnabled = publisherEnabled;
	}

	public void publish(String eventType, String userId, String bookId, Map<String, Object> metadata) {
		String key = Objects.requireNonNull(bookId, "bookId is required");
		if (!publisherEnabled) {
			return;
		}
		String topic = Objects.requireNonNull(topicsProperties.bookEvents(), "book-events topic is required");
		BookDomainEvent event = new BookDomainEvent(eventType, userId, bookId, Instant.now(), metadata);
		try {
			kafkaTemplate.send(topic, key, event).get(5, TimeUnit.SECONDS);
		} catch (Exception ex) {
			throw new IllegalStateException("Failed to publish book event to Kafka", ex);
		}
	}
}
