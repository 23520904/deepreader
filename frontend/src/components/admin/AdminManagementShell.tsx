"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Gauge,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";

const adminLinks = [
  { href: "/admin", label: "Dashboard", description: "System overview", icon: Gauge },
  { href: "/admin/users", label: "Users", description: "Accounts and roles", icon: Users },
  { href: "/admin/audit-logs", label: "Audit Logs", description: "Admin timeline", icon: Activity },
  { href: "/admin?section=documents", label: "Documents", description: "Indexed library", icon: BookOpen },
];

function resolveActiveHref(pathname: string, section: string | null) {
  if (pathname.startsWith("/admin/users")) {
    return "/admin/users";
  }
  if (pathname.startsWith("/admin/audit-logs")) {
    return "/admin/audit-logs";
  }
  if (pathname === "/admin" && section === "documents") {
    return "/admin?section=documents";
  }
  return "/admin";
}

export function AdminManagementShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellChrome activeHref="/admin">{children}</AdminShellChrome>}>
      <AdminManagementShellInner>{children}</AdminManagementShellInner>
    </Suspense>
  );
}

function AdminManagementShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const activeHref = resolveActiveHref(pathname, searchParams.get("section"));

  function logout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <AdminShellChrome activeHref={activeHref} email={session?.email} onLogout={logout}>
      {children}
    </AdminShellChrome>
  );
}

function AdminShellChrome({
  activeHref,
  email,
  onLogout,
  children,
}: {
  activeHref: string;
  email?: string;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#eef5ff_0%,#f8fbff_44%,#f5f7ff_100%)] text-[#102033]">
      <style jsx global>{`
        @keyframes admin-page-enter {
          from {
            opacity: 0.72;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_20%_20%,rgba(36,79,190,0.18),transparent_34%),radial-gradient(circle_at_80%_8%,rgba(20,184,166,0.16),transparent_30%)]" />
      <div className="relative mx-auto grid w-[min(1480px,calc(100%_-_28px))] grid-cols-1 gap-5 py-5 lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="w-full rounded-[22px] border border-white/70 bg-white/72 p-4 shadow-[0_24px_70px_rgba(20,40,90,0.12)] backdrop-blur-xl lg:sticky lg:top-5 lg:h-[calc(100vh_-_40px)] lg:w-[288px]">
          <div className="rounded-[18px] border border-white/70 bg-[linear-gradient(135deg,#0f2f82,#244fbe_55%,#1aa8a8)] p-4 text-white shadow-[0_18px_42px_rgba(36,79,190,0.25)]">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-white/18 ring-1 ring-white/25">
                <Shield className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[18px] font-black">DeepReader</p>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/74">
                  Admin Console
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[14px] bg-white/12 p-3 text-[12px] font-semibold text-white/82 ring-1 ring-white/18">
              {email || "Admin session"}
            </div>
          </div>

          <nav className="mt-5 grid gap-2">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`group grid grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-[16px] px-3 py-3 transition ${
                    active
                      ? "bg-[#102f7f] text-white shadow-[0_16px_36px_rgba(36,79,190,0.22)]"
                      : "text-[#50647f] hover:bg-white hover:text-[#173f9d] hover:shadow-[0_12px_28px_rgba(30,64,175,0.08)]"
                  }`}
                >
                  <span
                    className={`grid h-[42px] w-[42px] place-items-center rounded-[14px] ${
                      active
                        ? "bg-white/18"
                        : "bg-[#eef5ff] text-[#244fbe] group-hover:bg-[#dbeafe]"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-black">{item.label}</span>
                    <span className={`mt-0.5 block truncate text-[12px] font-semibold ${active ? "text-white/70" : "text-[#8a9ab3]"}`}>
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onLogout}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#fff1f2] text-[13px] font-black text-[#be123c] ring-1 ring-[#fecdd3] transition hover:bg-[#ffe4e6]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        </aside>
        <section
          key={activeHref}
          className="min-w-0 w-full max-w-[1172px] justify-self-stretch overflow-x-hidden"
          style={{ animation: "admin-page-enter 180ms ease-out both" }}
        >
          <div className="min-h-[calc(100vh_-_40px)] min-w-0">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function AdminPageHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="overflow-hidden rounded-[24px] border border-white/70 bg-white/72 p-5 shadow-[0_24px_70px_rgba(20,40,90,0.12)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-[760px]">
          <p className="inline-flex rounded-full bg-[#e9f2ff] px-3 py-1 text-[12px] font-black uppercase tracking-[0.14em] text-[#244fbe] ring-1 ring-[#cfe0ff]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-black leading-tight text-[#0f1f3d]">
            {title}
          </h1>
          <p className="mt-3 max-w-[680px] text-[15px] font-semibold leading-7 text-[#5b6d86]">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function AdminNotice({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "success";
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-[18px] border px-4 py-3 text-[14px] font-bold shadow-[0_14px_36px_rgba(20,40,90,0.08)] ${
        tone === "success"
          ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#047857]"
          : "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]"
      }`}
    >
      {message}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[22px] border border-white/70 bg-white/76 shadow-[0_22px_60px_rgba(20,40,90,0.1)] backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export function AdminBadge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "rose" | "violet" | "slate";
}) {
  const toneClass = {
    blue: "bg-[#e9f2ff] text-[#244fbe] ring-[#cfe0ff]",
    green: "bg-[#ecfdf5] text-[#047857] ring-[#bbf7d0]",
    amber: "bg-[#fffbeb] text-[#b45309] ring-[#fde68a]",
    rose: "bg-[#fff1f2] text-[#be123c] ring-[#fecdd3]",
    violet: "bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe]",
    slate: "bg-[#f8fafc] text-[#52637a] ring-[#e2e8f0]",
  }[tone];

  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${toneClass} ring-1`}>
      {children}
    </span>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "violet" | "amber";
}) {
  const toneClass = {
    blue: "from-[#e9f2ff] to-white text-[#244fbe]",
    green: "from-[#e8fff7] to-white text-[#047857]",
    violet: "from-[#f5f3ff] to-white text-[#6d28d9]",
    amber: "from-[#fff8e6] to-white text-[#b45309]",
  }[tone];

  return (
    <AdminCard className={`bg-[linear-gradient(135deg,var(--tw-gradient-stops))] p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#64748b]">
            {label}
          </p>
          <p className="mt-3 text-[32px] font-black leading-none text-[#0f1f3d]">
            {value}
          </p>
          <p className="mt-2 text-[13px] font-bold text-[#64748b]">{detail}</p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white/80 shadow-sm">
          {icon}
        </div>
      </div>
    </AdminCard>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#cbd5e1] bg-white/58 px-5 py-10 text-center">
      <BarChart3 className="mx-auto h-8 w-8 text-[#94a3b8]" aria-hidden="true" />
      <p className="mt-3 text-[16px] font-black text-[#0f1f3d]">{title}</p>
      <p className="mx-auto mt-1 max-w-[360px] text-[13px] font-semibold leading-6 text-[#64748b]">
        {description}
      </p>
    </div>
  );
}

export function AdminSkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-[74px] animate-pulse rounded-[18px] bg-[linear-gradient(90deg,#eef4ff,#ffffff,#eef4ff)]"
        />
      ))}
    </div>
  );
}
