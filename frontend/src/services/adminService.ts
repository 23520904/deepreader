import { apiRequestJson } from "@/services/apiClient";

/**
 * Summary statistics displayed on the admin dashboard.
 */
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

/**
 * User information shown in the admin user table.
 */
export type AdminUserRow = {
  user_id: string;
  email: string;
  username?: string | null;
  role: string;
  created_at: string;
  document_count: number;
};

/**
 * Document information shown in the admin document table.
 */
export type AdminDocumentRow = {
  document_id: string;
  user_id: string;
  file_name: string;
  created_at: string;
  email?: string | null;
  username?: string | null;
};

/**
 * Audit log record returned from the admin API.
 * Used to track important actions performed in the system.
 */
export type AdminAuditLog = {
  user_id?: string | null;
  action: string;
  details?: string | null;
  created_at: string;
};

/**
 * Load dashboard summary statistics.
 */
export function fetchAdminSummary(token: string) {
  return apiRequestJson<AdminSummary>("/api/v1/admin/summary", {
    token,
    fallbackError: "Could not load admin dashboard.",
  });
}

/**
 * Load a list of users for the admin management page.
 */
export function fetchAdminUsers(token: string) {
  return apiRequestJson<AdminUserRow[]>("/api/v1/admin/users?limit=80", {
    token,
    fallbackError: "Could not load users.",
  });
}

/**
 * Load recently uploaded documents for admin management.
 */
export function fetchAdminDocuments(token: string) {
  return apiRequestJson<AdminDocumentRow[]>("/api/v1/admin/documents?limit=80", {
    token,
    fallbackError: "Could not load documents.",
  });
}

/**
 * Load recent audit log entries.
 */
export function fetchAdminAuditLogs(token: string) {
  return apiRequestJson<AdminAuditLog[]>("/api/v1/admin/audit-logs?limit=20", {
    token,
    fallbackError: "Could not load audit logs.",
  });
}

/**
 * Delete a user account by user ID.
 */
export function deleteAdminUser(userId: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/users/${userId}`, {
    method: "DELETE",
    token,
    fallbackError: "Could not delete this user.",
  });
}

/**
 * Delete a document by document ID.
 */
export function deleteAdminDocument(documentId: string, token: string) {
  return apiRequestJson<void>(`/api/v1/admin/documents/${documentId}`, {
    method: "DELETE",
    token,
    fallbackError: "Could not delete this document.",
  });
}