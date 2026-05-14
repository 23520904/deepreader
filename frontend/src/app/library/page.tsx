"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getAuthSessionSnapshot, subscribeAuthSession } from "@/lib/auth";

export default function LibraryPage() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  return (
    <main className="min-h-screen bg-[#e9ecf4] text-[#17345d]">
      <SiteNavbar activeItem="Library" />

      <section className="mx-auto flex min-h-[calc(100vh-67px)] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <Image
          src="/deepreader-logo.png"
          alt="DeepReader AI logo"
          width={150}
          height={150}
          priority
          className="h-[150px] w-[150px] object-contain"
        />
        <h1 className="mt-8 text-4xl font-extrabold text-[#1e4f8d]">
          DeepReader Library
        </h1>

        {session ? (
          <>
            <p className="mt-4 text-lg text-[#667085]">
              Your account is ready. Continue from the home workspace.
            </p>
            <Link
              href="/"
              className="mt-8 cursor-pointer rounded-[7px] bg-[#245895] px-6 py-3 font-bold text-white transition hover:bg-[#1d4d86]"
            >
              Go Home
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-lg text-[#667085]">
              Log in to open your reading workspace.
            </p>
            <Link
              href="/login"
              className="mt-8 cursor-pointer rounded-[7px] bg-[#245895] px-6 py-3 font-bold text-white transition hover:bg-[#1d4d86]"
            >
              Go to Login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
