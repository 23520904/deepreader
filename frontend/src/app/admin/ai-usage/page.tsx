"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Bot, Cpu, Gauge, RefreshCcw, Sparkles, Zap } from "lucide-react";
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
import { fetchAdminAiUsage, type AiUsageSummary, type AiUsageByProvider } from "@/services/adminService";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";

const emptyUsage: AiUsageSummary = {
  requestsToday: 0,
  requestsThisMonth: 0,
  tokensToday: 0,
  tokensThisMonth: 0,
  usageByUser: [],
  usageByProvider: [],
  topUsers: [],
};

export default function AdminAiUsagePage() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const [usage, setUsage] = useState(emptyUsage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadUsage() {
    if (!session?.token) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setUsage(await fetchAdminAiUsage(session.token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load AI usage.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsage();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  const providerRows = useMemo(() => {
    const known = ["GEMINI", "GROQ"];
    const rows = new Map(usage.usageByProvider.map((row) => [row.provider.toUpperCase(), row]));
    return known.map((provider) => rows.get(provider) || { provider, requests: 0, tokens: 0 });
  }, [usage.usageByProvider]);
  const maxRequests = Math.max(1, ...usage.usageByUser.map((row) => row.requests));
  const estimatedQuotaPressure = Math.min(100, Math.round((usage.requestsToday / 500) * 100));

  return (
    <AdminManagementShell>
      <div className="grid gap-5">
        <AdminPageHero
          eyebrow="AI Operations"
          title="AI Usage"
          description="Monitor DeepReader model traffic, provider distribution, token volume, and quota pressure across active learners."
          action={
            <button type="button" onClick={() => void loadUsage()} disabled={isLoading} className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#102f7f] px-4 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(36,79,190,0.22)] transition hover:bg-[#244fbe] disabled:opacity-60">
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          }
        />

        {error ? <AdminNotice tone="error" message={error} /> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Requests today" value={usage.requestsToday.toLocaleString()} detail="Real-time gateway calls" icon={<Zap className="h-5 w-5" />} tone="blue" />
          <AdminMetricCard label="Requests month" value={usage.requestsThisMonth.toLocaleString()} detail="Monthly AI demand" icon={<Sparkles className="h-5 w-5" />} tone="violet" />
          <AdminMetricCard label="Tokens today" value={usage.tokensToday.toLocaleString()} detail="Estimated consumed tokens" icon={<Cpu className="h-5 w-5" />} tone="green" />
          <AdminMetricCard label="Tokens month" value={usage.tokensThisMonth.toLocaleString()} detail="Monthly token volume" icon={<Gauge className="h-5 w-5" />} tone="amber" />
        </section>

        {isLoading && !usage.requestsThisMonth ? <AdminSkeletonBlock rows={3} /> : null}

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-5">
            <AdminCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-black text-[#0f1f3d]">Provider mix</h2>
                  <p className="mt-1 text-[13px] font-semibold text-[#64748b]">
                    Gemini and Groq request distribution.
                  </p>
                </div>
                <AdminBadge tone="violet">AI routing</AdminBadge>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {providerRows.map((provider) => (
                  <ProviderCard key={provider.provider} provider={provider} />
                ))}
              </div>
            </AdminCard>

            <AdminCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-black text-[#0f1f3d]">Quota pressure</h2>
                  <p className="mt-1 text-[13px] font-semibold text-[#64748b]">
                    Daily load compared with the default request envelope.
                  </p>
                </div>
                <AdminBadge tone={estimatedQuotaPressure >= 80 ? "rose" : estimatedQuotaPressure >= 55 ? "amber" : "green"}>
                  {estimatedQuotaPressure}% used
                </AdminBadge>
              </div>
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-[#e2e8f0]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#244fbe,#7c3aed)]"
                  style={{ width: `${Math.max(3, estimatedQuotaPressure)}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <QuotaSignal label="Normal" active={estimatedQuotaPressure < 55} />
                <QuotaSignal label="Watch" active={estimatedQuotaPressure >= 55 && estimatedQuotaPressure < 80} />
                <QuotaSignal label="Throttle risk" active={estimatedQuotaPressure >= 80} />
              </div>
            </AdminCard>
          </div>

          <AdminCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-black text-[#0f1f3d]">Request and token chart</h2>
                <p className="mt-1 text-[13px] font-semibold text-[#64748b]">
                  User-level AI usage on the current reporting window.
                </p>
              </div>
              <AdminBadge tone="blue">{usage.usageByUser.length} users</AdminBadge>
            </div>
            <div className="mt-5 grid gap-3">
              {usage.usageByUser.slice(0, 8).map((row) => (
                <div key={row.userId} className="rounded-[16px] bg-[#f8fbff] p-4 ring-1 ring-[#e2e8f0]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-black text-[#0f1f3d]">{row.username || row.email || row.userId}</p>
                      <p className="mt-1 truncate text-[12px] font-bold text-[#64748b]">{row.tokens.toLocaleString()} tokens</p>
                    </div>
                    <p className="text-[13px] font-black text-[#244fbe]">{row.requests.toLocaleString()} requests</p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
                    <div className="h-full rounded-full bg-[#244fbe]" style={{ width: `${Math.max(5, Math.round((row.requests / maxRequests) * 100))}%` }} />
                  </div>
                </div>
              ))}
              {!usage.usageByUser.length ? <AdminEmptyState title="No usage tracked yet" description="AI requests will appear here once users start using summaries, chat, flashcards, or vision features." /> : null}
            </div>
          </AdminCard>
        </section>

        <AdminCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4">
            <div>
              <h2 className="text-[22px] font-black text-[#0f1f3d]">Top users</h2>
              <p className="mt-1 text-[13px] font-semibold text-[#64748b]">Highest AI request volume.</p>
            </div>
            <Bot className="h-6 w-6 text-[#244fbe]" aria-hidden="true" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[#607086]">
                <tr>
                  {["User", "Email", "Requests", "Tokens"].map((heading) => (
                    <th key={heading} className="border-b border-[#e2e8f0] px-5 py-3 font-black">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usage.topUsers.map((row) => (
                  <tr key={row.userId} className="border-b border-[#edf2f7] hover:bg-[#f8fbff]">
                    <td className="px-5 py-4 font-black text-[#0f1f3d]">{row.username || "Unset"}</td>
                    <td className="px-5 py-4 font-semibold text-[#52637a]">{row.email || row.userId}</td>
                    <td className="px-5 py-4 font-black text-[#244fbe]">{row.requests.toLocaleString()}</td>
                    <td className="px-5 py-4 font-semibold text-[#52637a]">{row.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!usage.topUsers.length ? (
            <div className="p-5">
              <AdminEmptyState title="No top users yet" description="The leaderboard will populate after successful AI calls are recorded." />
            </div>
          ) : null}
        </AdminCard>
      </div>
    </AdminManagementShell>
  );
}

function ProviderCard({ provider }: { provider: AiUsageByProvider }) {
  const tone = provider.provider.toUpperCase() === "GEMINI" ? "from-[#e9f2ff] to-[#f7fbff]" : "from-[#f5f3ff] to-[#fbfaff]";
  return (
    <div className={`rounded-[20px] bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${tone} p-5 ring-1 ring-white shadow-[0_16px_36px_rgba(20,40,90,0.08)]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-white text-[#244fbe] shadow-sm">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
        <AdminBadge tone={provider.requests ? "green" : "slate"}>{provider.requests ? "Active" : "Idle"}</AdminBadge>
      </div>
      <p className="mt-5 text-[13px] font-black uppercase tracking-[0.12em] text-[#64748b]">{provider.provider}</p>
      <p className="mt-2 text-[30px] font-black text-[#0f1f3d]">{provider.requests.toLocaleString()}</p>
      <p className="text-[13px] font-bold text-[#64748b]">{provider.tokens.toLocaleString()} tokens</p>
    </div>
  );
}

function QuotaSignal({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`rounded-[14px] px-3 py-2 text-[12px] font-black ring-1 ${active ? "bg-[#ecfdf5] text-[#047857] ring-[#bbf7d0]" : "bg-[#f8fafc] text-[#94a3b8] ring-[#e2e8f0]"}`}>
      {label}
    </div>
  );
}
