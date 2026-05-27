package com.deepreader.web_module.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(
		@Email @NotBlank String email,
		@NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit code") String otp
) {
}
