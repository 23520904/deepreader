"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AccountAvatar } from "@/components/AccountAvatar";
import type { ChatMessageView, ChatThreadView, ChatSourceReference } from "@/types/study";

/**
 * Props for the document chat panel.
 * The parent component sends chat data and handles all chat actions.
 */
type DocumentChatPanelProps = {
  // List of messages in the current chat thread.
  messages: ChatMessageView[];

  // List of saved chat threads shown in the history sidebar.
  chatThreads: ChatThreadView[];

  // The currently selected chat thread id.
  // Null means the user is starting a new chat.
  activeThreadId: string | null;

  // True while a message is being sent or the AI is replying.
  isSending: boolean;

  // The id of the chat thread currently being deleted.
  deletingThreadId: string;

  // Optional avatar image for the current user.
  userAvatarUrl?: string | null;

  // Called when the user starts a new chat.
  onNewChat: () => void;

  // Called when the user selects a chat thread from history.
  onSelectThread: (threadId: string) => void;

  // Called when the user deletes a chat thread.
  onDeleteThread: (threadId: string) => void;

  // Called when the user sends a new message.
  onSendMessage: (message: string) => void;

  // Optional pending source references while the assistant is still retrieving.
  pendingSources?: ChatSourceReference[];

  // Called when the user clicks a source chip.
  onSourceClick?: (source: ChatSourceReference) => void;
};

// Image paths used in the chat UI.
const ASTRONAUT_CAT_IMAGE = "/assets/images/library/astronaut-cat.jpg";
const TRASH_ICON = "/assets/images/library/trash-icon.png";

/**
 * Small send icon used inside the send button.
 */
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

/**
 * Small plus icon used for the new chat button.
 */
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

/**
 * Avatar for the AI assistant.
 * The size prop allows the same avatar to be used in normal and empty states.
 */
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

/**
 * Convert a chat thread updated time into a readable history time.
 * If the value is missing or invalid, show "Just now".
 */
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

/**
 * Animated dots shown while the AI assistant is typing.
 */
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

function getValidSourceReferences(sources?: ChatSourceReference[]) {
  return (sources ?? []).filter((source) => {
    const hasLabel =
      source.title?.trim() ||
      source.fileName?.trim() ||
      source.sectionId?.trim() ||
      typeof source.chunkIndex === "number";

    const hasTarget =
      source.chunkId?.trim() ||
      source.sectionId?.trim() ||
      typeof source.chunkIndex === "number" ||
      source.content?.trim();

    const hasGoodScore =
      typeof source.score !== "number" || source.score >= 0.2;

    return hasLabel && hasTarget && hasGoodScore;
  });
}

function isUngroundedAnswer(message: ChatMessageView) {
  return message.role === "assistant" && message.grounded === false;
}

function getDisplaySources(message: ChatMessageView) {
  if (isUngroundedAnswer(message)) {
    return [];
  }

  return getValidSourceReferences(message.sources);
}

/** Renders inline Markdown (bold, italic) and [N] citation buttons within a single text string. */
function renderInline(
  text: string,
  keyPrefix: string,
  sources: ChatSourceReference[],
  onSourceClick?: (source: ChatSourceReference) => void,
): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[\d+\])/).map((part, j) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={`${keyPrefix}-b${j}`}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={`${keyPrefix}-i${j}`}>{part.slice(1, -1)}</em>;
    const m = /^\[(\d+)\]$/.exec(part);
    if (m) {
      const num = parseInt(m[1], 10);
      const src = sources[num - 1];
      if (src)
        return (
          <button
            key={`${keyPrefix}-c${j}`}
            type="button"
            onClick={() => onSourceClick?.(src)}
            title={`View source ${num}`}
            className="mx-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#245895] align-middle text-[10px] font-black text-white transition hover:bg-[#1a3f6e]"
          >
            {num}
          </button>
        );
    }
    return <span key={`${keyPrefix}-t${j}`}>{part}</span>;
  });
}

/**
 * Renders an LLM answer as Gemini-style Markdown with inline [N] citation buttons.
 * Handles: ## headings, **bold**, *italic*, - bullet lists, 1. numbered lists, paragraphs.
 */
function renderMarkdownWithCitations(
  text: string,
  sources: ChatSourceReference[],
  onSourceClick?: (source: ChatSourceReference) => void,
): ReactNode {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  const inl = (t: string, kp: string) => renderInline(t, kp, sources, onSourceClick);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // ATX headings — check most specific first
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={i} className="mb-1 mt-4 text-[15px] font-black text-[#0f2442] first:mt-0">
          {inl(line.slice(4), `h3-${i}`)}
        </h3>,
      );
      i++; continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={i} className="mb-1.5 mt-5 text-[16px] font-black text-[#0f2442] first:mt-0">
          {inl(line.slice(3), `h2-${i}`)}
        </h2>,
      );
      i++; continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={i} className="mb-2 mt-5 text-[17px] font-black text-[#0f2442] first:mt-0">
          {inl(line.slice(2), `h1-${i}`)}
        </h1>,
      );
      i++; continue;
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const listKey = i;
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i}>{inl(lines[i].slice(2), `li-${i}`)}</li>);
        i++;
      }
      blocks.push(
        <ul key={`ul-${listKey}`} className="my-1.5 ml-5 list-disc space-y-1">
          {items}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const listKey = i;
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(
          <li key={i}>{inl(lines[i].replace(/^\d+\. /, ""), `li-${i}`)}</li>,
        );
        i++;
      }
      blocks.push(
        <ol key={`ol-${listKey}`} className="my-1.5 ml-5 list-decimal space-y-1">
          {items}
        </ol>,
      );
      continue;
    }

    // Paragraph: collect consecutive non-special lines
    const paraKey = i;
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("# ") &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(
        <p key={`p-${paraKey}`} className="leading-7">
          {inl(paraLines.join(" "), `p-${paraKey}`)}
        </p>,
      );
    }
  }

  return (
    <div className="space-y-2.5 text-[15px] font-medium text-[#17213a]">
      {blocks}
    </div>
  );
}

/**
 * One message bubble in the chat.
 * User messages are aligned to the right, and AI messages are aligned to the left.
 */
function ChatBubble({
  message,
  userAvatarUrl,
  onSourceClick,
}: {
  // The message data to display.
  message: ChatMessageView;

  // Optional avatar image for the user.
  userAvatarUrl?: string | null;

  // Called when clicking a source chip.
  onSourceClick?: (source: ChatSourceReference) => void;
}) {
  const isUser = message.role === "user";
  const displaySources = getDisplaySources(message);

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* AI avatar shown only for assistant messages */}
      {!isUser ? <CatAvatar /> : null}

      {/* Message content */}
      <div
        className={`max-w-[min(78%,760px)] ${
          isUser ? "items-end text-right" : "items-start text-left"
        } flex flex-col gap-2`}
      >
        {/* Assistant name label */}
        {!isUser ? (
          <span className="text-[12px] font-black uppercase tracking-[0.12em] text-[#245895]">
            Astronaut Cat
          </span>
        ) : null}

        {/* Chat message bubble */}
        <div
          className={`rounded-[18px] px-5 py-4 shadow-[0_10px_24px_rgba(18,24,38,0.08)] ${
            isUser
              ? "rounded-br-[6px] bg-[#245895] text-white"
              : "rounded-bl-[6px] bg-white text-[#17213a] ring-1 ring-[#dce6f4]"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[15px] font-semibold leading-7">
              {message.content}
            </p>
          ) : (
            renderMarkdownWithCitations(message.content, displaySources, onSourceClick)
          )}
        </div>

        {/* Numbered source cards below assistant messages */}
        {!isUser && displaySources.length > 0 ? (
          <div className="mt-1 grid gap-1.5">
            {displaySources.map((source, index) => {
              const rawFile = source.fileName?.trim() ?? "";
              const fileLabel = rawFile
                ? rawFile.split(/[/\\]/).pop()!.replace(/\.[^.]+$/, "")
                : source.title?.trim() || "Source";
              const locationLabel =
                typeof source.pageNumber === "number"
                  ? ` · page ${source.pageNumber}`
                  : typeof source.chunkIndex === "number"
                  ? ` · chunk ${source.chunkIndex}`
                  : "";
              const excerpt = source.content?.trim().slice(0, 120) ?? "";
              return (
                <button
                  key={source.chunkId ?? `${source.documentId}-${index}`}
                  type="button"
                  onClick={() => onSourceClick?.(source)}
                  className="flex items-start gap-2.5 rounded-xl bg-[#f0f6ff] px-3 py-2.5 text-left ring-1 ring-[#d1e3f8] transition hover:bg-[#e0eeff]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#245895] text-[10px] font-black text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-black text-[#245895]">
                      {fileLabel}{locationLabel}
                    </p>
                    {excerpt ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-relaxed text-[#5a7090]">
                        &ldquo;{excerpt}{excerpt.length >= 120 ? "…" : ""}&rdquo;
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

      </div>

      {/* User avatar shown only for user messages */}
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
  pendingSources,
  onSourceClick,
}: DocumentChatPanelProps) {
  // Stores the text currently typed in the message box.
  const [draft, setDraft] = useState("");

  // Becomes true when isSending has been true for more than 8 seconds.
  const [isSlowResponse, setIsSlowResponse] = useState(false);

  // Ref to the scrollable messages area.
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  // Ref to the bottom of the message list.
  // It can be used as an anchor point for scrolling.
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // The send button is disabled when sending or when the input is empty.
  const isSendBlocked = isSending || !draft.trim();

  const validPendingSources = getValidSourceReferences(pendingSources);

  // Memoized history list.
  // This keeps the value stable unless chatThreads changes.
  const historyItems = useMemo(() => chatThreads, [chatThreads]);

  useEffect(() => {
    if (!isSending) {
      return;
    }
    const timer = window.setTimeout(() => setIsSlowResponse(true), 8000);
    return () => {
      window.clearTimeout(timer);
      setIsSlowResponse(false);
    };
  }, [isSending]);

  /**
   * Scroll to the bottom whenever a new message appears
   * or when the typing state changes.
   */
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

  /**
   * Submit the current draft message.
   * Empty messages are ignored, and the input is cleared after sending.
   */
  function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = draft.trim();

    if (!message || isSending) {
      return;
    }

    setDraft("");
    onSendMessage(message);
  }

  /**
   * Send the message when the user presses Enter.
   * Shift + Enter still creates a new line.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitMessage();
  }

  return (
    <div className="p-6">
      {/* Main chat layout: history sidebar on the left and messages on the right */}
      <div className="grid h-[74vh] min-h-[560px] max-h-[760px] overflow-hidden rounded-[14px] border border-[#dce6f4] bg-white md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Chat history sidebar */}
        <aside className="hidden min-h-0 border-r border-[#dce6f4] bg-[#f4f8ff] p-4 md:flex md:flex-col">
          {/* Assistant profile card */}
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

          {/* History header and thread count */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#66758d]">
              History
            </p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#245895] ring-1 ring-[#dce6f4]">
              {historyItems.length}
            </span>
          </div>

          {/* Button for starting a new chat */}
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

          {/* List of previous chat threads */}
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
                      {/* Thread information button */}
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

                      {/* Delete thread button */}
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
              /* Empty history state */
              <div className="rounded-[9px] border border-dashed border-[#cbd8e8] bg-white px-4 py-5 text-center">
                <p className="text-[13px] font-bold leading-6 text-[#7a879a]">
                  No chat threads yet.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Main conversation area */}
        <div className="flex min-h-0 flex-col bg-[#f8fbff]">
          {/* Scrollable message list */}
          <div
            ref={messagesViewportRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6"
          >
            <div className="mx-auto grid max-w-[880px] gap-6">
              {messages.length ? (
                /* Render all chat messages */
                messages.map((message) => (
                  <div key={message.id}>
                    <ChatBubble
                      message={message}
                      userAvatarUrl={userAvatarUrl}
                      onSourceClick={onSourceClick}
                    />
                  </div>
                ))
              ) : (
                /* Empty chat state */
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

              {/* Typing indicator shown while the AI is responding */}
              {isSending ? (
                <div className="flex items-start gap-4">
                  <CatAvatar />
                  <div className="rounded-[18px] rounded-bl-[6px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(18,24,38,0.08)] ring-1 ring-[#dce6f4]">
                    <div className="flex flex-wrap items-center gap-3">
                      <TypingDots />
                      <span className="text-[13px] font-semibold text-[#17213a]">
                        {isSlowResponse
                          ? "Retrying, please wait a moment…"
                          : "Searching the document…"}
                      </span>
                    </div>

                    {validPendingSources.length ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#6b7a90]">
                        <span className="font-black text-[#245895]">Sources:</span>
                        {validPendingSources.slice(0, 3).map((source, index) => {
                          const rawFile = source.fileName?.trim() ?? "";
                          const fileLabel = rawFile
                            ? rawFile.split(/[/\\]/).pop()!.replace(/\.[^.]+$/, "")
                            : "";
                          const locationLabel =
                            typeof source.pageNumber === "number"
                              ? ` · page ${source.pageNumber}`
                              : typeof source.chunkIndex === "number"
                              ? ` · chunk ${source.chunkIndex}`
                              : "";
                          const label =
                            fileLabel
                              ? `${fileLabel}${locationLabel}`
                              : source.title?.trim() || `Chunk ${source.chunkIndex ?? index + 1}`;

                          return (
                            <span
                              key={source.chunkId ?? `${source.documentId}-${index}`}
                              className="max-w-[180px] truncate rounded-full bg-[#eef5ff] px-2 py-0.5 text-[#245895] ring-1 ring-[#dce6f4]"
                              title={label}
                            >
                              {label}
                            </span>
                          );
                        })}
                        {Math.max(validPendingSources.length - 3, 0) > 0 ? (
                          <span className="rounded-full bg-[#f6f8fb] px-2 py-0.5 text-[#7a879a] ring-1 ring-[#e4eaf3]">
                            +{validPendingSources.length - 3} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div ref={scrollAnchorRef} />
            </div>
          </div>

          {/* Message input form */}
          <form
            onSubmit={submitMessage}
            className="shrink-0 border-t border-[#dce6f4] bg-white p-4"
          >
            <div className="mx-auto flex max-w-[880px] items-end gap-3 rounded-[12px] bg-[#f4f8ff] p-3 ring-1 ring-[#dce6f4] focus-within:ring-[#245895]/35">
              <label className="sr-only" htmlFor="documentChatMessage">
                Message
              </label>

              {/* Textarea for writing a message */}
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

              {/* Send button */}
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