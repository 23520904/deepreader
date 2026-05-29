"use client";

import Image from "next/image";
import { useState } from "react";
import { buildGoogleAuthUrl } from "@/services/authService";

type GoogleOAuthButtonProps = {
  label?: string;
  nextPath?: string;
  disabled?: boolean;
};

export function GoogleOAuthButton({
  label = "Continue with google",
  nextPath = "/",
  disabled = false,
}: GoogleOAuthButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  function handleClick() {
    if (disabled || isRedirecting) {
      return;
    }

    setIsRedirecting(true);
    window.location.assign(buildGoogleAuthUrl(nextPath));
  }

  return (
    <button
      type="button"
      disabled={disabled || isRedirecting}
      onClick={handleClick}
      className="flex h-14 w-full cursor-pointer items-center justify-center rounded-[8px] border border-[#edf0f5] bg-white px-5 text-[16px] font-bold text-[#8d929d] shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:text-[#245895] hover:shadow-[0_12px_24px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-65"
    >
      <Image
        src="/assets/icons/auth/google-icon.png"
        alt=""
        width={34}
        height={34}
        className="mr-auto h-[34px] w-[34px] object-contain"
      />
      <span className="flex-1 text-center">
        {isRedirecting ? "Redirecting..." : label}
      </span>
      <span aria-hidden="true" className="ml-auto w-[34px]" />
    </button>
  );
}
