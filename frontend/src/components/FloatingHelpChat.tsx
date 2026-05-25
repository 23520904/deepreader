"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { helpFaqItems, type HelpFaqItem } from "@/lib/helpFaq";

type HelpMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
};

type FloatingHelpChatProps = {
  initiallyOpen?: boolean;
};

const initialMessages: HelpMessage[] = [
  {
    id: "welcome",
    role: "bot",
    text: "Hi, I am your DeepReader guide. Choose a question below and I will walk you through it.",
  },
];

export function FloatingHelpChat({
  initiallyOpen = false,
}: FloatingHelpChatProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [shouldRenderChat, setShouldRenderChat] = useState(initiallyOpen);
  const [messages, setMessages] = useState<HelpMessage[]>(initialMessages);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const answerTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const suggestedQuestions = helpFaqItems.filter(
    (item) => !askedQuestionIds.includes(item.id),
  );

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setShouldRenderChat(false);
      closeTimerRef.current = null;
    }, 220);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const viewport = messagesViewportRef.current;

      if (viewport) {
        viewport.scrollTop = Number.MAX_SAFE_INTEGER;
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isAnswering, isOpen, messages]);

  useEffect(() => {
    return () => {
      if (answerTimerRef.current) {
        window.clearTimeout(answerTimerRef.current);
      }

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function openChat() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setShouldRenderChat(true);
    requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }

  function closeChat() {
    setIsOpen(false);
  }

  function toggleChat() {
    if (isOpen) {
      closeChat();
      return;
    }

    openChat();
  }

  function chooseQuestion(item: HelpFaqItem) {
    if (isAnswering) {
      return;
    }

    setAskedQuestionIds((currentIds) =>
      currentIds.includes(item.id) ? currentIds : [...currentIds, item.id],
    );

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${item.id}-question-${currentMessages.length}`,
        role: "user",
        text: item.question,
      },
    ]);

    setIsAnswering(true);

    answerTimerRef.current = window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `${item.id}-answer-${currentMessages.length}`,
          role: "bot",
          text: item.answer,
        },
      ]);

      setIsAnswering(false);
      answerTimerRef.current = null;
    }, 420);
  }

  function resetChat() {
    if (answerTimerRef.current) {
      window.clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
    }

    setMessages(initialMessages);
    setAskedQuestionIds([]);
    setIsAnswering(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-[640px]:inset-x-0 max-[640px]:bottom-0 max-[640px]:flex max-[640px]:justify-end max-[640px]:px-4 max-[640px]:pb-4">
      {shouldRenderChat ? (
        <>
          <button
            type="button"
            aria-label="Close help chatbot overlay"
            onClick={closeChat}
            className={`fixed inset-0 z-[-1] hidden bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out max-[640px]:block ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          <section
            className={`mb-4 flex max-h-[min(760px,calc(100vh_-_112px))] w-[min(400px,calc(100vw_-_32px))] origin-bottom-right flex-col overflow-hidden rounded-[22px] border border-[#dbe7f5] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] transition-all duration-300 ease-out max-[640px]:fixed max-[640px]:inset-x-3 max-[640px]:bottom-20 max-[640px]:mb-0 max-[640px]:max-h-[calc(100dvh_-_108px)] max-[640px]:w-auto max-[640px]:origin-bottom max-[640px]:rounded-[24px] ${
              isOpen
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-4 scale-[0.96] opacity-0 max-[640px]:translate-y-8 max-[640px]:scale-[0.98]"
            }`}
          >
            <div className="flex items-center justify-between gap-3 bg-[linear-gradient(135deg,#dbeafe_0%,#cffafe_55%,#eef2ff_100%)] px-4 py-4 max-[420px]:px-3.5 max-[420px]:py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/70 ring-1 ring-white max-[420px]:h-10 max-[420px]:w-10 max-[420px]:rounded-xl">
                  <Image
                    src="/assets/images/brand/deepreader-navbar-logo-compact.webp"
                    alt=""
                    width={90}
                    height={60}
                    className="h-full w-full object-contain object-center"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[16px] font-black text-[#0f172a] max-[420px]:text-[15px]">
                    DeepReader Help
                  </h2>
                  <p className="text-[12px] font-bold text-[#64748b]">
                    Guide bot
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeChat}
                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white/70 text-[#334155] ring-1 ring-white transition hover:bg-white max-[420px]:h-9 max-[420px]:w-9"
                aria-label="Close help chatbot"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              ref={messagesViewportRef}
              className="min-h-[220px] flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-4 py-4 max-[640px]:min-h-[180px] max-[640px]:px-3.5 max-[640px]:py-3.5"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[84%] rounded-[18px] px-4 py-3 text-[13px] font-bold leading-6 max-[420px]:max-w-[88%] max-[420px]:px-3.5 max-[420px]:py-2.5 max-[420px]:text-[12.5px] ${
                      message.role === "user"
                        ? "rounded-br-[6px] bg-[#2563eb] text-white"
                        : "rounded-bl-[6px] bg-white text-[#334155] ring-1 ring-[#e2e8f0]"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isAnswering ? (
                <div className="flex justify-start">
                  <div className="rounded-[18px] rounded-bl-[6px] bg-white px-4 py-3 text-[13px] font-bold text-[#64748b] ring-1 ring-[#e2e8f0] max-[420px]:px-3.5 max-[420px]:py-2.5 max-[420px]:text-[12.5px]">
                    Preparing the guide...
                  </div>
                </div>
              ) : null}

            </div>

            <div className="border-t border-[#e2e8f0] bg-white px-4 py-4 max-[640px]:px-3.5 max-[640px]:py-3.5">
              <div className="mb-3 flex items-center justify-between gap-2 max-[420px]:items-start">
                <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#64748b]">
                  Suggested questions
                </p>

                <div className="flex shrink-0 items-center gap-3 max-[420px]:gap-2">
                  <Link
                    href="/help-center"
                    className="text-[12px] font-black text-[#2563eb] transition hover:text-[#0f172a]"
                  >
                    Help Center
                  </Link>

                  <button
                    type="button"
                    onClick={resetChat}
                    className="cursor-pointer text-[12px] font-black text-[#2563eb] transition hover:text-[#0f172a]"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {isAnswering ? (
                <p className="rounded-[14px] bg-[#f8fafc] px-3 py-3 text-[13px] font-bold text-[#64748b] ring-1 ring-[#e2e8f0] max-[420px]:text-[12.5px]">
                  I will show more suggestions after this answer.
                </p>
              ) : suggestedQuestions.length ? (
                <div className="grid max-h-[260px] gap-2 overflow-y-auto pr-1 max-[640px]:max-h-[190px]">
                  {suggestedQuestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseQuestion(item)}
                      className="cursor-pointer rounded-[14px] border border-[#dbe7f5] bg-[#f8fafc] px-3 py-2.5 text-left text-[13px] font-black leading-5 text-[#0f172a] transition hover:-translate-y-0.5 hover:border-[#bfdbfe] hover:bg-[#eff6ff] max-[420px]:text-[12.5px]"
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-[14px] bg-[#f8fafc] px-3 py-3 text-[13px] font-bold leading-6 text-[#64748b] ring-1 ring-[#e2e8f0] max-[420px]:text-[12.5px]">
                  You have viewed all suggested questions. Press Reset to start
                  again.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}

      <button
        type="button"
        onClick={toggleChat}
        className={`group ml-auto grid h-16 w-16 cursor-pointer place-items-center rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-[0_18px_38px_rgba(37,99,235,0.34)] ring-4 ring-white/90 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_44px_rgba(37,99,235,0.42)] max-[640px]:h-14 max-[640px]:w-14 ${
          isOpen ? "rotate-90 scale-95" : "rotate-0 scale-100"
        }`}
        aria-label={isOpen ? "Close help chatbot" : "Open help chatbot"}
        aria-expanded={isOpen}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8 max-[640px]:h-7 max-[640px]:w-7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M7.5 18.5 4 20l1.1-3.3A8.1 8.1 0 0 1 3.5 12c0-4.1 3.8-7.5 8.5-7.5s8.5 3.4 8.5 7.5-3.8 7.5-8.5 7.5a9.5 9.5 0 0 1-4.5-1Z" />
      <path d="M8.5 11.5h.01" />
      <path d="M12 11.5h.01" />
      <path d="M15.5 11.5h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 max-[640px]:h-5 max-[640px]:w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
