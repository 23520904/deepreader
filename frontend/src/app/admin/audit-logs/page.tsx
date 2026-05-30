"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Activity, Filter, RefreshCcw, Search } from "lucide-react";
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminManagementShell,
  AdminMetricCard,
  AdminNotice,
  AdminPageHero,
  AdminSkeletonBlock,
} from "@/components/admin/AdminManagementShell";
import {
  fetchStructuredAdminAuditLogs,
  type PageResponse,
  type StructuredAuditLog,
} from "@/services/adminService";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";

const emptyPage: PageResponse<StructuredAuditLog> = {
  items: [],
  page: 0,
  size: 25,
  total: 0,
  totalPages: 0,
};

export default function AdminAuditLogsPage() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const [logs, setLogs] = useState(emptyPage);
  const [targetUserId, setTargetUserId] = useState("");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadLogs() {
    if (!session?.token) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setLogs(await fetchStructuredAdminAuditLogs(session.token, { targetUserId, page, size: 25 }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load audit logs.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, page]);

  const actionCount = useMemo(() => new Set(logs.items.map((log) => log.action)).size, [logs.items]);

  return (
    <AdminManagementShell>
      <div className="grid gap-5">
        <AdminPageHero
          eyebrow="Governance"
          title="Audit Logs"
          description="Trace admin actions, target accounts, and metadata changes in a timeline built for incident review."
          action={
            <button type="button" onClick={() => void loadLogs()} disabled={isLoading} className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#102f7f] px-4 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(36,79,190,0.22)] transition hover:bg-[#244fbe] disabled:opacity-60">
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          }
        />

        {error ? <AdminNotice tone="error" message={error} /> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard label="Events" value={logs.total.toLocaleString()} detail={`Page ${logs.page + 1} of ${Math.max(logs.totalPages, 1)}`} icon={<Activity className="h-5 w-5" />} tone="blue" />
          <AdminMetricCard label="Action types" value={actionCount.toLocaleString()} detail="Visible page scope" icon={<Filter className="h-5 w-5" />} tone="violet" />
          <AdminMetricCard label="Filtered target" value={targetUserId ? "On" : "Off"} detail={targetUserId || "All target users"} icon={<Search className="h-5 w-5" />} tone="green" />
        </section>

        <AdminCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
              <input
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                placeholder="Filter by target user id"
                className="h-11 w-full rounded-[14px] border border-[#d8e2f0] bg-white/80 pl-10 pr-3 text-[14px] font-semibold outline-none transition focus:border-[#244fbe] focus:ring-4 focus:ring-[#dbeafe]"
              />
            </label>
            <button type="button" onClick={() => { setPage(0); void loadLogs(); }} className="h-11 rounded-[14px] bg-white px-4 text-[13px] font-black text-[#244fbe] ring-1 ring-[#d3e1ff] transition hover:bg-[#eef5ff]">
              Apply filter
            </button>
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          {isLoading && !logs.items.length ? (
            <AdminSkeletonBlock rows={5} />
          ) : logs.items.length ? (
            <div className="relative grid gap-4 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-[#d8e2f0]">
              {logs.items.map((log) => (
                <article key={log.id} className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-4">
                  <div className="relative z-10 grid h-9 w-9 place-items-center rounded-full bg-[#102f7f] text-white shadow-[0_10px_26px_rgba(36,79,190,0.22)]">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="rounded-[18px] border border-[#e2e8f0] bg-[#f8fbff] p-4 shadow-[0_12px_28px_rgba(20,40,90,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AdminBadge tone={actionTone(log.action)}>{humanizeAction(log.action)}</AdminBadge>
                        <p className="mt-3 truncate text-[14px] font-black text-[#0f1f3d]">
                          {log.adminEmail || log.adminUserId || "System"} acted on {log.targetEmail || log.targetUserId || "system"}
                        </p>
                      </div>
                      <p className="text-[12px] font-bold text-[#64748b]">{formatDate(log.timestamp)}</p>
                    </div>
                    <MetadataGrid metadata={log.metadata} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="No audit logs found" description="Admin actions such as bans, role changes, quota changes, and password resets will appear here." />
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4">
            <p className="text-[13px] font-bold text-[#64748b]">Page {logs.page + 1} of {Math.max(logs.totalPages, 1)}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 0 || isLoading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-10 rounded-[12px] border border-[#cbd5e1] bg-white px-4 text-[13px] font-black text-[#52637a] disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={page + 1 >= logs.totalPages || isLoading} onClick={() => setPage((value) => value + 1)} className="h-10 rounded-[12px] border border-[#cbd5e1] bg-white px-4 text-[13px] font-black text-[#52637a] disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </AdminCard>
      </div>
    </AdminManagementShell>
  );
}

function MetadataGrid({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata || {});

  if (!entries.length) {
    return <p className="mt-3 text-[13px] font-semibold text-[#94a3b8]">No metadata attached.</p>;
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0 rounded-[12px] bg-white px-3 py-2 ring-1 ring-[#e2e8f0]">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#94a3b8]">{humanizeAction(key)}</p>
          <p className="mt-1 break-words text-[12px] font-bold text-[#52637a]">{formatMetadataValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function actionTone(action: string) {
  if (action.includes("BAN")) {
    return "rose";
  }
  if (action.includes("ROLE")) {
    return "violet";
  }
  if (action.includes("QUOTA")) {
    return "amber";
  }
  return "blue";
}

function humanizeAction(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
