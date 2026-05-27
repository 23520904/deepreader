"use client";

import Link from "next/link";
import { useState } from "react";

type FooterLink = {
  label: string;
  href: string;
};

type FooterGroup = {
  title: string;
  links: FooterLink[];
};

type MobileFooterAccordionProps = {
  groups: FooterGroup[];
};

export function MobileFooterAccordion({ groups }: MobileFooterAccordionProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const toggleGroup = (title: string) => {
    setOpenGroup((current) => (current === title ? null : title));
  };

  return (
    <div className="hidden max-[700px]:block">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        {groups.map((group, index) => {
          const isOpen = openGroup === group.title;

          return (
            <div
              key={group.title}
              className={index !== 0 ? "border-t border-white/10" : ""}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[14px] font-extrabold uppercase tracking-[0.04em] text-white">
                  {group.title}
                </span>

                <span
                  className={`text-[20px] leading-none text-[#78e7d8] transition-transform duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>

              <div
                className={`grid overflow-hidden transition-all duration-300 ease-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0">
                  <div className="grid gap-3 px-5 pb-5 text-[14px] text-[#9aa6ba]">
                    {group.links.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="w-fit transition duration-200 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
