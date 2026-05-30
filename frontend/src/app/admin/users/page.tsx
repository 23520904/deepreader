"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Ban,
  ChevronDown,
  KeyRound,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
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
  fetchAdminUsersPage,
  forceLogoutAdminUser,
  resetAdminUserPassword,
  updateAdminUserRole,
  updateAdminUserStatus,
  type AdminUser,
  type PageResponse,
} from "@/services/adminService";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";

const emptyPage: PageResponse<AdminUser> = {
  items: [],
  page: 0,
  size: 20,
  total: 0,
  totalPages: 0,
};

export default function AdminUsersPage() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const [usersPage, setUsersPage] = useState(emptyPage);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [openMenuUserId, setOpenMenuUserId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const token = session?.token;

  async function loadUsers() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setNotice(null);
    try {
      const result = await fetchAdminUsersPage(token, {
        search,
        role,
        status,
        sort,
        page,
        size: 20,
      });
      setUsersPage(result);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not load users.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role, status, sort, page]);

  const disabledPrevious = page <= 0 || isLoading;
  const disabledNext = page + 1 >= usersPage.totalPages || isLoading;

  const userStats = useMemo(() => {
    const admins = usersPage.items.filter((user) => user.role === "ADMIN").length;
    const banned = usersPage.items.filter((user) => user.status === "BANNED").length;
    const verified = usersPage.items.filter((user) => user.emailVerified).length;
    return { admins, banned, verified };
  }, [usersPage.items]);

  async function runUserAction(user: AdminUser, action: () => Promise<unknown>, success: string) {
    if (!token || busyUserId) {
      return;
    }

    setBusyUserId(user.userId);
    setOpenMenuUserId("");
    setNotice(null);
    try {
      await action();
      setNotice({ tone: "success", text: success });
      await loadUsers();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Action failed.",
      });
    } finally {
      setBusyUserId("");
    }
  }

  async function resetPassword(user: AdminUser) {
    const nextPassword = window.prompt(`New password for ${user.email}`);
    if (!nextPassword) {
      return;
    }
    await runUserAction(
      user,
      () => resetAdminUserPassword(user.userId, nextPassword, token!),
      "Password reset and sessions revoked.",
    );
  }

  const shownRange = useMemo(() => {
    if (!usersPage.total) {
      return "No users";
    }
    const start = usersPage.page * usersPage.size + 1;
    const end = Math.min(usersPage.total, start + usersPage.items.length - 1);
    return `${start}-${end} of ${usersPage.total}`;
  }, [usersPage]);

  return (
    <AdminManagementShell>
      <div className="grid gap-5">
        <AdminPageHero
          eyebrow="Admin Management"
          title="Users"
          description="Search, protect, and operate DeepReader accounts with role, status, session, and quota controls."
          action={
            <button
              type="button"
              onClick={() => {
                setPage(0);
                void loadUsers();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#102f7f] px-4 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(36,79,190,0.22)] transition hover:bg-[#244fbe] disabled:opacity-60"
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          }
        />

        {notice ? <AdminNotice tone={notice.tone} message={notice.text} /> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard label="Visible users" value={usersPage.total.toLocaleString()} detail={shownRange} icon={<Users className="h-5 w-5" />} tone="blue" />
          <AdminMetricCard label="Admins" value={userStats.admins.toLocaleString()} detail="Loaded page scope" icon={<ShieldCheck className="h-5 w-5" />} tone="violet" />
          <AdminMetricCard label="Banned" value={userStats.banned.toLocaleString()} detail={`${userStats.verified} verified on page`} icon={<Ban className="h-5 w-5" />} tone="amber" />
        </section>

        <AdminCard className="p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_160px_160px_170px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(0);
                    void loadUsers();
                  }
                }}
                placeholder="Search email or username"
                className="h-11 w-full rounded-[14px] border border-[#d8e2f0] bg-white/80 pl-10 pr-3 text-[14px] font-semibold outline-none transition focus:border-[#244fbe] focus:ring-4 focus:ring-[#dbeafe]"
              />
            </label>
            <FilterSelect value={role} onChange={(value) => { setRole(value); setPage(0); }} options={["ALL", "USER", "ADMIN"]} />
            <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(0); }} options={["ALL", "ACTIVE", "BANNED"]} />
            <FilterSelect value={sort} onChange={(value) => { setSort(value as "asc" | "desc"); setPage(0); }} options={["desc", "asc"]} labels={{ desc: "Newest first", asc: "Oldest first" }} />
          </div>
        </AdminCard>

        <AdminCard className="overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-[13px]">
              <thead className="text-[#607086]">
                <tr>
                  {["User", "Role", "Status", "Verified", "Created", "Last login", "Documents", ""].map((heading) => (
                    <th key={heading} className="border-b border-[#e2e8f0] px-5 py-4 font-black">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersPage.items.map((user) => (
                  <tr key={user.userId} className="group border-b border-[#edf2f7] align-middle transition hover:bg-[#f8fbff]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div className="min-w-0">
                          <Link href={`/admin/users/${user.userId}`} className="truncate text-[14px] font-black text-[#0f1f3d] hover:text-[#244fbe]">
                            {user.username || "Unset username"}
                          </Link>
                          <p className="truncate text-[12px] font-bold text-[#64748b]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><AdminBadge tone={user.role === "ADMIN" ? "violet" : "blue"}>{user.role}</AdminBadge></td>
                    <td className="px-5 py-4"><AdminBadge tone={user.status === "BANNED" ? "rose" : "green"}>{user.status}</AdminBadge></td>
                    <td className="px-5 py-4"><AdminBadge tone={user.emailVerified ? "green" : "amber"}>{user.emailVerified ? "Verified" : "Pending"}</AdminBadge></td>
                    <td className="px-5 py-4 font-semibold text-[#52637a]">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 font-semibold text-[#52637a]">{formatDate(user.lastLogin)}</td>
                    <td className="px-5 py-4 font-black text-[#0f1f3d]">{user.documentCount}</td>
                    <td className="relative px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenMenuUserId(openMenuUserId === user.userId ? "" : user.userId)}
                        disabled={busyUserId === user.userId}
                        className="inline-flex h-9 items-center gap-1 rounded-[12px] bg-white px-3 text-[12px] font-black text-[#244fbe] ring-1 ring-[#d3e1ff] transition hover:bg-[#eef5ff] disabled:opacity-50"
                      >
                        {busyUserId === user.userId ? "Working" : "Actions"}
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {openMenuUserId === user.userId ? (
                        <UserActionMenu
                          user={user}
                          currentUserId={session?.userId || ""}
                          onClose={() => setOpenMenuUserId("")}
                          onBanToggle={() => runUserAction(user, () => updateAdminUserStatus(user.userId, user.status === "BANNED" ? "ACTIVE" : "BANNED", token!), user.status === "BANNED" ? "User unbanned." : "User banned and sessions revoked.")}
                          onRoleToggle={() => runUserAction(user, () => updateAdminUserRole(user.userId, user.role === "ADMIN" ? "USER" : "ADMIN", token!), "Role updated.")}
                          onForceLogout={() => runUserAction(user, () => forceLogoutAdminUser(user.userId, token!), "Sessions revoked.")}
                          onResetPassword={() => void resetPassword(user)}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!usersPage.items.length ? (
            <div className="p-5">
              {isLoading ? (
                <AdminSkeletonBlock rows={4} />
              ) : (
                <AdminEmptyState title="No users found" description="Adjust search or filters to find a DeepReader account." />
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-[13px] font-bold text-[#64748b]">{shownRange}</p>
            <div className="flex gap-2">
              <button type="button" disabled={disabledPrevious} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-10 rounded-[12px] border border-[#cbd5e1] bg-white px-4 text-[13px] font-black text-[#52637a] disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={disabledNext} onClick={() => setPage((value) => value + 1)} className="h-10 rounded-[12px] border border-[#cbd5e1] bg-white px-4 text-[13px] font-black text-[#52637a] disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </AdminCard>
      </div>
    </AdminManagementShell>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  labels = {},
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-[14px] border border-[#d8e2f0] bg-white/80 px-3 text-[14px] font-bold text-[#102033] outline-none transition focus:border-[#244fbe] focus:ring-4 focus:ring-[#dbeafe]"
    >
      {options.map((option) => (
        <option key={option} value={option}>{labels[option] || (option === "ALL" ? "All" : option)}</option>
      ))}
    </select>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = (user.username || user.email)
    .split(/[.@\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#dbeafe,#ccfbf1)] text-[13px] font-black text-[#244fbe] ring-2 ring-white">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials || "U"}
    </div>
  );
}

function UserActionMenu({
  user,
  currentUserId,
  onBanToggle,
  onRoleToggle,
  onForceLogout,
  onResetPassword,
}: {
  user: AdminUser;
  currentUserId: string;
  onClose: () => void;
  onBanToggle: () => void;
  onRoleToggle: () => void;
  onForceLogout: () => void;
  onResetPassword: () => void;
}) {
  const self = user.userId === currentUserId;

  return (
    <div className="absolute right-5 top-[52px] z-20 w-[210px] overflow-hidden rounded-[16px] border border-[#dbe7f5] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
      <Link href={`/admin/users/${user.userId}`} className="flex items-center gap-2 px-4 py-3 text-left text-[13px] font-black text-[#102033] hover:bg-[#f8fbff]">
        <UserCog className="h-4 w-4 text-[#244fbe]" aria-hidden="true" />
        View details
      </Link>
      <ActionItem disabled={self} icon={<Ban className="h-4 w-4" />} onClick={onBanToggle}>
        {user.status === "BANNED" ? "Unban user" : "Ban user"}
      </ActionItem>
      <ActionItem disabled={self} icon={<ShieldCheck className="h-4 w-4" />} onClick={onRoleToggle}>
        {user.role === "ADMIN" ? "Make USER" : "Make ADMIN"}
      </ActionItem>
      <ActionItem icon={<LogOut className="h-4 w-4" />} onClick={onForceLogout}>
        Force logout
      </ActionItem>
      <ActionItem icon={<KeyRound className="h-4 w-4" />} onClick={onResetPassword}>
        Reset password
      </ActionItem>
    </div>
  );
}

function ActionItem({
  children,
  icon,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-black text-[#52637a] transition hover:bg-[#f8fbff] hover:text-[#244fbe] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
