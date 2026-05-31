import type {
  AdminAuditLog,
  AdminDocumentRow,
  AdminSummary,
  AdminUserRow,
} from "@/services/adminService";

/**
 * Available admin workspace sections.
 *
 * These values are shared by desktop sidebar navigation, mobile navigation,
 * and the main content switcher.
 */
export type AdminSection = "dashboard" | "accounts" | "documents" | "activity";

/**
 * Supported timeline aggregation ranges for the dashboard document chart.
 */
export type TimelineRange = "day" | "week" | "month" | "year";

/**
 * Delete confirmation dialog state.
 *
 * The dialog can target either a user or a document, or be closed with null.
 */
export type DeleteDialog =
  | { kind: "user"; user: AdminUserRow }
  | { kind: "document"; document: AdminDocumentRow }
  | null;

/**
 * Toast notification state used for success and error feedback.
 */
export type Notice = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

/**
 * Combined admin API payload.
 *
 * Each field is optional so the page can still show partial data when one
 * backend request fails.
 */
export type AdminBundle = {
  summary?: AdminSummary;
  users?: AdminUserRow[];
  documents?: AdminDocumentRow[];
  auditLogs?: AdminAuditLog[];
  errorMessage: string;
};

/**
 * Generic chart row used by column, bar, and donut charts.
 */
export type AdminChartRow = {
  label: string;
  value: number;
  color: string;
};

/**
 * Visual tones for admin metric cards.
 */
export type AdminMetricTone = "blue" | "green" | "violet" | "amber" | "rose";