package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PromptBuilderService {

	public String buildAnswerPrompt(String query, List<RetrievedChunk> chunks) {
		StringBuilder context = new StringBuilder();
		for (int i = 0; i < chunks.size(); i++) {
			RetrievedChunk chunk = chunks.get(i);
			context.append("[Source ").append(i + 1).append("]\n")
					.append("File: ").append(nullSafe(chunk.fileName())).append("\n")
					.append("Section Id: ").append(nullSafe(chunk.sectionId())).append("\n")
					.append("Title: ").append(nullSafe(chunk.title())).append("\n")
					.append("Chunk Index: ").append(chunk.chunkIndex()).append("\n")
					.append("Content: ").append(nullSafe(chunk.content())).append("\n\n");
		}

		return "You are a document question-answering assistant. "
				+ "Answer using only the provided sources. "
				+ "If the answer cannot be found in the sources, say that clearly. "
				+ "Keep the answer concise and factual.\n\n"
				+ "Question:\n" + query + "\n\n"
				+ "Sources:\n" + context;
	}

	private String nullSafe(String value) {
		return value == null ? "" : value;
	}

	public String buildSummaryPrompt(String fileName, String content) {
		return "You are helping summarize a book for a reading application. Write a structured, reader-friendly summary with key ideas and important takeaways.\n\n"
				+ "Document: " + nullSafe(fileName) + "\n\n"
				+ content;
	}

	public String buildFlashcardPrompt(String fileName, String content, int count) {
		return "Create " + count + " flashcards from the following book content. Return one flashcard per line using the exact format 'Q: ... | A: ...'.\n\n"
				+ "Document: " + nullSafe(fileName) + "\n\n"
				+ content;
	}
}