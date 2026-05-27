package com.deepreader.web_module.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Service
public class GoogleAuthService {
	private static final Duration TOKENINFO_TIMEOUT = Duration.ofSeconds(5);

	private final WebClient webClient;
	private final String clientId;

	public GoogleAuthService(
			WebClient.Builder webClientBuilder,
			@Value("${deepreader.auth.google.client-id:}") String clientId
	) {
		this.webClient = webClientBuilder.baseUrl("https://oauth2.googleapis.com").build();
		this.clientId = clientId;
	}

	public GoogleProfile verifyIdToken(String idToken) {
		if (!StringUtils.hasText(clientId)) {
			throw new IllegalArgumentException("Google login is not configured.");
		}
		if (!StringUtils.hasText(idToken)) {
			throw new IllegalArgumentException("Google idToken is required.");
		}

		GoogleTokenInfo tokenInfo;
		try {
			tokenInfo = webClient.get()
					.uri(uriBuilder -> uriBuilder
							.path("/tokeninfo")
							.queryParam("id_token", idToken)
							.build()
					)
					.retrieve()
					.bodyToMono(GoogleTokenInfo.class)
					.block(TOKENINFO_TIMEOUT);
		} catch (Exception ex) {
			throw new IllegalArgumentException("Google token is invalid.", ex);
		}

		if (tokenInfo == null || !clientId.equals(tokenInfo.aud())) {
			throw new IllegalArgumentException("Google token audience is invalid.");
		}
		if (!isEmailVerified(tokenInfo.emailVerified())) {
			throw new IllegalArgumentException("Google email is not verified.");
		}
		if (!StringUtils.hasText(tokenInfo.sub()) || !StringUtils.hasText(tokenInfo.email())) {
			throw new IllegalArgumentException("Google token is missing required account data.");
		}

		return new GoogleProfile(
				tokenInfo.sub(),
				tokenInfo.email(),
				tokenInfo.name(),
				tokenInfo.picture()
		);
	}

	private record GoogleTokenInfo(
			String aud,
			String sub,
			String email,
			@com.fasterxml.jackson.annotation.JsonProperty("email_verified") Object emailVerified,
			String name,
			String picture
	) {}

	private boolean isEmailVerified(Object value) {
		if (value instanceof Boolean bool) {
			return bool;
		}
		if (value instanceof String text) {
			return "true".equalsIgnoreCase(text);
		}
		return false;
	}

	public record GoogleProfile(
			String subject,
			String email,
			String name,
			String picture
	) {
	}
}
