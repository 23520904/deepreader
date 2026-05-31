"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import type { AdminMetricTone } from "@/types/admin";

/**
 * Shared card container for admin sections and dashboard panels.
 */
export function AdminPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[18px] border border-[#dbe7f5] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] sm:p-5">
      <div className="mb-4">
        <h2 className="text-[19px] font-black text-[#0f172a] sm:text-[22px]">
          {title}
        </h2>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-[#64748b] sm:text-[14px]">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

/**
 * Small loading placeholder used by list sections.
 */
export function AdminSkeleton() {
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

/**
 * Reusable empty state for sections without data.
 */
export function EmptyAdminState({ text }: { text: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-8 text-center text-[14px] font-bold text-[#64748b]">
      {text}
    </div>
  );
}

/**
 * Shared delete icon button with disabled and busy states.
 */
export function TrashButton({
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
 * Metric card used at the top of the dashboard.
 */
export function AdminMetric({
  label,
  value,
  suffix = "",
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: AdminMetricTone;
}) {
  const toneClass = {
    blue: "bg-[#eff6ff] text-[#1d4ed8] ring-[#bfdbfe]",
    green: "bg-[#ecfdf5] text-[#047857] ring-[#bbf7d0]",
    violet: "bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe]",
    amber: "bg-[#fffbeb] text-[#b45309] ring-[#fde68a]",
    rose: "bg-[#fff1f2] text-[#be123c] ring-[#fecdd3]",
  }[tone];

  return (
    <div className={`rounded-[18px] px-4 py-4 ring-1 sm:px-5 sm:py-5 ${toneClass}`}>
      <p className="text-[12px] font-black uppercase tracking-[0.08em] opacity-80 sm:text-[13px]">
        {label}
      </p>
      <p className="mt-3 text-[32px] font-black leading-none sm:text-[36px]">
        {value}
        {suffix}
      </p>
    </div>
  );
}