package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.RetrievedChunk;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PromptBuilderService {

	// Default maximum number of characters allowed for the full context sent to the AI provider.
	private static final int DEFAULT_ANSWER_CONTEXT_CHARS = 18_000;

	// Default maximum number of characters allowed for each individual retrieved chunk.
	private static final int DEFAULT_ANSWER_CHUNK_CHARS = 3_500;

	/**
	 * Builds an answer prompt using the default context and chunk size limits.
	 */
	public String buildAnswerPrompt(String query, List<RetrievedChunk> chunks) {
		return buildAnswerPrompt(query, chunks, DEFAULT_ANSWER_CONTEXT_CHARS, DEFAULT_ANSWER_CHUNK_CHARS);
	}

	/**
	 * Builds a question-answering prompt from the user query and retrieved document chunks.
	 * The generated prompt strictly limits the AI model to the provided sources.
	 */
	public String buildAnswerPrompt(String query, List<RetrievedChunk> chunks, int maxContextChars, int maxChunkChars) {
		StringBuilder context = new StringBuilder();

		// Add retrieved chunks one by one until the total context size reaches the configured limit.
		for (int i = 0; i < chunks.size(); i++) {
			RetrievedChunk chunk = chunks.get(i);
			String source = "[chunkId: " + nullSafe(chunk.chunkId()) + "]\n"
				+ "File: " + nullSafe(chunk.fileName()) + "\n"
				+ "Location: " + displayLocation(chunk) + "\n"
				+ "Content: " + truncate(nullSafe(chunk.content()), maxChunkChars) + "\n\n";

			// Stop adding chunks before exceeding the maximum context size allowed for the prompt.
			if (context.length() + source.length() > maxContextChars) {
				break;
			}

			context.append(source);
		}

		// Ensure at least one chunk is included when available, even if the normal size check skipped all chunks.
		if (context.isEmpty() && !chunks.isEmpty()) {
			RetrievedChunk chunk = chunks.get(0);
			context.append("[chunkId: " + nullSafe(chunk.chunkId()) + "]\n")
					.append("File: ").append(nullSafe(chunk.fileName())).append("\n")
					.append("Location: ").append(displayLocation(chunk)).append("\n")
					.append("Content: ").append(truncate(nullSafe(chunk.content()), Math.max(500, maxContextChars / 2))).append("\n\n");
		}

		return "You are a document-grounded assistant for the document the user is currently reading. "
				+ "Answer the user's question using ONLY the provided document context. "
				+ "Do not use outside or general knowledge. "
				+ "If the answer is not clearly supported by the provided sources, say that the information was not found in the document. "
				+ "Return only valid JSON with this exact shape: {\"answer\": \"...\", \"grounded\": true|false, \"usedChunkIds\": [\"...\"]}. "
				+ "grounded must be true only when the answer is supported by the context. "
				+ "usedChunkIds must contain only chunk ids that directly support the answer. "
				+ "If the question is unrelated or unsupported, set grounded=false and usedChunkIds=[]. "
				+ "Do not include any text outside the JSON object. "
				+ "Do not include source labels, page labels, chunk IDs, citations, or phrases like \"based on the provided sources\" in the answer text. "
				+ "Keep the answer concise, factual, and useful for studying.\n\n"
				+ "Question:\n" + query + "\n\n"
				+ "Sources:\n" + context;
	}

	/**
	 * Builds a repair prompt used to clean a previous answer without introducing new facts.
	 */
	public String buildAnswerRepairPrompt(String query, String previousAnswer) {
		return "The previous assistant response did not follow the required JSON output format. "
				+ "Return only valid JSON with this exact shape: {\"answer\": \"...\", \"grounded\": true|false, \"usedChunkIds\": [\"...\"]}. "
				+ "Do not include any explanation, commentary, or text outside the JSON object. "
				+ "If the information is not supported by the provided sources, set grounded=false and usedChunkIds=[].\n\n"
				+ "Question:\n" + nullSafe(query) + "\n\n"
				+ "Previous response:\n" + nullSafe(previousAnswer);
	}

	/**
	 * Converts null strings to an empty string to prevent null values from appearing in prompts.
	 */
	private String nullSafe(String value) {
		return value == null ? "" : value;
	}

	/**
	 * Returns a readable location label for a retrieved chunk.
	 * Generic page or slide titles are replaced with a neutral document excerpt label.
	 */
	private String displayLocation(RetrievedChunk chunk) {
		String title = nullSafe(chunk.title()).trim();

		// Use meaningful titles when available, but avoid exposing generic page or slide labels.
		if (!title.matches("(?i)^page\\s+\\d+$") && !title.matches("(?i)^slide\\s+\\d+$") && !title.isBlank()) {
			return title;
		}

		return "Document excerpt";
	}

	/**
	 * Builds a structured Markdown summary prompt for a document.
	 */
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

	/**
	 * Builds a flashcard generation prompt with the default English-only behavior.
	 */
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

	/**
	 * Builds a repair prompt for regenerating flashcards when the previous response was invalid or low quality.
	 */
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

	/**
	 * Builds a flashcard generation prompt with configurable language and flashcard type.
	 */
	public String buildFlashcardPrompt(String fileName, String content, int count, String language, String type) {
		// Select the required response language, defaulting to English when the language is missing or unsupported.
		String langInstruction = switch (language != null ? language.toLowerCase().trim() : "en") {
			case "vi" -> "Respond entirely in Vietnamese. Every question and every answer must be written in standard Vietnamese only. Do not use English unless it is a necessary technical term.";
			case "ja" -> "Respond entirely in Japanese. Every question and every answer must be written in standard Japanese only.";
			default  -> "Respond entirely in English. Every question and every answer must be written in standard English only.";
		};

		// Select the flashcard generation style, defaulting to a mixed set of card types.
		String typeInstruction = switch (type != null ? type.toLowerCase().trim() : "mixed") {
			case "concept"   -> "Focus only on definitions and key concepts. Each card must test a definition, terminology, or a fundamental concept.";
			case "question"  -> "Generate question-answer pairs only. Each card should ask a direct question and provide a direct answer.";
			case "practical" -> "Focus on practical application, coding examples, and concrete syntax or logic scenarios.";
			default         -> "Mix definitions/concepts, question-answer pairs, and practical application examples.";
		};

		return "You are an expert study-card generator for a learning application. "
			+ "Create exactly " + count + " high-quality flashcards from the document content below. "
			+ "The flashcards must help students review the most important concepts, definitions, syntax rules, processes, comparisons, examples, and common mistakes. "
			+ "Use only facts that appear in the document. Do not invent information. "
			+ "Language rule: " + langInstruction + " "
			+ "Content category: " + typeInstruction + " "
			+ "Each question must be specific, standalone, and name the exact concept being tested. "
			+ "Avoid vague questions such as: \"What is this?\", \"What is one important point?\", \"What does the slide say?\". "
			+ "Each answer must be clear, useful, and 1 to 3 sentences long. "
			+ "Do not create page-based, slide-based, section-based, or file-name-based cards. "
			+ "Return only valid JSON with this exact shape and no Markdown, no code block, no commentary, and no extra keys: "
			+ "{\"flashcards\":[{\"question\":\"...\",\"answer\":\"...\"}]}.\n\n"
			+ "Document: " + nullSafe(fileName) + "\n\n"
			+ content;
	}

	/**
	 * Builds a repair prompt for configurable flashcard generation.
	 * The repair keeps the requested language and flashcard type constraints.
	 */
	public String buildFlashcardRepairPrompt(String fileName, String content, String previousResponse, int count, String language, String type) {
		// Select the required response language, defaulting to English when the language is missing or unsupported.
		String langInstruction = switch (language != null ? language.toLowerCase().trim() : "en") {
			case "vi" -> "Respond entirely in Vietnamese. Every question and every answer must be written in standard Vietnamese only. Do not use English unless it is a necessary technical term.";
			case "ja" -> "Respond entirely in Japanese. Every question and every answer must be written in standard Japanese only.";
			default  -> "Respond entirely in English. Every question and every answer must be written in standard English only.";
		};

		// Select the flashcard generation style, defaulting to a mixed set of card types.
		String typeInstruction = switch (type != null ? type.toLowerCase().trim() : "mixed") {
			case "concept"   -> "Focus only on definitions and key concepts. Each card must test a definition, terminology, or a fundamental concept.";
			case "question"  -> "Generate question-answer pairs only. Each card should ask a direct question and provide a direct answer.";
			case "practical" -> "Focus on practical application, coding examples, and concrete syntax or logic scenarios.";
			default         -> "Mix definitions/concepts, question-answer pairs, and practical application examples.";
		};

		return "The previous flashcard generation result was invalid, incomplete, vague, or in the wrong language. "
			+ "Regenerate the flashcards from scratch. "
			+ "Create exactly " + count + " high-quality study flashcards from the document content below. "
			+ "Use only facts from the document. "
			+ "Language rule: " + langInstruction + " "
			+ "Content category: " + typeInstruction + " "
			+ "Each question must be specific and name the concept directly. "
			+ "Each answer must be concise, correct, and useful for studying. "
			+ "Reject vague cards, broken keyword cards, duplicated cards, and cards about pages/slides/sections. "
			+ "Return only valid JSON with this exact shape: "
			+ "{\"flashcards\":[{\"question\":\"...\",\"answer\":\"...\"}]}.\n\n"
			+ "Document: " + nullSafe(fileName) + "\n\n"
			+ "Document content:\n" + content + "\n\n"
			+ "Previous bad response:\n" + nullSafe(previousResponse);
	}
	
	/**
	 * Truncates text to the requested character limit and appends a notice when truncation happens.
	 */
	public String truncate(String value, int maxChars) {
		if (value == null || maxChars <= 0 || value.length() <= maxChars) {
			return nullSafe(value);
		}

		return value.substring(0, maxChars).trim()
				+ "\n\n[Content truncated to fit the AI provider request limit.]";
	}
}