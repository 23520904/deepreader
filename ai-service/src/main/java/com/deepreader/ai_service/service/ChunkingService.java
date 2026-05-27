package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.DocumentSection;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ChunkingService {

	private static final int DEFAULT_CHUNK_SIZE = 1000;
	private static final int DEFAULT_OVERLAP = 150;

	public List<DocumentChunk> chunkDocument(String documentId, String fileName, List<DocumentSection> sections) {
		List<DocumentChunk> chunks = new ArrayList<>();
		int index = 0;

		for (DocumentSection section : sections) {
			String normalized = normalize(section.content());
			if (normalized.isBlank()) {
				continue;
			}
			int start = 0;
			while (start < normalized.length()) {
				int end = Math.min(start + DEFAULT_CHUNK_SIZE, normalized.length());
				String chunk = normalized.substring(start, end).trim();
				if (!chunk.isEmpty()) {
					chunks.add(new DocumentChunk(
						UUID.randomUUID().toString(),
						documentId,
						fileName,
						section.sectionId(),
						section.title(),
						index++,
						chunk
					));
				}
				if (end >= normalized.length()) {
					break;
				}
				start = Math.max(0, end - DEFAULT_OVERLAP);
			}
		}

		return chunks;
	}

	private String normalize(String text) {
		return text == null ? "" : text.replaceAll("\\s+", " ").trim();
	}
}