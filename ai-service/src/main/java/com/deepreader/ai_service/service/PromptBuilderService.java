package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PromptBuilderService {

	private static final int DEFAULT_ANSWER_CONTEXT_CHARS = 18_000;
	private static final int DEFAULT_ANSWER_CHUNK_CHARS = 3_500;

	public String buildAnswerPrompt(String query, List<RetrievedChunk> chunks) {
		return buildAnswerPrompt(query, chunks, DEFAULT_ANSWER_CONTEXT_CHARS, DEFAULT_ANSWER_CHUNK_CHARS);
	}

	public String buildAnswerPrompt(String query, List<RetrievedChunk> chunks, int maxContextChars, int maxChunkChars) {
		StringBuilder context = new StringBuilder();
		for (int i = 0; i < chunks.size(); i++) {
			RetrievedChunk chunk = chunks.get(i);
			String source = "[Source " + (i + 1) + "]\n"
					+ "File: " + nullSafe(chunk.fileName()) + "\n"
					+ "Section Id: " + nullSafe(chunk.sectionId()) + "\n"
					+ "Title: " + nullSafe(chunk.title()) + "\n"
					+ "Chunk Index: " + chunk.chunkIndex() + "\n"
					+ "Content: " + truncate(nullSafe(chunk.content()), maxChunkChars) + "\n\n";

			if (context.length() + source.length() > maxContextChars) {
				break;
			}

			context.append(source);
		}

		if (context.isEmpty() && !chunks.isEmpty()) {
			RetrievedChunk chunk = chunks.getFirst();
			context.append("[Source 1]\n")
					.append("File: ").append(nullSafe(chunk.fileName())).append("\n")
					.append("Section Id: ").append(nullSafe(chunk.sectionId())).append("\n")
					.append("Title: ").append(nullSafe(chunk.title())).append("\n")
					.append("Chunk Index: ").append(chunk.chunkIndex()).append("\n")
					.append("Content: ").append(truncate(nullSafe(chunk.content()), Math.max(500, maxContextChars / 2))).append("\n\n");
		}

		return "You are a document question-answering assistant for the document the user is currently reading. "
				+ "The sources below are the only allowed facts. "
				+ "Do not use prior knowledge, conversation memory, or content from any other document. "
				+ "If the answer cannot be found in these sources, say that clearly. "
				+ "Keep the answer concise and factual.\n\n"
				+ "Question:\n" + query + "\n\n"
				+ "Sources:\n" + context;
	}

	private String nullSafe(String value) {
		return value == null ? "" : value;
	}

	public String buildSummaryPrompt(String fileName, String content) {
		return "You are helping summarize a book for a reading application. "
				+ "Write a vivid, structured Markdown summary that is easy to scan. "
				+ "Write the entire summary in English only. If the source content is Vietnamese or another language, translate the ideas into natural English. "
				+ "Use Markdown headings, short paragraphs, bullet lists, **bold** for core concepts, and *italic* for subtle notes. "
				+ "Include these sections when possible: # Overview, ## Key Ideas, ## Important Details, ## Takeaways, ## Suggested Review Questions. "
				+ "Do not wrap the answer in a code block.\n\n"
				+ "Document: " + nullSafe(fileName) + "\n\n"
				+ content;
	}

	public String buildFlashcardPrompt(String fileName, String content, int count) {
		return "Create exactly " + count + " high-quality study flashcards from the following document content. "
				+ "Choose the most important concepts, definitions, rules, processes, comparisons, and examples across the whole document. "
				+ "Use only facts from the document. Write every question and answer in English only. "
				+ "If the source content is Vietnamese or another language, translate the concepts into natural English. "
				+ "Each question must be standalone, specific, and useful for active recall by naming the concept directly. "
				+ "Each answer must be concise, correct, and 1 to 3 sentences. "
				+ "Do not make page-based or slide-based cards. Never ask vague questions like \"What is one important point from page 1?\", "
				+ "\"What is the key idea from slide 2?\", or questions about a page, slide, section, or part number. "
				+ "Return only valid JSON with this exact shape and no Markdown, code block, commentary, or extra keys: "
				+ "{\"flashcards\":[{\"question\":\"...\",\"answer\":\"...\"}]}.\n\n"
				+ "Document: " + nullSafe(fileName) + "\n\n"
				+ content;
	}

	public String truncate(String value, int maxChars) {
		if (value == null || maxChars <= 0 || value.length() <= maxChars) {
			return nullSafe(value);
		}

		return value.substring(0, maxChars).trim()
				+ "\n\n[Content truncated to fit the AI provider request limit.]";
	}
}
