"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { InputField } from "@/components/InputField";
import { OtpVerificationPanel } from "@/components/OtpVerificationPanel";
import { PasswordField } from "@/components/PasswordField";
import {
  requestPasswordResetOtp,
  resetPassword,
} from "@/services/authService";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] =
    useState<"info" | "error" | "success">("info");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      await requestPasswordResetOtp({ email: email.trim() });
      setVerificationCode("");
      setStep("reset");
      setMessageTone("success");
      setMessage("A 4-digit code was sent to your email.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not send reset code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (verificationCode.length !== 4) {
      setMessageTone("error");
      setMessage("Please enter 4 digits.");
      return;
    }

    if (password !== confirmPassword) {
      setMessageTone("error");
      setMessage("Confirm password does not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        email: email.trim(),
        verificationCode,
        password,
      });
      router.push("/login");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOtpChange(value: string) {
    setVerificationCode(value.replace(/\D/g, "").slice(0, 4));
    setMessage("");
    setMessageTone("info");
  }

  async function resendPasswordResetCode() {
    if (isSubmitting) {
      return;
    }

    setMessage("");
    setIsSubmitting(true);
    try {
      await requestPasswordResetOtp({ email: email.trim() });
      setVerificationCode("");
      setMessageTone("success");
      setMessage("A new code was sent to your email.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not resend code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "reset") {
    return (
      <OtpVerificationPanel
        title="OTP Verification"
        description={`Please enter the 4-digit code sent to ${email.trim()} to reset your DeepReader password.`}
        value={verificationCode}
        message={message}
        messageTone={messageTone}
        submitLabel="Reset Password"
        submittingLabel="Updating..."
        cancelLabel="Change Email"
        isSubmitting={isSubmitting}
        onChange={handleOtpChange}
        onSubmit={handleResetPassword}
        onCancel={() => {
          setStep("email");
          setMessage("");
          setMessageTone("info");
        }}
        onResend={resendPasswordResetCode}
      >
        <PasswordField
          id="password"
          label="New Password"
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
      </OtpVerificationPanel>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[406px] lg:mx-0">
      <h1 className="text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
        Forgot Password
      </h1>

      <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
        Reset your password with a code sent to your email.
      </p>

      <form
        className="mt-4 space-y-3 sm:mt-5 sm:space-y-4"
        onSubmit={handleRequestCode}
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
          <p className="rounded-[8px] bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full cursor-pointer items-center justify-center rounded-[7px] bg-[#245895] px-5 text-[16px] font-bold text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8aa8cc]"
        >
          {isSubmitting ? "Sending code..." : "Send Code"}
        </button>
      </form>

      <p className="mt-4 text-center text-[18px] leading-[1.35] text-[#8d929d] sm:mt-5">
        Remember your password?{" "}
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
