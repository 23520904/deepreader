"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";
import {
  deleteAdminDocument,
  deleteAdminUser,
  fetchAdminAuditLogs,
  fetchAdminDocuments,
  fetchAdminSummary,
  fetchAdminUsers,
  type AdminAuditLog,
  type AdminDocumentRow,
  type AdminSummary,
  type AdminUserRow,
} from "@/services/adminService";

/**
 * Admin page for DeepReader web UI.
 *
 * This page loads admin metrics and lists, handles user and document deletion,
 * and protects the admin experience behind an authenticated admin session.
 */
type AdminSection = "dashboard" | "accounts" | "documents" | "activity";
type TimelineRange = "day" | "week" | "month" | "year";

type DeleteDialog =
  | { kind: "user"; user: AdminUserRow }
  | { kind: "document"; document: AdminDocumentRow }
  | null;

type Notice = {
  type: "success" | "error";
  title: string;
  message: string;
} | null;

type AdminBundle = {
  summary?: AdminSummary;
  users?: AdminUserRow[];
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

/**
 * Admin sidebar navigation items.
 *
 * Each section uses the same items for desktop sidebar and mobile select.
 */
const navItems: Array<{
  id: AdminSection;
  label: string;
  description: string;
  iconSrc: string;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview",
    iconSrc: "/assets/icons/admin/dashboard-icon.png",
  },
  {
    id: "accounts",
    label: "Account management",
    description: "Users and roles",
    iconSrc: "/assets/icons/admin/account-management-icon.png",
  },
  {
    id: "documents",
    label: "Document management",
    description: "Uploaded files",
    iconSrc: "/assets/icons/admin/document-management-icon.png",
  },
  {
    id: "activity",
    label: "Activity logs",
    description: "Audit events",
    iconSrc: "/assets/icons/admin/log-icon.png",
  },
];

/**
 * Load all admin dashboard data in parallel so the page can render summary,
 * user list, document list, and audit log data together.
 *
 * Errors are captured per request to allow partial data display when one
 * backend call fails.
 */
async function fetchAdminBundle(token: string): Promise<AdminBundle> {
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
 * Return the successful value from a settled promise or undefined if it failed.
 */
function resultValue<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : undefined;
}

/**
 * Create a user-friendly error message for a failed fetch result.
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
 * Apply admin data to local component state only when each data set is present.
 * This allows the page to preserve existing sections if some backend responses fail.
 */
function applyAdminBundle(
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
 * Main admin page component.
 *
 * It reads the authenticated session, verifies admin access, and then loads
 * the admin dashboard state for metrics, accounts, documents, and activity.
 */
export default function AdminPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const [activeSection, setActiveSection] =
    useState<AdminSection>("dashboard");
  const [summary, setSummary] = useState<AdminSummary>(emptySummary);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // The admin role is required to access admin-only data and controls.
  const isAdmin = session?.role?.toUpperCase() === "ADMIN";

  // Refresh the admin dashboard on demand and keep the existing state visible while loading.
  // This is invoked by the refresh button and after any successful delete action.
  // The existing summary and list state remain visible while a new data fetch is pending.
  function refreshAdminData(token: string) {
    setIsLoading(true);
    setErrorMessage("");
    void fetchAdminBundle(token)
      .then((bundle) =>
        applyAdminBundle(bundle, {
          setSummary,
          setUsers,
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
    // Do not load admin data unless the signed-in user has an admin role.
    if (!session?.token || !isAdmin) {
      return;
    }

    // Ignore stale fetch results if the component unmounts or the auth token changes.
    // This prevents old async responses from overwriting newer state.
    let ignore = false;
    const token = session.token;

    // Load admin dashboard state once the authenticated token is available.
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
          setUsers,
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

  // Only show the most recent audit events in the activity section.
  const recentLogs = useMemo(() => auditLogs.slice(0, 10), [auditLogs]);

  // Clear auth session and navigate back to login.
  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

/**
 * Show a temporary notification banner for success or error results.
 * The banner is cleared automatically after a few seconds.
 */
  function showNotice(nextNotice: NonNullable<Notice>) {
    setNotice(nextNotice);
    // Automatically clear the notice after a few seconds, but only if the same notice is still active.
    window.setTimeout(() => {
      setNotice((currentNotice) =>
        currentNotice?.title === nextNotice.title ? null : currentNotice,
      );
    }, 3600);
  }

/**
 * Open the delete dialog for a user, but block self-deletion by the current admin.
 */
  // Open the delete confirmation dialog for a user.
  // This is part of the Accounts UI section and blocks self-deletion.
  function requestDeleteUser(user: AdminUserRow) {
    if (!session?.token || deletingUserId) {
      return;
    }

    // Prevent the currently signed-in admin from deleting their own account.
    if (user.user_id === session.userId) {
      showNotice({
        type: "error",
        title: "Delete blocked",
        message: "You cannot delete the currently signed-in admin account.",
      });
      return;
    }

    setDeleteDialog({ kind: "user", user });
  }

  function requestDeleteDocument(document: AdminDocumentRow) {
    if (!session?.token || deletingDocumentId) {
      return;
    }

    // Ask the admin to confirm document deletion before calling the API.
    setDeleteDialog({ kind: "document", document });
  }

/**
 * Delete a user through the admin service and refresh dashboard data afterward.
 * This also shows a success or error notice based on the result.
 */
  // Execute a user deletion after the admin confirms the modal.
  // The delete action is only active for one user at a time and refreshes admin data.
  async function executeDeleteUser(user: AdminUserRow) {
    if (!session?.token || deletingUserId) {
      return;
    }

    if (user.user_id === session.userId) {
      showNotice({
        type: "error",
        title: "Delete blocked",
        message: "You cannot delete the currently signed-in admin account.",
      });
      return;
    }

    // Mark the delete action as busy and clear the confirmation dialog.
    setDeletingUserId(user.user_id);
    setDeleteDialog(null);
    setErrorMessage("");

    try {
      await deleteAdminUser(user.user_id, session.token);
      const bundle = await fetchAdminBundle(session.token);
      applyAdminBundle(bundle, {
        setSummary,
        setUsers,
        setDocuments,
        setAuditLogs,
        setErrorMessage,
      });
      showNotice({
        type: "success",
        title: "User deleted",
        message: `${user.username || user.email} was removed from DeepReader.`,
      });
    } catch (error) {
      showNotice({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof Error ? error.message : "Could not delete this user.",
      });
    } finally {
      setDeletingUserId("");
    }
  }

/**
 * Delete a document through the admin service and refresh page data once complete.
 * Prevents duplicate actions while a deletion is in progress.
 */
  // Execute a document deletion after confirmation in the documents UI section.
  // This refreshes the dashboard state and keeps the deletion button busy until done.
  async function executeDeleteDocument(document: AdminDocumentRow) {
    if (!session?.token || deletingDocumentId) {
      return;
    }

    // Mark this document delete request as busy and clear the existing dialog.
    setDeletingDocumentId(document.document_id);
    setDeleteDialog(null);
    setErrorMessage("");

    try {
      await deleteAdminDocument(document.document_id, session.token);
      const bundle = await fetchAdminBundle(session.token);
      applyAdminBundle(bundle, {
        setSummary,
        setUsers,
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
    <main className="min-h-screen overflow-x-hidden bg-[#edf3fb] text-[#0f172a]">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[292px] border-r border-[#dbe7f5] bg-white/94 px-5 py-6 shadow-[18px_0_44px_rgba(30,64,175,0.08)] backdrop-blur-xl lg:flex lg:flex-col">
          <AdminBrand />

          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3 text-left transition ${
                  activeSection === item.id
                    ? "bg-[#2563eb] text-white shadow-[0_16px_34px_rgba(37,99,235,0.22)]"
                    : "bg-transparent text-[#475569] hover:bg-[#eff6ff] hover:text-[#1d4ed8]"
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${
                    activeSection === item.id
                      ? "bg-white/22"
                      : "bg-[#eff6ff] ring-1 ring-[#dbeafe]"
                  }`}
                >
                  <img
                    src={item.iconSrc}
                    alt=""
                    className="h-7 w-7 object-contain"
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-black">
                    {item.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[12px] font-semibold ${
                      activeSection === item.id
                        ? "text-white/72"
                        : "text-[#94a3b8]"
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="h-12 w-full cursor-pointer rounded-[14px] bg-[#fff1f2] text-[14px] font-black text-[#be123c] ring-1 ring-[#fecdd3] transition hover:bg-[#ffe4e6]"
            >
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:pl-[292px]">
          <div className="sticky top-0 z-30 border-b border-[#dbe7f5] bg-[#edf3fb]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <AdminBrand compact />
              <select
                value={activeSection}
                onChange={(event) =>
                  setActiveSection(event.target.value as AdminSection)
                }
                className="h-11 rounded-[12px] border border-[#dbe7f5] bg-white px-3 text-[13px] font-black text-[#0f172a]"
                aria-label="Admin section"
              >
                {navItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mx-auto grid w-[min(1240px,calc(100%_-_48px))] gap-6 py-7 max-[700px]:w-[min(100%_-_28px,1240px)]">
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

            {activeSection === "dashboard" ? (
              <DashboardSection
                summary={summary}
                documents={documents}
                auditLogs={auditLogs}
              />
            ) : activeSection === "accounts" ? (
              <AccountsSection
                users={users}
                isLoading={isLoading}
                currentUserId={session?.userId || ""}
                deletingUserId={deletingUserId}
                onDeleteUser={requestDeleteUser}
              />
            ) : activeSection === "documents" ? (
              <DocumentsSection
                documents={documents}
                isLoading={isLoading}
                deletingDocumentId={deletingDocumentId}
                onDeleteDocument={requestDeleteDocument}
              />
            ) : (
              <ActivitySection logs={recentLogs} isLoading={isLoading} />
            )}
          </div>
        </section>
      </div>
      <AdminDeleteDialog
        dialog={deleteDialog}
        isBusy={Boolean(deletingUserId || deletingDocumentId)}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={() => {
          if (deleteDialog?.kind === "user") {
            void executeDeleteUser(deleteDialog.user);
          } else if (deleteDialog?.kind === "document") {
            void executeDeleteDocument(deleteDialog.document);
          }
        }}
      />
      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
    </main>
  );
}

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#eff6ff] ring-1 ring-[#dbeafe]">
        <img
          src="/assets/images/brand/deepreader-favicon.png"
          alt=""
          className="h-10 w-10 object-contain"
        />
      </div>
      {!compact ? (
        <div>
          <p className="text-[18px] font-black leading-none text-[#0f172a]">
            DeepReader
          </p>
          <p className="mt-1 text-[12px] font-black uppercase tracking-[0.12em] text-[#2563eb]">
            Admin Panel
          </p>
        </div>
      ) : (
        <p className="text-[16px] font-black text-[#0f172a]">Admin</p>
      )}
    </div>
  );
}

/**
 * Page header that shows the current admin section and provides refresh action.
 *
 * This header appears above the main admin panels and updates the title/description
 * based on the active sidebar section.
 */
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
    <header className="rounded-[22px] border border-[#dbe7f5] bg-white px-7 py-6 shadow-[0_18px_46px_rgba(15,23,42,0.06)] max-[520px]:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#2563eb]">
            Admin Workspace
          </p>
          <h1 className="mt-3 text-[clamp(34px,6vw,52px)] font-black leading-tight text-[#0f172a]">
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
          className="h-11 cursor-pointer rounded-[12px] bg-[#2563eb] px-5 text-[14px] font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.2)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}

/**
 * Dashboard section with metrics and charts for system status and document activity.
 *
 * This UI section renders the top admin metrics, distribution charts, ownership chart,
 * activity mix, and timeline controls for index volume.
 */
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

      <section className="grid gap-6 xl:grid-cols-2">
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

/**
 * Account management section showing user list and deletion controls.
 *
 * Renders the accounts panel and delegates user delete actions to the admin page state.
 */
function AccountsSection({
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
 * Document management section showing uploaded files and delete actions.
 *
 * Renders a list of indexed documents with delete buttons and fallback empty state.
 */
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
 * Activity section showing recent audit event entries and fallback state.
 */
function ActivitySection({
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

/**
 * Compact user list used in admin accounts section.
 *
 * Shows either a small preview or full expanded list depending on props.
 *
 * The accounts section uses this component to display users with role, document count,
 * and delete actions in a grid card layout.
 */
function CompactUserList({
  users,
  isLoading,
  expanded = false,
  currentUserId = "",
  deletingUserId = "",
  onDeleteUser,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
  expanded?: boolean;
  currentUserId?: string;
  deletingUserId?: string;
  onDeleteUser?: (user: AdminUserRow) => void;
}) {
  const visibleUsers = expanded ? users : users.slice(0, 6);

  if (isLoading && !visibleUsers.length) {
    return <AdminSkeleton />;
  }

  if (!visibleUsers.length) {
    return <EmptyAdminState text="No users found." />;
  }

  return (
    <div className="grid gap-3">
      {visibleUsers.map((user) => (
        <div
          key={user.user_id}
          className={`grid gap-3 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 ${
            onDeleteUser
              ? "md:grid-cols-[minmax(0,1fr)_110px_100px_46px]"
              : "md:grid-cols-[minmax(0,1fr)_110px_100px]"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black text-[#0f172a]">
              {user.username || user.email}
            </p>
            <p className="truncate text-[13px] font-semibold text-[#64748b]">
              {user.email}
            </p>
          </div>
          <span className="h-fit rounded-full bg-white px-3 py-1 text-center text-[12px] font-black text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
            {user.role}
          </span>
          <span className="h-fit rounded-full bg-white px-3 py-1 text-center text-[12px] font-black text-[#64748b] ring-1 ring-[#e2e8f0]">
            {user.document_count} docs
          </span>
          {onDeleteUser ? (
            <TrashButton
              label={`Delete ${user.username || user.email}`}
              disabled={user.user_id === currentUserId || deletingUserId === user.user_id}
              isBusy={deletingUserId === user.user_id}
              onClick={() => onDeleteUser(user)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Compact document list used in admin documents section.
 *
 * Supports a preview layout and delete button per document.
 *
 * This component renders document cards with owner and timestamp metadata,
 * and it is the main list view for the documents section.
 */
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
    <div className="grid gap-3 md:grid-cols-2">
      {visibleDocuments.map((document) => (
        <div
          key={document.document_id}
          className="grid min-w-0 gap-3 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] font-black leading-6 text-[#0f172a]">
                {document.file_name}
              </p>
              <p className="mt-2 truncate text-[13px] font-semibold text-[#64748b]">
                Owner: {document.username || document.email || "Unknown"}
              </p>
              <p className="mt-1 text-[12px] font-bold text-[#94a3b8]">
                {formatAdminDate(document.created_at)}
              </p>
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
        </div>
      ))}
    </div>
  );
}

/**
 * Button used for deleting users or documents with busy state support.
 */
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

/**
 * Confirmation dialog shown before deleting a user or document.
 *
 * Renders an overlay modal for delete confirmation, with cancel and confirm actions.
 */
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

  const isUser = dialog.kind === "user";
  const title = isUser ? "Delete user?" : "Delete document?";
  const name = isUser
    ? dialog.user.username || dialog.user.email
    : dialog.document.file_name;
  const message = isUser
    ? "This will remove the account and the data owned by this user. This action cannot be undone."
    : "This will remove the indexed document from the system. This action cannot be undone.";

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

/**
 * Toast notification shown for success or failure messages.
 *
 * Displays a fixed banner in the bottom-right corner and supports manual close.
 */
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

/**
 * Simple column chart for numeric dashboard metrics.
 *
 * Converts numeric summary rows into vertical bars with value labels above each bar.
 */
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

/**
 * Horizontal bar chart used to show ranked values with labels.
 *
 * Used in the dashboard section to display document ownership across owners
 * and to render other ranked value distributions.
 */
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

/**
 * Donut chart visualization for category distribution data.
 *
 * Renders a ring chart with a center label and a legend describing each slice.
 */
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
    <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
      <div className="grid place-items-center">
        <div
          className="grid h-48 w-48 place-items-center rounded-full"
          style={{ background: buildConicGradient(rows) }}
        >
          <div className="grid h-[136px] w-[136px] place-items-center rounded-full bg-white text-center shadow-inner">
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
      <ChartLegend rows={rows} />
    </div>
  );
}

/**
 * Line chart used for timeline trends of document indexing.
 *
 * Builds an SVG line path from timeline buckets and plots point values across the x-axis.
 */
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
    <div className="grid gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f8fafc] px-3 py-2 ring-1 ring-[#e2e8f0]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="truncate text-[13px] font-black text-[#0f172a]">
              {row.label}
            </span>
          </span>
          <span className="text-[13px] font-black text-[#64748b]">
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
    <div className={`rounded-[18px] px-5 py-5 ring-1 ${toneClass}`}>
      <p className="text-[13px] font-black uppercase tracking-[0.08em] opacity-80">
        {label}
      </p>
      <p className="mt-3 text-[36px] font-black leading-none">
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
    <section className="min-w-0 rounded-[18px] border border-[#dbe7f5] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)] max-[520px]:p-4">
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
          className="h-[76px] animate-pulse rounded-[14px] bg-[#eef4fb]"
        />
      ))}
    </div>
  );
}

function EmptyAdminState({ text }: { text: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-8 text-center text-[14px] font-bold text-[#64748b]">
      {text}
    </div>
  );
}

/**
 * Create a CSS conic gradient string from chart row colors and values.
 *
 * Converts pie slice values into angular stop ranges for the donut chart fill.
 */
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

/**
 * Build a small set of document owner rows for the ownership donut chart.
 *
 * Maps owners to document counts, keeps only the top five owners,
 * and assigns each owner a distinct chart color slice.
 */
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

/**
 * Build activity category counts for the audit event donut chart.
 *
 * Normalizes audit action text, aggregates counts by action type,
 * and selects the top five categories for the chart.
 */
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

/**
 * Build document count values per time bucket for the selected timeline range.
 *
 * Counts how many documents were indexed in each generated timeline bucket.
 */
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

/**
 * Create timeline buckets for day, week, month, or year views.
 *
 * The buckets are used to aggregate document counts into chart points.
 * Each range produces labels suitable for the timeline chart x-axis.
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

// Align a date to the start of the current week (Monday).
// Used by week-range timeline buckets to keep the chart aligned to full weeks.
function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Format admin timestamps for display in the activity section.
 *
 * Returns a compact human-readable string or a fallback label for invalid/missing dates.
 */
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
