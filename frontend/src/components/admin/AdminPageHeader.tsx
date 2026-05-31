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
    <header className="rounded-[18px] border border-[#dbe7f5] bg-white px-4 py-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] sm:rounded-[22px] sm:px-7 sm:py-6">
      <div className="grid gap-4 sm:flex sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563eb] sm:text-[13px]">
            Admin Workspace
          </p>

          <h1 className="mt-2 text-[clamp(30px,8vw,52px)] font-black leading-tight text-[#0f172a] sm:mt-3">
            {title}
          </h1>

          <p className="mt-2 max-w-[680px] text-[14px] font-semibold leading-6 text-[#64748b] sm:text-[15px] sm:leading-7">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-11 w-full cursor-pointer rounded-[12px] bg-[#2563eb] px-5 text-[14px] font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.2)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}