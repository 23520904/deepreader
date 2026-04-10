package com.deepreader.ai_service.service;

import com.deepreader.ai_service.model.UserRole;
import org.springframework.web.server.ServerWebExchange;

public final class RequestUserContext {

	public static final String USER_ID_ATTRIBUTE = "deepreader.userId";
	public static final String USER_ROLE_ATTRIBUTE = "deepreader.userRole";

	private RequestUserContext() {}

	public static String requireUserId(ServerWebExchange exchange) {
		Object value = exchange.getAttribute(USER_ID_ATTRIBUTE);
		if (value instanceof String userId && !userId.isBlank()) {
			return userId;
		}
		throw new IllegalArgumentException("Missing authenticated user context");
	}

	public static UserRole requireUserRole(ServerWebExchange exchange) {
		Object value = exchange.getAttribute(USER_ROLE_ATTRIBUTE);
		if (value instanceof UserRole role) {
			return role;
		}
		return UserRole.USER;
	}

	public static void requireAdmin(ServerWebExchange exchange) {
		if (requireUserRole(exchange) != UserRole.ADMIN) {
			throw new IllegalArgumentException("Admin role required");
		}
	}
}
