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
    { label: "Users", value: summary.users, color: "#334155" },
    { label: "Documents", value: summary.indexedDocuments, color: "#0f766e" },
    { label: "Sessions", value: summary.activeSessions, color: "#4f46e5" },
    { label: "Logs today", value: summary.auditEventsToday, color: "#b45309" },
  ];

  const roleRows = [
    { label: "Admins", value: summary.admins, color: "#334155" },
    {
      label: "Users",
      value: Math.max(0, summary.users - summary.admins),
      color: "#94a3b8",
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
    { label: "Sessions", value: summary.activeSessions, color: "#334155" },
    { label: "Audit today", value: summary.auditEventsToday, color: "#0f766e" },
    { label: "Dead letters", value: summary.deadLettersToday, color: "#e11d48" },
  ];

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Document ownership"
          description="Indexed files by owner"
        >
          <HorizontalBarChart
            rows={ownerRows}
            emptyText="No documents to chart."
          />
        </AdminPanel>

        <AdminPanel
          title="Activity mix"
          description="Recent audit events by action"
        >
          <DonutChart
            rows={activityMixRows}
            centerLabel={`${auditLogs.length}`}
            centerText="Events"
          />
        </AdminPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminPanel title="Document timeline" description={timelineDescription}>
          <div className="mb-5 flex flex-wrap gap-2">
            {(["day", "week", "month", "year"] as const).map((range) => {
              const isActive = timelineRange === range;

              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimelineRange(range)}
                  className={[
                    "h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold capitalize transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  ].join(" ")}
                >
                  {range}
                </button>
              );
            })}
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
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-slate-950">
                  {log.action}
                </p>

                <p className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  {formatAdminDate(log.created_at)}
                </p>
              </div>

              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
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