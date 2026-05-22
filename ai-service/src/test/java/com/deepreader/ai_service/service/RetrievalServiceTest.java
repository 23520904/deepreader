package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.SearchResponse;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

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
}
