import Image from "next/image";
import type { ReactNode } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[#e9ecf4] text-[#1c4d89]">
      <SiteNavbar />

      <section className="mx-auto flex w-full max-w-[1144px] flex-1 items-center justify-center px-3 py-6 sm:px-5 sm:py-8 lg:py-10">
        <div className="grid w-full max-w-[440px] overflow-hidden rounded-[18px] bg-white sm:max-w-[520px] lg:h-[min(572px,calc(100dvh-120px))] lg:max-w-none lg:grid-cols-2 lg:rounded-[22px]">
          <div className="flex items-center px-5 py-6 min-[380px]:px-7 sm:px-14 sm:py-8 lg:px-[76px] lg:py-6">
            <div className="w-full">{children}</div>
          </div>

          <aside className="hidden flex-col items-center justify-center bg-[#d1dceb] px-8 py-8 text-center lg:flex lg:min-h-full">
            <Image
              src="/deepreader-logo.png"
              alt="DeepReader AI logo"
              width={612}
              height={408}
              priority
              className="mb-1 h-auto w-[270px] object-contain xl:w-[300px]"
            />
            <h2 className="max-w-[520px] text-[29px] font-extrabold leading-[1.22] tracking-[0] text-[#1d4f8e] sm:text-[31px]">
              Read smarter and learn faster with DeepReader AI
            </h2>
            <p className="mt-5 text-[17px] font-medium text-[#8b929d] sm:text-[18px]">
              AI Summary. Smart Flashcards. Book Chat Assistant.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
