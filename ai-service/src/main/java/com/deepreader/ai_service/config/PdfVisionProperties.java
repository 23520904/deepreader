package com.deepreader.ai_service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@ConfigurationProperties(prefix = "deepreader.pdf-vision")
@Validated
public class PdfVisionProperties {

	@Min(1)
	@Max(64)
	private int maxImages = 16;

	@Min(4096)
	private int maxTextChars = 100_000;

	@Min(8)
	private int minImageSidePixels = 32;

	@Min(1024)
	private long maxImageBytes = 4L * 1024 * 1024;

	/**
	 * When true and embedded-image extraction finds nothing, rasterize the first pages
	 * so diagrams/layout still reach the vision model.
	 */
	private boolean fallbackRenderPagesIfNoImages = true;

	@Min(1)
	@Max(64)
	private int maxPagesToRender = 8;

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
