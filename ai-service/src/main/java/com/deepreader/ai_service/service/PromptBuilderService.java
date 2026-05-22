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
			String source = "[Document excerpt " + (i + 1) + "]\n"
					+ "File: " + nullSafe(chunk.fileName()) + "\n"
					+ "Location: " + displayLocation(chunk) + "\n"
					+ "Content: " + truncate(nullSafe(chunk.content()), maxChunkChars) + "\n\n";

			if (context.length() + source.length() > maxContextChars) {
				break;
			}

			context.append(source);
		}

		if (context.isEmpty() && !chunks.isEmpty()) {
			RetrievedChunk chunk = chunks.getFirst();
			context.append("[Document excerpt 1]\n")
					.append("File: ").append(nullSafe(chunk.fileName())).append("\n")
					.append("Location: ").append(displayLocation(chunk)).append("\n")
					.append("Content: ").append(truncate(nullSafe(chunk.content()), Math.max(500, maxContextChars / 2))).append("\n\n");
		}

		return "You are a document question-answering assistant for the document the user is currently reading. "
				+ "The sources below are the only allowed facts. "
				+ "Do not use prior knowledge, conversation memory, or content from any other document. "
				+ "If the answer cannot be found in these sources, say that clearly without guessing. "
				+ "For broad questions such as what the document is about, key points, overview, or summary, synthesize the overall topic across all provided sources and the file name; do not focus on a single matching word or one isolated page. "
				+ "For concept questions, answer the exact concept the user asked about and ignore unrelated source snippets. "
				+ "For example requests, give only examples that are explicitly present in the sources. "
				+ "Write the final answer in English only. Every sentence must be English. Translate source ideas into natural English when the source is Vietnamese. "
				+ "Do not include source labels, page labels, chunk IDs, citations, or text like \"Page 1\", \"Source 2\", or \"the provided sources\" in the final answer. "
				+ "Keep the answer concise, factual, and useful for studying.\n\n"
				+ "Question:\n" + query + "\n\n"
				+ "Sources:\n" + context;
	}

	public String buildAnswerRepairPrompt(String query, String previousAnswer) {
		return "Rewrite the assistant answer below for the user. "
				+ "Return only the cleaned answer, with no preface and no commentary. "
				+ "The answer must be fully in English only. If any word, phrase, or sentence is Vietnamese or another language, translate it into natural English. "
				+ "Remove every mention of sources, pages, chunks, citations, excerpts, or phrases such as \"based on the provided sources\". "
				+ "Do not add new facts. Preserve the meaning of the answer and keep it concise.\n\n"
				+ "Question:\n" + nullSafe(query) + "\n\n"
				+ "Answer to clean:\n" + nullSafe(previousAnswer);
	}

	private String nullSafe(String value) {
		return value == null ? "" : value;
	}

	private String displayLocation(RetrievedChunk chunk) {
		String title = nullSafe(chunk.title()).trim();

		if (!title.matches("(?i)^page\\s+\\d+$") && !title.matches("(?i)^slide\\s+\\d+$") && !title.isBlank()) {
			return title;
		}

		return "Document excerpt";
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
		return "You are an expert study-card generator for a learning application. "
			+ "Create exactly " + count + " high-quality flashcards from the document content below. "
			+ "The flashcards must help students review the most important concepts, definitions, syntax rules, processes, comparisons, examples, and common mistakes. "
			+ "Use only facts that appear in the document. Do not invent information. "
			+ "Write ALL questions and ALL answers in English only. "
			+ "If the source content is Vietnamese or another language, translate the meaning into natural English. "
			+ "Do not copy Vietnamese text into the answer. "
			+ "Each question must be specific, standalone, and name the exact concept being tested. "
			+ "Avoid vague questions such as: \"What is this?\", \"What is one important point?\", \"What does the slide say?\", or \"What is cha / class / class?\". "
			+ "Each answer must be clear, useful, and 1 to 3 sentences long. "
			+ "Prefer cards like: \"What is a conditional statement in Java?\", \"How does switch-case work in Java?\", \"What is the purpose of Scanner?\". "
			+ "Do not create page-based, slide-based, section-based, or file-name-based cards. "
			+ "Return only valid JSON with this exact shape and no Markdown, no code block, no commentary, and no extra keys: "
			+ "{\"flashcards\":[{\"question\":\"...\",\"answer\":\"...\"}]}.\n\n"
			+ "Document: " + nullSafe(fileName) + "\n\n"
			+ content;
	}

	public String buildFlashcardRepairPrompt(String fileName, String content, String previousResponse, int count) {
		return "The previous flashcard generation result was invalid, incomplete, vague, or not fully in English. "
			+ "Regenerate the flashcards from scratch. "
			+ "Create exactly " + count + " high-quality study flashcards from the document content below. "
			+ "Use only facts from the document. "
			+ "Write ALL questions and ALL answers in English only. "
			+ "If the source is Vietnamese, translate the ideas into natural English. "
			+ "Do not include Vietnamese text in the final JSON. "
			+ "Each question must be specific and name the concept directly. "
			+ "Each answer must be concise, correct, and useful for studying. "
			+ "Reject vague cards, broken keyword cards, duplicated cards, and cards about pages/slides/sections. "
			+ "Return only valid JSON with this exact shape: "
			+ "{\"flashcards\":[{\"question\":\"...\",\"answer\":\"...\"}]}.\n\n"
			+ "Document: " + nullSafe(fileName) + "\n\n"
			+ "Document content:\n" + content + "\n\n"
			+ "Previous bad response:\n" + nullSafe(previousResponse);
	}
	
	public String truncate(String value, int maxChars) {
		if (value == null || maxChars <= 0 || value.length() <= maxChars) {
			return nullSafe(value);
		}

		return value.substring(0, maxChars).trim()
				+ "\n\n[Content truncated to fit the AI provider request limit.]";
	}
}
