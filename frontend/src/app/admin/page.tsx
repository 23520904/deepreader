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
  fetchAdminAuditLogs,
  fetchAdminDocuments,
  fetchAdminSummary,
  fetchAdminUsers,
  type AdminAuditLog,
  type AdminDocumentRow,
  type AdminSummary,
  type AdminUserRow,
} from "@/services/adminService";

type AdminSection = "dashboard" | "accounts" | "documents" | "progress" | "activity";

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
    id: "progress",
    label: "Study progress",
    description: "Flashcard learning",
    iconSrc: "/assets/icons/admin/study-progress-icon.png",
  },
  {
    id: "activity",
    label: "Activity logs",
    description: "Audit events",
    iconSrc: "/assets/icons/admin/log-icon.png",
  },
];

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

  const isAdmin = session?.role?.toUpperCase() === "ADMIN";

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

  const newestUsers = useMemo(() => users.slice(0, 8), [users]);
  const newestDocuments = useMemo(() => documents.slice(0, 8), [documents]);
  const recentLogs = useMemo(() => auditLogs.slice(0, 10), [auditLogs]);
  const masteryPercent = summary.studyProgressRows
    ? Math.round(
        ((summary.studyProgressRows - summary.dueCards) /
          summary.studyProgressRows) *
          100,
      )
    : 0;

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
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
                  setIsLoading(true);
                  setErrorMessage("");
                  void fetchAdminBundle(session.token)
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
                users={newestUsers}
                documents={newestDocuments}
                masteryPercent={masteryPercent}
                isLoading={isLoading}
              />
            ) : activeSection === "accounts" ? (
              <AccountsSection users={users} isLoading={isLoading} />
            ) : activeSection === "documents" ? (
              <DocumentsSection documents={documents} isLoading={isLoading} />
            ) : activeSection === "progress" ? (
              <ProgressSection
                summary={summary}
                masteryPercent={masteryPercent}
                isLoading={isLoading}
              />
            ) : (
              <ActivitySection logs={recentLogs} isLoading={isLoading} />
            )}
          </div>
        </section>
      </div>
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

function DashboardSection({
  summary,
  users,
  documents,
  masteryPercent,
  isLoading,
}: {
  summary: AdminSummary;
  users: AdminUserRow[];
  documents: AdminDocumentRow[];
  masteryPercent: number;
  isLoading: boolean;
}) {
  const chartRows = [
    { label: "Users", value: summary.users, color: "#2563eb" },
    { label: "Documents", value: summary.indexedDocuments, color: "#10b981" },
    { label: "Study records", value: summary.studyProgressRows, color: "#7c3aed" },
    { label: "Due cards", value: summary.dueCards, color: "#f59e0b" },
  ];

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric label="Users" value={summary.users} tone="blue" />
        <AdminMetric
          label="Indexed documents"
          value={summary.indexedDocuments}
          tone="green"
        />
        <AdminMetric
          label="Study records"
          value={summary.studyProgressRows}
          tone="violet"
        />
        <AdminMetric label="Due cards" value={summary.dueCards} tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel title="Usage overview" description="Core system volume">
          <div className="grid gap-4">
            {chartRows.map((row) => (
              <BarRow key={row.label} {...row} maxValue={maxChartValue(chartRows)} />
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Learning health" description="Spaced repetition signal">
          <div className="grid place-items-center py-4">
            <div
              className="grid h-48 w-48 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#2563eb ${masteryPercent * 3.6}deg, #e2e8f0 0deg)`,
              }}
            >
              <div className="grid h-36 w-36 place-items-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-[38px] font-black text-[#0f172a]">
                    {masteryPercent}%
                  </p>
                  <p className="text-[12px] font-black uppercase text-[#64748b]">
                    Healthy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AdminPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Newest accounts" description="Recent users">
          <CompactUserList users={users} isLoading={isLoading} />
        </AdminPanel>

        <AdminPanel title="Recent documents" description="Latest indexed files">
          <CompactDocumentList documents={documents} isLoading={isLoading} />
        </AdminPanel>
      </section>
    </div>
  );
}

function AccountsSection({
  users,
  isLoading,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
}) {
  return (
    <AdminPanel title="Account management" description="Manage users and roles">
      <CompactUserList users={users} isLoading={isLoading} expanded />
    </AdminPanel>
  );
}

function DocumentsSection({
  documents,
  isLoading,
}: {
  documents: AdminDocumentRow[];
  isLoading: boolean;
}) {
  return (
    <AdminPanel
      title="Document management"
      description="Track documents indexed by the system"
    >
      <CompactDocumentList documents={documents} isLoading={isLoading} expanded />
    </AdminPanel>
  );
}

function ProgressSection({
  summary,
  masteryPercent,
  isLoading,
}: {
  summary: AdminSummary;
  masteryPercent: number;
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric
          label="Study records"
          value={summary.studyProgressRows}
          tone="violet"
        />
        <AdminMetric label="Due cards" value={summary.dueCards} tone="amber" />
        <AdminMetric
          label="Healthy progress"
          value={masteryPercent}
          suffix="%"
          tone="green"
        />
        <AdminMetric
          label="Active sessions"
          value={summary.activeSessions}
          tone="blue"
        />
      </section>

      <AdminPanel
        title="Spaced repetition"
        description="Cards with due dates are ready for review"
      >
        {isLoading ? (
          <AdminSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Due now"
              value={summary.dueCards}
              description="Cards scheduled for immediate review"
            />
            <InfoCard
              title="Stored records"
              value={summary.studyProgressRows}
              description="Progress rows persisted in backend"
            />
            <InfoCard
              title="Retention health"
              value={`${masteryPercent}%`}
              description="Records not due right now"
            />
          </div>
        )}
      </AdminPanel>
    </div>
  );
}

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

function CompactUserList({
  users,
  isLoading,
  expanded = false,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
  expanded?: boolean;
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
          className="grid gap-3 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 md:grid-cols-[minmax(0,1fr)_110px_100px]"
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
        </div>
      ))}
    </div>
  );
}

function CompactDocumentList({
  documents,
  isLoading,
  expanded = false,
}: {
  documents: AdminDocumentRow[];
  isLoading: boolean;
  expanded?: boolean;
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
          className="min-w-0 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4"
        >
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

function BarRow({
  label,
  value,
  color,
  maxValue,
}: {
  label: string;
  value: number;
  color: string;
  maxValue: number;
}) {
  const width = maxValue ? Math.max(6, Math.round((value / maxValue) * 100)) : 6;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[14px] font-black text-[#0f172a]">{label}</p>
        <p className="text-[13px] font-black text-[#64748b]">{value}</p>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-[16px] bg-[#f8fafc] p-5 ring-1 ring-[#e2e8f0]">
      <p className="text-[13px] font-black uppercase tracking-[0.08em] text-[#64748b]">
        {title}
      </p>
      <p className="mt-3 text-[32px] font-black text-[#0f172a]">{value}</p>
      <p className="mt-2 text-[13px] font-semibold leading-6 text-[#64748b]">
        {description}
      </p>
    </div>
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

function maxChartValue(rows: Array<{ value: number }>) {
  return Math.max(1, ...rows.map((row) => row.value));
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
