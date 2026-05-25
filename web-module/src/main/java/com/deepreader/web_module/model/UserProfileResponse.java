package com.deepreader.web_module.model;

public record UserProfileResponse(
		String userId,
		String email,
		String username,
		String avatarUrl,
		String fullName,
		String phoneNumber,
		String location,
		String role
) {
}
