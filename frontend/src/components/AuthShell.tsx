import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Library", href: "/library" },
  { label: "Flashcards", href: "/#flashcards" },
  { label: "Contact", href: "/#contact" },
];

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="flex h-dvh flex-col overflow-y-auto bg-[#e9ecf4] text-[#1c4d89] lg:overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between bg-white px-4 shadow-[0_4px_18px_rgba(31,41,55,0.14)] sm:h-20 sm:px-8 lg:h-[88px] lg:px-[86px]">
        <Link
          href="/"
          className="cursor-pointer text-[24px] font-bold tracking-[0] text-[#3449aa] sm:text-[28px] lg:text-[30px]"
        >
          DeepReader
        </Link>

        <nav className="hidden items-center gap-8 text-[15px] font-semibold text-[#253ba5] lg:flex xl:gap-[54px]">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="cursor-pointer transition hover:text-[#1f5597]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="flex h-10 min-w-[88px] cursor-pointer items-center justify-center rounded-[2px] bg-[#5861c6] px-5 text-[14px] font-semibold text-white transition hover:bg-[#4852b8] sm:h-11 sm:min-w-[106px] sm:px-6 sm:text-[15px]"
        >
          Login
        </Link>
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-[1144px] flex-1 items-center justify-center px-3 py-3 sm:px-5 sm:py-5 lg:py-6">
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
