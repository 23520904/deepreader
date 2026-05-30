package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests the prompt rules created by PromptBuilderService.
 *
 * <p>These tests make sure the generated prompts guide the AI model to answer
 * in the expected format, avoid source/page labels, and clean repaired answers correctly.
 */
class PromptBuilderServiceTest {

	private final PromptBuilderService promptBuilderService = new PromptBuilderService();

	/**
	 * Checks that the answer prompt tells the AI not to show page or source labels.
	 *
	 * <p>This is important because the final user answer should be clean and natural.
	 * The user should not see internal labels such as "Page 1", "Source 2",
	 * or other document retrieval details.
	 */
	@Test
	void answerPromptForbidsPageAndSourceLabels() {
		String prompt = promptBuilderService.buildAnswerPrompt(
				"what is this document about?",
				List.of(new RetrievedChunk(
						"doc-1",
						"page-1",
						"oop.pdf",
						"page-1",
						"Page 1",
						1,
						"Object-oriented programming in Java uses classes and objects.",
						1f
				))
		);

		// The prompt must clearly tell the AI to hide source and page labels.
		assertTrue(prompt.contains("Do not include source labels, page labels"));

		// The prompt must also tell the AI to summarize the whole topic for broad questions.
		assertTrue(prompt.contains("synthesize the overall topic"));
	}

	/**
	 * Checks that the repair prompt forces the answer to be cleaned correctly.
	 *
	 * <p>The repaired answer must be fully in English, must remove source mentions,
	 * and must not add new information that was not already in the previous answer.
	 */
	@Test
	void answerRepairPromptRequiresEnglishAndRemovesSources() {
		String prompt = promptBuilderService.buildAnswerRepairPrompt(
				"what is overloading",
				"Overloading là việc cùng một tên phương thức có thể có các cách triển khai khác nhau. Source 2"
		);

		// The repair prompt must require English-only output.
		assertTrue(prompt.contains("fully in English"));

		// The repair prompt must remove source, page, chunk, or citation references.
		assertTrue(prompt.contains("Remove every mention of sources"));

		// The repair step should clean the wording only, not invent extra facts.
		assertTrue(prompt.contains("Do not add new facts"));
	}
}