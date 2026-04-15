package com.deepreader.web_module.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRegisterRequest(
		@Email @NotBlank String email,
		@NotBlank @Size(min = 8, max = 128) String password
) {
}
