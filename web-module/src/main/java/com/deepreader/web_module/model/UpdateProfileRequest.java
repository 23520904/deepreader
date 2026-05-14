package com.deepreader.web_module.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
		@NotBlank @Size(min = 1, max = 80) String username,
		@Size(max = 120) String fullName,
		@Size(max = 30) String phoneNumber,
		@Size(max = 120) String location,
		@Size(max = 800000) String avatarUrl
) {
}
