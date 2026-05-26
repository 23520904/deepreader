"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { useAppPreferences } from "@/lib/appPreferences";

export const AI_PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    keyPrefix: "gsk_",
    keyPlaceholder: "gsk_................................................",
    keyHint: "Key starts with gsk_ - create one at console.groq.com",
    link: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (default)" },
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
    keyPlaceholder: "AIza....................................",
    keyHint:
      "Key does not start with gsk_ - create one at aistudio.google.com",
    link: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (default)" },
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

function detectProviderFromKey(key: string): ProviderId | null {
  if (!key.trim()) {
    return null;
  }

  return key.trim().startsWith("gsk_") ? "groq" : "gemini";
}

function validateApiKey(key: string, providerId: ProviderId): string | null {
  const trimmed = key.trim();

  if (!trimmed) {
    return "API key is required.";
  }

  if (providerId === "groq" && !trimmed.startsWith("gsk_")) {
    return 'Groq API key must start with "gsk_".';
  }

  if (providerId === "gemini" && trimmed.startsWith("gsk_")) {
    return 'Gemini API key must not start with "gsk_". If this is a Groq key, choose Groq.';
  }

  if (trimmed.length < 20) {
    return "This API key looks too short. Please check it again.";
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
    let message = "Could not save API key.";

    try {
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = data.error ?? data.message ?? message;
    } catch {
      /* Keep the default user-facing message. */
    }

    throw new Error(message);
  }
}

export function ConfigureModal({ isOpen, onClose, token }: ConfigureModalProps) {
  const { t } = useAppPreferences();
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

  const provider = AI_PROVIDERS.find((item) => item.id === providerId)!;

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setIsMounted(true), 0);

    return () => window.clearTimeout(mountTimer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const openTimer = window.setTimeout(() => {
        setShouldRender(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsVisible(true));
        });
      }, 0);

      return () => window.clearTimeout(openTimer);
    }

    const visibilityTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 0);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      timerRef.current = null;
    }, 460);

    return () => window.clearTimeout(visibilityTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldRender, onClose]);

  function handleKeyChange(value: string) {
    setApiKey(value);
    setKeyError(null);
    setSaveSuccess(false);
    setSaveError(null);

    const detectedProvider = detectProviderFromKey(value);

    if (detectedProvider) {
      setProviderId(detectedProvider);
    }
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
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed.");
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

  if (!isMounted || !shouldRender) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 isolate z-[10000] flex items-center justify-center">
      <button
        type="button"
        className={`fixed inset-0 z-0 cursor-default bg-[#07111f]/50 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label={t("Close AI settings")}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("AI Configuration")}
        className={`relative z-10 w-[min(520px,calc(100vw_-_32px))] rounded-[24px] bg-[#f8fbff] shadow-[0_32px_80px_rgba(12,22,48,0.28)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#dfe5f4] px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(145deg,#6976d6,#4d5ab8)] shadow-[0_6px_14px_rgba(77,90,184,0.30)]">
              <Sparkles className="h-[18px] w-[18px] text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-[#1e2d6b]">
                {t("AI Configuration")}
              </h2>
              <p className="text-[11px] font-semibold text-[#8a94b8]">
                {t("Your personal API key")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-[#dfe5f4] bg-white text-[#6b7db8] transition hover:bg-[#eef3ff] hover:text-[#2f47b8] focus:outline-none"
            aria-label={t("Close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-5 px-7 py-6">
          <div className="rounded-[12px] border border-[#c9d3f5] bg-[#eef3ff] px-4 py-3">
            <p className="text-[12px] font-semibold leading-relaxed text-[#3b55c9]">
              {t(
                "Your API key is stored securely on the server and takes priority over the default key. Groq is tried first, Gemini is the fallback.",
              )}
              <br />
              <span className="text-[#8a94b8]">
                {t("Embeddings always use Gemini (server key).")}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-black uppercase tracking-wide text-[#6b7db8]">
              {t("LLM Provider")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AI_PROVIDERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleProviderChange(item.id)}
                  className={`flex items-center gap-2.5 rounded-[12px] border px-4 py-3 text-left text-[13px] font-bold transition-all duration-200 ${
                    providerId === item.id
                      ? "border-[#4d5ab8] bg-[linear-gradient(145deg,#eef3ff,#dce5ff)] text-[#2f47b8] shadow-[0_4px_12px_rgba(77,90,184,0.18)]"
                      : "border-[#dfe5f4] bg-white text-[#5a6a9a] hover:border-[#b0bde8] hover:bg-[#f4f7ff]"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all ${
                      providerId === item.id
                        ? "scale-100 bg-[#4d5ab8]"
                        : "scale-75 bg-[#c5cde8]"
                    }`}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
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
                className="text-[11px] font-semibold text-[#4d5ab8] underline underline-offset-2 transition hover:text-[#2f47b8]"
              >
                {t("Get key ->")}
              </a>
            </div>

            <div className="relative">
              <input
                id="configure-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => handleKeyChange(event.target.value)}
                placeholder={provider.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className={`w-full rounded-[12px] border px-4 py-3 pr-[80px] font-mono text-[13px] text-[#1e2d6b] outline-none transition placeholder:font-sans placeholder:text-[#b0bde8] focus:ring-2 ${
                  keyError
                    ? "border-[#e05c6d] bg-[#fff5f6] focus:ring-[#e05c6d]/20"
                    : "border-[#dfe5f4] bg-white focus:border-[#4d5ab8] focus:ring-[#4d5ab8]/20"
                }`}
              />

              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                {apiKey ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    title={t("Clear")}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#9aa8d0] transition hover:bg-[#f0f4ff] hover:text-[#e05c6d]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowKey((current) => !current)}
                  title={showKey ? t("Hide key") : t("Show key")}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#9aa8d0] transition hover:bg-[#f0f4ff] hover:text-[#4d5ab8]"
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {keyError ? (
              <p className="mt-1.5 text-[11.5px] font-semibold text-[#e05c6d]">
                {t(keyError)}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] font-medium text-[#a0aac8]">
                {t(provider.keyHint)}
              </p>
            )}
          </div>

          {saveSuccess ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-[#b6e8c5] bg-[#edfaf2] px-4 py-3">
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-[#1e7a44]"
                aria-hidden
              />
              <p className="text-[12.5px] font-semibold text-[#1e7a44]">
                {t(
                  "API key saved successfully! Your AI features will use your key.",
                )}
              </p>
            </div>
          ) : null}

          {saveError ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-[#f5c5cb] bg-[#fff5f6] px-4 py-3">
              <XCircle
                className="h-4 w-4 shrink-0 text-[#c0293a]"
                aria-hidden
              />
              <p className="text-[12.5px] font-semibold text-[#c0293a]">
                {t(saveError)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#dfe5f4] px-7 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] px-5 py-2.5 text-[13px] font-bold text-[#6b7db8] transition hover:bg-[#eef3ff] hover:text-[#2f47b8]"
          >
            {t("Cancel")}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="flex min-w-[110px] cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(145deg,#6976d6_0%,#4d5ab8_100%)] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-[0_6px_16px_rgba(77,90,184,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(77,90,184,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSaving ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {t("Saving...")}
              </>
            ) : (
              t("Save key")
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
