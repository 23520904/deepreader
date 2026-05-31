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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[292px] border-r border-[#dbe7f5] bg-white/95 px-5 py-6 shadow-[18px_0_44px_rgba(30,64,175,0.08)] backdrop-blur-xl lg:flex lg:flex-col">
      <AdminBrand />

      <nav className="mt-8 grid gap-2" aria-label="Admin sections">
        {adminNavItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeSection(item.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3 text-left transition ${
                isActive
                  ? "bg-[#2563eb] text-white shadow-[0_16px_34px_rgba(37,99,235,0.22)]"
                  : "bg-transparent text-[#475569] hover:bg-[#eff6ff] hover:text-[#1d4ed8]"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${
                  isActive ? "bg-white/20" : "bg-[#eff6ff] ring-1 ring-[#dbeafe]"
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
                    isActive ? "text-white/75" : "text-[#94a3b8]"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={onLogout}
          className="h-12 w-full cursor-pointer rounded-[14px] bg-[#fff1f2] text-[14px] font-black text-[#be123c] ring-1 ring-[#fecdd3] transition hover:bg-[#ffe4e6]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}