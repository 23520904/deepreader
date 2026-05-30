"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveAuthSession } from "@/lib/authSession";
import type { AuthResponse } from "@/types/auth";

/**
 * Google OAuth callback page.
 * This page reads account data returned from the OAuth redirect URL,
 * saves the session, and redirects the user to the next page.
 */
export default function GoogleCallbackPage() {
  const router = useRouter();

  // Message shown while the OAuth callback is being processed.
  const [message, setMessage] = useState("Finishing Google login...");

  useEffect(() => {
    // OAuth data is returned in the URL hash, so it must be parsed on the client.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const error = params.get("error");

    /**
     * Updates the UI message after the current render cycle.
     * This keeps the callback handling safe while the effect is running.
     */
    function showMessage(nextMessage: string) {
      window.setTimeout(() => setMessage(nextMessage), 0);
    }

    // Stop the login flow when the OAuth provider returns an error.
    if (error) {
      showMessage(error);
      return;
    }

    // Required session values returned from the Google OAuth callback.
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const userId = params.get("userId");
    const email = params.get("email");
    const role = params.get("role");

    // Validate required account data before saving the session.
    if (!token || !refreshToken || !userId || !email || !role) {
      showMessage("Google login response is missing account data.");
      return;
    }

    // Build the auth session from callback parameters.
    const session: AuthResponse = {
      token,
      refreshToken,
      userId,
      email,
      role,
      username: params.get("username"),
      avatarUrl: params.get("avatarUrl"),
    };

    // Save the authenticated session before redirecting the user.
    saveAuthSession(session);

    // Redirect to the requested next page, or home when no next page is provided.
    router.replace(params.get("next") || "/");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e9ecf4] px-4 text-center text-[#1c4d89]">
      {/* Callback status card section. */}
      <div className="w-full max-w-[360px] rounded-[12px] bg-white px-7 py-8 shadow-[0_22px_70px_rgba(20,45,80,0.14)]">
        {/* Page title section. */}
        <h1 className="text-[28px] font-extrabold leading-tight text-[#1e4f8d]">
          Google Login
        </h1>

        {/* OAuth processing message section. */}
        <p className="mt-3 text-[15px] font-medium leading-6 text-[#7f8794]">
          {message}
        </p>
      </div>
    </main>
  );
}