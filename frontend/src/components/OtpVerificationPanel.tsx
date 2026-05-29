"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type OtpVerificationPanelProps = {
  title: string;
  description: string;
  value: string;
  message?: string;
  messageTone?: "info" | "error" | "success";
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  children?: ReactNode;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onResend: () => Promise<void> | void;
};

export function OtpVerificationPanel({
  title,
  description,
  value,
  message,
  messageTone = "info",
  submitLabel = "Verify",
  submittingLabel = "Verifying...",
  cancelLabel = "Cancel",
  isSubmitting = false,
  children,
  onChange,
  onSubmit,
  onCancel,
  onResend,
}: OtpVerificationPanelProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function updateCode(nextValue: string) {
    onChange(nextValue.replace(/\D/g, "").slice(0, 4));
  }

  function handleInput(index: number, text: string) {
    const digits = text.replace(/\D/g, "");

    if (digits.length > 1) {
      updateCode(digits);
      inputRefs.current[Math.min(3, digits.length - 1)]?.focus();
      return;
    }

    const nextCode = value.padEnd(4, " ").split("");
    nextCode[index] = digits;
    updateCode(nextCode.join("").replace(/\s/g, ""));

    if (digits && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleResend() {
    if (isSubmitting || isResending) {
      return;
    }

    setIsResending(true);
    try {
      await onResend();
      setRemainingSeconds(60);
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  }

  const messageClass =
    messageTone === "error"
      ? "bg-red-50 text-red-700"
      : messageTone === "success"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-[#eef5ff] text-[#245895]";

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-[520px] rounded-[12px] bg-white text-left"
    >
      <h1 className="text-[clamp(36px,8vw,52px)] font-extrabold leading-[1.06] tracking-[0] text-[#1e4f8d]">
        {title}
      </h1>

      <p className="mt-4 text-[18px] font-medium leading-8 text-[#7f8794]">
        {description}
      </p>

      <div className="mt-12 grid grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            aria-label={`OTP digit ${index + 1}`}
            value={value[index] ?? ""}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus={index === 0}
            onChange={(event) => handleInput(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event.key)}
            className="aspect-square w-full rounded-[10px] border-2 border-[#c8d2e4] bg-white text-center text-[34px] font-extrabold text-[#1e4f8d] outline-none transition focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/12"
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[15px] font-semibold text-[#8d929d]">
        <span>
          Remaining time:{" "}
          <span className="font-extrabold text-[#5b74d6]">
            00:{String(remainingSeconds).padStart(2, "0")}s
          </span>
        </span>

        <span>
          Did not get the code?{" "}
          <button
            type="button"
            disabled={isSubmitting || isResending}
            onClick={handleResend}
            className="cursor-pointer font-extrabold text-[#5b74d6] transition hover:text-[#245895] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isResending ? "Sending..." : "Resend"}
          </button>
        </span>
      </div>

      {children ? <div className="mt-7 space-y-3">{children}</div> : null}

      {message ? (
        <p className={`mt-6 rounded-[8px] px-4 py-3 text-sm font-bold ${messageClass}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-9 space-y-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-16 w-full cursor-pointer items-center justify-center rounded-full bg-[#5b74d6] px-6 text-[22px] font-extrabold text-white shadow-[0_14px_30px_rgba(91,116,214,0.24)] transition hover:bg-[#245895] disabled:cursor-not-allowed disabled:bg-[#9aaee8]"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="h-16 w-full cursor-pointer rounded-full border-2 border-[#6b82d7] bg-white text-[22px] font-extrabold text-[#5b74d6] transition hover:bg-[#eef5ff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
