package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import com.deepreader.ai_service.model.IndexedDocument;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service responsible for storing and loading indexed document metadata.
 *
 * This service persists document records and their extracted sections in the database
 * so they can be retrieved later for content display, search, chat, and generation features.
 */
@Service
public class DocumentIndexStoreService {

	private final JdbcTemplate jdbcTemplate;

	/**
	 * Creates the document index store service with JDBC database access.
	 */
	public DocumentIndexStoreService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/**
	 * Saves an indexed document and replaces its stored sections.
	 *
	 * The document metadata is inserted or updated first, then old section records
	 * are removed before inserting the latest extracted sections in order.
	 */
	public void save(IndexedDocument document) {
		jdbcTemplate.update(
				"insert into indexed_documents (user_id, document_id, file_name, object_key) values (?, ?, ?, ?) on conflict (document_id) do update set user_id = excluded.user_id, file_name = excluded.file_name, object_key = excluded.object_key",
				document.userId(),
				document.documentId(),
				document.fileName(),
				document.objectKey()
		);

		// Replace existing sections to keep the database in sync with the latest indexed content.
		jdbcTemplate.update("delete from indexed_document_sections where document_id = ?", document.documentId());

		int sectionOrder = 0;
		for (DocumentSection section : document.sections()) {
			jdbcTemplate.update(
					"insert into indexed_document_sections (document_id, section_order, section_id, title, page_number, summary, content) values (?, ?, ?, ?, ?, ?, ?)",
					document.documentId(),
					sectionOrder++,
					section.sectionId(),
					section.title(),
					section.pageNumber(),
					section.summary(),
					section.content()
			);
		}
	}

	/**
	 * Finds all indexed documents that belong to a user.
	 *
	 * Document ids are loaded first, then each document is rebuilt with its stored
	 * sections by reusing the single-document lookup method.
	 */
	public List<IndexedDocument> findAll(String userId) {
		List<String> documentIds = jdbcTemplate.query(
				"select document_id from indexed_documents where user_id = ? order by created_at desc",
				(rs, rowNum) -> rs.getString("document_id")
				,
				userId
		);

		List<IndexedDocument> documents = new ArrayList<>(documentIds.size());
		for (String documentId : documentIds) {
			findById(userId, documentId).ifPresent(documents::add);
		}
		return documents;
	}

	/**
	 * Finds one indexed document by user id and document id.
	 *
	 * The method first loads the document metadata, then loads its sections in
	 * their original stored order. An empty Optional is returned when no document
	 * matches the provided user and document id.
	 */
	public Optional<IndexedDocument> findById(String userId, String documentId) {
		List<IndexedDocument> documents = jdbcTemplate.query(
				"select user_id, document_id, file_name, object_key from indexed_documents where user_id = ? and document_id = ?",
				(rs, rowNum) -> new IndexedDocument(
						rs.getString("user_id"),
						rs.getString("document_id"),
						rs.getString("file_name"),
						rs.getString("object_key"),
						List.of()
				),
				userId,
				documentId
		);

		if (documents.isEmpty()) {
			return Optional.empty();
		}

		IndexedDocument document = documents.getFirst();
		List<DocumentSection> sections = jdbcTemplate.query(
				"select section_id, title, page_number, summary, content from indexed_document_sections where document_id = ? order by section_order asc",
				(rs, rowNum) -> new DocumentSection(
						rs.getString("section_id"),
						rs.getString("title"),
						rs.getInt("page_number"),
						rs.getString("summary"),
						rs.getString("content")
				),
				documentId
		);

		return Optional.of(new IndexedDocument(document.userId(), document.documentId(), document.fileName(), document.objectKey(), sections));
	}

	/**
	 * Returns an indexed document or throws an exception when it does not exist.
	 *
	 * This helper is useful for controller and service flows where the document
	 * must exist before the operation can continue.
	 */
	public IndexedDocument requireById(String userId, String documentId) {
		return findById(userId, documentId)
				.orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));
	}
}