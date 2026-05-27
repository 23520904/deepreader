"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type SyntheticEvent } from "react";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { InputField } from "@/components/InputField";
import { PasswordField } from "@/components/PasswordField";
import { clearAuthSession, saveAuthSession } from "@/lib/authSession";
import { googleLogin, registerUser } from "@/services/authService";

export default function SignupPage() {
  const router = useRouter();
  const registerInFlightRef = useRef(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (registerInFlightRef.current) {
      return;
    }

    if (!userName.trim()) {
      setMessage("Please enter a user name.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Confirm password does not match.");
      return;
    }

    const credentials = {
      email: email.trim(),
      password,
      username: userName.trim(),
    };

    console.log("[DeepReader signup direct register]", {
      email: credentials.email,
      username: credentials.username,
    });

    registerInFlightRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await registerUser(credentials);
      clearAuthSession();
      sessionStorage.setItem(
        "deepreader.pendingVerificationEmail",
        response.email || credentials.email,
      );
      router.push(`/verify-email?email=${encodeURIComponent(response.email || credentials.email)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      registerInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setMessage("");
      setIsGoogleSubmitting(true);

      try {
        const session = await googleLogin({ idToken });
        saveAuthSession(session);
        router.replace(session.role?.toUpperCase() === "ADMIN" ? "/admin" : "/");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Google signup failed.");
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [router],
  );

  return (
    <div className="mx-auto w-full max-w-[406px] lg:mx-0">
      <h1 className="whitespace-nowrap text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
        Create an account
      </h1>

      <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
        Join DeepReader to read, summarize and learn with AI.
      </p>

      <form
        className="mt-4 space-y-3 sm:mt-5 sm:space-y-4"
        onSubmit={handleSubmit}
      >
        <InputField
          id="userName"
          label="User Name"
          value={userName}
          autoComplete="name"
          onChange={setUserName}
        />

        <InputField
          id="email"
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={setEmail}
        />

        <PasswordField
          id="password"
          label="Password"
          value={password}
          autoComplete="new-password"
          onChange={setPassword}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          autoComplete="new-password"
          onChange={setConfirmPassword}
        />

        {message ? (
          <p className="rounded-[8px] bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full cursor-pointer items-center justify-center rounded-[7px] bg-[#245895] px-5 text-[16px] font-bold text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
        >
          {isSubmitting ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0] text-[#8d929d]">
        <span className="h-px flex-1 bg-[#d7dce5]" />
        <span>or</span>
        <span className="h-px flex-1 bg-[#d7dce5]" />
      </div>

      <GoogleAuthButton
        disabled={isSubmitting || isGoogleSubmitting}
        onCredential={handleGoogleCredential}
      />

      <p className="mt-4 text-center text-[18px] leading-[1.35] text-[#8d929d] sm:mt-5">
        Already have an account?{" "}
        <Link
          className="cursor-pointer font-medium text-[#174987] hover:text-[#123a6d]"
          href="/login"
        >
          Login now
        </Link>
      </p>
    </div>
  );
}
