"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { PasswordField } from "@/components/PasswordField";
import { loginUser, saveAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const session = await loginUser({
        email: email.trim(),
        password,
      });
      saveAuthSession(session);
      router.push("/library");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng nhập thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[406px] lg:mx-0">
        <h1 className="text-center text-[clamp(28px,8.4vw,46px)] font-extrabold leading-[1.05] tracking-[0] text-[#1e4f8d]">
          Welcome Back!
        </h1>
        <p className="mt-3 text-center text-[18px] leading-[1.35] text-[#8b909a]">
          Log in to continue learning with DeepReader AI.
        </p>

        <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            onChange={setPassword}
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
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

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
    </AuthShell>
  );
}
