package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Configuration properties for PDF vision processing.
 *
 * These values control how much text and image data can be extracted from a PDF
 * before being sent to the vision model.
 */
@ConfigurationProperties(prefix = "deepreader.pdf-vision")
@Validated
public class PdfVisionProperties {

	/**
	 * Maximum number of images extracted from a PDF.
	 */
	@Min(1)
	@Max(64)
	private int maxImages = 16;

	/**
	 * Maximum number of text characters extracted from a PDF.
	 */
	@Min(4096)
	private int maxTextChars = 100_000;

	/**
	 * Minimum width or height required for an image to be processed.
	 */
	@Min(8)
	private int minImageSidePixels = 32;

	/**
	 * Maximum allowed size for a single extracted image.
	 */
	@Min(1024)
	private long maxImageBytes = 4L * 1024 * 1024;

	/**
	 * When true and embedded-image extraction finds nothing, rasterize the first pages
	 * so diagrams/layout still reach the vision model.
	 */
	private boolean fallbackRenderPagesIfNoImages = true;

	/**
	 * Maximum number of PDF pages to render when fallback rendering is enabled.
	 */
	@Min(1)
	@Max(64)
	private int maxPagesToRender = 8;

	/**
	 * DPI used when rendering PDF pages into images.
	 */
	@Min(36)
	@Max(300)
	private int renderDpi = 100;

	public int getMaxImages() {
		return maxImages;
	}

	public void setMaxImages(int maxImages) {
		this.maxImages = maxImages;
	}

	public int getMaxTextChars() {
		return maxTextChars;
	}

	public void setMaxTextChars(int maxTextChars) {
		this.maxTextChars = maxTextChars;
	}

	public int getMinImageSidePixels() {
		return minImageSidePixels;
	}

	public void setMinImageSidePixels(int minImageSidePixels) {
		this.minImageSidePixels = minImageSidePixels;
	}

	public long getMaxImageBytes() {
		return maxImageBytes;
	}

	public void setMaxImageBytes(long maxImageBytes) {
		this.maxImageBytes = maxImageBytes;
	}

	public boolean isFallbackRenderPagesIfNoImages() {
		return fallbackRenderPagesIfNoImages;
	}

	public void setFallbackRenderPagesIfNoImages(boolean fallbackRenderPagesIfNoImages) {
		this.fallbackRenderPagesIfNoImages = fallbackRenderPagesIfNoImages;
	}

	public int getMaxPagesToRender() {
		return maxPagesToRender;
	}

	public void setMaxPagesToRender(int maxPagesToRender) {
		this.maxPagesToRender = maxPagesToRender;
	}

	public int getRenderDpi() {
		return renderDpi;
	}

	public void setRenderDpi(int renderDpi) {
		this.renderDpi = renderDpi;
	}
}