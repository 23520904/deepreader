"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

// ─── Danh sách providers & models hợp lệ theo backend ──────────────────────
// Backend (SupportedProvider.java): chỉ có GROQ và GEMINI
// LlmClientService: isGroqApiKey = bắt đầu bằng "gsk_", còn lại là Gemini
// Generation priority: groq → gemini (fallback)
// Embedding: chỉ dùng Gemini (không thể thay đổi per-user)
export const AI_PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    keyPrefix: "gsk_",
    keyPlaceholder: "gsk_••••••••••••••••••••••••••••••••••••••••••••••••••••",
    keyHint: "Key bắt đầu bằng gsk_ — lấy tại console.groq.com",
    link: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (mặc định)" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
      { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B 32K" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B IT" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keyPrefix: "",
    keyPlaceholder: "AIza••••••••••••••••••••••••••••••••••••",
    keyHint: "Không bắt đầu bằng gsk_ — lấy tại aistudio.google.com",
    link: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (mặc định)" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
] as const;

type ProviderId = (typeof AI_PROVIDERS)[number]["id"];

type ConfigureModalProps = {
  isOpen: boolean;
  onClose: () => void;
  token: string;
};

// ─── Validate API key theo logic backend ────────────────────────────────────
function detectProviderFromKey(key: string): ProviderId | null {
  if (!key.trim()) return null;
  return key.trim().startsWith("gsk_") ? "groq" : "gemini";
}

function validateApiKey(key: string, providerId: ProviderId): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "Vui lòng nhập API key.";
  if (providerId === "groq" && !trimmed.startsWith("gsk_")) {
    return 'Groq API key phải bắt đầu bằng "gsk_".';
  }
  if (providerId === "gemini" && trimmed.startsWith("gsk_")) {
    return 'Gemini API key không được bắt đầu bằng "gsk_". Nếu đây là Groq key, hãy chọn Groq.';
  }
  if (trimmed.length < 20) {
    return "API key có vẻ quá ngắn, vui lòng kiểm tra lại.";
  }
  return null;
}

async function saveLlmToken(
  token: string,
  llmApiToken: string,
): Promise<void> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8083";

  const response = await fetch(`${apiBase}/api/v1/users/me/llm-token`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ llmApiToken }),
  });

  if (!response.ok) {
    let msg = "Không thể lưu API key.";
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      msg = data.error ?? data.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

export function ConfigureModal({ isOpen, onClose, token }: ConfigureModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timerRef = useRef<number | null>(null);

  const [providerId, setProviderId] = useState<ProviderId>("groq");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const provider = AI_PROVIDERS.find((p) => p.id === providerId)!;

  // ── Mount guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  // ── Open/close animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setShouldRender(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
      return;
    }
    setIsVisible(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      timerRef.current = null;
    }, 460);
  }, [isOpen]);

  // ── Escape to close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldRender) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [shouldRender, onClose]);

  // ── Auto-detect provider khi nhập key ─────────────────────────────────────
  function handleKeyChange(value: string) {
    setApiKey(value);
    setKeyError(null);
    setSaveSuccess(false);
    setSaveError(null);
    const detected = detectProviderFromKey(value);
    if (detected) setProviderId(detected);
  }

  function handleProviderChange(id: ProviderId) {
    setProviderId(id);
    setKeyError(null);
    setSaveSuccess(false);
    setSaveError(null);
  }

  async function handleSave() {
    const error = validateApiKey(apiKey, providerId);
    if (error) {
      setKeyError(error);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await saveLlmToken(token, apiKey.trim());
      setSaveSuccess(true);
      setApiKey("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleClear() {
    setApiKey("");
    setKeyError(null);
    setSaveSuccess(false);
    setSaveError(null);
  }

  if (!isMounted || !shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 isolate z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className={`fixed inset-0 z-0 cursor-default bg-[#07111f]/50 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="Đóng cài đặt AI"
      />

      {/* Modal card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cấu hình AI"
        className={`relative z-10 w-[min(520px,calc(100vw_-_32px))] rounded-[24px] bg-[#f8fbff] shadow-[0_32px_80px_rgba(12,22,48,0.28)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfe5f4] px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(145deg,#6976d6,#4d5ab8)] shadow-[0_6px_14px_rgba(77,90,184,0.30)]">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-[#1e2d6b]">
                Cấu hình AI
              </h2>
              <p className="text-[11px] font-semibold text-[#8a94b8]">
                API Key cá nhân của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-[#dfe5f4] bg-white text-[#6b7db8] transition hover:bg-[#eef3ff] hover:text-[#2f47b8] focus:outline-none"
            aria-label="Đóng"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">

          {/* Info banner */}
          <div className="rounded-[12px] bg-[#eef3ff] border border-[#c9d3f5] px-4 py-3">
            <p className="text-[12px] font-semibold text-[#3b55c9] leading-relaxed">
              💡 API key của bạn được lưu an toàn trên server và dùng ưu tiên
              hơn key mặc định. Groq được thử trước, Gemini là fallback.
              <br />
              <span className="text-[#8a94b8]">Embedding luôn dùng Gemini (server key).</span>
            </p>
          </div>

          {/* Provider selector */}
          <div>
            <label className="mb-2 block text-[12px] font-black uppercase tracking-wide text-[#6b7db8]">
              Nhà cung cấp LLM
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`flex items-center gap-2.5 rounded-[12px] border px-4 py-3 text-left text-[13px] font-bold transition-all duration-200 ${
                    providerId === p.id
                      ? "border-[#4d5ab8] bg-[linear-gradient(145deg,#eef3ff,#dce5ff)] text-[#2f47b8] shadow-[0_4px_12px_rgba(77,90,184,0.18)]"
                      : "border-[#dfe5f4] bg-white text-[#5a6a9a] hover:border-[#b0bde8] hover:bg-[#f4f7ff]"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all ${
                      providerId === p.id
                        ? "scale-100 bg-[#4d5ab8]"
                        : "scale-75 bg-[#c5cde8]"
                    }`}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key input */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="configure-api-key"
                className="text-[12px] font-black uppercase tracking-wide text-[#6b7db8]"
              >
                API Key ({provider.label})
              </label>
              <a
                href={provider.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[#4d5ab8] underline underline-offset-2 hover:text-[#2f47b8] transition"
              >
                Lấy key →
              </a>
            </div>
            <div className="relative">
              <input
                id="configure-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={provider.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className={`w-full rounded-[12px] border px-4 py-3 pr-[80px] text-[13px] font-mono text-[#1e2d6b] placeholder:font-sans placeholder:text-[#b0bde8] outline-none transition focus:ring-2 ${
                  keyError
                    ? "border-[#e05c6d] bg-[#fff5f6] focus:ring-[#e05c6d]/20"
                    : "border-[#dfe5f4] bg-white focus:border-[#4d5ab8] focus:ring-[#4d5ab8]/20"
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Xoá"
                    className="grid h-7 w-7 place-items-center rounded-full text-[#9aa8d0] transition hover:bg-[#f0f4ff] hover:text-[#e05c6d]"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? "Ẩn key" : "Hiện key"}
                  className="grid h-7 w-7 place-items-center rounded-full text-[#9aa8d0] transition hover:bg-[#f0f4ff] hover:text-[#4d5ab8]"
                >
                  {showKey ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {keyError && (
              <p className="mt-1.5 text-[11.5px] font-semibold text-[#e05c6d]">
                ⚠ {keyError}
              </p>
            )}
            {!keyError && (
              <p className="mt-1.5 text-[11px] font-medium text-[#a0aac8]">
                {provider.keyHint}
              </p>
            )}
          </div>

          {/* Status messages */}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[#b6e8c5] bg-[#edfaf2] px-4 py-3">
              <span className="text-[14px]">✅</span>
              <p className="text-[12.5px] font-semibold text-[#1e7a44]">
                API key đã lưu thành công! Các tính năng AI sẽ dùng key của bạn.
              </p>
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[#f5c5cb] bg-[#fff5f6] px-4 py-3">
              <span className="text-[14px]">❌</span>
              <p className="text-[12.5px] font-semibold text-[#c0293a]">
                {saveError}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#dfe5f4] px-7 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold text-[#6b7db8] transition hover:bg-[#eef3ff] hover:text-[#2f47b8]"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="flex min-w-[110px] items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(145deg,#6976d6_0%,#4d5ab8_100%)] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(77,90,184,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(77,90,184,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSaving ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Đang lưu…
              </>
            ) : (
              "Lưu key"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function SparklesIcon() {
  return (
    <svg className="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ height: 18, width: 18 }}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
