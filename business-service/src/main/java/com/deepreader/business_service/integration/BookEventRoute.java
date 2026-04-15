package com.deepreader.business_service.integration;

import com.deepreader.business_service.config.KafkaTopicsProperties;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.support.processor.idempotent.MemoryIdempotentRepository;
import org.springframework.stereotype.Component;

@Component
public class BookEventRoute extends RouteBuilder {

	private final KafkaTopicsProperties topicsProperties;

	public BookEventRoute(KafkaTopicsProperties topicsProperties) {
		this.topicsProperties = topicsProperties;
	}

	@Override
	public void configure() {
		onException(Exception.class)
				.maximumRedeliveries(3)
				.redeliveryDelay(1000)
				.useExponentialBackOff()
				.backOffMultiplier(2)
				.handled(true)
				.toD("kafka:" + topicsProperties.bookEventsDlq() + "?brokers={{spring.kafka.bootstrap-servers}}");

		fromF("kafka:%s?brokers=%s&groupId=%s", topicsProperties.bookEvents(),
				"{{spring.kafka.bootstrap-servers}}",
				"camel-book-events")
				.routeId("book-events-audit-route")
				.idempotentConsumer(simple("${header[kafka.KEY]}"), MemoryIdempotentRepository.memoryIdempotentRepository(5000))
				.log("Camel consumed book event: ${body}")
				.to("direct:book-event-enrichment");

		from("direct:book-event-enrichment")
				.routeId("book-events-enrichment-route")
				.setHeader("deepreader.eventType", simple("${body[eventType]}"))
				.log("Enriched event type=${header.deepreader.eventType} payload=${body}");
	}
}
