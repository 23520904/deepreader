package com.deepreader.business_service.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record BookQueryRequest(
		@NotBlank String query,
		@Min(1) @Max(20) Integer limit,
		String provider,
		String threadId
) {
}
