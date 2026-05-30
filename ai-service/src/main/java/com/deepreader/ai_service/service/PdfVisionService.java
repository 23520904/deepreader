package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.PdfVisionProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;

/**
 * Service responsible for analyzing PDF files with text and visual context.
 *
 * This service extracts PDF text, collects embedded images, optionally renders
 * pages as fallback images, and sends the combined multimodal context to the
 * vision model.
 */
@Service
public class PdfVisionService {

	/**
	 * Result returned after PDF vision analysis.
	 *
	 * The counts help clients understand whether the model used embedded images,
	 * rendered page previews, or text-only context.
	 */
	public record PdfVisionOutcome(String result, int embeddedImageCount, int renderedPageCount) {}

	private final TextExtractionService textExtractionService;
	private final PdfEmbeddedImageExtractor pdfEmbeddedImageExtractor;
	private final PdfPageRasterizer pdfPageRasterizer;
	private final VisionService visionService;
	private final PdfVisionProperties pdfVisionProperties;

	/**
	 * Creates the PDF vision service with text extraction, image extraction,
	 * page rendering, vision analysis, and PDF vision configuration dependencies.
	 */
	public PdfVisionService(
			TextExtractionService textExtractionService,
			PdfEmbeddedImageExtractor pdfEmbeddedImageExtractor,
			PdfPageRasterizer pdfPageRasterizer,
			VisionService visionService,
			PdfVisionProperties pdfVisionProperties
	) {
		this.textExtractionService = textExtractionService;
		this.pdfEmbeddedImageExtractor = pdfEmbeddedImageExtractor;
		this.pdfPageRasterizer = pdfPageRasterizer;
		this.visionService = visionService;
		this.pdfVisionProperties = pdfVisionProperties;
	}

	/**
	 * Analyzes a PDF using extracted text and available visual content.
	 *
	 * Blocking PDF parsing work is moved to a bounded elastic scheduler, then the
	 * prepared prompt and image parts are forwarded to the multimodal vision service.
	 */
	public Mono<PdfVisionOutcome> analyzePdf(String userId, String provider, String userPrompt, byte[] pdfBytes) {
		return Mono.fromCallable(() -> buildPromptAndImages(userPrompt, pdfBytes))
				.subscribeOn(Schedulers.boundedElastic())
				.flatMap(ctx -> visionService.analyzeMultimodal(userId, provider, ctx.combinedPrompt(), ctx.imageParts())
						.map(text -> new PdfVisionOutcome(text, ctx.embeddedImageCount(), ctx.renderedPageCount())));
	}

	/**
	 * Builds the final multimodal prompt and image list for PDF analysis.
	 *
	 * The method first extracts text and embedded images. If no embedded images are
	 * found and fallback rendering is enabled, it renders the first pages so layout,
	 * diagrams, and visual structure can still reach the vision model.
	 */
	private MultimodalPdfContext buildPromptAndImages(String userPrompt, byte[] pdfBytes) {
		String fullText = textExtractionService.extractPdfText(pdfBytes);
		String excerpt = truncate(fullText, pdfVisionProperties.getMaxTextChars());
		List<PdfEmbeddedImageExtractor.PdfEmbeddedImage> fromXObjects = pdfEmbeddedImageExtractor.extract(pdfBytes);
		int embeddedCount = fromXObjects.size();

		List<PdfEmbeddedImageExtractor.PdfEmbeddedImage> forModel = new ArrayList<>(fromXObjects);
		int renderedPageCount = 0;
		if (forModel.isEmpty() && pdfVisionProperties.isFallbackRenderPagesIfNoImages()) {
			int pageCap = Math.min(pdfVisionProperties.getMaxPagesToRender(), pdfVisionProperties.getMaxImages());
			List<PdfEmbeddedImageExtractor.PdfEmbeddedImage> pages = pdfPageRasterizer.renderFirstPages(pdfBytes, pageCap);
			forModel = new ArrayList<>(pages);
			renderedPageCount = pages.size();
		}

		List<VisionService.ImagePart> imageParts = new ArrayList<>();
		for (PdfEmbeddedImageExtractor.PdfEmbeddedImage img : forModel) {
			imageParts.add(new VisionService.ImagePart("image/png", img.pngBytes()));
		}

		String instructions = StringUtils.hasText(userPrompt)
				? userPrompt
				: defaultInstructions(embeddedCount, renderedPageCount);

		String combined = """
				%s

				--- Extracted PDF text (may be truncated) ---
				%s
				""".formatted(instructions, excerpt);

		if (fullText.length() > excerpt.length()) {
			combined = combined + "\n\n[Note: PDF text was truncated for context length.]";
		}
		if (renderedPageCount > 0) {
			combined = combined + "\n\n[Attached images are full-page raster previews (first "
					+ renderedPageCount + " pages) because no embedded bitmaps were found in the PDF.]";
		}

		return new MultimodalPdfContext(combined, imageParts, embeddedCount, renderedPageCount);
	}

	/**
	 * Provides default analysis instructions based on the available visual context.
	 *
	 * The prompt changes depending on whether the PDF includes embedded images,
	 * rendered page previews, or only extracted text.
	 */
	private String defaultInstructions(int embeddedCount, int renderedPageCount) {
		if (renderedPageCount > 0) {
			return "Using the extracted PDF text and the attached page images, summarize the document, describe layouts and visuals (figures, diagrams, UI), and relate them to the text.";
		}
		if (embeddedCount > 0) {
			return "Using the extracted PDF text and the embedded images below, summarize the document, explain how images relate to the text, and call out key visuals or diagrams.";
		}
		return "Using only the extracted PDF text below, summarize the document. (No images were available.)";
	}

	/**
	 * Truncates text to the configured maximum length for prompt safety.
	 */
	private String truncate(String text, int maxChars) {
		if (text == null) {
			return "";
		}
		if (text.length() <= maxChars) {
			return text;
		}
		return text.substring(0, maxChars);
	}

	/**
	 * Internal context object passed from PDF preparation to multimodal analysis.
	 */
	private record MultimodalPdfContext(
			String combinedPrompt,
			List<VisionService.ImagePart> imageParts,
			int embeddedImageCount,
			int renderedPageCount
	) {}
}