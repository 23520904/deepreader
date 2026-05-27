package com.deepreader.web_module.model;

import jakarta.validation.constraints.NotBlank;

public record UpdateLlmTokenRequest(@NotBlank String llmApiToken) {
}
