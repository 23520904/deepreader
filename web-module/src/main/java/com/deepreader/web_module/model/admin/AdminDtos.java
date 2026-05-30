package com.deepreader.web_module.model.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class AdminDtos {
	private AdminDtos() {
	}

	public record PageResponse<T>(
			List<T> items,
			int page,
			int size,
			long total,
			int totalPages
	) {
	}

	public record AdminUserRow(
			String userId,
			String avatarUrl,
			String username,
			String email,
			String role,
			String status,
			boolean emailVerified,
			Instant createdAt,
			Instant lastLogin,
			long documentCount,
			Integer dailyRequestsLimit,
			Integer dailyTokensLimit,
			boolean quotaDisabled
	) {
	}

	public record AdminUserDetail(
			AdminUserRow user,
			List<LoginHistoryRow> loginHistory,
			List<AiUsageByProvider> usageByProvider
	) {
	}

	public record LoginHistoryRow(
			Long id,
			String userId,
			String email,
			String ipAddress,
			String userAgent,
			Instant loginTime,
			boolean success,
			String failureReason
	) {
	}

	public record AiUsageSummary(
			long requestsToday,
			long requestsThisMonth,
			long tokensToday,
			long tokensThisMonth,
			List<AiUsageByUser> usageByUser,
			List<AiUsageByProvider> usageByProvider,
			List<AiUsageByUser> topUsers
	) {
	}

	public record AiUsageByUser(
			String userId,
			String email,
			String username,
			long requests,
			long tokens
	) {
	}

	public record AiUsageByProvider(
			String provider,
			long requests,
			long tokens
	) {
	}

	public record AdminAuditLogRow(
			Long id,
			String adminUserId,
			String adminEmail,
			String action,
			String targetUserId,
			String targetEmail,
			Map<String, Object> metadata,
			Instant timestamp
	) {
	}

	public record ChangeRoleRequest(@NotBlank String role) {
	}

	public record ChangeStatusRequest(@NotBlank String status) {
	}

	public record AdminResetPasswordRequest(
			@NotBlank
			@Size(min = 8, max = 128)
			String newPassword
	) {
	}

	public record UpdateQuotaRequest(
			Integer dailyRequestsLimit,
			Integer dailyTokensLimit,
			@NotNull Boolean quotaDisabled
	) {
	}

	public record AiUsageRecordRequest(
			@NotBlank String provider,
			String model,
			@Min(0) int promptTokens,
			@Min(0) int completionTokens,
			@Min(0) int totalTokens,
			@Min(0) long latencyMs,
			boolean success
	) {
	}
}
