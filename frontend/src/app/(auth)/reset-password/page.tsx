"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type SyntheticEvent } from "react";
import { InputField } from "@/components/InputField";
import { PasswordField } from "@/components/PasswordField";
import { resetPassword } from "@/services/authService";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => {
    const queryEmail = searchParams.get("email")?.trim() ?? "";
    const storedEmail =
      typeof window !== "undefined"
        ? sessionStorage.getItem("deepreader.pendingPasswordResetEmail") ?? ""
        : "";

    return queryEmail || storedEmail;
  });
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setMessage("Please enter the 6-digit reset code.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Confirm password does not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        email: trimmedEmail,
        otp: trimmedOtp,
        newPassword,
      });
      sessionStorage.removeItem("deepreader.pendingPasswordResetEmail");
      setMessage(response.message);
      window.setTimeout(() => router.replace("/login"), 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[406px] lg:mx-0">
      <h1 className="text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
        Enter reset code
      </h1>

      <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
        Use the code from your email and choose a new password.
      </p>

      <form
        className="mt-4 space-y-3 sm:mt-5 sm:space-y-4"
        onSubmit={handleSubmit}
      >
        <InputField
          id="email"
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={setEmail}
        />

        <InputField
          id="otp"
          label="Reset Code"
          value={otp}
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
        />

        <PasswordField
          id="newPassword"
          label="New Password"
          value={newPassword}
          autoComplete="new-password"
          onChange={setNewPassword}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          autoComplete="new-password"
          onChange={setConfirmPassword}
        />

        {message ? (
          <p className="rounded-[8px] bg-blue-50 px-4 py-3 text-sm font-medium text-[#1e4f8d]">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full cursor-pointer items-center justify-center rounded-[7px] bg-[#245895] px-5 text-[16px] font-bold text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      <p className="mt-4 text-center text-[18px] leading-[1.35] text-[#8d929d] sm:mt-5">
        Need a new code?{" "}
        <Link
          className="cursor-pointer font-medium text-[#174987] hover:text-[#123a6d]"
          href="/forgot-password"
        >
          Send again
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
