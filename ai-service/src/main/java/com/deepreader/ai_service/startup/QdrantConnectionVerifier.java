package com.deepreader.ai_service.startup;

import com.deepreader.ai_service.service.QdrantVectorStoreService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "deepreader.qdrant", name = "startup-verify", havingValue = "true")
public class QdrantConnectionVerifier implements CommandLineRunner {

	private final QdrantVectorStoreService qdrantVectorStoreService;

	public QdrantConnectionVerifier(QdrantVectorStoreService qdrantVectorStoreService) {
		this.qdrantVectorStoreService = qdrantVectorStoreService;
	}

	@Override
	public void run(String... args) {
		qdrantVectorStoreService.logCollections();
	}
}