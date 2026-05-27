package com.deepreader.business_service;

import com.deepreader.business_service.config.KafkaTopicsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(KafkaTopicsProperties.class)
public class BusinessServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(BusinessServiceApplication.class, args);
	}

}
