package com.deepreader.ai_service.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class TextExtractionService {

	public String extractPdfText(byte[] fileBytes) {
		try (PDDocument document = Loader.loadPDF(fileBytes)) {
			PDFTextStripper stripper = new PDFTextStripper();
			String text = stripper.getText(document);
			return text == null ? "" : text.trim();
		} catch (IOException e) {
			throw new IllegalStateException("Failed to extract text from PDF", e);
		}
	}
}