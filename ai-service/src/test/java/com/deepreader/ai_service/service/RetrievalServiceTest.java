package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import com.deepreader.ai_service.config.GeminiProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RetrievalServiceTest {

	@Test
	void broadDocumentQuestionsUseRepresentativeSections() {
		IndexedDocument document = new IndexedDocument(
				"user-1",
				"doc-1",
				"B4. Chapter 3-1 - OOP Java Programming.pdf",
				null,
				List.of(
						new DocumentSection("page-1", "Page 1", 1, "", "Object-oriented programming in Java uses classes and objects."),
						new DocumentSection("page-2", "Page 2", 2, "", "This page only explains the keyword this."),
						new DocumentSection("page-3", "Page 3", 3, "", "Classes define fields and methods."),
						new DocumentSection("page-4", "Page 4", 4, "", "Constructors initialize objects when they are created."),
						new DocumentSection("page-5", "Page 5", 5, "", "Encapsulation hides state behind methods.")
				)
		);

		RetrievalService retrievalService = new RetrievalService(
				new FakeDocumentIndexStoreService(document),
				null,
				WebClient.builder(),
				"http://localhost"
		);

		SearchResponse response = retrievalService
				.search("user-1", "doc-1", "what is this document about?", 4, "groq")
				.block();

		assertEquals(5, response.matches().size());
		assertTrue(response.matches().stream().anyMatch(match -> match.content().contains("Object-oriented programming")));
		assertTrue(response.matches().stream().anyMatch(match -> match.content().contains("Constructors")));
	}

	@Test
	void lexicalQuestionsIgnoreGenericWords() {
		IndexedDocument document = new IndexedDocument(
				"user-1",
				"doc-1",
				"oop.pdf",
				null,
				List.of(
						new DocumentSection("page-1", "Page 1", 1, "", "The document has a table of contents."),
						new DocumentSection("page-2", "Page 2", 2, "", "A constructor initializes objects and has the same name as the class.")
				)
		);

		RetrievalService retrievalService = new RetrievalService(
				new FakeDocumentIndexStoreService(document),
				null,
				WebClient.builder(),
				"http://localhost"
		);

		SearchResponse response = retrievalService
				.search("user-1", "doc-1", "what is constructor", 4, "groq")
				.block();

		assertEquals(1, response.matches().size());
		assertTrue(response.matches().getFirst().content().contains("constructor initializes"));
	}

	@Test
	void lexicalChatOverviewQuestionsUseCurrentDocumentRepresentativeSections() {
		IndexedDocument document = new IndexedDocument(
				"user-1",
				"doc-1",
				"java-oop.pdf",
				null,
				List.of(
						new DocumentSection("page-1", "Page 1", 1, "", "Java OOP introduces classes and objects."),
						new DocumentSection("page-2", "Page 2", 2, "", "Encapsulation keeps state private behind methods."),
						new DocumentSection("page-3", "Page 3", 3, "", "Inheritance lets classes reuse behavior."),
						new DocumentSection("page-4", "Page 4", 4, "", "Polymorphism lets objects respond differently to the same method.")
				)
		);

		RetrievalService retrievalService = new RetrievalService(
				new FakeDocumentIndexStoreService(document),
				new FailingEmbeddingService(),
				WebClient.builder(),
				"http://localhost"
		);

		SearchResponse response = retrievalService
				.searchLexical("user-1", "doc-1", "what can i learn from this document", 4)
				.block();

		assertEquals(4, response.matches().size());
		assertTrue(response.matches().stream().allMatch(match -> "doc-1".equals(match.documentId())));
		assertTrue(response.matches().stream().anyMatch(match -> match.content().contains("Java OOP")));
	}

	@Test
	void vectorSearchFiltersMatchesToRequestedDocument() {
		IndexedDocument requestedDocument = new IndexedDocument(
				"user-1",
				"doc-1",
				"oop.pdf",
				null,
				List.of(new DocumentSection("page-1", "Page 1", 1, "", "Lexical fallback content."))
		);

		WebClient.Builder haystackBuilder = WebClient.builder().exchangeFunction(request -> Mono.just(
				ClientResponse.create(HttpStatus.OK)
						.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
						.body("""
								{"matches":[
								  {"document_id":"doc-2","chunk_id":"other","file_name":"other.pdf","section_id":"p1","title":"Other","chunk_index":1,"content":"Wrong user document","score":0.99},
								  {"document_id":"doc-1","chunk_id":"right","file_name":"oop.pdf","section_id":"p2","title":"OOP","chunk_index":2,"content":"Vector result for the requested document","score":0.88}
								]}
								""")
						.build()
		));

		RetrievalService retrievalService = new RetrievalService(
				new FakeDocumentIndexStoreService(requestedDocument),
				new FakeEmbeddingService(),
				haystackBuilder,
				"http://haystack"
		);

		SearchResponse response = retrievalService
				.search("user-1", "doc-1", "constructor", 5, null)
				.block();

		assertEquals("gemini", response.provider());
		assertEquals(1, response.matches().size());
		assertEquals("doc-1", response.matches().getFirst().documentId());
		assertEquals("Vector result for the requested document", response.matches().getFirst().content());
	}

	private static class FakeDocumentIndexStoreService extends DocumentIndexStoreService {
		private final IndexedDocument document;

		FakeDocumentIndexStoreService(IndexedDocument document) {
			super(null);
			this.document = document;
		}

		@Override
		public List<IndexedDocument> findAll(String userId) {
			return List.of(document);
		}

		@Override
		public Optional<IndexedDocument> findById(String userId, String documentId) {
			return Optional.of(document);
		}

		@Override
		public IndexedDocument requireById(String userId, String documentId) {
			return document;
		}
	}

	private static class FakeEmbeddingService extends EmbeddingService {
		FakeEmbeddingService() {
			super(WebClient.builder(), new GeminiProperties());
		}

		@Override
		public List<Float> embed(String provider, String text) {
			return List.of(0.1f, 0.2f, 0.3f);
		}
	}

	private static class FailingEmbeddingService extends EmbeddingService {
		FailingEmbeddingService() {
			super(WebClient.builder(), new GeminiProperties());
		}

		@Override
		public List<Float> embed(String provider, String text) {
			throw new AssertionError("Chat lexical retrieval should not call embeddings");
		}
	}
}
