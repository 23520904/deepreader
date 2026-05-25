"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AccountAvatar, accountIconTint } from "@/components/AccountAvatar";
import { ConfigureModal } from "@/components/ConfigureModal";
import type { AuthResponse } from "@/types/auth";

const sidebarItems = [
  {
    label: "PROFILE",
    href: "/profile",
    icon: "/assets/icons/sidebar/profile-icon.png",
  },
  {
    label: "LIBRARY",
    href: "/library",
    icon: "/assets/icons/sidebar/library-icon.png",
  },
  {
    label: "FLASHCARDS",
    href: "/flashcards",
    icon: "/assets/icons/sidebar/flashcard-icon.png",
  },
] as const;

const secondarySidebarItems = [
  {
    label: "HELP CENTER",
    href: "/help-center",
    icon: "/assets/icons/sidebar/question-mark-icon.png",
  },
] as const;

const LOGOUT_ICON = "/assets/icons/sidebar/logout-icon.png";

type AccountSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  session: AuthResponse;
};

export function getAccountDisplayName(email: string) {
  const localPart = email.split("@")[0] || "Reader";

  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAccountName(session: AuthResponse) {
  return session.username?.trim() || getAccountDisplayName(session.email);
}

export function getAccountInitials(email: string) {
  const displayName = getAccountDisplayName(email);
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");

  return initials || "DR";
}

export function AccountSidebar({
  isOpen,
  onClose,
  onLogout,
  session,
}: AccountSidebarProps) {
  const displayName = getAccountName(session);
  const [shouldRenderSidebar, setShouldRenderSidebar] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const sidebarTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const mountTimer = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    return () => window.clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (sidebarTimerRef.current) {
        window.clearTimeout(sidebarTimerRef.current);
        sidebarTimerRef.current = null;
      }

      const openTimer = window.setTimeout(() => {
        setShouldRenderSidebar(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsSidebarVisible(true);
          });
        });
      }, 0);

      return () => window.clearTimeout(openTimer);
    }

    const visibilityTimer = window.setTimeout(() => {
      setIsSidebarVisible(false);
    }, 0);

    if (sidebarTimerRef.current) {
      window.clearTimeout(sidebarTimerRef.current);
    }

    sidebarTimerRef.current = window.setTimeout(() => {
      setShouldRenderSidebar(false);
      sidebarTimerRef.current = null;
    }, 460);

    return () => window.clearTimeout(visibilityTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRenderSidebar) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    if (!isMobile) {
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }

    const scrollY = window.scrollY;

    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;

      window.removeEventListener("keydown", handleKeyDown);
      window.scrollTo(0, scrollY);
    };
  }, [shouldRenderSidebar, onClose]);

  useEffect(() => {
    return () => {
      if (sidebarTimerRef.current) {
        window.clearTimeout(sidebarTimerRef.current);
      }
    };
  }, []);

  if (!isMounted || !shouldRenderSidebar) {
    return null;
  }

  const sidebarContent = (
    <div
      className="fixed inset-0 isolate z-[9999] overflow-hidden overscroll-none"
      aria-hidden={false}
    >
      <button
        type="button"
        className={`fixed inset-0 z-0 cursor-default bg-[#07111f]/40 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isSidebarVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="Close account sidebar"
      />

      <aside
        className={`fixed right-0 top-0 z-10 flex h-dvh w-[min(360px,calc(100vw_-_18px))] flex-col overflow-y-auto overscroll-contain rounded-l-[28px] bg-[#f8fbff] px-7 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-[#2f47b8] shadow-[-26px_0_70px_rgba(12,22,48,0.22)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-[420px]:w-[calc(100vw_-_10px)] max-[420px]:rounded-l-[22px] max-[420px]:px-5 max-[420px]:py-7 max-[420px]:pb-[calc(1.75rem+env(safe-area-inset-bottom))] ${
          isSidebarVisible
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
        aria-label="Account sidebar"
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#dfe5f4] bg-white text-[#2f47b8] shadow-[0_8px_18px_rgba(47,71,184,0.10)] transition hover:bg-[#eef3ff] hover:text-[#223aa4] focus:outline-none focus:ring-4 focus:ring-[#5d6bd6]/20"
          aria-label="Close account sidebar"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div
          className={`flex items-center gap-4 pr-9 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isSidebarVisible
              ? "translate-x-0 opacity-100 delay-100"
              : "translate-x-4 opacity-0"
          }`}
        >
          <AccountAvatar
            avatarUrl={session.avatarUrl}
            size={58}
            imagePaddingClassName="p-3"
            className="grid h-[58px] w-[58px] shrink-0 place-items-center shadow-[0_12px_28px_rgba(36,88,149,0.22)]"
          />

          <div className="min-w-0 text-left">
            <p className="truncate text-[15px] font-black uppercase leading-tight text-[#4053c7]">
              {displayName}
            </p>
            <p className="mt-1 truncate text-[12px] font-semibold normal-case text-[#8a94b8]">
              {session.email}
            </p>
          </div>
        </div>

        <nav className="mt-10 grid gap-1">
          {sidebarItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              style={{
                transitionDelay: isSidebarVisible
                  ? `${150 + index * 55}ms`
                  : "0ms",
              }}
              className={`grid min-h-[54px] grid-cols-[26px_1fr] items-center gap-4 rounded-[12px] px-3 text-[14px] font-black text-[#2f47b8] transition-[opacity,transform,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#eef3ff] hover:text-[#223aa4] ${
                isSidebarVisible
                  ? "translate-x-0 opacity-100"
                  : "translate-x-5 opacity-0"
              }`}
            >
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                className="h-[22px] w-[22px] object-contain"
                style={accountIconTint}
              />

              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#dfe5f4] pt-5">
          {secondarySidebarItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              style={{
                transitionDelay: isSidebarVisible
                  ? `${260 + index * 55}ms`
                  : "0ms",
              }}
              className={`grid min-h-[54px] grid-cols-[26px_1fr] items-center gap-4 rounded-[12px] px-3 text-[14px] font-black text-[#2f47b8] transition-[opacity,transform,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#eef3ff] hover:text-[#223aa4] ${
                isSidebarVisible
                  ? "translate-x-0 opacity-100"
                  : "translate-x-5 opacity-0"
              }`}
            >
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                className="h-[22px] w-[22px] object-contain"
                style={accountIconTint}
              />

              <span>{item.label}</span>
            </Link>
          ))}

          {/* Configure AI — nhập API key */}
          <button
            type="button"
            onClick={() => setIsConfigureOpen(true)}
            style={{
              transitionDelay: isSidebarVisible ? "315ms" : "0ms",
            }}
            className={`grid min-h-[54px] w-full cursor-pointer grid-cols-[26px_1fr] items-center gap-4 rounded-[12px] px-3 text-left text-[14px] font-black text-[#2f47b8] transition-[opacity,transform,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#eef3ff] hover:text-[#223aa4] ${
              isSidebarVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-5 opacity-0"
            }`}
          >
            <span className="grid h-[22px] w-[22px] place-items-center">
              <svg
                aria-hidden="true"
                className="h-[20px] w-[20px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={accountIconTint}
              >
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
                <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
              </svg>
            </span>
            <span>CONFIGURE AI</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              transitionDelay: isSidebarVisible ? "370ms" : "0ms",
            }}
            className={`grid min-h-[54px] w-full cursor-pointer grid-cols-[26px_1fr] items-center gap-4 rounded-[12px] px-3 text-left text-[14px] font-black text-[#2f47b8] transition-[opacity,transform,background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#eef3ff] hover:text-[#223aa4] ${
              isSidebarVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-5 opacity-0"
            }`}
          >
            <Image
              src={LOGOUT_ICON}
              alt=""
              width={24}
              height={24}
              className="h-[22px] w-[22px] object-contain"
              style={accountIconTint}
            />

            <span>LOG OUT</span>
          </button>
        </div>
      </aside>
    </div>
  );

  return (
    <>
      {createPortal(sidebarContent, document.body)}
      <ConfigureModal
        isOpen={isConfigureOpen}
        onClose={() => setIsConfigureOpen(false)}
        token={session.token}
      />
    </>
  );
}
