package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentChunk;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ChunkingService {

	private static final int DEFAULT_CHUNK_SIZE = 1000;
	private static final int DEFAULT_OVERLAP = 150;

	public List<DocumentChunk> chunkDocument(String documentId, String fileName, String text) {
		String normalized = normalize(text);
		if (normalized.isBlank()) {
			return List.of();
		}

		List<DocumentChunk> chunks = new ArrayList<>();
		int start = 0;
		int index = 0;

		while (start < normalized.length()) {
			int end = Math.min(start + DEFAULT_CHUNK_SIZE, normalized.length());
			String chunk = normalized.substring(start, end).trim();
			if (!chunk.isEmpty()) {
				chunks.add(new DocumentChunk(
					UUID.randomUUID().toString(),
					documentId,
					fileName,
					index++,
					chunk
				));
			}

			if (end >= normalized.length()) {
				break;
			}
			start = Math.max(0, end - DEFAULT_OVERLAP);
		}

		return chunks;
	}

	private String normalize(String text) {
		return text == null ? "" : text.replaceAll("\\s+", " ").trim();
	}
}