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
						null,
						"Object-oriented programming in Java uses classes and objects.",
						1f
				))
		);

		// The prompt must clearly tell the AI to hide source file names and page labels.
		assertTrue(prompt.contains("Do not include source file names, page labels"));

		// The prompt must restrict the AI to the numbered sources only.
		assertTrue(prompt.contains("ONLY the numbered sources provided below"));
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
				"Overloading là việc cùng một tên phương thức có thể có các cách triển khai khác nhau. Source 2",
				List.of(),
				18_000,
				1_800
		);

		// The repair prompt must flag non-English text as a reason for repair.
		assertTrue(prompt.contains("non-English text"));

		// The repair prompt must tell the AI to exclude source labels and page labels.
		assertTrue(prompt.contains("Do not include source labels, page labels, chunk IDs as text"));

		// The repair prompt must require valid JSON output.
		assertTrue(prompt.contains("valid JSON"));
	}
}