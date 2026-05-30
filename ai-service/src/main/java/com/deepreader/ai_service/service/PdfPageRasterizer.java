package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.PdfVisionProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Service responsible for rendering PDF pages into images for vision analysis.
 *
 * This is used when embedded image extraction is not enough or when the page
 * layout itself needs to be sent to a multimodal model.
 */
@Service
public class PdfPageRasterizer {

	private final PdfVisionProperties properties;

	/**
	 * Creates the PDF page rasterizer with rendering and image size settings.
	 */
	public PdfPageRasterizer(PdfVisionProperties properties) {
		this.properties = properties;
	}

	/**
	 * Renders the first pages of a PDF into PNG images.
	 *
	 * The number of rendered pages is limited by the requested max page count
	 * and the actual number of pages in the document.
	 */
	public List<PdfEmbeddedImageExtractor.PdfEmbeddedImage> renderFirstPages(byte[] pdfBytes, int maxPages) {
		try (PDDocument document = Loader.loadPDF(pdfBytes)) {
			PDFRenderer renderer = new PDFRenderer(document);
			int totalPages = document.getNumberOfPages();
			int limit = Math.min(Math.max(0, maxPages), totalPages);
			List<PdfEmbeddedImageExtractor.PdfEmbeddedImage> out = new ArrayList<>();

			for (int i = 0; i < limit; i++) {
				BufferedImage rendered = renderer.renderImageWithDPI(i, properties.getRenderDpi(), ImageType.RGB);
				byte[] png = encodePngUnderByteCap(rendered);
				if (png != null && png.length > 0) {
					out.add(new PdfEmbeddedImageExtractor.PdfEmbeddedImage(i + 1, png));
				}
			}

			return out;
		} catch (IOException e) {
			throw new IllegalStateException("Failed to render PDF pages for vision", e);
		}
	}

	/**
	 * Encodes a rendered page as PNG while keeping it under the configured byte limit.
	 *
	 * If the image is too large, it is repeatedly scaled down and re-encoded.
	 * This prevents oversized page images from being sent to the vision model.
	 */
	private byte[] encodePngUnderByteCap(BufferedImage image) throws IOException {
		BufferedImage current = image;
		long cap = properties.getMaxImageBytes();

		for (int attempt = 0; attempt < 6; attempt++) {
			ByteArrayOutputStream buffer = new ByteArrayOutputStream();
			if (!ImageIO.write(current, "png", buffer)) {
				return null;
			}

			byte[] bytes = buffer.toByteArray();
			if (bytes.length <= cap) {
				return bytes;
			}

			// Scale the image down by half before trying to encode it again.
			int w = Math.max(1, current.getWidth() / 2);
			int h = Math.max(1, current.getHeight() / 2);
			BufferedImage scaled = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
			Graphics2D g = scaled.createGraphics();
			g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			g.drawImage(current, 0, 0, w, h, null);
			g.dispose();
			current = scaled;
		}

		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		return ImageIO.write(current, "png", buffer) ? buffer.toByteArray() : null;
	}
}