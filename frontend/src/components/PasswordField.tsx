"use client";

import Image from "next/image";
import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
};

export function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const iconSrc = isVisible ? "/assets/icons/auth/password-eye-off.png" : "/assets/icons/auth/password-eye-on.png";

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={isVisible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        required
        minLength={8}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[8px] border border-[#c8ccd6] bg-white px-4 pr-12 text-[14px] text-[#17213a] outline-none transition placeholder:text-[#9095a1] focus:border-[#255895] focus:ring-4 focus:ring-[#255895]/10 sm:h-12"
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#eef2f8] sm:h-9 sm:w-9"
      >
        <Image
          src={iconSrc}
          alt=""
          width={22}
          height={22}
          className="h-5 w-5 object-contain sm:h-[22px] sm:w-[22px]"
        />
      </button>
    </div>
  );
}
