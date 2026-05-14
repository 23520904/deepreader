"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Library", href: "/library" },
  { label: "Flashcards", href: "/#flashcards" },
  { label: "Contact", href: "/contact" },
];

type SiteNavbarProps = {
  activeItem?: string;
};

export function SiteNavbar({ activeItem }: SiteNavbarProps) {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  function handleLogout() {
    clearAuthSession();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-[#eef2f8]/90 shadow-[0_14px_32px_rgba(18,31,65,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[66px] w-[min(1180px,calc(100%_-_40px))] items-center justify-between gap-4 max-[1050px]:min-h-0 max-[1050px]:flex-wrap max-[1050px]:py-3 max-[700px]:w-[min(calc(100%_-_28px),1180px)] max-[700px]:justify-center max-[700px]:text-center">
        <Link
          href="/"
          className="flex h-[58px] w-[52px] items-center justify-center transition hover:-translate-y-0.5 max-[700px]:h-[54px] max-[700px]:w-[49px]"
          aria-label="DeepReader Home"
        >
          <Image
            src="/deepreader-navbar-logo.png"
            alt=""
            width={252}
            height={320}
            priority
            className="h-[54px] w-auto object-contain drop-shadow-[0_7px_9px_rgba(29,53,91,0.18)] max-[700px]:h-[50px]"
          />
        </Link>

        <nav className="flex items-center justify-center gap-1 rounded-[8px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-1 text-[14px] font-bold text-[#2f4195] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_26px_rgba(34,54,111,0.10)] max-[1050px]:order-3 max-[1050px]:w-full max-[1050px]:flex-wrap">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-[38px] min-w-[82px] items-center justify-center rounded-[6px] px-4 transition duration-200 hover:-translate-y-0.5 hover:bg-[#eef3ff] hover:text-[#273a99] hover:shadow-[0_8px_18px_rgba(62,80,180,0.14)] max-[1050px]:min-w-0 max-[1050px]:px-[16px] ${
                item.label === activeItem
                  ? "bg-[linear-gradient(145deg,#ffffff_0%,#e9efff_58%,#d4ddff_100%)] text-[#273a99] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_9px_18px_rgba(62,80,180,0.20)]"
                  : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {session ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[40px] min-w-[96px] cursor-pointer items-center justify-center rounded-[8px] bg-[linear-gradient(145deg,#6976d6_0%,#4d5ab8_100%)] px-5 text-[14px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_22px_rgba(77,88,181,0.24)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_28px_rgba(77,88,181,0.30)] max-[700px]:min-h-10"
          >
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-[40px] min-w-[96px] items-center justify-center rounded-[8px] bg-[linear-gradient(145deg,#6976d6_0%,#4d5ab8_100%)] px-5 text-[14px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_22px_rgba(77,88,181,0.24)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_28px_rgba(77,88,181,0.30)] max-[700px]:min-h-10"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
