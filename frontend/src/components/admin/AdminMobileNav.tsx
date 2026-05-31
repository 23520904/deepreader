"use client";

/* eslint-disable @next/next/no-img-element */
import { adminNavItems } from "@/lib/admin";
import type { AdminSection } from "@/types/admin";
import { AdminBrand } from "./AdminBrand";

/**
 * Mobile and tablet navigation.
 *
 * The select is compact for very small screens, while horizontal pills make
 * section switching faster on phones and tablets.
 */
export function AdminMobileNav({
  activeSection,
  onChangeSection,
}: {
  activeSection: AdminSection;
  onChangeSection: (section: AdminSection) => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-[#dbe7f5] bg-[#edf3fb]/95 px-3 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <AdminBrand compact />

        <select
          value={activeSection}
          onChange={(event) => onChangeSection(event.target.value as AdminSection)}
          className="h-11 max-w-[180px] rounded-[12px] border border-[#dbe7f5] bg-white px-3 text-[13px] font-black text-[#0f172a] outline-none focus:ring-2 focus:ring-[#bfdbfe] sm:max-w-none"
          aria-label="Admin section"
        >
          {adminNavItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <nav
        className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1"
        aria-label="Admin quick sections"
      >
        {adminNavItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeSection(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[12px] font-black transition ${
                isActive
                  ? "bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.2)]"
                  : "bg-white text-[#475569] ring-1 ring-[#dbe7f5]"
              }`}
            >
              <img
                src={item.iconSrc}
                alt=""
                aria-hidden="true"
                className="h-5 w-5 object-contain"
              />
              {item.shortLabel}
            </button>
          );
        })}
      </nav>
    </div>
  );
}