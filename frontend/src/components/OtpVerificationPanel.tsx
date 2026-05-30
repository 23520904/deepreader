"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type OtpVerificationPanelProps = {
  // Main heading displayed on the panel
  title: string;

  // Description shown below the title
  description: string;

  // Current OTP value (4 digits)
  value: string;

  // Optional status message
  message?: string;

  // Style of the status message
  messageTone?: "info" | "error" | "success";

  // Submit button text
  submitLabel?: string;

  // Submit button text while processing
  submittingLabel?: string;

  // Cancel button text
  cancelLabel?: string;

  // Indicates whether verification is in progress
  isSubmitting?: boolean;

  // Optional extra content rendered between OTP section and message section
  children?: ReactNode;

  // Update OTP value in parent component
  onChange: (value: string) => void;

  // Handle form submission
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  // Handle cancel action
  onCancel: () => void;

  // Handle resend OTP request
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
  // Store references to OTP input fields for focus management
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown timer for OTP resend
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  // Track resend request state
  const [isResending, setIsResending] = useState(false);

  // Start countdown timer when component mounts
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Keep only numeric characters and limit OTP length to 4 digits
  function updateCode(nextValue: string) {
    onChange(nextValue.replace(/\D/g, "").slice(0, 4));
  }

  // Handle OTP input changes
  function handleInput(index: number, text: string) {
    const digits = text.replace(/\D/g, "");

    // Support pasting multiple digits at once
    if (digits.length > 1) {
      updateCode(digits);
      inputRefs.current[Math.min(3, digits.length - 1)]?.focus();
      return;
    }

    const nextCode = value.padEnd(4, " ").split("");
    nextCode[index] = digits;
    updateCode(nextCode.join("").replace(/\s/g, ""));

    // Automatically move to the next input after entering a digit
    if (digits && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  // Move focus back when deleting an empty input
  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Request a new OTP code and restart the timer
  async function handleResend() {
    if (isSubmitting || isResending) {
      return;
    }

    setIsResending(true);

    try {
      await onResend();
      setRemainingSeconds(60);

      // Focus first input after successful resend
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  }

  // Select message style based on message type
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
      {/* Page title */}
      <h1 className="text-[clamp(36px,8vw,52px)] font-extrabold leading-[1.06] tracking-[0] text-[#1e4f8d]">
        {title}
      </h1>

      {/* Description text */}
      <p className="mt-4 text-[18px] font-medium leading-8 text-[#7f8794]">
        {description}
      </p>

      {/* OTP input fields */}
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

      {/* Countdown timer and resend action */}
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

      {/* Optional custom content */}
      {children ? <div className="mt-7 space-y-3">{children}</div> : null}

      {/* Status message */}
      {message ? (
        <p className={`mt-6 rounded-[8px] px-4 py-3 text-sm font-bold ${messageClass}`}>
          {message}
        </p>
      ) : null}

      {/* Action buttons */}
      <div className="mt-9 space-y-4">
        {/* Verify button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-16 w-full cursor-pointer items-center justify-center rounded-full bg-[#5b74d6] px-6 text-[22px] font-extrabold text-white shadow-[0_14px_30px_rgba(91,116,214,0.24)] transition hover:bg-[#245895] disabled:cursor-not-allowed disabled:bg-[#9aaee8]"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>

        {/* Cancel button */}
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