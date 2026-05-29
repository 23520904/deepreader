"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { AuthDivider } from "@/components/AuthDivider";
import { GoogleOAuthButton } from "@/components/GoogleOAuthButton";
import { InputField } from "@/components/InputField";
import { PasswordField } from "@/components/PasswordField";
import { saveAuthSession } from "@/lib/authSession";
import { loginUser } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const session = await loginUser({
        email: email.trim(),
        password,
      });
      saveAuthSession(session);
      router.replace(session.role?.toUpperCase() === "ADMIN" ? "/admin" : "/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[406px] lg:mx-0">
      <h1 className="text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
        Welcome Back!
      </h1>

      <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
        Log in to continue learning with DeepReader AI.
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

        <PasswordField
          id="password"
          label="Password"
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
        />

        <div className="text-right">
          <Link
            className="text-sm font-bold text-[#174987] hover:text-[#123a6d]"
            href="/forgot-password"
          >
            Forgot Password?
          </Link>
        </div>

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
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <AuthDivider />
      <GoogleOAuthButton disabled={isSubmitting} />

      <p className="mt-4 text-center text-[18px] leading-[1.35] text-[#8d929d] sm:mt-5">
        Not a member?{" "}
        <Link
          className="cursor-pointer font-medium text-[#174987] hover:text-[#123a6d]"
          href="/signup"
        >
          Register now
        </Link>
      </p>
    </div>
  );
}
