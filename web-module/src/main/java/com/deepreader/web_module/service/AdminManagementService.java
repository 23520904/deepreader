package com.deepreader.web_module.service;

import com.deepreader.web_module.model.UserRole;
import com.deepreader.web_module.model.UserStatus;
import com.deepreader.web_module.model.admin.AdminDtos;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminManagementService {
	private static final int DEFAULT_DAILY_REQUESTS_LIMIT = 500;
	private static final int DEFAULT_DAILY_TOKENS_LIMIT = 250_000;
	private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

	private final JdbcTemplate jdbcTemplate;
	private final NamedParameterJdbcTemplate namedJdbcTemplate;
	private final ObjectMapper objectMapper;

	public AdminManagementService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
		this.jdbcTemplate = jdbcTemplate;
		this.namedJdbcTemplate = new NamedParameterJdbcTemplate(jdbcTemplate);
		this.objectMapper = objectMapper;
	}

	public AdminDtos.PageResponse<AdminDtos.AdminUserRow> listUsers(
			String search,
			String role,
			String status,
			int page,
			int size,
			String sortDirection
	) {
		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), 100);
		String safeSort = "asc".equalsIgnoreCase(sortDirection) ? "asc" : "desc";
		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("limit", safeSize)
				.addValue("offset", safePage * safeSize);
		String whereClause = userWhereClause(search, role, status, params);
		long total = queryLong("select count(*) from app_users u " + whereClause, params);
		List<AdminDtos.AdminUserRow> items = namedJdbcTemplate.query(
				"""
				select u.user_id, u.avatar_url, u.username, u.email, u.role, u.status,
				       u.email_verified, u.created_at, u.daily_requests_limit,
				       u.daily_tokens_limit, u.quota_disabled,
				       coalesce(count(d.document_id), 0) as document_count,
				       max(l.login_time) filter (where l.success = true) as last_login
				from app_users u
				left join indexed_documents d on d.user_id = u.user_id
				left join login_history l on l.user_id = u.user_id
				""" + whereClause + """
				group by u.user_id, u.avatar_url, u.username, u.email, u.role, u.status,
				         u.email_verified, u.created_at, u.daily_requests_limit,
				         u.daily_tokens_limit, u.quota_disabled
				order by u.created_at """ + " " + safeSort + " " + """
				limit :limit offset :offset
				""",
				params,
				(rs, rowNum) -> userRow(rs)
		);
		int totalPages = (int) Math.ceil(total / (double) safeSize);
		return new AdminDtos.PageResponse<>(items, safePage, safeSize, total, totalPages);
	}

	public AdminDtos.AdminUserDetail getUser(String userId) {
		AdminDtos.AdminUserRow user = requireUser(userId);
		return new AdminDtos.AdminUserDetail(
				user,
				listLoginHistory(userId, null, null, 0, 20).items(),
				usageByProvider("where user_id = :userId", new MapSqlParameterSource("userId", userId))
		);
	}

	public AdminDtos.AdminUserRow changeStatus(String adminUserId, String targetUserId, String status) {
		if (adminUserId.equals(targetUserId)) {
			throw new IllegalArgumentException("Admin cannot change the current signed-in account status");
		}
		UserStatus nextStatus = UserStatus.from(status);
		int updated = jdbcTemplate.update("update app_users set status = ? where user_id = ?", nextStatus.name(), targetUserId);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found");
		}
		if (nextStatus == UserStatus.BANNED) {
			revokeSessions(targetUserId);
		}
		recordAudit(adminUserId, nextStatus == UserStatus.BANNED ? "BAN_USER" : "UNBAN_USER", targetUserId, Map.of("status", nextStatus.name()));
		return requireUser(targetUserId);
	}

	public AdminDtos.AdminUserRow changeRole(String adminUserId, String targetUserId, String role) {
		UserRole nextRole = UserRole.from(role);
		if (adminUserId.equals(targetUserId) && nextRole != UserRole.ADMIN) {
			throw new IllegalArgumentException("Admin cannot remove ADMIN from the current signed-in account");
		}
		int updated = jdbcTemplate.update("update app_users set role = ? where user_id = ?", nextRole.name(), targetUserId);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found");
		}
		recordAudit(adminUserId, "ROLE_CHANGE", targetUserId, Map.of("role", nextRole.name()));
		return requireUser(targetUserId);
	}

	public void forceLogout(String adminUserId, String targetUserId) {
		revokeSessions(targetUserId);
		recordAudit(adminUserId, "FORCE_LOGOUT", targetUserId, Map.of());
	}

	public void resetPassword(String adminUserId, String targetUserId, String newPassword) {
		if (!StringUtils.hasText(newPassword) || newPassword.length() < 8 || newPassword.length() > 128) {
			throw new IllegalArgumentException("Password must contain between 8 and 128 characters");
		}
		int updated = jdbcTemplate.update(
				"update app_users set password_hash = ? where user_id = ?",
				BCrypt.hashpw(newPassword, BCrypt.gensalt()),
				targetUserId
		);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found");
		}
		revokeSessions(targetUserId);
		recordAudit(adminUserId, "PASSWORD_RESET", targetUserId, Map.of());
	}

	public AdminDtos.AdminUserRow updateQuota(String adminUserId, String targetUserId, AdminDtos.UpdateQuotaRequest request) {
		validateQuota(request.dailyRequestsLimit(), "daily_requests_limit");
		validateQuota(request.dailyTokensLimit(), "daily_tokens_limit");
		int updated = jdbcTemplate.update(
				"""
				update app_users
				set daily_requests_limit = ?, daily_tokens_limit = ?, quota_disabled = ?
				where user_id = ?
				""",
				request.dailyRequestsLimit(),
				request.dailyTokensLimit(),
				Boolean.TRUE.equals(request.quotaDisabled()),
				targetUserId
		);
		if (updated == 0) {
			throw new IllegalArgumentException("User not found");
		}
		Map<String, Object> metadata = new LinkedHashMap<>();
		metadata.put("dailyRequestsLimit", request.dailyRequestsLimit());
		metadata.put("dailyTokensLimit", request.dailyTokensLimit());
		metadata.put("quotaDisabled", request.quotaDisabled());
		recordAudit(adminUserId, "QUOTA_CHANGE", targetUserId, metadata);
		return requireUser(targetUserId);
	}

	public void resetUsage(String adminUserId, String targetUserId) {
		jdbcTemplate.update("delete from ai_usage where user_id = ? and request_time >= current_date", targetUserId);
		recordAudit(adminUserId, "QUOTA_USAGE_RESET", targetUserId, Map.of("window", "today"));
	}

	public void enforceAiQuota(String userId, int estimatedTokens) {
		UserQuota quota = userQuota(userId);
		if (quota.quotaDisabled()) {
			return;
		}
		Instant todayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("userId", userId)
				.addValue("todayStart", Timestamp.from(todayStart));
		long requestsToday = queryLong(
				"select count(*) from ai_usage where user_id = :userId and request_time >= :todayStart",
				params
		);
		long tokensToday = queryLong(
				"select coalesce(sum(total_tokens), 0) from ai_usage where user_id = :userId and request_time >= :todayStart",
				params
		);
		if (requestsToday >= quota.dailyRequestsLimit()) {
			throw new IllegalStateException("Daily AI request quota exceeded");
		}
		if (tokensToday + Math.max(estimatedTokens, 0) > quota.dailyTokensLimit()) {
			throw new IllegalStateException("Daily AI token quota exceeded");
		}
	}

	public void recordAiUsage(String userId, String provider, String model, int promptTokens, int completionTokens, long latencyMs, boolean success) {
		int safePromptTokens = Math.max(promptTokens, 0);
		int safeCompletionTokens = Math.max(completionTokens, 0);
		int totalTokens = safePromptTokens + safeCompletionTokens;
		jdbcTemplate.update(
				"""
				insert into ai_usage
					(user_id, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success)
				values (?, ?, ?, ?, ?, ?, ?, ?)
				""",
				userId,
				StringUtils.hasText(provider) ? provider.trim().toUpperCase(Locale.ROOT) : "AUTO",
				model,
				safePromptTokens,
				safeCompletionTokens,
				totalTokens,
				Math.max(latencyMs, 0),
				success
		);
	}

	public AdminDtos.PageResponse<AdminDtos.LoginHistoryRow> listLoginHistory(String userId, Instant from, Instant to, int page, int size) {
		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), 100);
		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("limit", safeSize)
				.addValue("offset", safePage * safeSize);
		List<String> filters = new ArrayList<>();
		if (StringUtils.hasText(userId)) {
			filters.add("user_id = :userId");
			params.addValue("userId", userId.trim());
		}
		if (from != null) {
			filters.add("login_time >= :from");
			params.addValue("from", Timestamp.from(from));
		}
		if (to != null) {
			filters.add("login_time <= :to");
			params.addValue("to", Timestamp.from(to));
		}
		String whereClause = filters.isEmpty() ? "" : "where " + String.join(" and ", filters);
		long total = queryLong("select count(*) from login_history " + whereClause, params);
		List<AdminDtos.LoginHistoryRow> items = namedJdbcTemplate.query(
				"select id, user_id, email, ip_address, user_agent, login_time, success, failure_reason from login_history "
						+ whereClause + " order by login_time desc limit :limit offset :offset",
				params,
				(rs, rowNum) -> loginHistoryRow(rs)
		);
		return new AdminDtos.PageResponse<>(items, safePage, safeSize, total, (int) Math.ceil(total / (double) safeSize));
	}

	public AdminDtos.AiUsageSummary aiUsageSummary() {
		Instant todayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
		Instant monthStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC);
		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("todayStart", Timestamp.from(todayStart))
				.addValue("monthStart", Timestamp.from(monthStart));
		return new AdminDtos.AiUsageSummary(
				queryLong("select count(*) from ai_usage where request_time >= :todayStart", params),
				queryLong("select count(*) from ai_usage where request_time >= :monthStart", params),
				queryLong("select coalesce(sum(total_tokens), 0) from ai_usage where request_time >= :todayStart", params),
				queryLong("select coalesce(sum(total_tokens), 0) from ai_usage where request_time >= :monthStart", params),
				usageByUser("where a.request_time >= :monthStart", params, 20),
				usageByProvider("where request_time >= :monthStart", params),
				usageByUser("where a.request_time >= :monthStart", params, 10)
		);
	}

	public AdminDtos.PageResponse<AdminDtos.AdminAuditLogRow> listAdminAuditLogs(String targetUserId, int page, int size) {
		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), 100);
		MapSqlParameterSource params = new MapSqlParameterSource()
				.addValue("limit", safeSize)
				.addValue("offset", safePage * safeSize);
		String whereClause = "";
		if (StringUtils.hasText(targetUserId)) {
			whereClause = "where a.target_user_id = :targetUserId";
			params.addValue("targetUserId", targetUserId.trim());
		}
		long total = queryLong("select count(*) from audit_log a " + whereClause, params);
		List<AdminDtos.AdminAuditLogRow> items = namedJdbcTemplate.query(
				"""
				select a.id, a.admin_user_id, admin.email as admin_email, a.action,
				       a.target_user_id, target.email as target_email, a.metadata::text as metadata,
				       a.timestamp
				from audit_log a
				left join app_users admin on admin.user_id = a.admin_user_id
				left join app_users target on target.user_id = a.target_user_id
				""" + whereClause + """
				order by a.timestamp desc
				limit :limit offset :offset
				""",
				params,
				(rs, rowNum) -> auditLogRow(rs)
		);
		return new AdminDtos.PageResponse<>(items, safePage, safeSize, total, (int) Math.ceil(total / (double) safeSize));
	}

	private AdminDtos.AdminUserRow requireUser(String userId) {
		List<AdminDtos.AdminUserRow> users = jdbcTemplate.query(
				"""
				select u.user_id, u.avatar_url, u.username, u.email, u.role, u.status,
				       u.email_verified, u.created_at, u.daily_requests_limit,
				       u.daily_tokens_limit, u.quota_disabled,
				       coalesce(count(d.document_id), 0) as document_count,
				       max(l.login_time) filter (where l.success = true) as last_login
				from app_users u
				left join indexed_documents d on d.user_id = u.user_id
				left join login_history l on l.user_id = u.user_id
				where u.user_id = ?
				group by u.user_id, u.avatar_url, u.username, u.email, u.role, u.status,
				         u.email_verified, u.created_at, u.daily_requests_limit,
				         u.daily_tokens_limit, u.quota_disabled
				""",
				(rs, rowNum) -> userRow(rs),
				userId
		);
		if (users.isEmpty()) {
			throw new IllegalArgumentException("User not found");
		}
		return users.getFirst();
	}

	private String userWhereClause(String search, String role, String status, MapSqlParameterSource params) {
		List<String> filters = new ArrayList<>();
		if (StringUtils.hasText(search)) {
			filters.add("(lower(u.email) like :search or lower(coalesce(u.username, '')) like :search)");
			params.addValue("search", "%" + search.trim().toLowerCase(Locale.ROOT) + "%");
		}
		if (StringUtils.hasText(role) && !"ALL".equalsIgnoreCase(role)) {
			filters.add("u.role = :role");
			params.addValue("role", UserRole.from(role).name());
		}
		if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
			filters.add("u.status = :status");
			params.addValue("status", UserStatus.from(status).name());
		}
		return filters.isEmpty() ? "" : "where " + String.join(" and ", filters) + " ";
	}

	private List<AdminDtos.AiUsageByUser> usageByUser(String whereClause, MapSqlParameterSource params, int limit) {
		MapSqlParameterSource localParams = copyParams(params).addValue("limit", limit);
		return namedJdbcTemplate.query(
				"""
				select a.user_id, u.email, u.username, count(*) as requests, coalesce(sum(a.total_tokens), 0) as tokens
				from ai_usage a
				left join app_users u on u.user_id = a.user_id
				""" + whereClause + """
				group by a.user_id, u.email, u.username
				order by tokens desc, requests desc
				limit :limit
				""",
				localParams,
				(rs, rowNum) -> new AdminDtos.AiUsageByUser(
						rs.getString("user_id"),
						rs.getString("email"),
						rs.getString("username"),
						rs.getLong("requests"),
						rs.getLong("tokens")
				)
		);
	}

	private List<AdminDtos.AiUsageByProvider> usageByProvider(String whereClause, MapSqlParameterSource params) {
		return namedJdbcTemplate.query(
				"""
				select provider, count(*) as requests, coalesce(sum(total_tokens), 0) as tokens
				from ai_usage
				""" + whereClause + """
				group by provider
				order by requests desc
				""",
				params,
				(rs, rowNum) -> new AdminDtos.AiUsageByProvider(
						rs.getString("provider"),
						rs.getLong("requests"),
						rs.getLong("tokens")
				)
		);
	}

	private UserQuota userQuota(String userId) {
		List<UserQuota> quotas = jdbcTemplate.query(
				"""
				select coalesce(daily_requests_limit, ?) as daily_requests_limit,
				       coalesce(daily_tokens_limit, ?) as daily_tokens_limit,
				       quota_disabled
				from app_users
				where user_id = ?
				""",
				(rs, rowNum) -> new UserQuota(
						rs.getInt("daily_requests_limit"),
						rs.getInt("daily_tokens_limit"),
						rs.getBoolean("quota_disabled")
				),
				DEFAULT_DAILY_REQUESTS_LIMIT,
				DEFAULT_DAILY_TOKENS_LIMIT,
				userId
		);
		if (quotas.isEmpty()) {
			throw new IllegalArgumentException("User not found");
		}
		return quotas.getFirst();
	}

	private void revokeSessions(String userId) {
		jdbcTemplate.update("update auth_sessions set revoked = true, updated_at = now() where user_id = ? and revoked = false", userId);
	}

	private void recordAudit(String adminUserId, String action, String targetUserId, Map<String, Object> metadata) {
		jdbcTemplate.update(
				"insert into audit_log (admin_user_id, action, target_user_id, metadata) values (?, ?, ?, ?::jsonb)",
				adminUserId,
				action,
				targetUserId,
				toJson(metadata)
		);
	}

	private AdminDtos.AdminUserRow userRow(ResultSet rs) throws SQLException {
		return new AdminDtos.AdminUserRow(
				rs.getString("user_id"),
				rs.getString("avatar_url"),
				rs.getString("username"),
				rs.getString("email"),
				rs.getString("role"),
				rs.getString("status"),
				rs.getBoolean("email_verified"),
				toInstant(rs.getTimestamp("created_at")),
				toInstant(rs.getTimestamp("last_login")),
				rs.getLong("document_count"),
				(Integer) rs.getObject("daily_requests_limit"),
				(Integer) rs.getObject("daily_tokens_limit"),
				rs.getBoolean("quota_disabled")
		);
	}

	private AdminDtos.LoginHistoryRow loginHistoryRow(ResultSet rs) throws SQLException {
		return new AdminDtos.LoginHistoryRow(
				rs.getLong("id"),
				rs.getString("user_id"),
				rs.getString("email"),
				rs.getString("ip_address"),
				rs.getString("user_agent"),
				toInstant(rs.getTimestamp("login_time")),
				rs.getBoolean("success"),
				rs.getString("failure_reason")
		);
	}

	private AdminDtos.AdminAuditLogRow auditLogRow(ResultSet rs) throws SQLException {
		return new AdminDtos.AdminAuditLogRow(
				rs.getLong("id"),
				rs.getString("admin_user_id"),
				rs.getString("admin_email"),
				rs.getString("action"),
				rs.getString("target_user_id"),
				rs.getString("target_email"),
				fromJson(rs.getString("metadata")),
				toInstant(rs.getTimestamp("timestamp"))
		);
	}

	private long queryLong(String sql, MapSqlParameterSource params) {
		Long value = namedJdbcTemplate.queryForObject(sql, params, Long.class);
		return value == null ? 0L : value;
	}

	private MapSqlParameterSource copyParams(MapSqlParameterSource params) {
		MapSqlParameterSource copy = new MapSqlParameterSource();
		for (String name : params.getValues().keySet()) {
			copy.addValue(name, params.getValue(name));
		}
		return copy;
	}

	private void validateQuota(Integer value, String field) {
		if (value != null && value < 0) {
			throw new IllegalArgumentException(field + " must be zero or greater");
		}
	}

	private String toJson(Map<String, Object> metadata) {
		try {
			return objectMapper.writeValueAsString(metadata == null ? Map.of() : metadata);
		} catch (Exception ex) {
			return "{}";
		}
	}

	private Map<String, Object> fromJson(String value) {
		if (!StringUtils.hasText(value)) {
			return Map.of();
		}
		try {
			return objectMapper.readValue(value, MAP_TYPE);
		} catch (Exception ex) {
			return new LinkedHashMap<>();
		}
	}

	private Instant toInstant(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant();
	}

	private record UserQuota(int dailyRequestsLimit, int dailyTokensLimit, boolean quotaDisabled) {
	}
}
