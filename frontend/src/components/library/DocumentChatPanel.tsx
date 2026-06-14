"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AccountAvatar } from "@/components/AccountAvatar";
import type {
  ChatMessageView,
  ChatSourceReference,
  ChatThreadView,
} from "@/types/study";

type DocumentChatPanelProps = {
  messages: ChatMessageView[];
  chatThreads: ChatThreadView[];
  activeThreadId: string | null;
  isSending: boolean;
  deletingThreadId: string;
  userAvatarUrl?: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onSendMessage: (message: string) => void;
  onCitationClick?: (source: ChatSourceReference) => void;
};

const ASTRONAUT_CAT_IMAGE = "/assets/images/library/astronaut-cat.jpg";
const TRASH_ICON = "/assets/images/library/trash-icon.png";

function SendIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4.75 19.25 20 12 4.75 4.75 7.4 12l-2.65 7.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M7.5 12H20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function CatAvatar({ size = "md" }: { size?: "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-20 w-20" : "h-11 w-11";

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-[#eaf2ff] shadow-[0_10px_24px_rgba(36,88,149,0.18)] ring-2 ring-white ${dimensions}`}
    >
      <Image
        src={ASTRONAUT_CAT_IMAGE}
        alt=""
        width={120}
        height={120}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function formatHistoryTime(value: string | null) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#245895]/55"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}

function citationPageNumber(source: ChatSourceReference) {
  const pageNumber = source.pageNumber ?? source.chunkIndex;

  return typeof pageNumber === "number" && pageNumber > 0 ? pageNumber : null;
}

function citationSnippet(source: ChatSourceReference) {
  return (source.snippet ?? source.content ?? "").trim();
}

function citationTooltip(source: ChatSourceReference, fallbackIndex: number) {
  const pageNumber = citationPageNumber(source);
  const label = source.title?.trim() || (pageNumber ? `Page ${pageNumber}` : `Citation ${fallbackIndex}`);
  const snippet = citationSnippet(source);

  return snippet ? `${label}\n\n${snippet}` : label;
}

function citationIndex(source: ChatSourceReference, fallbackIndex: number) {
  return typeof source.index === "number" && source.index > 0
    ? source.index
    : fallbackIndex;
}

function ChatBubble({
  message,
  userAvatarUrl,
  onCitationClick,
}: {
  message: ChatMessageView;
  userAvatarUrl?: string | null;
  onCitationClick?: (source: ChatSourceReference) => void;
}) {
  const isUser = message.role === "user";
  const citations = !isUser ? (message.sources ?? []).slice(0, 3) : [];

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? <CatAvatar /> : null}

      <div
        className={`max-w-[min(78%,760px)] ${
          isUser ? "items-end text-right" : "items-start text-left"
        } flex flex-col gap-2`}
      >
        {!isUser ? (
          <span className="text-[12px] font-black uppercase tracking-[0.12em] text-[#245895]">
            Astronaut Cat
          </span>
        ) : null}

        <div
          className={`rounded-[18px] px-5 py-4 shadow-[0_10px_24px_rgba(18,24,38,0.08)] ${
            isUser
              ? "rounded-br-[6px] bg-[#245895] text-white"
              : "rounded-bl-[6px] bg-white text-[#17213a] ring-1 ring-[#dce6f4]"
          }`}
        >
          <p className="whitespace-pre-wrap text-[15px] font-semibold leading-7">
            {message.content}
            {citations.length ? (
              <span className="ml-2 inline-flex align-baseline gap-1">
                {citations.map((source, index) => {
                  const fallbackIndex = index + 1;
                  const badgeIndex = citationIndex(source, fallbackIndex);

                  return (
                    <button
                      key={`${message.id}-citation-${badgeIndex}-${source.chunkId ?? source.sectionId ?? fallbackIndex}`}
                      type="button"
                      onClick={() => onCitationClick?.(source)}
                      className="inline-flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full bg-[#eef5ff] px-2 text-[12px] font-black leading-none text-[#245895] ring-1 ring-[#c8d9ee] transition hover:bg-[#dfeeff] hover:text-[#174f87]"
                      title={citationTooltip(source, badgeIndex)}
                      aria-label={`Jump to citation ${badgeIndex}`}
                    >
                      [{badgeIndex}]
                    </button>
                  );
                })}
              </span>
            ) : null}
          </p>
        </div>

      </div>

      {isUser ? (
        <AccountAvatar
          avatarUrl={userAvatarUrl}
          size={44}
          imagePaddingClassName="p-2.5"
          className="h-11 w-11 shrink-0 shadow-[0_8px_18px_rgba(36,88,149,0.14)] ring-2 ring-white"
        />
      ) : null}
    </div>
  );
}

export function DocumentChatPanel({
  messages,
  chatThreads,
  activeThreadId,
  isSending,
  deletingThreadId,
  userAvatarUrl,
  onNewChat,
  onSelectThread,
  onDeleteThread,
  onSendMessage,
  onCitationClick,
}: DocumentChatPanelProps) {
  const [draft, setDraft] = useState("");
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const isSendBlocked = isSending || !draft.trim();
  const historyItems = useMemo(() => chatThreads, [chatThreads]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;

    if (!viewport) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: Number.MAX_SAFE_INTEGER,
        behavior: "auto",
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [messages.length, isSending]);

  function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = draft.trim();

    if (!message || isSending) {
      return;
    }

    setDraft("");
    onSendMessage(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitMessage();
  }

  return (
    <div className="p-6">
      <div className="grid h-[74vh] min-h-[560px] max-h-[760px] overflow-hidden rounded-[14px] border border-[#dce6f4] bg-white md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-[#dce6f4] bg-[#f4f8ff] p-4 md:flex md:flex-col">
          <div className="flex items-center gap-3 rounded-[10px] bg-white px-3 py-3 ring-1 ring-[#dce6f4]">
            <CatAvatar />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-black text-[#0f2442]">
                Astronaut Cat
              </p>
              <p className="mt-0.5 truncate text-[12px] font-bold text-[#7a879a]">
                Document companion
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#66758d]">
              History
            </p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#245895] ring-1 ring-[#dce6f4]">
              {historyItems.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onNewChat}
            className={`mt-3 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[8px] px-4 text-[13px] font-black transition ${
              activeThreadId === null
                ? "bg-[#245895] text-white shadow-[0_10px_20px_rgba(36,88,149,0.18)]"
                : "bg-white text-[#245895] ring-1 ring-[#dce6f4] hover:bg-[#eef5ff]"
            }`}
          >
            <PlusIcon />
            New chat
          </button>

          <div className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
            {historyItems.length ? (
              historyItems.map((thread, index) => {
                const isActive = activeThreadId === thread.id;
                const isDeleting = deletingThreadId === thread.id;

                return (
                  <div
                    key={`history-${thread.id}`}
                    className={`min-h-[76px] cursor-pointer rounded-[9px] px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-[#245895] text-white shadow-[0_10px_20px_rgba(36,88,149,0.18)]"
                        : "bg-white text-[#102744] hover:bg-[#eef5ff] hover:shadow-[0_8px_18px_rgba(36,88,149,0.08)]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectThread(thread.id)}
                        className="min-w-0 flex-1 cursor-pointer text-left"
                      >
                        <span className="block truncate text-[13px] font-black">
                          {thread.title || `Chat ${index + 1}`}
                        </span>
                        <span
                          className={`mt-1 block text-[11px] font-bold ${
                            isActive ? "text-white/75" : "text-[#8a96aa]"
                          }`}
                        >
                          {formatHistoryTime(thread.updatedAt)}
                        </span>
                        <span
                          className={`mt-1 block text-[11px] font-black ${
                            isActive ? "text-white/70" : "text-[#245895]"
                          }`}
                        >
                          {thread.messages.length} messages
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteThread(thread.id)}
                        disabled={isDeleting || (isSending && isActive)}
                        className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[7px] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isActive
                            ? "bg-white/15 hover:bg-white/25"
                            : "bg-[#fff0f1] hover:bg-[#ffe1e4]"
                        }`}
                        aria-label={`Delete ${
                          thread.title || `chat ${index + 1}`
                        }`}
                        title="Delete chat"
                      >
                        <Image
                          src={TRASH_ICON}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 object-contain"
                          style={
                            isActive
                              ? { filter: "brightness(0) invert(1)" }
                              : undefined
                          }
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[9px] border border-dashed border-[#cbd8e8] bg-white px-4 py-5 text-center">
                <p className="text-[13px] font-bold leading-6 text-[#7a879a]">
                  No chat threads yet.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col bg-[#f8fbff]">
          <div
            ref={messagesViewportRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6"
          >
            <div className="mx-auto grid max-w-[880px] gap-6">
              {messages.length ? (
                messages.map((message) => (
                  <div key={message.id}>
                    <ChatBubble
                      message={message}
                      userAvatarUrl={userAvatarUrl}
                      onCitationClick={onCitationClick}
                    />
                  </div>
                ))
              ) : (
                <div className="grid min-h-[380px] place-items-center px-4 text-center">
                  <div className="max-w-[460px]">
                    <div className="flex justify-center">
                      <CatAvatar size="lg" />
                    </div>
                    <h3 className="mt-5 text-[26px] font-black leading-tight text-[#0f2442]">
                      Chat with Astronaut Cat
                    </h3>
                    <p className="mt-3 text-[15px] font-semibold leading-7 text-[#748195]">
                      Ask Astronaut Cat to understand the document you are
                      reading.
                    </p>
                  </div>
                </div>
              )}

              {isSending ? (
                <div className="flex items-end gap-4">
                  <CatAvatar />
                  <div className="rounded-[18px] rounded-bl-[6px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(18,24,38,0.08)] ring-1 ring-[#dce6f4]">
                    <TypingDots />
                  </div>
                </div>
              ) : null}

              <div ref={scrollAnchorRef} />
            </div>
          </div>

          <form
            onSubmit={submitMessage}
            className="shrink-0 border-t border-[#dce6f4] bg-white p-4"
          >
            <div className="mx-auto flex max-w-[880px] items-end gap-3 rounded-[12px] bg-[#f4f8ff] p-3 ring-1 ring-[#dce6f4] focus-within:ring-[#245895]/35">
              <label className="sr-only" htmlFor="documentChatMessage">
                Message
              </label>

              <textarea
                id="documentChatMessage"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={900}
                placeholder="Message Astronaut Cat..."
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-[15px] font-semibold leading-6 text-[#17213a] outline-none placeholder:text-[#8a96aa]"
              />

              <button
                type="submit"
                disabled={isSendBlocked}
                className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[10px] bg-[#245895] text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#9ab0ca] disabled:shadow-none"
                aria-label="Send message"
                title="Send"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
