"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();

  return (
    <main className="flex min-h-screen flex-col bg-[#e9ecf4] text-[#1c4d89]">
      <SiteNavbar />

      <section className="mx-auto flex w-full max-w-[1144px] flex-1 items-center justify-center px-3 py-6 sm:px-5 sm:py-8 lg:py-10">
        <div className="relative w-full max-w-[440px] overflow-hidden rounded-[20px] bg-white shadow-[0_22px_70px_rgba(20,45,80,0.14)] sm:max-w-[520px] lg:grid lg:h-[min(572px,calc(100dvh-120px))] lg:max-w-none lg:grid-cols-2 lg:rounded-[24px]">
          <div className="relative z-20 flex min-h-[520px] w-full items-center bg-white px-5 py-6 min-[380px]:px-7 sm:px-14 sm:py-8 lg:min-h-0 lg:px-[76px] lg:py-6">
            <div
              key={pathname}
              className="w-full animate-[authFormIn_220ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
            >
              {children}
            </div>
          </div>

          <aside className="hidden bg-[#d4dfef] lg:flex">
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-10 py-10 text-center">
              <div className="absolute inset-0 bg-[linear-gradient(145deg,#e0e9f6_0%,#d2deee_52%,#c4d4e8_100%)]" />

              <div className="absolute left-10 top-10 h-16 w-16 rounded-full border border-white/55" />
              <div className="absolute bottom-12 right-12 h-24 w-24 rounded-full border border-white/45" />
              <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#245895]/10 blur-2xl" />

              <div className="relative z-10">
                <Image
                  src="/assets/images/brand/deepreader-auth-logo.png"
                  alt="DeepReader AI logo"
                  width={612}
                  height={408}
                  priority
                  className="mx-auto h-auto w-[275px] object-contain"
                />

                <h2 className="mt-2 max-w-[440px] text-[30px] font-extrabold leading-[1.18] tracking-[-0.02em] text-[#1d4f8e]">
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
