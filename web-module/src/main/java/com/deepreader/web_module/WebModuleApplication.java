package com.deepreader.web_module;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WebModuleApplication {

	public static void main(String[] args) {
		SpringApplication.run(WebModuleApplication.class, args);
	}

}
