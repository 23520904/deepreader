package com.deepreader.data_service.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserAccountUpsertRequest(
		@Email @NotBlank String email,
		@NotBlank String passwordHash,
		String fullName,
		@NotBlank String role) {
}
