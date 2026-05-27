package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PromptBuilderServiceTest {

	private final PromptBuilderService promptBuilderService = new PromptBuilderService();

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

		assertTrue(prompt.contains("Do not include source labels, page labels"));
		assertTrue(prompt.contains("synthesize the overall topic"));
	}

	@Test
	void answerRepairPromptRequiresEnglishAndRemovesSources() {
		String prompt = promptBuilderService.buildAnswerRepairPrompt(
				"what is overloading",
				"Overloading là việc cùng một tên phương thức có thể có các cách triển khai khác nhau. Source 2"
		);

		assertTrue(prompt.contains("fully in English"));
		assertTrue(prompt.contains("Remove every mention of sources"));
		assertTrue(prompt.contains("Do not add new facts"));
	}
}
