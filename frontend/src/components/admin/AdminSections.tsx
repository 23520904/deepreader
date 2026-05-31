"use client";

import { useState } from "react";
import {
  buildActivityMix,
  buildDocumentOwnerRows,
  buildDocumentTrend,
  formatAdminDate,
} from "@/lib/admin";
import type {
  AdminAuditLog,
  AdminDocumentRow,
  AdminSummary,
  AdminUserRow,
} from "@/services/adminService";
import type { TimelineRange } from "@/types/admin";
import {
  ColumnChart,
  DonutChart,
  HorizontalBarChart,
  LineChart,
} from "./AdminCharts";
import { CompactDocumentList, CompactUserList } from "./AdminLists";
import {
  AdminMetric,
  AdminPanel,
  AdminSkeleton,
  EmptyAdminState,
} from "./AdminShared";

/**
 * Dashboard section with summary metrics and visual charts.
 */
export function DashboardSection({
  summary,
  documents,
  auditLogs,
}: {
  summary: AdminSummary;
  documents: AdminDocumentRow[];
  auditLogs: AdminAuditLog[];
}) {
  const [timelineRange, setTimelineRange] = useState<TimelineRange>("day");

  const volumeRows = [
    { label: "Users", value: summary.users, color: "#2563eb" },
    { label: "Documents", value: summary.indexedDocuments, color: "#10b981" },
    { label: "Sessions", value: summary.activeSessions, color: "#7c3aed" },
    { label: "Logs today", value: summary.auditEventsToday, color: "#f59e0b" },
  ];

  const roleRows = [
    { label: "Admins", value: summary.admins, color: "#2563eb" },
    {
      label: "Users",
      value: Math.max(0, summary.users - summary.admins),
      color: "#10b981",
    },
  ];

  const ownerRows = buildDocumentOwnerRows(documents);
  const activityMixRows = buildActivityMix(auditLogs);
  const documentRows = buildDocumentTrend(documents, timelineRange);

  const timelineDescription = {
    day: "Documents indexed in the last 7 days",
    week: "Documents indexed in the last 6 weeks",
    month: "Documents indexed in the last 12 months",
    year: "Documents indexed in the last 5 years",
  }[timelineRange];

  const operationRows = [
    { label: "Sessions", value: summary.activeSessions, color: "#2563eb" },
    { label: "Audit today", value: summary.auditEventsToday, color: "#10b981" },
    { label: "Dead letters", value: summary.deadLettersToday, color: "#ef4444" },
  ];

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <AdminMetric label="Users" value={summary.users} tone="blue" />
        <AdminMetric
          label="Documents"
          value={summary.indexedDocuments}
          tone="green"
        />
        <AdminMetric
          label="Active sessions"
          value={summary.activeSessions}
          tone="violet"
        />
        <AdminMetric
          label="Audit today"
          value={summary.auditEventsToday}
          tone="amber"
        />
      </section>

      <section className="grid gap-5 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel
          title="System volume"
          description="Users, documents, sessions, and activity"
        >
          <ColumnChart rows={volumeRows} />
        </AdminPanel>

        <AdminPanel
          title="Role distribution"
          description="Admin and learner ratio"
        >
          <DonutChart
            rows={roleRows}
            centerLabel={`${summary.admins}`}
            centerText="Admins"
          />
        </AdminPanel>
      </section>

      <section className="grid gap-5 sm:gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Document ownership"
          description="Indexed files by owner"
        >
          <HorizontalBarChart
            rows={ownerRows}
            emptyText="No documents to chart."
          />
        </AdminPanel>

        <AdminPanel title="Activity mix" description="Recent audit events by action">
          <DonutChart
            rows={activityMixRows}
            centerLabel={`${auditLogs.length}`}
            centerText="Events"
          />
        </AdminPanel>
      </section>

      <section className="grid gap-5 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel title="Document timeline" description={timelineDescription}>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["day", "week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimelineRange(range)}
                className={`h-9 cursor-pointer rounded-full px-4 text-[12px] font-black capitalize transition ${
                  timelineRange === range
                    ? "bg-[#2563eb] text-white shadow-[0_10px_22px_rgba(37,99,235,0.2)]"
                    : "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#bfdbfe] hover:bg-[#dbeafe]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <LineChart
            rows={documentRows}
            xLabel={timelineRange}
            yLabel="Documents indexed"
          />
        </AdminPanel>

        <AdminPanel
          title="Operations status"
          description="Live sessions, audit volume, and failed jobs"
        >
          <ColumnChart rows={operationRows} />
        </AdminPanel>
      </section>
    </div>
  );
}

/**
 * Account management section.
 */
export function AccountsSection({
  users,
  isLoading,
  currentUserId,
  deletingUserId,
  onDeleteUser,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
  currentUserId: string;
  deletingUserId: string;
  onDeleteUser: (user: AdminUserRow) => void;
}) {
  return (
    <AdminPanel title="Account management" description="Manage users and roles">
      <CompactUserList
        users={users}
        isLoading={isLoading}
        expanded
        currentUserId={currentUserId}
        deletingUserId={deletingUserId}
        onDeleteUser={onDeleteUser}
      />
    </AdminPanel>
  );
}

/**
 * Document management section.
 */
export function DocumentsSection({
  documents,
  isLoading,
  deletingDocumentId,
  onDeleteDocument,
}: {
  documents: AdminDocumentRow[];
  isLoading: boolean;
  deletingDocumentId: string;
  onDeleteDocument: (document: AdminDocumentRow) => void;
}) {
  return (
    <AdminPanel
      title="Document management"
      description="Track documents indexed by the system"
    >
      <CompactDocumentList
        documents={documents}
        isLoading={isLoading}
        expanded
        deletingDocumentId={deletingDocumentId}
        onDeleteDocument={onDeleteDocument}
      />
    </AdminPanel>
  );
}

/**
 * Activity log section.
 */
export function ActivitySection({
  logs,
  isLoading,
}: {
  logs: AdminAuditLog[];
  isLoading: boolean;
}) {
  return (
    <AdminPanel title="Activity logs" description="Recent security and usage events">
      {isLoading && !logs.length ? (
        <AdminSkeleton />
      ) : logs.length ? (
        <div className="grid gap-3">
          {logs.map((log, index) => (
            <div
              key={`${log.created_at}-${index}`}
              className="rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-[14px] font-black text-[#0f172a]">
                  {log.action}
                </p>
                <p className="text-[12px] font-bold text-[#64748b]">
                  {formatAdminDate(log.created_at)}
                </p>
              </div>

              <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-[#64748b]">
                {log.details || "No details"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyAdminState text="No audit logs found." />
      )}
    </AdminPanel>
  );
}