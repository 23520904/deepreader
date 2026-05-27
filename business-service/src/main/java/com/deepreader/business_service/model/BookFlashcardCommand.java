package com.deepreader.business_service.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record BookFlashcardCommand(
		String provider,
		@Min(1) @Max(50) Integer count
) {
}