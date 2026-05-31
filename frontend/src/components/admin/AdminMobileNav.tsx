"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { adminNavItems } from "@/lib/admin";
import type { AdminSection } from "@/types/admin";
import { AdminBrand } from "./AdminBrand";

/**
 * Mobile and tablet navigation.
 *
 * Uses a hamburger dropdown overlay to keep the header compact.
 * When opened, the page behind is locked and only the menu can scroll.
 */
export function AdminMobileNav({
  activeSection,
  onChangeSection,
}: {
  activeSection: AdminSection;
  onChangeSection: (section: AdminSection) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const activeItem = adminNavItems.find((item) => item.id === activeSection);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;

    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;

      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      document.body.style.overflow = previousBodyOverflow;

      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  function handleChangeSection(section: AdminSection) {
    onChangeSection(section);
    setIsOpen(false);
  }

  return (
    <div className="sticky top-0 z-50 border-b border-blue-100 bg-blue-50/95 px-3 py-3 shadow-sm backdrop-blur-xl lg:hidden">
      <div className="relative z-50 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 shrink">
          <AdminBrand compact />
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-controls="admin-mobile-menu"
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        >
          <span className="max-w-[110px] truncate sm:max-w-[180px]">
            {activeItem?.shortLabel || activeItem?.label || "Menu"}
          </span>

          <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <span className="relative h-3.5 w-4">
              <span
                className={[
                  "absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current transition duration-200",
                  isOpen ? "translate-y-[6px] rotate-45" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute left-0 top-[6px] h-0.5 w-4 rounded-full bg-current transition duration-200",
                  isOpen ? "opacity-0" : "opacity-100",
                ].join(" ")}
              />
              <span
                className={[
                  "absolute left-0 top-3 h-0.5 w-4 rounded-full bg-current transition duration-200",
                  isOpen ? "-translate-y-[6px] -rotate-45" : "",
                ].join(" ")}
              />
            </span>
          </span>
        </button>
      </div>

      <button
        type="button"
        aria-label="Close admin menu"
        onClick={() => setIsOpen(false)}
        className={[
          "fixed inset-x-0 bottom-0 top-[65px] z-40 cursor-default bg-black/10 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <nav
        id="admin-mobile-menu"
        className={[
          "absolute left-3 right-3 top-[calc(100%+8px)] z-50 grid max-h-[calc(100dvh-86px)] gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.16)]",
          "touch-pan-y [-webkit-overflow-scrolling:touch]",
          "origin-top transition-all duration-200 ease-out",
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0",
        ].join(" ")}
        aria-label="Admin sections"
      >
        {adminNavItems.map((item, index) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleChangeSection(item.id)}
              className={[
                "flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                isOpen
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0",
              ].join(" ")}
              style={{
                transitionDelay: isOpen ? `${index * 25}ms` : "0ms",
              }}
            >
              <span
                className={[
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                  isActive ? "bg-white/20" : "bg-blue-50",
                ].join(" ")}
              >
                <img
                  src={item.iconSrc}
                  alt=""
                  aria-hidden="true"
                  className={[
                    "h-5 w-5 object-contain transition",
                    isActive ? "opacity-95" : "opacity-70",
                  ].join(" ")}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {item.label}
                </span>

                <span
                  className={[
                    "mt-0.5 block truncate text-xs",
                    isActive ? "text-white/75" : "text-slate-400",
                  ].join(" ")}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}