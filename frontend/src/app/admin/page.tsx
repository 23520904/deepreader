"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { AdminManagementShell } from "@/components/admin/AdminManagementShell";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";
import {
  deleteAdminDocument,
  fetchAdminAuditLogs,
  fetchAdminDocuments,
  fetchAdminSummary,
  type AdminAuditLog,
  type AdminDocumentRow,
  type AdminSummary,
} from "@/services/adminService";

type AdminSection = "dashboard" | "documents";
type TimelineRange = "day" | "week" | "month" | "year";

type DeleteDialog = { kind: "document"; document: AdminDocumentRow } | null;

type Notice = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

type AdminBundle = {
  summary?: AdminSummary;
  documents?: AdminDocumentRow[];
  auditLogs?: AdminAuditLog[];
  errorMessage: string;
};

const emptySummary: AdminSummary = {
  users: 0,
  admins: 0,
  indexedDocuments: 0,
  activeSessions: 0,
  studyProgressRows: 0,
  dueCards: 0,
  auditEventsToday: 0,
  deadLettersToday: 0,
};

const navItems: Array<{
  id: AdminSection;
  label: string;
  description: string;
  iconSrc: string;
  href: string;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview",
    iconSrc: "/assets/icons/admin/dashboard-icon.png",
    href: "/admin",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Uploaded files",
    iconSrc: "/assets/icons/admin/document-management-icon.png",
    href: "/admin?section=documents",
  },
];

async function fetchAdminBundle(token: string): Promise<AdminBundle> {
  const [summaryResult, documentsResult, auditLogsResult] =
    await Promise.allSettled([
      fetchAdminSummary(token),
      fetchAdminDocuments(token),
      fetchAdminAuditLogs(token),
    ]);

  const errors = [
    resultError(summaryResult, "summary"),
    resultError(documentsResult, "documents"),
    resultError(auditLogsResult, "activity logs"),
  ].filter(Boolean);

  return {
    summary: resultValue(summaryResult),
    documents: resultValue(documentsResult),
    auditLogs: resultValue(auditLogsResult),
    errorMessage: errors.length
      ? `Some admin data could not be loaded: ${errors.join("; ")}`
      : "",
  };
}

function resultValue<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : undefined;
}

function resultError<T>(result: PromiseSettledResult<T>, label: string) {
  if (result.status === "fulfilled") {
    return "";
  }

  const message =
    result.reason instanceof Error ? result.reason.message : "Unknown error";

  return `${label}: ${message}`;
}

function applyAdminBundle(
  bundle: AdminBundle,
  setters: {
    setSummary: (value: AdminSummary) => void;
    setDocuments: (value: AdminDocumentRow[]) => void;
    setAuditLogs: (value: AdminAuditLog[]) => void;
    setErrorMessage: (value: string) => void;
  },
) {
  if (bundle.summary) {
    setters.setSummary(bundle.summary);
  }

  if (bundle.documents) {
    setters.setDocuments(bundle.documents);
  }

  if (bundle.auditLogs) {
    setters.setAuditLogs(bundle.auditLogs);
  }

  setters.setErrorMessage(bundle.errorMessage);
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoadingView />}>
      <AdminPageContent />
    </Suspense>
  );
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const [summary, setSummary] = useState<AdminSummary>(emptySummary);
  const [documents, setDocuments] = useState<AdminDocumentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const isAdmin = session?.role?.toUpperCase() === "ADMIN";
  const activeSection: AdminSection =
    searchParams.get("section") === "documents" ? "documents" : "dashboard";

  function refreshAdminData(token: string) {
    setIsLoading(true);
    setErrorMessage("");
    void fetchAdminBundle(token)
      .then((bundle) =>
        applyAdminBundle(bundle, {
          setSummary,
          setDocuments,
          setAuditLogs,
          setErrorMessage,
        }),
      )
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not refresh admin dashboard.",
        );
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!session?.token || !isAdmin) {
      return;
    }

    let ignore = false;
    const token = session.token;

    async function loadAdminDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const bundle = await fetchAdminBundle(token);

        if (ignore) {
          return;
        }

        applyAdminBundle(bundle, {
          setSummary,
          setDocuments,
          setAuditLogs,
          setErrorMessage,
        });
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load admin dashboard.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminDashboard();

    return () => {
      ignore = true;
    };
  }, [isAdmin, session?.token]);

  function showNotice(nextNotice: NonNullable<Notice>) {
    setNotice(nextNotice);
    window.setTimeout(() => {
      setNotice((currentNotice) =>
        currentNotice?.title === nextNotice.title ? null : currentNotice,
      );
    }, 3600);
  }

  function requestDeleteDocument(document: AdminDocumentRow) {
    if (!session?.token || deletingDocumentId) {
      return;
    }

    setDeleteDialog({ kind: "document", document });
  }

  async function executeDeleteDocument(document: AdminDocumentRow) {
    if (!session?.token || deletingDocumentId) {
      return;
    }

    setDeletingDocumentId(document.document_id);
    setDeleteDialog(null);
    setErrorMessage("");

    try {
      await deleteAdminDocument(document.document_id, session.token);
      const bundle = await fetchAdminBundle(session.token);
      applyAdminBundle(bundle, {
        setSummary,
        setDocuments,
        setAuditLogs,
        setErrorMessage,
      });
      showNotice({
        type: "success",
        title: "Document deleted",
        message: `${document.file_name} was removed from the library.`,
      });
    } catch (error) {
      showNotice({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete this document.",
      });
    } finally {
      setDeletingDocumentId("");
    }
  }

  return (
    <AdminManagementShell>
      <div className="grid gap-6">
        <AdminPageHeader
          activeSection={activeSection}
          isLoading={isLoading}
          onRefresh={() => {
            if (session?.token && isAdmin) {
              refreshAdminData(session.token);
            }
          }}
        />

        {errorMessage ? (
          <div className="rounded-[12px] border border-[#fecdd3] bg-[#fff1f2] px-5 py-4 text-[14px] font-bold text-[#be123c]">
            {errorMessage}
          </div>
        ) : null}

        {activeSection === "documents" ? (
          <DocumentsSection
            documents={documents}
            isLoading={isLoading}
            deletingDocumentId={deletingDocumentId}
            onDeleteDocument={requestDeleteDocument}
          />
        ) : (
          <DashboardSection
            summary={summary}
            documents={documents}
            auditLogs={auditLogs}
          />
        )}
      </div>
      <AdminDeleteDialog
        dialog={deleteDialog}
        isBusy={Boolean(deletingDocumentId)}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={() => {
          if (deleteDialog?.kind === "document") {
            void executeDeleteDocument(deleteDialog.document);
          }
        }}
      />
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
    </AdminManagementShell>
  );
}

function AdminLoadingView() {
  return (
    <AdminManagementShell>
      <div className="grid gap-6">
        <div className="h-[176px] animate-pulse rounded-[24px] bg-white/70 shadow-[0_24px_70px_rgba(20,40,90,0.08)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-[132px] animate-pulse rounded-[20px] bg-white/70" />
          ))}
        </div>
        <div className="h-[360px] animate-pulse rounded-[22px] bg-white/70" />
      </div>
    </AdminManagementShell>
  );
}

function AdminPageHeader({
  activeSection,
  isLoading,
  onRefresh,
}: {
  activeSection: AdminSection;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const item = navItems.find((navItem) => navItem.id === activeSection);
  const title =
    activeSection === "dashboard" ? "Dashboard" : item?.label || "Admin";
  const description =
    activeSection === "dashboard"
      ? "Monitor system health, study activity, and document usage."
      : item?.description || "Manage DeepReader";

  return (
    <header className="overflow-hidden rounded-[24px] border border-white/70 bg-white/72 px-7 py-6 shadow-[0_24px_70px_rgba(20,40,90,0.12)] backdrop-blur-xl max-[520px]:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex rounded-full bg-[#e9f2ff] px-3 py-1 text-[12px] font-black uppercase tracking-[0.14em] text-[#244fbe] ring-1 ring-[#cfe0ff]">
            Admin Workspace
          </p>
          <h1 className="mt-4 text-[clamp(34px,6vw,52px)] font-black leading-tight text-[#0f1f3d]">
            {title}
          </h1>
          <p className="mt-2 max-w-[680px] text-[15px] font-semibold leading-7 text-[#64748b]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-11 cursor-pointer rounded-[14px] bg-[#102f7f] px-5 text-[14px] font-black text-white shadow-[0_14px_34px_rgba(36,79,190,0.22)] transition hover:bg-[#244fbe] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}

function DashboardSection({
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
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Users" value={summary.users} tone="blue" />
        <AdminMetric label="Documents" value={summary.indexedDocuments} tone="green" />
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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel title="System volume" description="Users, documents, sessions, and activity">
          <ColumnChart rows={volumeRows} />
        </AdminPanel>

        <AdminPanel title="Role distribution" description="Admin and learner ratio">
          <DonutChart rows={roleRows} centerLabel={`${summary.admins}`} centerText="Admins" />
        </AdminPanel>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <AdminPanel title="Document ownership" description="Indexed files by owner">
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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

        <AdminPanel title="Operations status" description="Live sessions, audit volume, and failed jobs">
          <ColumnChart rows={operationRows} />
        </AdminPanel>
      </section>
    </div>
  );
}

function DocumentsSection({
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
      title="Documents"
      description="Document cards with owner, upload date, and moderation actions"
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

function CompactDocumentList({
  documents,
  isLoading,
  expanded = false,
  deletingDocumentId = "",
  onDeleteDocument,
}: {
  documents: AdminDocumentRow[];
  isLoading: boolean;
  expanded?: boolean;
  deletingDocumentId?: string;
  onDeleteDocument?: (document: AdminDocumentRow) => void;
}) {
  const visibleDocuments = expanded ? documents : documents.slice(0, 6);

  if (isLoading && !visibleDocuments.length) {
    return <AdminSkeleton />;
  }

  if (!visibleDocuments.length) {
    return <EmptyAdminState text="No indexed documents found." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleDocuments.map((document) => (
        <div
          key={document.document_id}
          className="grid min-w-0 gap-4 rounded-[20px] border border-white/80 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-4 shadow-[0_16px_36px_rgba(20,40,90,0.08)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#e9f2ff] text-[11px] font-black text-[#244fbe] ring-1 ring-[#cfe0ff]">
                {fileExtension(document.file_name)}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[15px] font-black leading-6 text-[#0f1f3d]">
                  {document.file_name}
                </p>
                <p className="mt-2 truncate text-[13px] font-semibold text-[#64748b]">
                  {document.username || document.email || "Unknown owner"}
                </p>
              </div>
            </div>
            {onDeleteDocument ? (
              <TrashButton
                label={`Delete ${document.file_name}`}
                disabled={deletingDocumentId === document.document_id}
                isBusy={deletingDocumentId === document.document_id}
                onClick={() => onDeleteDocument(document)}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-[#f8fbff] px-3 py-2 ring-1 ring-[#e2e8f0]">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#94a3b8]">
              Uploaded
            </span>
            <span className="text-[12px] font-black text-[#52637a]">
              {formatAdminDate(document.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrashButton({
  label,
  disabled,
  isBusy,
  onClick,
}: {
  label: string;
  disabled: boolean;
  isBusy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[12px] bg-[#fff1f2] ring-1 ring-[#fecdd3] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {isBusy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#be123c] border-t-transparent" />
      ) : (
        <img
          src="/assets/icons/admin/trash-icon.png"
          alt=""
          aria-hidden="true"
          className="h-5 w-5 object-contain"
        />
      )}
    </button>
  );
}

function AdminDeleteDialog({
  dialog,
  isBusy,
  onCancel,
  onConfirm,
}: {
  dialog: DeleteDialog;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!dialog) {
    return null;
  }

  const title = "Delete document?";
  const name = dialog.document.file_name;
  const message = "This will remove the indexed document from the system. This action cannot be undone.";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#0f172a]/38 px-4 backdrop-blur-sm">
      <section className="w-full max-w-[460px] rounded-[20px] border border-[#fecdd3] bg-white p-5 shadow-[0_26px_70px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#fff1f2] ring-1 ring-[#fecdd3]">
            <img
              src="/assets/icons/admin/trash-icon.png"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-[22px] font-black text-[#0f172a]">{title}</h2>
            <p className="mt-2 break-words text-[14px] font-black text-[#be123c]">
              {name}
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="h-11 cursor-pointer rounded-[12px] bg-[#f8fafc] text-[14px] font-black text-[#0f172a] ring-1 ring-[#dbe7f5] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="h-11 cursor-pointer rounded-[12px] bg-[#e11d48] text-[14px] font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.2)] transition hover:bg-[#be123c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AdminNotice({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  if (!notice) {
    return null;
  }

  const tone =
    notice.type === "success"
      ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#047857]"
      : "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]";

  return (
    <div className="fixed bottom-5 right-5 z-[80] w-[min(360px,calc(100vw_-_32px))]">
      <div
        className={`rounded-[16px] border px-4 py-3 shadow-[0_18px_46px_rgba(15,23,42,0.16)] ${tone}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-black">{notice.title}</p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-[#475569]">
              {notice.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full bg-white/70 text-[16px] font-black text-[#64748b] ring-1 ring-black/5"
            aria-label="Close notification"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}

function ColumnChart({
  rows,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="rounded-[16px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
      <div className="grid min-h-[240px] grid-cols-[repeat(auto-fit,minmax(84px,1fr))] items-end gap-4">
        {rows.map((row) => {
          const height = Math.max(18, Math.round((row.value / maxValue) * 170));

          return (
            <div key={row.label} className="grid justify-items-center gap-3">
              <p className="text-[16px] font-black text-[#0f172a]">
                {row.value}
              </p>
              <div className="flex h-[178px] w-full items-end justify-center border-b border-l border-[#cbd5e1]">
                <div
                  className="w-full max-w-[54px] rounded-t-[14px] shadow-[0_12px_26px_rgba(15,23,42,0.1)]"
                  style={{ height, backgroundColor: row.color }}
                />
              </div>
              <p className="text-center text-[12px] font-black text-[#64748b]">
                {row.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorizontalBarChart({
  rows,
  emptyText,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  emptyText: string;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  if (!rows.length) {
    return <EmptyAdminState text={emptyText} />;
  }

  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="truncate text-[14px] font-black text-[#0f172a]">
              {row.label}
            </p>
            <p className="text-[13px] font-black text-[#64748b]">{row.value}</p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(8, Math.round((row.value / maxValue) * 100))}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  rows,
  centerLabel,
  centerText,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerText: string;
}) {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(160px,220px)_minmax(0,1fr)] lg:items-center">
      <div className="grid min-w-0 place-items-center">
        <div
          className="grid h-44 w-44 max-w-full place-items-center rounded-full sm:h-48 sm:w-48"
          style={{ background: buildConicGradient(rows) }}
        >
          <div className="grid h-[124px] w-[124px] place-items-center rounded-full bg-white text-center shadow-inner sm:h-[136px] sm:w-[136px]">
            <div>
              <p className="text-[34px] font-black text-[#0f172a]">
                {centerLabel}
              </p>
              <p className="text-[12px] font-black uppercase text-[#64748b]">
                {centerText}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden">
        <ChartLegend rows={rows} />
      </div>
    </div>
  );
}

function LineChart({
  rows,
  xLabel,
  yLabel,
}: {
  rows: Array<{ label: string; value: number }>;
  xLabel: string;
  yLabel: string;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const chartLeft = 52;
  const chartRight = 380;
  const chartTop = 42;
  const chartBottom = 158;
  const points = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? chartLeft
        : chartLeft + (index / (rows.length - 1)) * (chartRight - chartLeft);
    const y = chartBottom - (row.value / maxValue) * (chartBottom - chartTop);
    return { x, y, ...row };
  });
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="rounded-[16px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
      <svg
        viewBox="0 0 430 205"
        role="img"
        aria-label={`${yLabel} by ${xLabel}`}
        className="h-[260px] w-full"
      >
        <path d={`M ${chartLeft} ${chartBottom} H ${chartRight + 22}`} stroke="#cbd5e1" strokeWidth="3" />
        <path d={`M ${chartLeft} ${chartTop - 8} V ${chartBottom}`} stroke="#cbd5e1" strokeWidth="3" />
        <path d={`M ${chartLeft} 100 H ${chartRight}`} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 6" />
        <text x={chartLeft + 8} y="24" textAnchor="start" fontSize="10" fontWeight="900" fill="#64748b">
          {yLabel}
        </text>
        <text x={chartRight + 28} y={chartBottom + 10} textAnchor="start" fontSize="10" fontWeight="900" fill="#64748b">
          {xLabel}
        </text>
        <text x={chartLeft - 18} y={chartTop + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#64748b">
          {maxValue}
        </text>
        <text x={chartLeft - 18} y={chartBottom + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#64748b">
          0
        </text>
        <path d={path} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.label} className="group">
            <title>{`${point.label}: ${point.value}`}</title>
            <circle cx={point.x} cy={point.y} r="6" fill="#2563eb" />
            <g className="opacity-0 transition group-hover:opacity-100">
              <rect
                x={point.x - 16}
                y={point.y - 30}
                width="32"
                height="20"
                rx="8"
                fill="#0f172a"
              />
              <text
                x={point.x}
                y={point.y - 16}
                textAnchor="middle"
                fontSize="10"
                fontWeight="900"
                fill="#ffffff"
              >
                {point.value}
              </text>
            </g>
            <text x={point.x} y="184" textAnchor="middle" fontSize="10" fontWeight="800" fill="#64748b">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ChartLegend({
  rows,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="grid min-w-0 gap-3 overflow-hidden">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-[12px] bg-[#f8fafc] px-3 py-2 ring-1 ring-[#e2e8f0]"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="block min-w-0 truncate text-[13px] font-black text-[#0f172a]" title={row.label}>
              {row.label}
            </span>
          </span>
          <span className="shrink-0 text-[13px] font-black text-[#64748b]">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function AdminMetric({
  label,
  value,
  suffix = "",
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: "blue" | "green" | "violet" | "amber" | "rose";
}) {
  const toneClass = {
    blue: "bg-[#eff6ff] text-[#1d4ed8] ring-[#bfdbfe]",
    green: "bg-[#ecfdf5] text-[#047857] ring-[#bbf7d0]",
    violet: "bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe]",
    amber: "bg-[#fffbeb] text-[#b45309] ring-[#fde68a]",
    rose: "bg-[#fff1f2] text-[#be123c] ring-[#fecdd3]",
  }[tone];

  return (
    <div className={`rounded-[20px] bg-[linear-gradient(135deg,#ffffff,rgba(255,255,255,0.72))] px-5 py-5 shadow-[0_18px_46px_rgba(20,40,90,0.08)] ring-1 ${toneClass}`}>
      <p className="text-[13px] font-black uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>
      <p className="mt-3 text-[36px] font-black leading-none text-[#0f1f3d]">
        {value}
        {suffix}
      </p>
    </div>
  );
}

function AdminPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-white/70 bg-white/76 p-5 shadow-[0_22px_60px_rgba(20,40,90,0.1)] backdrop-blur-xl max-[520px]:p-4">
      <div className="mb-4">
        <h2 className="text-[22px] font-black text-[#0f172a]">{title}</h2>
        <p className="mt-1 text-[14px] font-semibold text-[#64748b]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function AdminSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[76px] animate-pulse rounded-[18px] bg-[linear-gradient(90deg,#eef4ff,#ffffff,#eef4ff)]"
        />
      ))}
    </div>
  );
}

function EmptyAdminState({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#cbd5e1] bg-white/58 px-4 py-8 text-center">
      <p className="text-[15px] font-black text-[#0f1f3d]">{text}</p>
      <p className="mx-auto mt-1 max-w-[360px] text-[13px] font-semibold leading-6 text-[#64748b]">
        Try refreshing or changing the current filters.
      </p>
    </div>
  );
}

function buildConicGradient(
  rows: Array<{ label: string; value: number; color: string }>,
) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total <= 0) {
    return "conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)";
  }

  let current = 0;
  const stops = rows.map((row) => {
    const start = current;
    const end = current + (row.value / total) * 360;
    current = end;
    return `${row.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildDocumentOwnerRows(documents: AdminDocumentRow[]) {
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

function buildActivityMix(logs: AdminAuditLog[]) {
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

function buildDocumentTrend(
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

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatAdminDate(value: string | null | undefined) {
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

function fileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.slice(0, 4).toUpperCase();
  return extension || "FILE";
}
