"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { AuthDivider } from "@/components/AuthDivider";
import { GoogleOAuthButton } from "@/components/GoogleOAuthButton";
import { InputField } from "@/components/InputField";
import { OtpVerificationPanel } from "@/components/OtpVerificationPanel";
import { PasswordField } from "@/components/PasswordField";
import { saveAuthSession } from "@/lib/authSession";
import { registerUser, requestRegistrationOtp } from "@/services/authService";
import type { AuthCredentials } from "@/types/auth";

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
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationMessageTone, setVerificationMessageTone] =
    useState<"info" | "error" | "success">("info");

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
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

    const credentials = {
      email: email.trim(),
      password,
      username: userName.trim(),
    };

    setIsSubmitting(true);
    try {
      await requestRegistrationOtp({ email: credentials.email });
      setPendingCredentials(credentials);
      setVerificationInput("");
      setVerificationMessage("");
      setVerificationMessageTone("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerificationSubmit(
    event: SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setVerificationMessage("");

    if (!pendingCredentials) {
      setVerificationMessageTone("error");
      setVerificationMessage("Please submit the form again.");
      return;
    }

    if (verificationInput.length !== 4) {
      setVerificationMessageTone("error");
      setVerificationMessage("Please enter 4 digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await registerUser({
        ...pendingCredentials,
        verificationCode: verificationInput,
      });
      saveAuthSession(session);
      router.replace(session.role?.toUpperCase() === "ADMIN" ? "/admin" : "/");
    } catch (error) {
      setVerificationMessageTone("error");
      setVerificationMessage(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleVerificationInputChange(value: string) {
    setVerificationInput(value.replace(/\D/g, "").slice(0, 4));
    setVerificationMessage("");
    setVerificationMessageTone("info");
  }

  function closeVerification() {
    if (isSubmitting) {
      return;
    }

    setPendingCredentials(null);
    setVerificationInput("");
    setVerificationMessage("");
    setVerificationMessageTone("info");
  }

  async function resendVerificationCode() {
    if (!pendingCredentials || isSubmitting) {
      return;
    }

    setVerificationMessage("");
    setIsSubmitting(true);
    try {
      await requestRegistrationOtp({ email: pendingCredentials.email });
      setVerificationInput("");
      setVerificationMessageTone("success");
      setVerificationMessage("A new code was sent to your email.");
    } catch (error) {
      setVerificationMessageTone("error");
      setVerificationMessage(error instanceof Error ? error.message : "Could not resend code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pendingCredentials) {
    return (
      <OtpVerificationPanel
        title="OTP Verification"
        description={`Please enter the 4-digit code sent to ${pendingCredentials.email} to complete your DeepReader account.`}
        value={verificationInput}
        message={verificationMessage}
        messageTone={verificationMessageTone}
        submitLabel="Verify"
        submittingLabel="Creating..."
        isSubmitting={isSubmitting}
        onChange={handleVerificationInputChange}
        onSubmit={handleVerificationSubmit}
        onCancel={closeVerification}
        onResend={resendVerificationCode}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[460px] lg:mx-0">
      <h1 className="text-center text-[clamp(32px,8.4vw,50px)] font-extrabold leading-[1.08] tracking-[0] text-[#1e4f8d]">
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
          {isSubmitting ? "Sending code..." : "Create Account"}
        </button>
      </form>

      <AuthDivider />
      <GoogleOAuthButton disabled={isSubmitting} />

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
