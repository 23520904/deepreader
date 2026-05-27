package com.deepreader.business_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "deepreader.kafka.topics")
public record KafkaTopicsProperties(String bookEvents, String bookEventsDlq) {
}
