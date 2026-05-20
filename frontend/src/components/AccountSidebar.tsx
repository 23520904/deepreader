"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
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
    href: "/contact",
    icon: "/assets/icons/sidebar/question-mark-icon.png",
  },
] as const;

export const DEFAULT_USER_ICON = "/assets/icons/sidebar/user-icon.png";
const LOGOUT_ICON = "/assets/icons/sidebar/logout-icon.png";
export const accountIconTint = {
  filter:
    "invert(26%) sepia(89%) saturate(1558%) hue-rotate(222deg) brightness(91%) contrast(88%)",
};

type AccountSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  session: AuthResponse;
};

type AccountAvatarProps = {
  avatarUrl?: string | null;
  size: number;
  imagePaddingClassName: string;
  className?: string;
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

export function AccountAvatar({
  avatarUrl,
  size,
  imagePaddingClassName,
  className = "",
}: AccountAvatarProps) {
  const trimmedAvatarUrl = avatarUrl?.trim();

  return (
    <div className={`overflow-hidden rounded-full bg-[#eaf2ff] ${className}`}>
      {trimmedAvatarUrl ? (
        <span
          aria-hidden="true"
          className="block h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(trimmedAvatarUrl)})` }}
        />
      ) : (
        <Image
          src={DEFAULT_USER_ICON}
          alt=""
          width={size}
          height={size}
          className={`h-full w-full object-cover ${imagePaddingClassName}`}
          style={accountIconTint}
        />
      )}
    </div>
  );
}

export function AccountSidebar({
  isOpen,
  onClose,
  onLogout,
  session,
}: AccountSidebarProps) {
  const displayName = getAccountName(session);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50"
      aria-hidden={false}
    >
      <button
        type="button"
        className="account-sidebar-backdrop absolute inset-0 cursor-default bg-[#07111f]/36 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="Close account sidebar"
      />

      <aside
        className="account-sidebar-panel absolute right-0 top-0 flex h-dvh w-[min(320px,calc(100vw_-_28px))] flex-col bg-white px-7 py-8 text-[#2f47b8] shadow-[-26px_0_70px_rgba(12,22,48,0.18)]"
        aria-label="Account sidebar"
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#dfe5f4] bg-white text-[#2f47b8] shadow-[0_8px_18px_rgba(47,71,184,0.10)] transition hover:bg-[#eef3ff] hover:text-[#223aa4] focus:outline-none focus:ring-4 focus:ring-[#5d6bd6]/20"
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

        <div className="flex items-center gap-4 pr-9">
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
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="grid min-h-[54px] grid-cols-[26px_1fr] items-center gap-4 rounded-[8px] px-2 text-[14px] font-black text-[#2f47b8] transition hover:bg-[#eef3ff] hover:text-[#223aa4]"
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
          {secondarySidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="grid min-h-[54px] grid-cols-[26px_1fr] items-center gap-4 rounded-[8px] px-2 text-[14px] font-black text-[#2f47b8] transition hover:bg-[#eef3ff] hover:text-[#223aa4]"
            >
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                className="h-[22px] w-[22px] object-contain"
              />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="grid min-h-[54px] w-full cursor-pointer grid-cols-[26px_1fr] items-center gap-4 rounded-[8px] px-2 text-left text-[14px] font-black text-[#2f47b8] transition hover:bg-[#eef3ff] hover:text-[#223aa4]"
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
}
