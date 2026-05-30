package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.PdfVisionProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service responsible for extracting embedded images from PDF files.
 *
 * This extractor scans PDF page resources, collects image XObjects, converts
 * valid images to PNG bytes, and applies configured limits such as maximum image
 * count, minimum image size, and maximum image byte size.
 */
@Service
public class PdfEmbeddedImageExtractor {

	/**
	 * Represents an extracted embedded image and the PDF page where it was found.
	 */
	public record PdfEmbeddedImage(int pageNumber, byte[] pngBytes) {}

	private final PdfVisionProperties properties;

	/**
	 * Creates the embedded image extractor with PDF vision configuration limits.
	 */
	public PdfEmbeddedImageExtractor(PdfVisionProperties properties) {
		this.properties = properties;
	}

	/**
	 * Extracts embedded images from the provided PDF bytes.
	 *
	 * The method scans each page until the configured maximum number of images is
	 * reached. Duplicate image objects are skipped so reused PDF resources are not
	 * returned multiple times.
	 */
	public List<PdfEmbeddedImage> extract(byte[] pdfBytes) {
		try (PDDocument document = Loader.loadPDF(pdfBytes)) {
			List<PdfEmbeddedImage> out = new ArrayList<>();
			Set<Integer> seenImageObjects = new HashSet<>();
			int pageNumber = 0;
			for (PDPage page : document.getPages()) {
				pageNumber++;
				if (out.size() >= properties.getMaxImages()) {
					break;
				}
				Set<Integer> formsOnPage = new HashSet<>();
				collectFromResources(
						page.getResources(),
						pageNumber,
						out,
						seenImageObjects,
						formsOnPage
				);
			}
			return out;
		} catch (IOException e) {
			throw new IllegalStateException("Failed to extract embedded images from PDF", e);
		}
	}

	/**
	 * Recursively collects image objects from PDF resources.
	 *
	 * Images are filtered by size and byte limit before being added to the output.
	 * Form XObjects are also inspected because PDF images may be nested inside
	 * reusable form resources.
	 */
	private void collectFromResources(
			PDResources resources,
			int pageNumber,
			List<PdfEmbeddedImage> out,
			Set<Integer> seenImageObjects,
			Set<Integer> formsOnPage
	) throws IOException {
		if (resources == null || out.size() >= properties.getMaxImages()) {
			return;
		}
		for (COSName name : resources.getXObjectNames()) {
			if (out.size() >= properties.getMaxImages()) {
				return;
			}
			PDXObject xObject = resources.getXObject(name);
			if (xObject instanceof PDImageXObject imageXObject) {
				int id = System.identityHashCode(imageXObject.getCOSObject());
				if (!seenImageObjects.add(id)) {
					continue;
				}
				int w = imageXObject.getWidth();
				int h = imageXObject.getHeight();

				// Skip very small images such as icons, separators, or decorative assets.
				if (w < properties.getMinImageSidePixels() || h < properties.getMinImageSidePixels()) {
					continue;
				}

				byte[] png = toPngBytes(imageXObject);
				if (png != null && png.length > 0 && png.length <= properties.getMaxImageBytes()) {
					out.add(new PdfEmbeddedImage(pageNumber, png));
				}
			} else if (xObject instanceof PDFormXObject formXObject) {
				int formId = System.identityHashCode(formXObject.getCOSObject());
				if (!formsOnPage.add(formId)) {
					continue;
				}

				// Recursively inspect nested form resources for embedded images.
				collectFromResources(
						formXObject.getResources(),
						pageNumber,
						out,
						seenImageObjects,
						formsOnPage
				);
			}
		}
	}

	/**
	 * Converts a PDF image object into PNG bytes.
	 *
	 * If the image cannot be decoded or written as PNG, null is returned so the
	 * extractor can skip the image without failing the whole PDF analysis.
	 */
	private byte[] toPngBytes(PDImageXObject imageXObject) {
		try {
			BufferedImage image = imageXObject.getImage();
			if (image == null) {
				return null;
			}
			ByteArrayOutputStream buffer = new ByteArrayOutputStream();
			if (!ImageIO.write(image, "png", buffer)) {
				return null;
			}
			return buffer.toByteArray();
		} catch (IOException ex) {
			return null;
		}
	}
}