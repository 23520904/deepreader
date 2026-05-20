package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.Flashcard;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GenerationServiceTest {

	private final GenerationService generationService = new GenerationService(
			null,
			null,
			null,
			new ObjectMapper()
	);

	@Test
	void parsesJsonFlashcards() {
		List<Flashcard> flashcards = generationService.parseFlashcards("""
				{"flashcards":[
				  {"question":"What is encapsulation?","answer":"Bundling data with methods that operate on it."},
				  {"question":"What does inheritance support?","answer":"Reusing and extending behavior from another class."}
				]}
				""", 8);

		assertEquals(2, flashcards.size());
		assertEquals("What is encapsulation?", flashcards.getFirst().question());
		assertEquals("Bundling data with methods that operate on it.", flashcards.getFirst().answer());
	}

	@Test
	void parsesMarkdownTableFlashcards() {
		List<Flashcard> flashcards = generationService.parseFlashcards("""
				| Question | Answer |
				| --- | --- |
				| What is polymorphism? | The ability for different objects to respond to the same message differently. |
				""", 8);

		assertEquals(1, flashcards.size());
		assertEquals("What is polymorphism?", flashcards.getFirst().question());
	}

	@Test
	void parsesLabelledFlashcards() {
		List<Flashcard> flashcards = generationService.parseFlashcards("""
				1. **Q:** What is a class? | **A:** A blueprint for creating objects.
				2. Question: What is an object?
				   Answer: A runtime instance with state and behavior.
				""", 8);

		assertEquals(2, flashcards.size());
		assertEquals("A runtime instance with state and behavior.", flashcards.get(1).answer());
	}

	@Test
	void createsFallbackFlashcardsFromImportantDocumentConcepts() {
		IndexedDocument document = new IndexedDocument(
				"user-1",
				"doc-1",
				"oop.pdf",
				null,
				List.of(
						new DocumentSection(
								"section-1",
								"Page 1",
								1,
								null,
								"Object-oriented programming is a programming paradigm based on objects and classes. It helps organize software around data and behavior."
						),
						new DocumentSection(
								"section-2",
								"Page 2",
								2,
								null,
								"Encapsulation keeps data and behavior together inside a class. It helps protect object state and exposes controlled operations through methods."
						)
				)
		);

		List<Flashcard> flashcards = generationService.createFallbackFlashcards(document, 8);

		assertEquals(2, flashcards.size());
		assertEquals("What is Object-oriented programming?", flashcards.getFirst().question());
		org.junit.jupiter.api.Assertions.assertFalse(
				flashcards.stream().anyMatch(card -> card.question().toLowerCase().contains("page"))
		);
	}

	@Test
	void filtersPageBasedGeneratedFlashcards() {
		List<Flashcard> flashcards = generationService.filterStudyFlashcards(List.of(
				new Flashcard("What is one important point from page 1?", "The page introduces classes."),
				new Flashcard("What is a class?", "A class is a blueprint for creating objects.")
		), 8);

		assertEquals(1, flashcards.size());
		assertEquals("What is a class?", flashcards.getFirst().question());
	}

	@Test
	void filtersVietnameseAnswers() {
		List<Flashcard> flashcards = generationService.filterStudyFlashcards(List.of(
				new Flashcard("What is a conditional loop?", "Là một cấu trúc điều khiển dùng để lặp lại một hành động một số lần."),
				new Flashcard("What is a conditional loop?", "A conditional loop repeats an action while a condition remains true.")
		), 8);

		assertEquals(1, flashcards.size());
		assertEquals("A conditional loop repeats an action while a condition remains true.", flashcards.getFirst().answer());
	}
}
