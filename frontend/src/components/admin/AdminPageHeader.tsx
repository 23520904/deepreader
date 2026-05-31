"use client";

import { adminNavItems } from "@/lib/admin";
import type { AdminSection } from "@/types/admin";

/**
 * Header for the active admin section.
 *
 * The refresh button is responsive: full-width on small phones and compact on
 * larger screens.
 */
export function AdminPageHeader({
  activeSection,
  isLoading,
  onRefresh,
}: {
  activeSection: AdminSection;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const item = adminNavItems.find((navItem) => navItem.id === activeSection);

  const title =
    activeSection === "dashboard" ? "Dashboard" : item?.label || "Admin";

  const description =
    activeSection === "dashboard"
      ? "Monitor system health, study activity, and document usage."
      : item?.description || "Manage DeepReader";

  return (
    <header className="min-w-0 rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-sky-50/60 to-blue-50/80 px-4 py-5 shadow-[0_16px_38px_rgba(59,130,246,0.07)] sm:px-6 sm:py-6">
      <div className="grid min-w-0 gap-5 md:flex md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="rounded-full border border-blue-100 bg-blue-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              Admin Workspace
            </p>

            {item?.label ? (
              <p className="rounded-full border border-blue-100 bg-white/85 px-3 py-1 text-xs font-semibold text-blue-600">
                {item.label}
              </p>
            ) : null}
          </div>

          <h1 className="mt-4 break-words text-[30px] font-bold tracking-tight text-slate-950 sm:text-[38px] lg:text-[42px]">
            {title}
          </h1>

          <p className="mt-2 max-w-2xl break-words text-sm font-medium leading-6 text-slate-500 sm:text-[15px] sm:leading-7">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-busy={isLoading}
          className="inline-flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(59,130,246,0.18)] transition hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`h-[18px] w-[18px] ${isLoading ? "animate-spin" : ""}`}
          >
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>{isLoading ? "Refreshing..." : "Refresh data"}</span>
        </button>
      </div>
    </header>
  );
}