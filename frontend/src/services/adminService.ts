import { apiRequestJson } from "@/services/apiClient";

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

export type AdminUserRow = {
  user_id: string;
  email: string;
  username?: string | null;
  role: string;
  created_at: string;
  document_count: number;
};

export type AdminDocumentRow = {
  document_id: string;
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

export function fetchAdminSummary(token: string) {
  return apiRequestJson<AdminSummary>("/api/v1/admin/summary", {
    token,
    fallbackError: "Could not load admin dashboard.",
  });
}

export function fetchAdminUsers(token: string) {
  return apiRequestJson<AdminUserRow[]>("/api/v1/admin/users?limit=80", {
    token,
    fallbackError: "Could not load users.",
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
