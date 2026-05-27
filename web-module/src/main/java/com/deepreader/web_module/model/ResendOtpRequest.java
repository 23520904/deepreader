package com.deepreader.web_module.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(
		@Email @NotBlank String email
) {
}
