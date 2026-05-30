"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Clock, Cpu, FileText, RefreshCcw, Save, ShieldCheck, UserRound } from "lucide-react";
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
  fetchAdminUserDetail,
  resetAdminUserUsage,
  updateAdminUserQuota,
  type AdminUserDetail,
} from "@/services/adminService";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [requestsLimit, setRequestsLimit] = useState("");
  const [tokensLimit, setTokensLimit] = useState("");
  const [quotaDisabled, setQuotaDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const userId = params.id;
  const token = session?.token;

  async function loadDetail() {
    if (!token || !userId) {
      return;
    }

    setIsLoading(true);
    try {
      const nextDetail = await fetchAdminUserDetail(userId, token);
      setDetail(nextDetail);
      setRequestsLimit(nextDetail.user.dailyRequestsLimit?.toString() ?? "");
      setTokensLimit(nextDetail.user.dailyTokensLimit?.toString() ?? "");
      setQuotaDisabled(nextDetail.user.quotaDisabled);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not load user.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  async function saveQuota() {
    if (!token || !detail) {
      return;
    }
    setNotice(null);
    setIsSaving(true);
    try {
      const user = await updateAdminUserQuota(
        detail.user.userId,
        {
          dailyRequestsLimit: requestsLimit ? Number(requestsLimit) : null,
          dailyTokensLimit: tokensLimit ? Number(tokensLimit) : null,
          quotaDisabled,
        },
        token,
      );
      setDetail({ ...detail, user });
      setNotice({ tone: "success", text: "Quota updated." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not update quota.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function resetUsage() {
    if (!token || !detail) {
      return;
    }
    setIsSaving(true);
    try {
      await resetAdminUserUsage(detail.user.userId, token);
      setNotice({ tone: "success", text: "Today usage reset." });
      await loadDetail();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not reset usage.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminManagementShell>
      <div className="grid gap-5">
        <AdminPageHero
          eyebrow="User Intelligence"
          title={detail?.user.email || (isLoading ? "Loading user" : "User details")}
          description="Review account health, login activity, document ownership, and AI quota posture for this DeepReader user."
          action={
            <Link href="/admin/users" className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-white px-4 text-[13px] font-black text-[#244fbe] ring-1 ring-[#d3e1ff] transition hover:bg-[#eef5ff]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to users
            </Link>
          }
        />

        {notice ? <AdminNotice tone={notice.tone} message={notice.text} /> : null}

        {detail ? (
          <div className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard label="Role" value={detail.user.role} detail={detail.user.emailVerified ? "Email verified" : "Verification pending"} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" />
              <AdminMetricCard label="Status" value={detail.user.status} detail={formatDate(detail.user.lastLogin)} icon={<UserRound className="h-5 w-5" />} tone={detail.user.status === "BANNED" ? "amber" : "green"} />
              <AdminMetricCard label="Documents" value={detail.user.documentCount.toLocaleString()} detail="Indexed documents owned" icon={<FileText className="h-5 w-5" />} tone="blue" />
              <AdminMetricCard label="Providers" value={detail.usageByProvider.length.toLocaleString()} detail="AI providers used" icon={<Cpu className="h-5 w-5" />} tone="amber" />
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <AdminCard className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-black text-[#0f1f3d]">Account profile</h2>
                    <p className="mt-1 text-[13px] font-semibold text-[#64748b]">Identity, access, and account metadata.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminBadge tone={detail.user.role === "ADMIN" ? "violet" : "blue"}>{detail.user.role}</AdminBadge>
                    <AdminBadge tone={detail.user.status === "BANNED" ? "rose" : "green"}>{detail.user.status}</AdminBadge>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
                  <Info label="Username" value={detail.user.username || "Unset"} />
                  <Info label="Email" value={detail.user.email} />
                  <Info label="Email verified" value={detail.user.emailVerified ? "Yes" : "No"} />
                  <Info label="Last login" value={formatDate(detail.user.lastLogin)} />
                  <Info label="Created" value={formatDate(detail.user.createdAt)} />
                  <Info label="User id" value={detail.user.userId} />
                </dl>
              </AdminCard>

              <AdminCard className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-black text-[#0f1f3d]">AI quota</h2>
                    <p className="mt-1 text-[13px] font-semibold text-[#64748b]">Control request and token limits.</p>
                  </div>
                  <AdminBadge tone={quotaDisabled ? "amber" : "green"}>{quotaDisabled ? "Disabled" : "Enforced"}</AdminBadge>
                </div>
                <div className="mt-5 grid gap-3">
                  <QuotaInput label="Daily requests limit" value={requestsLimit} onChange={setRequestsLimit} />
                  <QuotaInput label="Daily tokens limit" value={tokensLimit} onChange={setTokensLimit} />
                  <label className="flex items-center justify-between gap-3 rounded-[16px] bg-[#f8fbff] px-4 py-3 text-[13px] font-black text-[#52637a] ring-1 ring-[#e2e8f0]">
                    Disable quota enforcement
                    <input checked={quotaDisabled} onChange={(event) => setQuotaDisabled(event.target.checked)} type="checkbox" className="h-5 w-5 accent-[#244fbe]" />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => void saveQuota()} disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#102f7f] text-[13px] font-black text-white shadow-[0_14px_34px_rgba(36,79,190,0.22)] disabled:opacity-60">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save
                    </button>
                    <button type="button" onClick={() => void resetUsage()} disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-white text-[13px] font-black text-[#52637a] ring-1 ring-[#cbd5e1] disabled:opacity-60">
                      <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                      Reset usage
                    </button>
                  </div>
                </div>
              </AdminCard>
            </div>

            <AdminCard className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4">
                <div>
                  <h2 className="text-[22px] font-black text-[#0f1f3d]">Recent login history</h2>
                  <p className="mt-1 text-[13px] font-semibold text-[#64748b]">Authentication attempts and device context.</p>
                </div>
                <Clock className="h-6 w-6 text-[#244fbe]" aria-hidden="true" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead className="text-[#607086]">
                    <tr>
                      {["Time", "Result", "IP", "Reason", "User agent"].map((heading) => (
                        <th key={heading} className="border-b border-[#e2e8f0] px-5 py-3 font-black">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.loginHistory.map((row) => (
                      <tr key={row.id} className="border-b border-[#edf2f7] hover:bg-[#f8fbff]">
                        <td className="px-5 py-4 font-semibold text-[#52637a]">{formatDate(row.loginTime)}</td>
                        <td className="px-5 py-4"><AdminBadge tone={row.success ? "green" : "rose"}>{row.success ? "Success" : "Failed"}</AdminBadge></td>
                        <td className="px-5 py-4 font-semibold text-[#52637a]">{row.ipAddress || "-"}</td>
                        <td className="px-5 py-4 font-semibold text-[#52637a]">{row.failureReason || "-"}</td>
                        <td className="max-w-[380px] truncate px-5 py-4 font-semibold text-[#52637a]">{row.userAgent || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!detail.loginHistory.length ? (
                <div className="p-5">
                  <AdminEmptyState title="No login history" description="Login attempts for this user will appear after authentication events are recorded." />
                </div>
              ) : null}
            </AdminCard>
          </div>
        ) : (
          <AdminCard className="p-6">
            {isLoading ? <AdminSkeletonBlock rows={5} /> : <AdminEmptyState title="User not found" description="This account may have been deleted or the admin token cannot access it." />}
          </AdminCard>
        )}
      </div>
    </AdminManagementShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[16px] bg-[#f8fbff] p-4 ring-1 ring-[#e2e8f0]">
      <dt className="text-[11px] font-black uppercase tracking-[0.1em] text-[#64748b]">{label}</dt>
      <dd className="mt-2 break-words font-black text-[#102033]">{value}</dd>
    </div>
  );
}

function QuotaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[13px] font-bold text-[#52637a]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        min="0"
        className="h-11 rounded-[14px] border border-[#d8e2f0] bg-white px-3 text-[#102033] outline-none transition focus:border-[#244fbe] focus:ring-4 focus:ring-[#dbeafe]"
      />
    </label>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Never";
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
