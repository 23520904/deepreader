package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.IndexedDocument;
import com.deepreader.ai_service.model.api.internal.Flashcard;
import com.deepreader.ai_service.model.api.internal.FlashcardResponse;
import com.deepreader.ai_service.model.api.internal.SummaryResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GenerationService {

	private static final String STUDY_PROVIDER = "groq";
	private static final int GROQ_MAX_GENERATION_CONTENT_CHARS = 14_000;
	private static final int DEFAULT_MAX_GENERATION_CONTENT_CHARS = 28_000;
	private static final Pattern DEFINITION_PATTERN = Pattern.compile("(?i)^(?:a|an|the)?\\s*([A-Za-z][A-Za-z0-9 _/()#.+-]{2,80}?)\\s+(?:is|are|means|refers to|represents|defines|describes|contains|consists of|allows|helps|keeps|organizes|uses|supports|enables|provides|hides|groups|combines|stores|creates|implements|extends)\\b");
	private static final Pattern HEADING_PATTERN = Pattern.compile("^([A-Z][A-Za-z0-9 _/()#.+-]{2,80}):\\s+.+$");
	private static final Set<String> STOP_WORDS = Set.of(
			"about", "after", "also", "another", "because", "before", "between", "chapter", "could",
			"document", "during", "example", "first", "from", "have", "into", "more", "most",
			"only", "other", "page", "pages", "part", "section", "should", "slide", "slides",
			"such", "than", "that", "their", "there", "these", "thing", "this", "through",
			"when", "where", "which", "while", "with", "would"
	);

	private final DocumentIndexStoreService documentIndexStoreService;
	private final PromptBuilderService promptBuilderService;
	private final LlmClientService llmClientService;
	private final ObjectMapper objectMapper;

	public GenerationService(DocumentIndexStoreService documentIndexStoreService, PromptBuilderService promptBuilderService, LlmClientService llmClientService, ObjectMapper objectMapper) {
		this.documentIndexStoreService = documentIndexStoreService;
		this.promptBuilderService = promptBuilderService;
		this.llmClientService = llmClientService;
		this.objectMapper = objectMapper;
	}

	public Mono<SummaryResponse> summarize(String userId, String documentId, String provider) {
		return Mono.fromCallable(() -> {
			IndexedDocument document = documentIndexStoreService.requireById(userId, documentId);
			String prompt = promptBuilderService.buildSummaryPrompt(
					document.fileName(),
					combinedContent(document, contentBudget(STUDY_PROVIDER))
			);
			LlmClientService.GeneratedAnswer generated = llmClientService.generateAnswer(userId, prompt);
			return new SummaryResponse(documentId, generated.provider(), generated.answer());
		}).subscribeOn(Schedulers.boundedElastic());
	}

	public Mono<FlashcardResponse> createFlashcards(String userId, String documentId, String provider, Integer requestedCount) {
		return Mono.fromCallable(() -> {
			int count = requestedCount == null || requestedCount <= 0 ? 10 : Math.min(requestedCount, 25);
			IndexedDocument document = documentIndexStoreService.requireById(userId, documentId);
			String prompt = promptBuilderService.buildFlashcardPrompt(
					document.fileName(),
					combinedStudyContent(document, contentBudget(STUDY_PROVIDER)),
					count
			);
			LlmClientService.GeneratedAnswer generated = llmClientService.generateAnswer(userId, prompt);
			String response = generated.answer();
			String responseProvider = generated.provider();
			List<Flashcard> flashcards = filterStudyFlashcards(parseFlashcards(response, count), count);

			if (flashcards.size() < count) {
				String repairPrompt = promptBuilderService.buildFlashcardRepairPrompt(
					document.fileName(),
					combinedStudyContent(document, contentBudget(STUDY_PROVIDER)),
					response,
					count
				);

				LlmClientService.GeneratedAnswer repaired = llmClientService.generateAnswer(userId, repairPrompt);
				responseProvider = repaired.provider();
				flashcards = filterStudyFlashcards(parseFlashcards(repaired.answer(), count), count);
			}

			return new FlashcardResponse(documentId, responseProvider, flashcards);
		}).subscribeOn(Schedulers.boundedElastic());
	}

	private String combinedContent(IndexedDocument document, int maxChars) {
		StringBuilder content = new StringBuilder();
		for (var section : document.sections()) {
			String nextSection = section.title() + "\n" + section.content() + "\n\n";
			if (content.length() + nextSection.length() > maxChars) {
				int remaining = maxChars - content.length();
				if (remaining > 500) {
					content.append(promptBuilderService.truncate(nextSection, remaining));
				}
				break;
			}
			content.append(nextSection);
		}
		return content.toString().trim();
	}

	private String combinedStudyContent(IndexedDocument document, int maxChars) {
		if (document == null || document.sections() == null || document.sections().isEmpty()) {
			return "";
		}

		StringBuilder content = new StringBuilder();
		int sectionCount = Math.max(1, document.sections().size());
		int perSectionChars = Math.max(160, maxChars / sectionCount);

		for (var section : document.sections()) {
			String sectionContent = cleanFlashcardText(section.content());

			if (!StringUtils.hasText(sectionContent)) {
				continue;
			}

			String title = cleanTopic(section.title());
			String excerpt = truncatePlain(sectionContent, perSectionChars);
			String nextSection = (StringUtils.hasText(title) ? title + "\n" : "") + excerpt + "\n\n";

			if (content.length() + nextSection.length() > maxChars) {
				int remaining = maxChars - content.length();
				if (remaining > 160) {
					content.append(truncatePlain(nextSection, remaining));
				}
				break;
			}

			content.append(nextSection);
		}

		return content.toString().trim();
	}

	private int contentBudget(String provider) {
		if (provider != null && "groq".equalsIgnoreCase(provider.trim())) {
			return GROQ_MAX_GENERATION_CONTENT_CHARS;
		}

		return DEFAULT_MAX_GENERATION_CONTENT_CHARS;
	}

	List<Flashcard> createFallbackFlashcards(IndexedDocument document, int limit) {
		List<Flashcard> flashcards = new ArrayList<>();
		Set<String> seenQuestions = new LinkedHashSet<>();

		extractStudyCandidates(document).stream()
				.sorted(Comparator.<StudyCandidate>comparingInt(StudyCandidate::score).reversed()
						.thenComparingInt(StudyCandidate::order))
				.forEach(candidate -> addFlashcard(
						buildFallbackQuestion(candidate.topic(), candidate.answer()),
						candidate.answer(),
						flashcards,
						seenQuestions,
						limit
				));

		return flashcards;
	}

	List<Flashcard> filterStudyFlashcards(List<Flashcard> flashcards, int limit) {
		List<Flashcard> filtered = new ArrayList<>();
		Set<String> seenQuestions = new LinkedHashSet<>();

		for (Flashcard flashcard : flashcards == null ? List.<Flashcard>of() : flashcards) {
			if (isWeakFlashcardQuestion(flashcard.question())) {
				continue;
			}

			addFlashcard(flashcard.question(), flashcard.answer(), filtered, seenQuestions, limit);
		}

		return filtered;
	}

	private void appendFlashcards(List<Flashcard> target, List<Flashcard> source, int limit) {
		Set<String> seenQuestions = new LinkedHashSet<>();

		for (Flashcard flashcard : target) {
			seenQuestions.add(cleanFlashcardText(flashcard.question()).toLowerCase(Locale.ROOT));
		}

		for (Flashcard flashcard : source) {
			addFlashcard(flashcard.question(), flashcard.answer(), target, seenQuestions, limit);
		}
	}

	private boolean isWeakFlashcardQuestion(String question) {
		String cleanQuestion = cleanFlashcardText(question);

		if (!StringUtils.hasText(cleanQuestion)) {
			return true;
		}

		String normalized = cleanQuestion.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9 ]", " ")
				.replaceAll("\\s+", " ")
				.trim();

		return normalized.matches(".*\\b(page|slide)\\s*\\d+\\b.*")
				|| normalized.matches(".*\\b(important point|key point|main point|key idea)\\b.*\\b(page|slide|section|part)\\b.*")
				|| normalized.matches("^(what|which|name|list|summarize|describe)\\b.*\\b(page|slide|section)\\b.*")
				|| normalized.contains("what is one important point")
				|| normalized.contains("what important point")
				|| normalized.contains("what is the key idea in this part")
				|| normalized.equals("what is the document about")
				|| normalized.equals("what does the document discuss");
	}

	private List<StudyCandidate> extractStudyCandidates(IndexedDocument document) {
		if (document == null || document.sections() == null) {
			return List.of();
		}

		List<SectionSentences> sectionSentences = new ArrayList<>();
		List<String> allSentences = new ArrayList<>();

		for (var section : document.sections()) {
			List<String> sentences = splitStudySentences(section.content());

			if (sentences.isEmpty()) {
				continue;
			}

			sectionSentences.add(new SectionSentences(cleanTopic(section.title()), sentences));
			allSentences.addAll(sentences);
		}

		Map<String, Integer> wordFrequencies = wordFrequencies(allSentences);
		List<StudyCandidate> candidates = new ArrayList<>();
		int order = 0;

		for (SectionSentences group : sectionSentences) {
			for (int index = 0; index < group.sentences().size(); index += 1) {
				String sentence = group.sentences().get(index);

				if (!isStudySentence(sentence)) {
					continue;
				}

				String answer = extractStudyAnswer(group.sentences(), index);
				String topic = extractConceptTopic(sentence, group.topicHint());

				if (!StringUtils.hasText(topic)) {
					if (startsWithReferencePronoun(sentence)) {
						continue;
					}

					topic = extractKeywordTopic(sentence, wordFrequencies);
				}

				if (!StringUtils.hasText(topic) || !StringUtils.hasText(answer)) {
					continue;
				}

				candidates.add(new StudyCandidate(
						topic,
						answer,
						scoreStudySentence(sentence, topic, wordFrequencies),
						order++
				));
			}
		}

		return candidates;
	}

	private String cleanTopic(String title) {
		String topic = cleanFlashcardText(title)
				.replaceAll("(?i)^\\[?slide\\s*\\d+\\]?\\s*", "")
				.replaceAll("(?i)^page\\s*\\d+\\s*", "")
				.replaceAll("(?i)^chapter\\s*\\d+(?:[-.\\s]\\d+)?\\s*", "")
				.trim();

		if (!StringUtils.hasText(topic) || topic.matches("(?i)^page\\s+\\d+$")) {
			return "";
		}

		return isGenericTopic(topic) ? "" : truncatePlain(topic, 80);
	}

	private List<String> splitStudySentences(String content) {
		String normalized = content == null
				? ""
				: content.replace("\r\n", "\n")
						.replace('\r', '\n')
						.replaceAll("\\s+", " ")
						.trim();

		if (!StringUtils.hasText(normalized)) {
			return List.of();
		}

		String[] sentences = normalized.split("(?<=[.!?])\\s+");
		List<String> safeSentences = new ArrayList<>();

		for (String sentence : sentences) {
			String cleanSentence = cleanFlashcardText(sentence);

			if (!StringUtils.hasText(cleanSentence)) {
				continue;
			}

			if (cleanSentence.length() <= 420) {
				safeSentences.add(cleanSentence);
				continue;
			}

			for (String chunk : cleanSentence.split("(?<=;)\\s+")) {
				String cleanChunk = cleanFlashcardText(chunk);
				if (StringUtils.hasText(cleanChunk)) {
					safeSentences.add(truncatePlain(cleanChunk, 360));
				}
			}
		}

		return safeSentences;
	}

	private String extractStudyAnswer(List<String> sentences, int index) {
		StringBuilder answer = new StringBuilder(sentences.get(index));
		int nextIndex = index + 1;

		while (nextIndex < sentences.size() && answer.length() < 220) {
			String nextSentence = sentences.get(nextIndex);

			if (nextSentence.length() < 24 || answer.length() + nextSentence.length() > 390) {
				break;
			}

			answer.append(" ").append(nextSentence);
			nextIndex += 1;
		}

		return truncatePlain(answer.toString(), 390);
	}

	private String extractConceptTopic(String sentence, String topicHint) {
		String cleanSentence = cleanFlashcardText(sentence);
		Matcher definitionMatcher = DEFINITION_PATTERN.matcher(cleanSentence);

		if (definitionMatcher.find()) {
			String topic = normalizeTopic(definitionMatcher.group(1));

			if (StringUtils.hasText(topic)) {
				return topic;
			}
		}

		Matcher headingMatcher = HEADING_PATTERN.matcher(cleanSentence);

		if (headingMatcher.find()) {
			String topic = normalizeTopic(headingMatcher.group(1));

			if (StringUtils.hasText(topic)) {
				return topic;
			}
		}

		if (StringUtils.hasText(topicHint)) {
			return topicHint;
		}

		return "";
	}

	private String extractKeywordTopic(String sentence, Map<String, Integer> wordFrequencies) {
		List<String> words = words(sentence).stream()
				.filter(word -> !STOP_WORDS.contains(word))
				.sorted((left, right) -> Integer.compare(
						wordFrequencies.getOrDefault(right, 0),
						wordFrequencies.getOrDefault(left, 0)
				))
				.limit(3)
				.toList();

		if (words.isEmpty()) {
			return "";
		}

		return String.join(" / ", words);
	}

	private String normalizeTopic(String value) {
		String topic = cleanFlashcardText(value)
				.replaceAll("(?i)^(a|an|the|this|these|those|it|they)\\s+", "")
				.replaceAll("[.:;,-]+$", "")
				.trim();

		if (isGenericTopic(topic)) {
			return "";
		}

		return truncatePlain(topic, 80);
	}

	private boolean isGenericTopic(String topic) {
		String lower = topic == null ? "" : topic.toLowerCase(Locale.ROOT).trim();

		return !StringUtils.hasText(lower)
				|| lower.length() < 3
				|| lower.matches("^(page|slide|chapter|section)\\s*\\d*.*$")
				|| lower.matches("^(this|that|these|those|it|they|there|we|you|i)$")
				|| lower.contains("copyright");
	}

	private boolean isStudySentence(String sentence) {
		String cleanSentence = cleanFlashcardText(sentence);

		return cleanSentence.length() >= 36
				&& cleanSentence.matches(".*[A-Za-z].*")
				&& !cleanSentence.matches("(?i)^(page|slide)\\s+\\d+\\.?$")
				&& !cleanSentence.toLowerCase(Locale.ROOT).contains("all rights reserved");
	}

	private boolean startsWithReferencePronoun(String sentence) {
		return cleanFlashcardText(sentence).matches("(?i)^(it|this|these|those|they|there|such)\\b.*");
	}

	private int scoreStudySentence(String sentence, String topic, Map<String, Integer> wordFrequencies) {
		String lower = sentence.toLowerCase(Locale.ROOT);
		int score = 0;

		if (DEFINITION_PATTERN.matcher(sentence).find()) {
			score += 12;
		}

		if (StringUtils.hasText(topic)) {
			score += 5;
		}

		if (lower.matches(".*\\b(key|important|principle|concept|feature|benefit|purpose|because|therefore|allows|helps|used|consists|defined)\\b.*")) {
			score += 5;
		}

		int length = sentence.length();
		if (length >= 70 && length <= 260) {
			score += 4;
		}

		for (String word : words(sentence)) {
			if (!STOP_WORDS.contains(word)) {
				score += Math.min(3, wordFrequencies.getOrDefault(word, 0));
			}
		}

		return score;
	}

	private Map<String, Integer> wordFrequencies(List<String> sentences) {
		Map<String, Integer> frequencies = new HashMap<>();

		for (String sentence : sentences) {
			for (String word : words(sentence)) {
				if (!STOP_WORDS.contains(word)) {
					frequencies.merge(word, 1, Integer::sum);
				}
			}
		}

		return frequencies;
	}

	private List<String> words(String value) {
		Matcher matcher = Pattern.compile("[A-Za-z][A-Za-z0-9+#-]{2,}").matcher(value == null ? "" : value.toLowerCase(Locale.ROOT));
		List<String> words = new ArrayList<>();

		while (matcher.find()) {
			words.add(matcher.group());
		}

		return words;
	}

	private String buildFallbackQuestion(String topic, String answer) {
		String safeTopic = normalizeTopic(topic);

		if (StringUtils.hasText(safeTopic)) {
			return "What is " + safeTopic + "?";
		}

		String keywordTopic = extractKeywordTopic(answer, wordFrequencies(List.of(answer)));

		if (StringUtils.hasText(keywordTopic)) {
			return "What does the document explain about " + keywordTopic + "?";
		}

		return "What is the key idea in this part of the document?";
	}

	private String truncatePlain(String value, int maxLength) {
		if (value == null || value.length() <= maxLength) {
			return value == null ? "" : value.trim();
		}

		int boundary = value.lastIndexOf(' ', maxLength);

		if (boundary < 120) {
			boundary = maxLength;
		}

		return value.substring(0, boundary).trim() + "...";
	}

	private record SectionSentences(String topicHint, List<String> sentences) {
	}

	private record StudyCandidate(String topic, String answer, int score, int order) {
	}

	List<Flashcard> parseFlashcards(String response, int limit) {
		List<Flashcard> flashcards = new ArrayList<>();
		Set<String> seenQuestions = new LinkedHashSet<>();

		parseJsonFlashcards(response, flashcards, seenQuestions, limit);
		parseMarkdownTableFlashcards(response, flashcards, seenQuestions, limit);
		parseLabelledFlashcards(response, flashcards, seenQuestions, limit);

		return flashcards.size() > limit ? flashcards.subList(0, limit) : flashcards;
	}

	private void parseJsonFlashcards(String response, List<Flashcard> flashcards, Set<String> seenQuestions, int limit) {
		String candidate = extractJsonCandidate(response);

		if (!StringUtils.hasText(candidate)) {
			return;
		}

		try {
			JsonNode root = objectMapper.readTree(candidate);
			JsonNode cardsNode = root.isArray() ? root : root.path("flashcards");

			if (!cardsNode.isArray()) {
				return;
			}

			for (JsonNode cardNode : cardsNode) {
				addFlashcard(
						textValue(cardNode, "question", "front", "prompt", "term"),
						textValue(cardNode, "answer", "back", "definition", "explanation"),
						flashcards,
						seenQuestions,
						limit
				);
			}
		} catch (Exception ignored) {
			// Fall through to tolerant text parsers.
		}
	}

	private void parseMarkdownTableFlashcards(String response, List<Flashcard> flashcards, Set<String> seenQuestions, int limit) {
		for (String rawLine : normalizedResponse(response).split("\n")) {
			String line = rawLine.trim();

			if (!line.startsWith("|") || !line.endsWith("|")) {
				continue;
			}

			String normalizedLine = line.replaceAll("^\\|", "").replaceAll("\\|$", "");
			String[] cells = normalizedLine.split("\\|");

			if (cells.length < 2) {
				continue;
			}

			String firstCell = cells[0].trim();
			String secondCell = cells[1].trim();
			String lower = (firstCell + " " + secondCell).toLowerCase();

			if (lower.contains("question") && lower.contains("answer")) {
				continue;
			}

			if (firstCell.matches("^-{3,}:?$") || secondCell.matches("^-{3,}:?$")) {
				continue;
			}

			addFlashcard(firstCell, secondCell, flashcards, seenQuestions, limit);
		}
	}

	private void parseLabelledFlashcards(String response, List<Flashcard> flashcards, Set<String> seenQuestions, int limit) {
		String pendingQuestion = null;
		StringBuilder pendingAnswer = new StringBuilder();
		Pattern sameLinePattern = Pattern.compile("(?i)^(?:Q|Question|Front)\\s*[:\\-]\\s*(.+?)\\s*(?:\\||;)\\s*(?:A|Answer|Back)\\s*[:\\-]\\s*(.+)$");
		Pattern questionPattern = Pattern.compile("(?i)^(?:Q|Question|Front)\\s*[:\\-]\\s*(.+)$");
		Pattern answerPattern = Pattern.compile("(?i)^(?:A|Answer|Back)\\s*[:\\-]\\s*(.+)$");

		for (String rawLine : normalizedResponse(response).split("\n")) {
			String line = cleanGeneratedLine(rawLine);

			if (!StringUtils.hasText(line)) {
				continue;
			}

			Matcher sameLineMatcher = sameLinePattern.matcher(line);

			if (sameLineMatcher.matches()) {
				addFlashcard(sameLineMatcher.group(1), sameLineMatcher.group(2), flashcards, seenQuestions, limit);
				pendingQuestion = null;
				pendingAnswer = new StringBuilder();
				continue;
			}

			Matcher questionMatcher = questionPattern.matcher(line);

			if (questionMatcher.matches()) {
				if (StringUtils.hasText(pendingQuestion) && StringUtils.hasText(pendingAnswer)) {
					addFlashcard(pendingQuestion, pendingAnswer.toString(), flashcards, seenQuestions, limit);
				}

				pendingQuestion = questionMatcher.group(1);
				pendingAnswer = new StringBuilder();
				continue;
			}

			Matcher answerMatcher = answerPattern.matcher(line);

			if (answerMatcher.matches() && StringUtils.hasText(pendingQuestion)) {
				pendingAnswer = new StringBuilder(answerMatcher.group(1));
				addFlashcard(pendingQuestion, pendingAnswer.toString(), flashcards, seenQuestions, limit);
				pendingQuestion = null;
				pendingAnswer = new StringBuilder();
			}
		}

		if (StringUtils.hasText(pendingQuestion) && StringUtils.hasText(pendingAnswer)) {
			addFlashcard(pendingQuestion, pendingAnswer.toString(), flashcards, seenQuestions, limit);
		}
	}

	private void addFlashcard(String question, String answer, List<Flashcard> flashcards, Set<String> seenQuestions, int limit) {
		if (flashcards.size() >= limit) {
			return;
		}

		String safeQuestion = cleanFlashcardText(question);
		String safeAnswer = cleanFlashcardText(answer);

		if (!StringUtils.hasText(safeQuestion) || !StringUtils.hasText(safeAnswer)) {
			return;
		}

		if (isWeakFlashcardQuestion(safeQuestion) || isWeakFlashcardAnswer(safeAnswer)) {
			return;
		}

		String dedupeKey = safeQuestion.toLowerCase(Locale.ROOT);

		if (!seenQuestions.add(dedupeKey)) {
			return;
		}

		flashcards.add(new Flashcard(safeQuestion, safeAnswer));
	}

	private boolean isWeakFlashcardAnswer(String answer) {
		String cleanAnswer = cleanFlashcardText(answer);
		String normalized = cleanAnswer.toLowerCase(Locale.ROOT);

		return cleanAnswer.length() < 20
				|| normalized.contains("slide ")
				|| normalized.contains("page ")
				|| normalized.contains("the document says")
				|| normalized.contains("this section")
				|| normalized.contains("this slide")
				|| containsVietnameseCharacters(cleanAnswer);
	}

	private boolean containsVietnameseCharacters(String value) {
		return value != null && value.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ].*");
	}

	private String extractJsonCandidate(String response) {
		String normalized = normalizedResponse(response)
				.replace("```json", "")
				.replace("```JSON", "")
				.replace("```", "")
				.trim();
		int objectStart = normalized.indexOf('{');
		int objectEnd = normalized.lastIndexOf('}');
		int arrayStart = normalized.indexOf('[');
		int arrayEnd = normalized.lastIndexOf(']');

		if (objectStart >= 0 && objectEnd > objectStart && (arrayStart < 0 || objectStart < arrayStart)) {
			return normalized.substring(objectStart, objectEnd + 1);
		}

		if (arrayStart >= 0 && arrayEnd > arrayStart) {
			return normalized.substring(arrayStart, arrayEnd + 1);
		}

		return "";
	}

	private String textValue(JsonNode node, String... fields) {
		for (String field : fields) {
			JsonNode value = node.path(field);

			if (value.isTextual() && StringUtils.hasText(value.asText())) {
				return value.asText();
			}
		}

		return "";
	}

	private String normalizedResponse(String response) {
		return response == null ? "" : response.replace("\r\n", "\n").replace('\r', '\n');
	}

	private String cleanGeneratedLine(String line) {
		return line
				.trim()
				.replace("**", "")
				.replace("__", "")
				.replaceAll("^[-*\\u2022]\\s*", "")
				.replaceAll("^\\d+[.)]\\s*", "")
				.trim();
	}

	private String cleanFlashcardText(String value) {
		if (value == null) {
			return "";
		}

		return value
				.replace("\\n", " ")
				.replaceAll("\\s+", " ")
				.replaceAll("^\"|\"$", "")
				.replaceAll("^`|`$", "")
				.trim();
	}
}
