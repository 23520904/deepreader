"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { AccountAvatar } from "@/components/AccountAvatar";

import {
  clearAuthSession,
  getAuthSessionSnapshot,
  syncProfileIntoSession,
  subscribeAuthSession,
} from "@/lib/authSession";
import { useAppPreferences } from "@/lib/appPreferences";

// Lazy load account sidebar to reduce initial bundle size
const LazyAccountSidebar = dynamic(
  () =>
    import("@/components/AccountSidebar").then(
      (module) => module.AccountSidebar,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

// Navigation items for normal users
const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Library", href: "/library" },
  { label: "Flashcards", href: "/flashcards" },
  { label: "Contact", href: "/contact" },
];

// Navigation items for admin users
const adminNavItems = [{ label: "Admin", href: "/admin" }];

type SiteNavbarProps = {
  // Currently active navigation item
  activeItem?: string;
};

export function SiteNavbar({ activeItem }: SiteNavbarProps) {
  const router = useRouter();
  const { t } = useAppPreferences();

  // Controls account sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Prevents loading sidebar until user opens it at least once
  const [hasRequestedSidebar, setHasRequestedSidebar] = useState(false);

  // Controls mobile menu animation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Controls whether mobile menu should exist in DOM
  const [shouldRenderMobileMenu, setShouldRenderMobileMenu] = useState(false);

  // Stores timeout id for menu closing animation
  const mobileMenuTimerRef = useRef<number | null>(null);

  // Subscribe to authentication session updates
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  // Show different navigation based on user role
  const visibleNavItems =
    session?.role?.toUpperCase() === "ADMIN" ? adminNavItems : navItems;

  // Close account sidebar
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Cleanup mobile menu timeout on unmount
  useEffect(() => {
    return () => {
      if (mobileMenuTimerRef.current) {
        window.clearTimeout(mobileMenuTimerRef.current);
      }
    };
  }, []);

  // Refresh user profile whenever a valid session token exists
  useEffect(() => {
    if (!session?.token) {
      return;
    }

    let isCancelled = false;

    Promise.all([
      import("@/services/apiClient"),
      import("@/services/profileService"),
    ])
      .then(([apiClient, profileService]) => {
        profileService
          .fetchUserProfile(session.token)
          .then((profile) => {
            if (!isCancelled) {
              syncProfileIntoSession(profile);
            }
          })
          .catch((error) => {
            // Logout user if token is no longer valid
            if (isCancelled || !apiClient.isAuthError(error)) {
              return;
            }

            clearAuthSession();
            setIsSidebarOpen(false);
          });
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [session?.token]);

  // Logout and redirect to home page
  function handleLogout() {
    setIsSidebarOpen(false);
    clearAuthSession();
    router.push("/");
  }

  // Open account sidebar and mark it as requested
  function openAccountSidebar() {
    setHasRequestedSidebar(true);
    setIsSidebarOpen(true);
  }

  // Open mobile menu with animation
  function openMobileMenu() {
    if (mobileMenuTimerRef.current) {
      window.clearTimeout(mobileMenuTimerRef.current);
      mobileMenuTimerRef.current = null;
    }

    setShouldRenderMobileMenu(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsMobileMenuOpen(true);
      });
    });
  }

  // Close mobile menu and wait for animation before removing from DOM
  function closeMobileMenu() {
    setIsMobileMenuOpen(false);

    if (mobileMenuTimerRef.current) {
      window.clearTimeout(mobileMenuTimerRef.current);
    }

    mobileMenuTimerRef.current = window.setTimeout(() => {
      setShouldRenderMobileMenu(false);
      mobileMenuTimerRef.current = null;
    }, 420);
  }

  // Toggle mobile menu state
  function toggleMobileMenu() {
    if (isMobileMenuOpen) {
      closeMobileMenu();
      return;
    }

    openMobileMenu();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-[#eef2f8]/90 shadow-[0_14px_32px_rgba(18,31,65,0.12)] backdrop-blur-xl">
      <div className="relative mx-auto flex min-h-[76px] w-[min(1180px,calc(100%_-_40px))] items-center justify-between gap-4 max-[700px]:min-h-[66px] max-[700px]:w-[min(calc(100%_-_28px),1180px)] max-[700px]:py-3">
        
        {/* Logo section */}
        <Link
          href="/"
          className="flex h-[64px] w-[170px] items-center justify-center overflow-hidden rounded-[8px] transition duration-300 hover:-translate-y-0.5 max-[700px]:h-[46px] max-[700px]:w-[118px]"
          aria-label={t("DeepReader Home")}
          onClick={closeMobileMenu}
        >
          <img
            src="/assets/images/brand/deepreader-navbar-logo-compact.webp"
            alt=""
            width={180}
            height={120}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-contain object-center drop-shadow-[0_7px_9px_rgba(29,53,91,0.12)]"
          />
        </Link>

        {/* Desktop navigation menu */}
        <nav className="hidden items-center justify-center gap-1 rounded-[8px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-1 text-[14px] font-bold text-[#2f4195] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_26px_rgba(34,54,111,0.10)] min-[700px]:flex">
          {visibleNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-[40px] min-w-[82px] items-center justify-center rounded-[6px] px-4 transition duration-200 hover:-translate-y-0.5 hover:bg-[#eef3ff] hover:text-[#273a99] hover:shadow-[0_8px_18px_rgba(62,80,180,0.14)] ${
                item.label === activeItem
                  ? "bg-[linear-gradient(145deg,#ffffff_0%,#e9efff_58%,#d4ddff_100%)] text-[#273a99] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_9px_18px_rgba(62,80,180,0.20)]"
                  : ""
              }`}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button and authentication area */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={`flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/80 bg-white text-[#2f4195] shadow-[0_10px_22px_rgba(34,54,111,0.12)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:scale-95 min-[700px]:hidden ${
              isMobileMenuOpen
                ? "rotate-90 bg-[#f8fbff] shadow-[0_14px_28px_rgba(34,54,111,0.16)]"
                : "rotate-0"
            }`}
            aria-label={t("Toggle mobile menu")}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="grid place-items-center transition-transform duration-300">
              {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </span>
          </button>

          {/* Authenticated user avatar */}
          {session ? (
            <button
              type="button"
              onClick={openAccountSidebar}
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-[#eaf2ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_13px_24px_rgba(77,88,181,0.20)] ring-2 ring-white/80 transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_17px_30px_rgba(77,88,181,0.27)] focus:outline-none focus:ring-4 focus:ring-[#5d6bd6]/30"
              aria-label={t("Open account sidebar")}
              aria-expanded={isSidebarOpen}
            >
              <AccountAvatar
                avatarUrl={session.avatarUrl}
                size={44}
                imagePaddingClassName="p-2.5"
                className="h-full w-full"
              />
            </button>
          ) : (
            /* Login button for guests */
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="flex min-h-[40px] min-w-[96px] items-center justify-center rounded-[8px] bg-[linear-gradient(145deg,#6976d6_0%,#4d5ab8_100%)] px-5 text-[14px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_22px_rgba(77,88,181,0.24)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_16px_28px_rgba(77,88,181,0.30)] max-[420px]:min-w-0 max-[420px]:px-4"
            >
              {t("Login")}
            </Link>
          )}
        </div>

        {/* Mobile navigation menu */}
        {shouldRenderMobileMenu ? (
          <div className="absolute left-1/2 top-full z-50 w-screen -translate-x-1/2 min-[700px]:hidden">
            <nav
              className={`w-full origin-top overflow-hidden border-y border-[#dbe5f3] bg-[#f8fbff] px-7 py-4 shadow-[0_24px_60px_rgba(18,31,65,0.22)] transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform max-[420px]:px-5 ${
                isMobileMenuOpen
                  ? "translate-y-0 opacity-100 blur-0"
                  : "pointer-events-none -translate-y-5 opacity-0 blur-[2px]"
              }`}
            >
              <div className="grid gap-1.5">
                {visibleNavItems.map((item, index) => {
                  const isActive = item.label === activeItem;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={closeMobileMenu}
                      style={{
                        transitionDelay: isMobileMenuOpen
                          ? `${index * 55}ms`
                          : "0ms",
                      }}
                      className={`group flex items-center justify-between rounded-[16px] px-5 py-4 text-[20px] font-extrabold transition-[opacity,transform,background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-[420px]:px-4 max-[420px]:py-3.5 max-[420px]:text-[17px] ${
                        isMobileMenuOpen
                          ? "translate-x-0 translate-y-0 opacity-100"
                          : "-translate-x-2 translate-y-2 opacity-0"
                      } ${
                        isActive
                          ? "bg-[linear-gradient(145deg,#ffffff_0%,#e9efff_58%,#d4ddff_100%)] text-[#273a99] shadow-[0_10px_20px_rgba(62,80,180,0.14)]"
                          : "text-[#2f4195] hover:bg-[#eef4ff] hover:text-[#273a99]"
                      }`}
                    >
                      <span>{t(item.label)}</span>

                      <span
                        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                          isActive
                            ? "scale-100 bg-[#5d6bd6]"
                            : "scale-0 bg-[#9aa8ff] group-hover:scale-100"
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        ) : null}
      </div>

      {/* Lazy loaded account sidebar */}
      {session && hasRequestedSidebar ? (
        <LazyAccountSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onLogout={handleLogout}
          session={session}
        />
      ) : null}
    </header>
  );
}

// Mobile menu icon
function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

// Close menu icon
function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}