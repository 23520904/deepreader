package com.deepreader.web_module.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;

@Service
public class GoogleOAuthService {
	private static final Duration GOOGLE_TIMEOUT = Duration.ofSeconds(8);

	private final WebClient webClient;
	private final String clientId;
	private final String clientSecret;
	private final String redirectUri;

	public GoogleOAuthService(
			WebClient.Builder webClientBuilder,
			@Value("${deepreader.auth.google.client-id:}") String clientId,
			@Value("${deepreader.auth.google.client-secret:}") String clientSecret,
			@Value("${deepreader.auth.google.redirect-uri:}") String redirectUri
	) {
		this.webClient = webClientBuilder.build();
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.redirectUri = redirectUri;
	}

	public URI buildAuthorizationUri(String state) {
		requireConfigured();
		return UriComponentsBuilder
				.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
				.queryParam("client_id", clientId)
				.queryParam("redirect_uri", redirectUri)
				.queryParam("response_type", "code")
				.queryParam("scope", "openid email profile")
				.queryParam("prompt", "select_account")
				.queryParam("state", state)
				.build()
				.encode()
				.toUri();
	}

	public GoogleProfile exchangeCodeForProfile(String code) {
		requireConfigured();
		if (!StringUtils.hasText(code)) {
			throw new IllegalArgumentException("Google authorization code is required.");
		}

		GoogleTokenResponse tokenResponse;
		try {
			tokenResponse = webClient.post()
					.uri("https://oauth2.googleapis.com/token")
					.contentType(MediaType.APPLICATION_FORM_URLENCODED)
					.body(BodyInserters
							.fromFormData("code", code)
							.with("client_id", clientId)
							.with("client_secret", clientSecret)
							.with("redirect_uri", redirectUri)
							.with("grant_type", "authorization_code")
					)
					.retrieve()
					.bodyToMono(GoogleTokenResponse.class)
					.block(GOOGLE_TIMEOUT);
		} catch (Exception ex) {
			throw new IllegalArgumentException("Google authorization failed.", ex);
		}

		if (tokenResponse == null || !StringUtils.hasText(tokenResponse.idToken())
				|| !StringUtils.hasText(tokenResponse.accessToken())) {
			throw new IllegalArgumentException("Google authorization did not return account data.");
		}

		verifyIdTokenAudience(tokenResponse.idToken());
		GoogleUserInfo userInfo = fetchUserInfo(tokenResponse.accessToken());

		if (userInfo == null || !StringUtils.hasText(userInfo.sub()) || !StringUtils.hasText(userInfo.email())) {
			throw new IllegalArgumentException("Google account is missing required profile data.");
		}
		if (!isEmailVerified(userInfo.emailVerified())) {
			throw new IllegalArgumentException("Google email is not verified.");
		}

		return new GoogleProfile(
				userInfo.sub(),
				userInfo.email(),
				userInfo.name(),
				userInfo.picture()
		);
	}

	private void verifyIdTokenAudience(String idToken) {
		GoogleTokenInfo tokenInfo;
		try {
			tokenInfo = webClient.get()
					.uri(uriBuilder -> uriBuilder
							.scheme("https")
							.host("oauth2.googleapis.com")
							.path("/tokeninfo")
							.queryParam("id_token", idToken)
							.build()
					)
					.retrieve()
					.bodyToMono(GoogleTokenInfo.class)
					.block(GOOGLE_TIMEOUT);
		} catch (Exception ex) {
			throw new IllegalArgumentException("Google token is invalid.", ex);
		}

		if (tokenInfo == null || !clientId.equals(tokenInfo.aud())) {
			throw new IllegalArgumentException("Google token audience is invalid.");
		}
	}

	private GoogleUserInfo fetchUserInfo(String accessToken) {
		try {
			return webClient.get()
					.uri("https://openidconnect.googleapis.com/v1/userinfo")
					.headers(headers -> headers.setBearerAuth(accessToken))
					.retrieve()
					.bodyToMono(GoogleUserInfo.class)
					.block(GOOGLE_TIMEOUT);
		} catch (Exception ex) {
			throw new IllegalArgumentException("Could not read Google profile.", ex);
		}
	}

	private boolean isEmailVerified(Object value) {
		if (value instanceof Boolean bool) {
			return bool;
		}
		if (value instanceof String text) {
			return "true".equalsIgnoreCase(text);
		}
		return false;
	}

	private void requireConfigured() {
		if (!StringUtils.hasText(clientId) || !StringUtils.hasText(clientSecret) || !StringUtils.hasText(redirectUri)) {
			throw new IllegalArgumentException("Google OAuth is not configured.");
		}
	}

	private record GoogleTokenResponse(
			@JsonProperty("access_token") String accessToken,
			@JsonProperty("id_token") String idToken
	) {
	}

	private record GoogleTokenInfo(String aud) {
	}

	private record GoogleUserInfo(
			String sub,
			String email,
			@JsonProperty("email_verified") Object emailVerified,
			String name,
			String picture
	) {
	}

	public record GoogleProfile(
			String subject,
			String email,
			String name,
			String picture
	) {
	}
}
