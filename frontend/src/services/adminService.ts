import { apiRequestJson } from "@/services/apiClient";

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type AdminSummary = {
  users: number;
  admins: number;
  indexedDocuments: number;
  activeSessions: number;
  studyProgressRows: number;
  dueCards: number;
  auditEventsToday: number;
  deadLettersToday: number;
};

export type AdminUser = {
  userId: string;
  avatarUrl?: string | null;
  username?: string | null;
  email: string;
  role: "USER" | "ADMIN" | string;
  status: "ACTIVE" | "BANNED" | string;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string | null;
  documentCount: number;
  dailyRequestsLimit?: number | null;
  dailyTokensLimit?: number | null;
  quotaDisabled: boolean;
};

export type AdminUserRow = {
  user_id: string;
  email: string;
  username?: string | null;
  role: string;
  status?: string;
  email_verified?: boolean;
  created_at: string;
  last_login?: string | null;
  avatar_url?: string | null;
  document_count: number;
};

export type AdminDocumentRow = {
  document_id: string;
  user_id: string;
  file_name: string;
  created_at: string;
  email?: string | null;
  username?: string | null;
};

export type AdminAuditLog = {
  user_id?: string | null;
  action: string;
  details?: string | null;
  created_at: string;
};

export type LoginHistoryRow = {
  id: number;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  loginTime: string;
  success: boolean;
  failureReason?: string | null;
};

export type AiUsageByUser = {
  userId: string;
  email?: string | null;
  username?: string | null;
  requests: number;
  tokens: number;
};

export type AiUsageByProvider = {
  provider: string;
  requests: number;
  tokens: number;
};

export type AiUsageSummary = {
  requestsToday: number;
  requestsThisMonth: number;
  tokensToday: number;
  tokensThisMonth: number;
  usageByUser: AiUsageByUser[];
  usageByProvider: AiUsageByProvider[];
  topUsers: AiUsageByUser[];
};

export type StructuredAuditLog = {
  id: number;
  adminUserId?: string | null;
  adminEmail?: string | null;
  action: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
};

export type AdminUserDetail = {
  user: AdminUser;
  loginHistory: LoginHistoryRow[];
  usageByProvider: AiUsageByProvider[];
};

export type UserQuery = {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: "asc" | "desc";
};

export function fetchAdminSummary(token: string) {
  return apiRequestJson<AdminSummary>("/api/v1/admin/summary", {
    token,
    fallbackError: "Could not load admin dashboard.",
  });
}

export async function fetchAdminUsers(token: string) {
  const page = await fetchAdminUsersPage(token, { size: 80 });
  return page.items.map(toLegacyUserRow);
}

export function fetchAdminUsersPage(token: string, query: UserQuery = {}) {
  return apiRequestJson<PageResponse<AdminUser>>(`/api/v1/admin/users${queryString(query)}`, {
    token,
    fallbackError: "Could not load users.",
  });
}

export function fetchAdminUserDetail(userId: string, token: string) {
  return apiRequestJson<AdminUserDetail>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
    token,
    fallbackError: "Could not load user details.",
  });
}

export function updateAdminUserStatus(userId: string, status: "ACTIVE" | "BANNED", token: string) {
  return apiRequestJson<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PUT",
    token,
    body: JSON.stringify({ status }),
    fallbackError: "Could not update user status.",
  });
}

export function updateAdminUserRole(userId: string, role: "USER" | "ADMIN", token: string) {
  return apiRequestJson<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PUT",
    token,
    body: JSON.stringify({ role }),
    fallbackError: "Could not update user role.",
  });
}

export function forceLogoutAdminUser(userId: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/users/${encodeURIComponent(userId)}/force-logout`, {
    method: "POST",
    token,
    fallbackError: "Could not force logout this user.",
  });
}

export function resetAdminUserPassword(userId: string, newPassword: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "POST",
    token,
    body: JSON.stringify({ newPassword }),
    fallbackError: "Could not reset password.",
  });
}

export function updateAdminUserQuota(
  userId: string,
  payload: { dailyRequestsLimit: number | null; dailyTokensLimit: number | null; quotaDisabled: boolean },
  token: string,
) {
  return apiRequestJson<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/quota`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
    fallbackError: "Could not update quota.",
  });
}

export function resetAdminUserUsage(userId: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/users/${encodeURIComponent(userId)}/quota/reset`, {
    method: "POST",
    token,
    fallbackError: "Could not reset usage.",
  });
}

export function fetchAdminLoginHistory(
  token: string,
  query: { userId?: string; page?: number; size?: number } = {},
) {
  return apiRequestJson<PageResponse<LoginHistoryRow>>(`/api/v1/admin/login-history${queryString(query)}`, {
    token,
    fallbackError: "Could not load login history.",
  });
}

export function fetchAdminAiUsage(token: string) {
  return apiRequestJson<AiUsageSummary>("/api/v1/admin/ai-usage", {
    token,
    fallbackError: "Could not load AI usage.",
  });
}

export function fetchStructuredAdminAuditLogs(
  token: string,
  query: { targetUserId?: string; page?: number; size?: number } = {},
) {
  return apiRequestJson<PageResponse<StructuredAuditLog>>(`/api/v1/admin/audit-log${queryString(query)}`, {
    token,
    fallbackError: "Could not load admin audit logs.",
  });
}

export function fetchAdminDocuments(token: string) {
  return apiRequestJson<AdminDocumentRow[]>("/api/v1/admin/documents?limit=80", {
    token,
    fallbackError: "Could not load documents.",
  });
}

export function fetchAdminAuditLogs(token: string) {
  return apiRequestJson<AdminAuditLog[]>("/api/v1/admin/audit-logs?limit=20", {
    token,
    fallbackError: "Could not load audit logs.",
  });
}

export function deleteAdminUser(userId: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/users/${userId}`, {
    method: "DELETE",
    token,
    fallbackError: "Could not delete this user.",
  });
}

export function deleteAdminDocument(documentId: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/documents/${documentId}`, {
    method: "DELETE",
    token,
    fallbackError: "Could not delete this document.",
  });
}

function queryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toLegacyUserRow(user: AdminUser): AdminUserRow {
  return {
    user_id: user.userId,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    email_verified: user.emailVerified,
    created_at: user.createdAt,
    last_login: user.lastLogin,
    avatar_url: user.avatarUrl,
    document_count: user.documentCount,
  };
}
