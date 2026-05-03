"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/auth";

export default function LibraryPage() {
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  function handleLogout() {
    clearAuthSession();
  }

  return (
    <main className="min-h-screen bg-[#e9ecf4] px-6 py-8 text-[#17345d]">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col items-center justify-center text-center">
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
              Bạn đã đăng nhập bằng email{" "}
              <span className="font-semibold text-[#1e4f8d]">{session.email}</span>.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 cursor-pointer rounded-[7px] bg-[#245895] px-6 py-3 font-bold text-white transition hover:bg-[#1d4d86]"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-lg text-[#667085]">
              Bạn chưa đăng nhập. Hãy đăng nhập để tiếp tục.
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
