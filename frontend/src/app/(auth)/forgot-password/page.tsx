"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { InputField } from "@/components/InputField";
import { forgotPassword } from "@/services/authService";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email: trimmedEmail });
      sessionStorage.setItem("deepreader.pendingPasswordResetEmail", trimmedEmail);
      setMessage(response.message);
      router.push(`/reset-password?email=${encodeURIComponent(trimmedEmail)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send a reset code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[406px] lg:mx-0">
      <h1 className="text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
        Reset password
      </h1>

      <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
        Enter your email and we will send a reset code if the account exists.
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
          {isSubmitting ? "Sending..." : "Send Code"}
        </button>
      </form>

      <p className="mt-4 text-center text-[18px] leading-[1.35] text-[#8d929d] sm:mt-5">
        Remembered your password?{" "}
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
