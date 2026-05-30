"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";

// Props for the authentication layout wrapper.
// children is the page content, such as login, signup, or forgot password form.
type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  // Gets the current URL path so the layout can adjust for different auth pages.
  const pathname = usePathname();

  // Signup and forgot password pages need more vertical space than the login page.
  const isTallAuth = pathname === "/signup" || pathname === "/forgot-password";

  return (
    <main className="flex min-h-screen flex-col bg-[#e9ecf4] text-[#1c4d89]">
      {/* Top navigation shared across authentication pages. */}
      <SiteNavbar />

      {/* Main centered area that holds the authentication card. */}
      <section className="mx-auto flex w-full max-w-[1320px] flex-1 items-center justify-center px-3 py-5 sm:px-5 sm:py-7 lg:py-8">
        {/* Auth card container. On large screens, it becomes a two-column layout. */}
        <div className="relative w-full max-w-[460px] overflow-hidden rounded-[20px] bg-white shadow-[0_22px_70px_rgba(20,45,80,0.14)] sm:max-w-[560px] lg:grid lg:min-h-[660px] lg:max-w-none lg:grid-cols-2 lg:rounded-[24px] xl:min-h-[700px]">
          {/* Left side: authentication form content. */}
          <div
            className={[
              "relative z-20 flex w-full items-center bg-white px-5 py-7 min-[380px]:px-7 sm:px-14 sm:py-9 lg:px-[88px] lg:py-10",
              isTallAuth ? "min-h-[720px] lg:min-h-[700px]" : "min-h-[560px] lg:min-h-[660px]",
            ].join(" ")}
          >
            {/* 
              The key uses pathname to replay the small form animation
              when the user moves between auth pages.
            */}
            <div
              key={pathname}
              className="w-full animate-[authFormIn_220ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
            >
              {children}
            </div>
          </div>

          {/* Right side: brand image and marketing text, hidden on smaller screens. */}
          <aside className="hidden bg-[#d4dfef] lg:flex">
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-10 py-10 text-center">
              {/* Decorative background gradient. */}
              <div className="absolute inset-0 bg-[linear-gradient(145deg,#e0e9f6_0%,#d2deee_52%,#c4d4e8_100%)]" />

              {/* Decorative shapes for the visual panel. */}
              <div className="absolute left-10 top-10 h-16 w-16 rounded-full border border-white/55" />
              <div className="absolute bottom-12 right-12 h-24 w-24 rounded-full border border-white/45" />
              <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#245895]/10 blur-2xl" />

              {/* Brand content shown in the right panel. */}
              <div className="relative z-10">
                <Image
                  src="/assets/images/brand/deepreader-auth-logo.png"
                  alt="DeepReader AI logo"
                  width={612}
                  height={408}
                  priority
                  className="mx-auto h-auto w-[275px] object-contain"
                />

                <h2 className="mt-2 max-w-[480px] text-[34px] font-extrabold leading-[1.18] tracking-[0] text-[#1d4f8e]">
                  Read smarter and learn faster with DeepReader AI
                </h2>

                <p className="mx-auto mt-5 max-w-[390px] text-[17px] font-medium leading-7 text-[#7b8796]">
                  AI Summary. Smart Flashcards. Book Chat Assistant.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}