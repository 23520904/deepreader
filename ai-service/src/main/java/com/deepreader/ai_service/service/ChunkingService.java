package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.IngestionProperties;
import com.deepreader.ai_service.model.DocumentChunk;
import com.deepreader.ai_service.model.DocumentSection;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service responsible for splitting document sections into smaller text chunks.
 *
 * The generated chunks are used for embedding, indexing, and retrieval.
 * Each chunk keeps a small overlap with the previous one so important context
 * is not lost between chunk boundaries.
 */
@Service
public class ChunkingService {

	private final int chunkSize;
	private final int chunkOverlap;

	public ChunkingService(IngestionProperties ingestionProperties) {
		this.chunkSize = ingestionProperties.getChunkSize();
		this.chunkOverlap = ingestionProperties.getChunkOverlap();
	}

	/**
	 * Converts document sections into overlapping chunks for vector embedding and search retrieval.
	 *
	 * Empty sections are skipped, while valid sections are normalized and split into
	 * fixed-size chunks with overlap. Each generated chunk receives a unique id and
	 * keeps references to its source document and section.
	 */
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
				int end = Math.min(start + chunkSize, normalized.length());
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

				start = Math.max(0, end - chunkOverlap);
			}
		}

		return chunks;
	}

	/**
	 * Normalizes section text before chunking.
	 *
	 * This removes repeated whitespace and safely handles null content.
	 */
	private String normalize(String text) {
		return text == null ? "" : text.replaceAll("\\s+", " ").trim();
	}
}