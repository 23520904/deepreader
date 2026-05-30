package com.deepreader.ai_service.startup;

import com.deepreader.ai_service.service.QdrantVectorStoreService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Checks the Qdrant connection when the application starts.
 *
 * <p>This verifier only runs when deepreader.qdrant.startup-verify is true.
 */
@Component
@ConditionalOnProperty(prefix = "deepreader.qdrant", name = "startup-verify", havingValue = "true")
public class QdrantConnectionVerifier implements CommandLineRunner {

	private final QdrantVectorStoreService qdrantVectorStoreService;

	public QdrantConnectionVerifier(QdrantVectorStoreService qdrantVectorStoreService) {
		this.qdrantVectorStoreService = qdrantVectorStoreService;
	}

	/**
	 * Logs Qdrant collections to confirm that the connection works.
	 */
	@Override
	public void run(String... args) {
		qdrantVectorStoreService.logCollections();
	}
}