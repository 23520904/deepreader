"use client";

/* eslint-disable @next/next/no-img-element */
import { adminNavItems } from "@/lib/admin";
import type { AdminSection } from "@/types/admin";
import { AdminBrand } from "./AdminBrand";

/**
 * Desktop-only admin sidebar.
 *
 * Hidden below lg screens. Mobile navigation is handled by AdminMobileNav.
 */
export function AdminSidebar({
  activeSection,
  onChangeSection,
  onLogout,
}: {
  activeSection: AdminSection;
  onChangeSection: (section: AdminSection) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[300px] border-r border-blue-100 bg-gradient-to-b from-white via-sky-50/40 to-blue-50/60 px-5 py-6 shadow-[12px_0_32px_rgba(59,130,246,0.06)] lg:flex lg:flex-col">
      <div className="px-2">
        <AdminBrand />
      </div>

      <nav className="mt-8 space-y-1.5" aria-label="Admin sections">
        {adminNavItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeSection(item.id)}
              className={[
                "group relative flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                isActive
                  ? "bg-white text-blue-700 shadow-[0_10px_24px_rgba(59,130,246,0.12)] ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-white/80 hover:text-blue-700 hover:ring-1 hover:ring-blue-100",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
              )}

              <span
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition",
                  isActive
                    ? "border-blue-100 bg-blue-50"
                    : "border-blue-100/70 bg-white group-hover:bg-blue-50",
                ].join(" ")}
              >
                <img
                  src={item.iconSrc}
                  alt=""
                  className={[
                    "h-6 w-6 object-contain transition",
                    isActive
                      ? "opacity-95"
                      : "opacity-65 group-hover:opacity-85",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {item.label}
                </span>

                <span
                  className={[
                    "mt-1 block truncate text-[13px] font-medium",
                    isActive ? "text-blue-400" : "text-slate-400",
                  ].join(" ")}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-blue-100 pt-5">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-transparent text-[15px] font-semibold text-slate-500 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}