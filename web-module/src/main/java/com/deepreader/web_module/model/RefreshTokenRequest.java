package com.deepreader.web_module.model;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
		@NotBlank String refreshToken
) {
}
