package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.DocumentSection;
import nl.siegmann.epublib.domain.Book;
import nl.siegmann.epublib.domain.Resource;
import nl.siegmann.epublib.epub.EpubReader;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class TextExtractionService {

	/**
	 * Extracts all text from a PDF file.
	 */
	public String extractPdfText(byte[] fileBytes) {
		try (PDDocument document = Loader.loadPDF(fileBytes)) {
			PDFTextStripper stripper = new PDFTextStripper();
			String text = stripper.getText(document);
			return text == null ? "" : text.trim();
		} catch (IOException e) {
			throw new IllegalStateException("Failed to extract text from PDF", e);
		}
	}

	/**
	 * Extracts text from each PDF page separately.
	 */
	public List<String> extractPdfPages(byte[] fileBytes) {
		try (PDDocument document = Loader.loadPDF(fileBytes)) {
			PDFTextStripper stripper = new PDFTextStripper();
			List<String> pages = new ArrayList<>();

			// Read one page at a time and store its text.
			for (int i = 1; i <= document.getNumberOfPages(); i++) {
				stripper.setStartPage(i);
				stripper.setEndPage(i);
				String text = stripper.getText(document);
				pages.add(text == null ? "" : text.trim());
			}

			return pages;
		} catch (IOException e) {
			throw new IllegalStateException("Failed to extract page text from PDF", e);
		}
	}

	/**
	 * Extracts document sections based on the file type.
	 * Currently, only PDF and EPUB files are supported.
	 */
	public List<DocumentSection> extractSections(String fileName, byte[] fileBytes) {
		String normalized = fileName == null ? "" : fileName.toLowerCase();

		if (normalized.endsWith(".pdf")) {
			return extractPdfSections(fileBytes);
		}

		if (normalized.endsWith(".epub")) {
			return extractEpubSections(fileBytes);
		}

		throw new IllegalArgumentException("Only PDF and EPUB files are supported");
	}

	/**
	 * Converts each non-empty PDF page into a document section.
	 */
	private List<DocumentSection> extractPdfSections(byte[] fileBytes) {
		List<String> pages = extractPdfPages(fileBytes);
		List<DocumentSection> sections = new ArrayList<>();

		for (int i = 0; i < pages.size(); i++) {
			String text = pages.get(i);

			// Skip empty pages.
			if (!StringUtils.hasText(text)) {
				continue;
			}

			sections.add(new DocumentSection("page-" + (i + 1), "Page " + (i + 1), i + 1, summarize(text), text));
		}

		return sections;
	}

	/**
	 * Converts each readable EPUB spine resource into a document section.
	 */
	private List<DocumentSection> extractEpubSections(byte[] fileBytes) {
		try {
			Book book = new EpubReader().readEpub(new ByteArrayInputStream(fileBytes));
			List<DocumentSection> sections = new ArrayList<>();
			int index = 1;

			for (Resource resource : book.getSpine().getSpineReferences().stream().map(ref -> ref.getResource()).toList()) {
				// Skip missing EPUB resources.
				if (resource == null) {
					continue;
				}

				String raw = new String(resource.getData(), StandardCharsets.UTF_8);
				String text = stripHtml(raw);

				// Skip chapters or sections with no readable text.
				if (!StringUtils.hasText(text)) {
					continue;
				}

				String title = StringUtils.hasText(resource.getTitle()) ? resource.getTitle() : "Chapter " + index;
				sections.add(new DocumentSection("chapter-" + index, title, index, summarize(text), text));
				index++;
			}

			return sections;
		} catch (IOException e) {
			throw new IllegalStateException("Failed to extract text from EPUB", e);
		}
	}

	/**
	 * Removes basic HTML tags and common HTML entities from EPUB content.
	 */
	private String stripHtml(String html) {
		return html
				.replaceAll("(?is)<script.*?>.*?</script>", " ")
				.replaceAll("(?is)<style.*?>.*?</style>", " ")
				.replaceAll("(?is)<[^>]+>", " ")
				.replace("&nbsp;", " ")
				.replace("&amp;", "&")
				.replace("&lt;", "<")
				.replace("&gt;", ">")
				.replaceAll("\\s+", " ")
				.trim();
	}

	/**
	 * Creates a short preview from the beginning of the text.
	 */
	private String summarize(String text) {
		String normalized = text.replaceAll("\\s+", " ").trim();
		return normalized.length() <= 280 ? normalized : normalized.substring(0, 280) + "...";
	}
}