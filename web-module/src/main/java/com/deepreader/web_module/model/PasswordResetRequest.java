package com.deepreader.web_module.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
		@Email @NotBlank String email,
		@NotBlank @Pattern(regexp = "\\d{4}") String verificationCode,
		@NotBlank @Size(min = 8, max = 128) String password
) {
}
