"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveAuthSession } from "@/lib/authSession";
import type { AuthResponse } from "@/types/auth";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing Google login...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const error = params.get("error");

    function showMessage(nextMessage: string) {
      window.setTimeout(() => setMessage(nextMessage), 0);
    }

    if (error) {
      showMessage(error);
      return;
    }

    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const userId = params.get("userId");
    const email = params.get("email");
    const role = params.get("role");

    if (!token || !refreshToken || !userId || !email || !role) {
      showMessage("Google login response is missing account data.");
      return;
    }

    const session: AuthResponse = {
      token,
      refreshToken,
      userId,
      email,
      role,
      username: params.get("username"),
      avatarUrl: params.get("avatarUrl"),
    };

    saveAuthSession(session);
    router.replace(params.get("next") || "/");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9ecf4] px-4 text-center text-[#1c4d89]">
      <div className="w-full max-w-[360px] rounded-[12px] bg-white px-7 py-8 shadow-[0_22px_70px_rgba(20,45,80,0.14)]">
        <h1 className="text-[28px] font-extrabold leading-tight text-[#1e4f8d]">
          Google Login
        </h1>
        <p className="mt-3 text-[15px] font-medium leading-6 text-[#7f8794]">
          {message}
        </p>
      </div>
    </main>
  );
}
