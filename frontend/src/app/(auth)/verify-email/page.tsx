"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type SyntheticEvent } from "react";
import { InputField } from "@/components/InputField";
import { resendOtp, verifyEmail } from "@/services/authService";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => {
    const queryEmail = searchParams.get("email")?.trim() ?? "";
    const storedEmail =
      typeof window !== "undefined"
        ? sessionStorage.getItem("deepreader.pendingVerificationEmail") ?? ""
        : "";

    return queryEmail || storedEmail;
  });
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

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
      setMessage("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await verifyEmail({
        email: trimmedEmail,
        otp: trimmedOtp,
      });
      sessionStorage.removeItem("deepreader.pendingVerificationEmail");
      setMessage(response.message);
      router.replace("/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setIsResending(true);

    try {
      const response = await resendOtp(trimmedEmail);
      setMessage(response.message);
      setCooldown(60);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend the code.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[406px] lg:mx-0">
      <h1 className="text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
        Verify your email
      </h1>

      <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
        Enter the code sent to your email to finish creating your account.
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
          label="Verification Code"
          value={otp}
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
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
          {isSubmitting ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <button
        type="button"
        disabled={isResending || cooldown > 0}
        onClick={handleResend}
        className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center rounded-[7px] border border-[#b8c7da] bg-white px-5 text-[15px] font-bold text-[#245895] transition hover:bg-[#f3f7fb] disabled:cursor-not-allowed disabled:text-[#8aa8cc]"
      >
        {isResending
          ? "Sending..."
          : cooldown > 0
            ? `Resend code in ${cooldown}s`
            : "Resend code"}
      </button>

      <p className="mt-4 text-center text-[18px] leading-[1.35] text-[#8d929d] sm:mt-5">
        Already verified?{" "}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
