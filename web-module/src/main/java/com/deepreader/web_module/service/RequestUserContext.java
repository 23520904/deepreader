package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
import org.springframework.web.server.ServerWebExchange;

/**
 * Utility class for reading authenticated user information from the current request.
 *
 * <p>The authentication filter stores the user ID and role in exchange attributes,
 * then controllers and services can read them through this class.
 */
public final class RequestUserContext {
	// Attribute key used to store the authenticated user's ID.
	public static final String USER_ID_ATTRIBUTE = "deepreader.userId";

	// Attribute key used to store the authenticated user's role.
	public static final String USER_ROLE_ATTRIBUTE = "deepreader.userRole";

	private RequestUserContext() {}

	/**
	 * Returns the authenticated user's role from the request context.
	 *
	 * <p>If no role is found, USER is used as the safe default.
	 */
	public static UserRole requireUserRole(ServerWebExchange exchange) {
		Object value = exchange.getAttribute(USER_ROLE_ATTRIBUTE);
		if (value instanceof UserRole role) {
			return role;
		}
		return UserRole.USER;
	}

	/**
	 * Returns the authenticated user's ID from the request context.
	 *
	 * <p>This method fails when no valid user ID is available, because protected
	 * endpoints must always know which user is making the request.
	 */
	public static String requireUserId(ServerWebExchange exchange) {
		Object value = exchange.getAttribute(USER_ID_ATTRIBUTE);
		if (value instanceof String userId && !userId.isBlank()) {
			return userId;
		}
		throw new IllegalArgumentException("Authenticated user id is required");
	}

	/**
	 * Ensures the current request belongs to an admin user.
	 *
	 * <p>Admin-only controllers call this before returning sensitive data or
	 * performing management actions.
	 */
	public static void requireAdmin(ServerWebExchange exchange) {
		if (requireUserRole(exchange) != UserRole.ADMIN) {
			throw new IllegalArgumentException("Admin role required");
		}
	}
}