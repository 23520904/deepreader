package com.deepreader.ai_service.config;

import com.deepreader.ai_service.service.JwtService;
import com.deepreader.ai_service.service.RequestUserContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
public class AuthWebFilter implements WebFilter {

	private final JwtService jwtService;
	private final AntPathMatcher matcher = new AntPathMatcher();

	public AuthWebFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
		String path = exchange.getRequest().getPath().value();
		if (isPublicPath(path)) {
			return chain.filter(exchange);
		}
		boolean protectedPath = matcher.match("/api/documents/**", path)
				|| matcher.match("/api/v1/documents/**", path)
				|| matcher.match("/api/v1/admin/**", path);
		if (!protectedPath) {
			return chain.filter(exchange);
		}
		String auth = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
		if (!StringUtils.hasText(auth) || !auth.startsWith("Bearer ")) {
			return unauthorized(exchange, "Missing Bearer token");
		}
		String token = auth.substring("Bearer ".length()).trim();
		try {
			JwtService.AuthPrincipal principal = jwtService.verifyAndGetPrincipal(token);
			exchange.getAttributes().put(RequestUserContext.USER_ID_ATTRIBUTE, principal.userId());
			exchange.getAttributes().put(RequestUserContext.USER_ROLE_ATTRIBUTE, principal.role());
			return chain.filter(exchange);
		} catch (IllegalArgumentException ex) {
			return unauthorized(exchange, ex.getMessage());
		}
	}

	private boolean isPublicPath(String path) {
		return matcher.match("/api/auth/**", path)
				|| matcher.match("/api/v1/auth/**", path)
				|| matcher.match("/actuator/**", path)
				|| matcher.match("/v3/api-docs/**", path)
				|| matcher.match("/swagger-ui/**", path)
				|| matcher.match("/swagger-ui.html", path);
	}

	private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
		exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
		exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
		String body = "{\"error\":\"" + message.replace("\"", "") + "\"}";
		byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
		return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
	}
}
