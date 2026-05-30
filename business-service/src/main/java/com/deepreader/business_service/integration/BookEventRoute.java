package com.deepreader.business_service.integration;

import com.deepreader.business_service.config.KafkaTopicsProperties;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.support.processor.idempotent.MemoryIdempotentRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Apache Camel route for consuming and auditing book events from Kafka.
 *
 * <p>The route is only enabled when the Kafka Camel route feature flag is turned on.
 */
@Component
@ConditionalOnProperty(prefix = "deepreader.kafka", name = "camel-route-enabled", havingValue = "true")
public class BookEventRoute extends RouteBuilder {

	private final KafkaTopicsProperties topicsProperties;

	public BookEventRoute(KafkaTopicsProperties topicsProperties) {
		this.topicsProperties = topicsProperties;
	}

	@Override
	public void configure() {
		// Common Kafka security settings reused by both the main topic and DLQ endpoint.
		String kafkaSecurity = "additionalProperties.security.protocol={{spring.kafka.properties.security.protocol}}"
				+ "&additionalProperties.ssl.keystore.type=PEM"
				+ "&additionalProperties.ssl.truststore.type=PEM"
				+ "&additionalProperties.ssl.keystore.location={{spring.kafka.properties.ssl.keystore.location}}"
				+ "&additionalProperties.ssl.truststore.location={{spring.kafka.properties.ssl.truststore.location}}";

		// Retry temporary failures before sending failed messages to the dead-letter topic.
		onException(Exception.class)
				.maximumRedeliveries(3)
				.redeliveryDelay(1000)
				.useExponentialBackOff()
				.backOffMultiplier(2)
				.handled(true)
				.toD("kafka:" + topicsProperties.bookEventsDlq() + "?brokers={{spring.kafka.bootstrap-servers}}&" + kafkaSecurity);

		// Consume book events once per Kafka key to avoid duplicate audit processing.
		from("kafka:" + topicsProperties.bookEvents() + "?brokers={{spring.kafka.bootstrap-servers}}&groupId=camel-book-events&" + kafkaSecurity)
				.routeId("book-events-audit-route")
				.idempotentConsumer(simple("${header[kafka.KEY]}"), MemoryIdempotentRepository.memoryIdempotentRepository(5000))
				.log("Camel consumed book event: ${body}")
				.to("direct:book-event-enrichment");

		// Add useful headers for downstream processing or logging.
		from("direct:book-event-enrichment")
				.routeId("book-events-enrichment-route")
				.setHeader("deepreader.eventType", simple("${body[eventType]}"))
				.log("Enriched event type=${header.deepreader.eventType} payload=${body}");
	}
}