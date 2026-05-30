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

/**
 * Service for handling Google OAuth login.
 *
 * <p>It builds the Google authorization URL, exchanges the callback code for
 * tokens, verifies the returned ID token, and reads the user's Google profile.
 */
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

	/**
	 * Builds the Google OAuth authorization URI used to start login.
	 *
	 * <p>The state value is passed through Google and returned to the callback,
	 * so the application can restore redirect information after login.
	 */
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

	/**
	 * Exchanges a Google authorization code for the user's verified profile.
	 *
	 * <p>The flow first gets tokens from Google, then checks the ID token audience,
	 * then uses the access token to load profile information.
	 */
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

		// Make sure the ID token was issued for this DeepReader OAuth client.
		verifyIdTokenAudience(tokenResponse.idToken());

		// Use the access token to fetch the user's public Google profile.
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

	/**
	 * Checks the Google ID token audience against the configured client ID.
	 *
	 * <p>This prevents accepting a token that was issued for another application.
	 */
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

	/**
	 * Reads the Google user profile using the access token.
	 *
	 * <p>The userinfo response provides the stable Google subject ID, email,
	 * display name, and avatar URL.
	 */
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

	/**
	 * Checks whether Google marked the email as verified.
	 *
	 * <p>The value can arrive as a boolean or string depending on how it is parsed.
	 */
	private boolean isEmailVerified(Object value) {
		if (value instanceof Boolean bool) {
			return bool;
		}
		if (value instanceof String text) {
			return "true".equalsIgnoreCase(text);
		}
		return false;
	}

	/**
	 * Ensures Google OAuth settings are available before starting the flow.
	 */
	private void requireConfigured() {
		if (!StringUtils.hasText(clientId) || !StringUtils.hasText(clientSecret) || !StringUtils.hasText(redirectUri)) {
			throw new IllegalArgumentException("Google OAuth is not configured.");
		}
	}

	// Token response returned by Google's token endpoint.
	private record GoogleTokenResponse(
			@JsonProperty("access_token") String accessToken,
			@JsonProperty("id_token") String idToken
	) {
	}

	// Minimal token info used to verify that the token audience matches this app.
	private record GoogleTokenInfo(String aud) {
	}

	// User profile returned by Google's userinfo endpoint.
	private record GoogleUserInfo(
			String sub,
			String email,
			@JsonProperty("email_verified") Object emailVerified,
			String name,
			String picture
	) {
	}

	/**
	 * Public Google profile data used by the authentication flow.
	 */
	public record GoogleProfile(
			String subject,
			String email,
			String name,
			String picture
	) {
	}
}