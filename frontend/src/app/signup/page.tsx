"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { PasswordField } from "@/components/PasswordField";
import { clearAuthSession, registerUser, type AuthCredentials } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingCredentials, setPendingCredentials] =
    useState<AuthCredentials | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!userName.trim()) {
      setMessage("Please enter a user name.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Confirm password does not match.");
      return;
    }

    setPendingCredentials({
      email: email.trim(),
      password,
    });
    setVerificationCode(String(Math.floor(1000 + Math.random() * 9000)));
    setVerificationInput("");
    setVerificationMessage("");
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerificationMessage("");

    if (!pendingCredentials) {
      setVerificationMessage("Please submit the form again.");
      return;
    }

    if (verificationInput.length !== 4) {
      setVerificationMessage("Please enter 4 digits.");
      return;
    }

    if (verificationInput !== verificationCode) {
      setVerificationMessage("Verification code is not correct.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser(pendingCredentials);
      clearAuthSession();
      router.push("/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign up failed.");
      setPendingCredentials(null);
      setVerificationCode("");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleVerificationInputChange(value: string) {
    setVerificationInput(value.replace(/\D/g, "").slice(0, 4));
    setVerificationMessage("");
  }

  function closeVerification() {
    if (isSubmitting) {
      return;
    }

    setPendingCredentials(null);
    setVerificationCode("");
    setVerificationInput("");
    setVerificationMessage("");
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[406px] lg:mx-0">
        <h1 className="whitespace-nowrap text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
          Create an account
        </h1>
        <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
          Join DeepReader to read, summarize and learn with AI.
        </p>

        <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="sr-only" htmlFor="userName">
              User Name
            </label>
            <input
              id="userName"
              type="text"
              value={userName}
              autoComplete="name"
              required
              placeholder="User Name"
              onChange={(event) => setUserName(event.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#c8ccd6] bg-white px-4 text-[14px] text-[#17213a] outline-none transition placeholder:text-[#9095a1] focus:border-[#255895] focus:ring-4 focus:ring-[#255895]/10 sm:h-12"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              required
              placeholder="Email"
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-[8px] border border-[#c8ccd6] bg-white px-4 text-[14px] text-[#17213a] outline-none transition placeholder:text-[#9095a1] focus:border-[#255895] focus:ring-4 focus:ring-[#255895]/10 sm:h-12"
            />
          </div>

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
            Create Account
          </button>
        </form>

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

      {pendingCredentials ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4 backdrop-blur-[6px]">
          <form
            onSubmit={handleVerificationSubmit}
            className="w-full max-w-[360px] rounded-[14px] bg-white px-7 py-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.25)]"
          >
            <h2 className="text-[28px] font-extrabold leading-tight text-[#1e4f8d]">
              Verify sign up
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-[#7f8794]">
              Enter the 4-digit code to finish creating your account.
            </p>

            <div
              aria-label="Verification code image"
              className="relative mt-4 h-16 overflow-hidden rounded-[10px] border border-[#c8d4e6] bg-[#eef3fb]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18px_18px,rgba(36,88,149,0.18)_1px,transparent_1px)] bg-[length:18px_18px]" />
              <div className="absolute left-[-8%] top-1/2 h-[2px] w-[116%] -rotate-6 bg-[#245895]/15" />
              <div className="absolute left-[-8%] top-1/3 h-[2px] w-[116%] rotate-3 bg-[#245895]/10" />
              <div className="relative flex h-full select-none items-center justify-center">
                <span className="rotate-[-2deg] text-[32px] font-extrabold tracking-[0.35em] text-[#245895]/75 blur-[0.7px] [text-shadow:0_1px_0_rgba(255,255,255,0.75)]">
                  {verificationCode}
                </span>
              </div>
            </div>

            <label className="sr-only" htmlFor="verificationCode">
              Verification code
            </label>
            <input
              id="verificationCode"
              value={verificationInput}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoFocus
              placeholder="0000"
              onChange={(event) => handleVerificationInputChange(event.target.value)}
              className="mt-5 h-14 w-full rounded-[8px] border border-[#c8ccd6] bg-white px-4 text-center text-[28px] font-bold tracking-[0.35em] text-[#17213a] outline-none transition placeholder:text-[#c1c7d0]/70 focus:border-[#255895] focus:ring-4 focus:ring-[#255895]/10"
            />

            {verificationMessage ? (
              <p className="mt-3 rounded-[8px] bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {verificationMessage}
              </p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeVerification}
                disabled={isSubmitting}
                className="h-12 flex-1 cursor-pointer rounded-[7px] border border-[#c8ccd6] text-[15px] font-bold text-[#667085] transition hover:bg-[#f3f5f9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 flex-1 cursor-pointer rounded-[7px] bg-[#245895] text-[15px] font-bold text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
              >
                {isSubmitting ? "Creating..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AuthShell>
  );
}
