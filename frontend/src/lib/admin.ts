import {
  fetchAdminAuditLogs,
  fetchAdminDocuments,
  fetchAdminSummary,
  fetchAdminUsers,
  type AdminAuditLog,
  type AdminDocumentRow,
  type AdminSummary,
  type AdminUserRow,
} from "@/services/adminService";
import type {
  AdminBundle,
  AdminChartRow,
  AdminSection,
  TimelineRange,
} from "@/types/admin";

/**
 * Safe fallback summary used before real admin data is loaded.
 */
export const emptyAdminSummary: AdminSummary = {
  users: 0,
  admins: 0,
  indexedDocuments: 0,
  activeSessions: 0,
  studyProgressRows: 0,
  dueCards: 0,
  auditEventsToday: 0,
  deadLettersToday: 0,
};

/**
 * Single source of truth for admin navigation.
 *
 * Desktop sidebar, mobile select, and mobile horizontal pills all read from
 * this list so labels and icons stay consistent.
 */
export const adminNavItems: Array<{
  id: AdminSection;
  label: string;
  shortLabel: string;
  description: string;
  iconSrc: string;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    description: "Overview",
    iconSrc: "/assets/icons/admin/dashboard-icon.png",
  },
  {
    id: "accounts",
    label: "Account management",
    shortLabel: "Accounts",
    description: "Users and roles",
    iconSrc: "/assets/icons/admin/account-management-icon.png",
  },
  {
    id: "documents",
    label: "Document management",
    shortLabel: "Documents",
    description: "Uploaded files",
    iconSrc: "/assets/icons/admin/document-management-icon.png",
  },
  {
    id: "activity",
    label: "Activity logs",
    shortLabel: "Activity",
    description: "Audit events",
    iconSrc: "/assets/icons/admin/log-icon.png",
  },
];

/**
 * Load all admin dashboard data in parallel.
 *
 * Promise.allSettled is used instead of Promise.all so one failed endpoint does
 * not prevent the page from rendering successful sections.
 */
export async function fetchAdminBundle(token: string): Promise<AdminBundle> {
  const [summaryResult, usersResult, documentsResult, auditLogsResult] =
    await Promise.allSettled([
      fetchAdminSummary(token),
      fetchAdminUsers(token),
      fetchAdminDocuments(token),
      fetchAdminAuditLogs(token),
    ]);

  const errors = [
    resultError(summaryResult, "summary"),
    resultError(usersResult, "users"),
    resultError(documentsResult, "documents"),
    resultError(auditLogsResult, "activity logs"),
  ].filter(Boolean);

  return {
    summary: resultValue(summaryResult),
    users: resultValue(usersResult),
    documents: resultValue(documentsResult),
    auditLogs: resultValue(auditLogsResult),
    errorMessage: errors.length
      ? `Some admin data could not be loaded: ${errors.join("; ")}`
      : "",
  };
}

/**
 * Extract a fulfilled promise value while keeping failed values undefined.
 */
function resultValue<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : undefined;
}

/**
 * Convert a rejected promise into a readable section-level error.
 */
function resultError<T>(result: PromiseSettledResult<T>, label: string) {
  if (result.status === "fulfilled") {
    return "";
  }

  const message =
    result.reason instanceof Error ? result.reason.message : "Unknown error";

  return `${label}: ${message}`;
}

/**
 * Apply loaded admin data to React state.
 *
 * Each section is only updated when its data is present. This preserves the
 * previous UI state when a refresh partially fails.
 */
export function applyAdminBundle(
  bundle: AdminBundle,
  setters: {
    setSummary: (value: AdminSummary) => void;
    setUsers: (value: AdminUserRow[]) => void;
    setDocuments: (value: AdminDocumentRow[]) => void;
    setAuditLogs: (value: AdminAuditLog[]) => void;
    setErrorMessage: (value: string) => void;
  },
) {
  if (bundle.summary) {
    setters.setSummary(bundle.summary);
  }

  if (bundle.users) {
    setters.setUsers(bundle.users);
  }

  if (bundle.documents) {
    setters.setDocuments(bundle.documents);
  }

  if (bundle.auditLogs) {
    setters.setAuditLogs(bundle.auditLogs);
  }

  setters.setErrorMessage(bundle.errorMessage);
}

/**
 * Format admin timestamps for compact UI display.
 */
export function formatAdminDate(value: string | null | undefined) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Build top document owners for the dashboard ownership chart.
 */
export function buildDocumentOwnerRows(
  documents: AdminDocumentRow[],
): AdminChartRow[] {
  const colors = ["#2563eb", "#10b981", "#7c3aed", "#f59e0b", "#ef4444"];
  const counts = new Map<string, number>();

  documents.forEach((document) => {
    const owner = document.username || document.email || "Unknown";
    counts.set(owner, (counts.get(owner) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      value,
      color: colors[index % colors.length],
    }));
}

/**
 * Build recent activity distribution rows from audit logs.
 */
export function buildActivityMix(logs: AdminAuditLog[]): AdminChartRow[] {
  const colors = ["#2563eb", "#10b981", "#7c3aed", "#f59e0b", "#ef4444"];
  const counts = new Map<string, number>();

  logs.forEach((log) => {
    const action = log.action
      .toLowerCase()
      .replace(/^admin_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    counts.set(action, (counts.get(action) || 0) + 1);
  });

  const rows = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      value,
      color: colors[index % colors.length],
    }));

  return rows.length
    ? rows
    : [{ label: "No activity", value: 0, color: "#e2e8f0" }];
}

/**
 * Build document index counts for the selected timeline range.
 */
export function buildDocumentTrend(
  documents: AdminDocumentRow[],
  range: TimelineRange,
) {
  const buckets = createTimelineBuckets(range);

  return buckets.map((bucket) => {
    const value = documents.filter((document) => {
      const createdAt = new Date(document.created_at);
      return createdAt >= bucket.start && createdAt < bucket.end;
    }).length;

    return {
      label: bucket.label,
      value,
    };
  });
}

/**
 * Create fixed time buckets used by the line chart.
 */
function createTimelineBuckets(range: TimelineRange) {
  if (range === "week") {
    return Array.from({ length: 6 }, (_, index) => {
      const start = startOfWeek(new Date());
      start.setDate(start.getDate() - (5 - index) * 7);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      return {
        start,
        end,
        label: `${start.getMonth() + 1}/${start.getDate()}`,
      };
    });
  }

  if (range === "month") {
    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date();
      start.setMonth(start.getMonth() - (11 - index), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setMonth(start.getMonth() + 1, 1);

      return {
        start,
        end,
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(start),
      };
    });
  }

  if (range === "year") {
    return Array.from({ length: 5 }, (_, index) => {
      const start = new Date();
      start.setFullYear(start.getFullYear() - (4 - index), 0, 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setFullYear(start.getFullYear() + 1, 0, 1);

      return {
        start,
        end,
        label: String(start.getFullYear()),
      };
    });
  }

  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date();
    start.setDate(start.getDate() - (6 - index));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return {
      start,
      end,
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(start),
    };
  });
}

/**
 * Align any date to Monday 00:00 of its current week.
 */
function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);

  date.setDate(diff);
  date.setHours(0, 0, 0, 0);

  return date;
}