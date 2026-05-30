"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { DocumentChatPanel } from "@/components/library/DocumentChatPanel";
import type {
  AiStudyTab,
  ChatMessageView,
  ChatThreadView,
  FlashcardView,
  SummaryView,
} from "@/types/study";

export type {
  AiStudyTab,
  ChatMessageView,
  ChatThreadView,
  FlashcardView,
  SummaryView,
} from "@/types/study";

/**
 * Props for the AI study panel.
 * This component receives all data and actions from the parent component.
 */
type AiStudyPanelProps = {
  // Current selected tab: summary, flashcards, or chat.
  activeTab: AiStudyTab;

  // Saved summaries shown in the Summary tab.
  summaries: SummaryView[];

  // Saved flashcards shown in the Flashcards tab.
  flashcards: FlashcardView[];

  // Messages for the active chat thread.
  chatMessages: ChatMessageView[];

  // List of available chat threads.
  chatThreads: ChatThreadView[];

  // The currently selected chat thread id.
  activeChatThreadId: string | null;

  // Number of flashcards the user wants to generate.
  flashcardCount: number;

  // Index of the flashcard currently being displayed.
  activeFlashcardIndex: number;

  // General loading state for the whole panel.
  isLoading: boolean;

  // Loading state when generating a summary.
  isGeneratingSummary: boolean;

  // Loading state when generating flashcards.
  isGeneratingFlashcards: boolean;

  // Loading state when sending a chat message.
  isSendingChatMessage: boolean;

  // Id of the chat thread currently being deleted.
  deletingChatThreadId: string;

  // Error message shown to the user.
  errorMessage: string;

  // Optional avatar image for the current user in chat.
  userAvatarUrl?: string | null;

  // Callback functions are provided by the parent component.
  onActiveTabChange: (tab: AiStudyTab) => void;
  onFlashcardCountChange: (count: number) => void;
  onActiveFlashcardIndexChange: (index: number) => void;
  onNewChat: () => void;
  onSelectChatThread: (threadId: string) => void;
  onDeleteChatThread: (threadId: string) => void;
  onGenerateSummary: () => void;
  onGenerateFlashcards: () => void;
  onSendChatMessage: (message: string) => void;
};

/**
 * A summary is parsed into simple blocks before rendering.
 * This makes markdown-like content easier to display as UI.
 */
type SummaryBlock =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "quote"; content: string }
  | { type: "list"; ordered: boolean; items: string[] };

/**
 * Convert a createdAt value into a readable date.
 * If the value is missing or invalid, show "Just now".
 */
function formatCreatedAt(value: string | null) {
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
    year: "numeric",
  }).format(date);
}

/**
 * Parse a summary text into display blocks.
 * It supports simple markdown-like headings, lists, quotes, and paragraphs.
 */
function parseSummaryBlocks(content: string) {
  const blocks: SummaryBlock[] = [];
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let isOrderedList = false;

  // Save the current paragraph into blocks, then clear the temporary lines.
  function flushParagraph() {
    const paragraph = paragraphLines.join(" ").trim();

    if (paragraph) {
      blocks.push({ type: "paragraph", content: paragraph });
    }

    paragraphLines = [];
  }

  // Save the current list into blocks, then reset list state.
  function flushList() {
    if (listItems.length) {
      blocks.push({
        type: "list",
        ordered: isOrderedList,
        items: listItems,
      });
    }

    listItems = [];
    isOrderedList = false;
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Empty lines separate paragraphs and lists.
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);

    // Lines starting with # become headings.
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      return;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(trimmed);

    // Lines starting with -, *, or numbers become list items.
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const nextIsOrdered = Boolean(orderedMatch);

      if (listItems.length && isOrderedList !== nextIsOrdered) {
        flushList();
      }

      isOrderedList = nextIsOrdered;
      listItems.push((orderedMatch?.[1] ?? unorderedMatch?.[1] ?? "").trim());
      return;
    }

    const quoteMatch = /^>\s+(.+)$/.exec(trimmed);

    // Lines starting with > become quote blocks.
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", content: quoteMatch[1].trim() });
      return;
    }

    // Normal text becomes part of a paragraph.
    flushList();
    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushList();

  if (blocks.length) {
    return blocks;
  }

  return [{ type: "paragraph", content }] satisfies SummaryBlock[];
}

/**
 * Render simple inline markdown styles inside a text block.
 * It supports bold, italic, bold italic, and inline code.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        renderLabelledText(
          text.slice(lastIndex, match.index),
          `${keyPrefix}-t${lastIndex}`,
        ),
      );
    }

    const token = match[0];
    const key = `${keyPrefix}-m${match.index}`;

    if (token.startsWith("***")) {
      nodes.push(
        <strong key={key} className="font-black text-[#174f87]">
          <em>{token.slice(3, -3)}</em>
        </strong>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-black text-[#174f87]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key} className="font-semibold text-[#7a4b9e]">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(
        <code
          key={key}
          className="rounded-[5px] bg-[#eef5ff] px-1.5 py-0.5 text-[0.92em] font-black text-[#245895]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      renderLabelledText(text.slice(lastIndex), `${keyPrefix}-t${lastIndex}`),
    );
  }

  return nodes;
}

/**
 * Highlight short labels at the start of a sentence.
 * Example: "Definition: something" will highlight "Definition:".
 */
function renderLabelledText(text: string, key: string) {
  const labelMatch = /^([A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9\s/,-]{1,34}):\s+(.+)$/.exec(
    text,
  );

  if (!labelMatch) {
    return <span key={key}>{text}</span>;
  }

  return (
    <span key={key}>
      <span className="font-black text-[#c35a1e]">{labelMatch[1]}:</span>{" "}
      <span>{labelMatch[2]}</span>
    </span>
  );
}

/**
 * Render the summary content as styled blocks.
 * useMemo avoids parsing the same content again on every render.
 */
function SummaryRenderer({ content }: { content: string }) {
  const blocks = useMemo(() => parseSummaryBlocks(content), [content]);
  const headingClasses = [
    "text-[30px] font-black leading-tight text-[#0f2442]",
    "text-[24px] font-black leading-tight text-[#245895]",
    "text-[20px] font-black leading-tight text-[#7a4b9e]",
    "text-[18px] font-black leading-tight text-[#245895]",
  ];

  return (
    <div className="space-y-5">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          const className =
            headingClasses[Math.min(block.level, headingClasses.length) - 1] ??
            headingClasses[1];

          return (
            <h4 key={`${block.type}-${blockIndex}`} className={className}>
              {renderInline(block.content, `h-${blockIndex}`)}
            </h4>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${blockIndex}`}
              className="rounded-[10px] border-l-4 border-[#f0d45f] bg-[#fff9d9] px-5 py-4 text-[16px] font-bold italic leading-8 text-[#5f4b12]"
            >
              {renderInline(block.content, `q-${blockIndex}`)}
            </blockquote>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";

          return (
            <ListTag
              key={`${block.type}-${blockIndex}`}
              className={`grid gap-3 ${
                block.ordered ? "list-decimal pl-7" : "list-none pl-0"
              }`}
            >
              {block.items.map((item, itemIndex) => (
                <li
                  key={`${blockIndex}-${itemIndex}`}
                  className={`text-[16px] font-semibold leading-8 text-[#17213a] ${
                    block.ordered
                      ? "pl-1 marker:font-black marker:text-[#245895]"
                      : "relative rounded-[9px] bg-[#f8fbff] px-4 py-3 pl-11 ring-1 ring-[#e4ebf5] before:absolute before:left-4 before:top-[22px] before:h-2.5 before:w-2.5 before:rounded-full before:bg-[#74ead4]"
                  }`}
                >
                  {renderInline(item, `li-${blockIndex}-${itemIndex}`)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p
            key={`${block.type}-${blockIndex}`}
            className="text-[17px] font-medium leading-8 text-[#17213a]"
          >
            {renderInline(block.content, `p-${blockIndex}`)}
          </p>
        );
      })}
    </div>
  );
}

// Icons used for each AI study tab.
const studyToolIcons = {
  summary: "/assets/icons/home/magic-icon.png",
  flashcards: "/assets/icons/home/stack-icon.png",
  chat: "/assets/icons/home/chat-icon.png",
} satisfies Record<AiStudyTab, string>;

// Tint style for inactive icons.
const studyIconTint = {
  filter:
    "invert(26%) sepia(89%) saturate(1558%) hue-rotate(222deg) brightness(91%) contrast(88%)",
};

/**
 * Small icon component used inside tab buttons and action buttons.
 */
function StudyToolIcon({
  tab,
  active = false,
}: {
  tab: AiStudyTab;
  active?: boolean;
}) {
  return (
    <Image
      src={studyToolIcons[tab]}
      alt=""
      width={20}
      height={20}
      unoptimized
      className="h-5 w-5 shrink-0 object-contain"
      style={active ? { filter: "brightness(0) invert(1)" } : studyIconTint}
    />
  );
}

/**
 * Button for switching between Summary, Flashcards, and Chat tabs.
 */
function StudyTabButton({
  tab,
  activeTab,
  label,
  onClick,
}: {
  tab: AiStudyTab;
  activeTab: AiStudyTab;
  label: string;
  onClick: () => void;
}) {
  const isActive = activeTab === tab;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-[8px] px-5 text-[14px] font-black transition ${
        isActive
          ? "bg-[#245895] text-white shadow-[0_10px_20px_rgba(36,88,149,0.18)]"
          : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
      }`}
    >
      <StudyToolIcon tab={tab} active={isActive} />
      {label}
    </button>
  );
}

export function AiStudyPanel({
  activeTab,
  summaries,
  flashcards,
  chatMessages,
  chatThreads,
  activeChatThreadId,
  flashcardCount,
  activeFlashcardIndex,
  isLoading,
  isGeneratingSummary,
  isGeneratingFlashcards,
  isSendingChatMessage,
  deletingChatThreadId,
  errorMessage,
  userAvatarUrl,
  onActiveTabChange,
  onFlashcardCountChange,
  onActiveFlashcardIndexChange,
  onNewChat,
  onSelectChatThread,
  onDeleteChatThread,
  onGenerateSummary,
  onGenerateFlashcards,
  onSendChatMessage,
}: AiStudyPanelProps) {
  // Stores which flashcard answer is currently visible.
  const [visibleAnswerCardId, setVisibleAnswerCardId] = useState<string | null>(
    null,
  );

  // Stores completed flashcard ids locally in this component.
  const [completedFlashcardIds, setCompletedFlashcardIds] = useState<
    Set<string>
  >(() => new Set());

  // Stores the selected summary id from history.
  // When it is null, the latest summary is shown.
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(
    null,
  );

  // The newest summary is expected to be the first item.
  const latestSummary = summaries[0] ?? null;

  // Show the selected saved summary, or fall back to the latest summary.
  const activeSummary =
    summaries.find((summary) => summary.id === selectedSummaryId) ??
    latestSummary;

  // Current flashcard based on the active index.
  const activeFlashcard = flashcards[activeFlashcardIndex] ?? null;

  // Check whether the current flashcard answer should be displayed.
  const isAnswerVisible = activeFlashcard
    ? visibleAnswerCardId === activeFlashcard.id
    : false;

  // Count how many flashcards were marked as completed.
  const completedFlashcardCount = flashcards.filter((card) =>
    completedFlashcardIds.has(card.id),
  ).length;

  // Check whether the current flashcard is completed.
  const isActiveFlashcardCompleted = activeFlashcard
    ? completedFlashcardIds.has(activeFlashcard.id)
    : false;

  // Keep the flashcard count input inside the allowed range from 1 to 50.
  const boundedFlashcardCount = useMemo(
    () => Math.min(50, Math.max(1, flashcardCount)),
    [flashcardCount],
  );

  // Generate a new summary and reset selection so the latest summary is shown.
  function generateSummaryAndShowLatest() {
    setSelectedSummaryId(null);
    onGenerateSummary();
  }

  // Mark the current flashcard as completed.
  function markActiveFlashcardCompleted() {
    if (!activeFlashcard) {
      return;
    }

    setCompletedFlashcardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(activeFlashcard.id);
      return nextIds;
    });
  }

  // Mark the current flashcard as not completed.
  function markActiveFlashcardUncompleted() {
    if (!activeFlashcard) {
      return;
    }

    setCompletedFlashcardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(activeFlashcard.id);
      return nextIds;
    });
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[14px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] ring-1 ring-[#dce6f4]">
      {/* Main panel header */}
      <div className="border-b border-[#dce6f4] px-6 py-5">
        <div>
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#5f6c82]">
            AI Study
          </p>
          <h2 className="mt-1 text-[28px] font-black leading-tight text-[#0f2442]">
            Summary, Flashcards & Chat
          </h2>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-3 px-6 pt-5">
        <StudyTabButton
          tab="summary"
          activeTab={activeTab}
          label="Summary"
          onClick={() => onActiveTabChange("summary")}
        />
        <StudyTabButton
          tab="flashcards"
          activeTab={activeTab}
          label="Flashcards"
          onClick={() => onActiveTabChange("flashcards")}
        />
        <StudyTabButton
          tab="chat"
          activeTab={activeTab}
          label="Chat"
          onClick={() => onActiveTabChange("chat")}
        />
      </div>

      {/* Error message area */}
      {errorMessage ? (
        <div className="mx-6 mt-5 rounded-[10px] border border-[#ffc4ca] bg-[#fff0f1] px-4 py-3 text-[14px] font-bold text-[#b42335]">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        /* Loading placeholder */
        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_260px]">
          <div className="h-[260px] rounded-[12px] bg-[#f2f6fb]" />
          <div className="h-[260px] rounded-[12px] bg-[#f2f6fb]" />
        </div>
      ) : activeTab === "summary" ? (
        /* Summary tab content */
        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          {/* Main summary display */}
          <article className="min-h-[280px] rounded-[12px] border border-[#dce6f4] bg-[#f8fbff] p-6">
            {activeSummary ? (
              <>
                {/* Summary title and date */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[24px] font-black text-[#0f2442]">
                    {selectedSummaryId ? "Saved Summary" : "Latest Summary"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#5f6c82] ring-1 ring-[#dce6f4]">
                      {formatCreatedAt(activeSummary.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Rendered summary content */}
                <div className="mt-5 max-h-[620px] overflow-y-auto rounded-[12px] bg-white px-6 py-6 ring-1 ring-[#e4ebf5]">
                  <SummaryRenderer content={activeSummary.content} />
                </div>
              </>
            ) : (
              /* Empty summary state */
              <div className="grid min-h-[230px] place-items-center rounded-[10px] border border-dashed border-[#cbd8e8] bg-white px-6 text-center">
                <div>
                  <h3 className="text-[22px] font-black text-[#0f2442]">
                    No summary yet
                  </h3>
                  <p className="mt-2 text-[15px] font-semibold text-[#748195]">
                    Saved summaries will appear here.
                  </p>
                </div>
              </div>
            )}
          </article>

          {/* Summary sidebar with count, generate button, and history */}
          <aside className="rounded-[12px] border border-[#dce6f4] bg-white p-5">
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
              Saved
            </p>
            <p className="mt-2 text-[40px] font-black leading-none text-[#0f2442]">
              {summaries.length}
            </p>
            <p className="mt-2 text-[14px] font-bold text-[#7a879a]">
              summaries
            </p>

            <button
              type="button"
              onClick={generateSummaryAndShowLatest}
              disabled={isGeneratingSummary}
              className="mt-7 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#9ab0ca] disabled:shadow-none"
            >
              <StudyToolIcon tab="summary" active />
              {isGeneratingSummary ? "Generating..." : "Generate Summary"}
            </button>

            {summaries.length ? (
              /* Summary history list */
              <div className="mt-6 border-t border-[#e5ecf6] pt-5">
                <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
                  History
                </p>
                <div className="mt-3 grid max-h-[220px] gap-2 overflow-y-auto pr-1">
                  {summaries.map((summary, index) => {
                    const isActive = activeSummary?.id === summary.id;

                    return (
                      <button
                        key={summary.id}
                        type="button"
                        onClick={() => setSelectedSummaryId(summary.id)}
                        className={`rounded-[8px] px-3 py-3 text-left transition ${
                          isActive
                            ? "bg-[#245895] text-white shadow-[0_8px_18px_rgba(36,88,149,0.18)]"
                            : "bg-[#f4f8ff] text-[#102744] ring-1 ring-[#dce6f4] hover:bg-[#eaf2ff]"
                        }`}
                      >
                        <span className="block text-[14px] font-black">
                          Summary {summaries.length - index}
                        </span>
                        <span
                          className={`mt-1 block text-[12px] font-bold ${
                            isActive ? "text-white/75" : "text-[#7a879a]"
                          }`}
                        >
                          {formatCreatedAt(summary.createdAt)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : activeTab === "flashcards" ? (
        /* Flashcards tab content */
        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main flashcard display */}
          <article className="rounded-[12px] border border-[#dce6f4] bg-[#f8fbff] p-6">
            {activeFlashcard ? (
              <>
                {/* Flashcard title and status */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[24px] font-black text-[#0f2442]">
                      Card {activeFlashcardIndex + 1} of {flashcards.length}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-4 py-2 text-[13px] font-black ring-1 ${
                          isActiveFlashcardCompleted
                            ? "bg-[#d9f8df] text-[#2e9b55] ring-[#b8ecc5]"
                            : "bg-[#fff7df] text-[#a66a00] ring-[#f3d487]"
                        }`}
                      >
                        {isActiveFlashcardCompleted
                          ? "Completed"
                          : "Not completed"}
                      </span>

                      <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#5f6c82] ring-1 ring-[#dce6f4]">
                        {formatCreatedAt(activeFlashcard.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Flashcard question and answer area */}
                <div className="mt-5 grid min-h-[300px] rounded-[12px] bg-white p-6 shadow-[inset_0_0_0_1px_#e4ebf5]">
                  <div>
                    <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#245895]">
                      Question
                    </p>
                    <h4 className="mt-3 text-[24px] font-black leading-snug text-[#102744]">
                      {activeFlashcard.question}
                    </h4>
                  </div>

                  <div className="mt-7 border-t border-[#e5ecf6] pt-5">
                    {isAnswerVisible ? (
                      <>
                        <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#2e9b55]">
                          Answer
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[17px] font-semibold leading-8 text-[#17213a]">
                          {activeFlashcard.answer}
                        </p>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleAnswerCardId(activeFlashcard.id)
                        }
                        className="h-12 cursor-pointer rounded-[8px] bg-[#eef5ff] px-5 text-[14px] font-black text-[#245895] transition hover:bg-[#dfeeff]"
                      >
                        Show Answer
                      </button>
                    )}
                  </div>
                </div>

                {/* Flashcard navigation and completion actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onActiveFlashcardIndexChange(activeFlashcardIndex - 1)
                      }
                      disabled={activeFlashcardIndex === 0}
                      className="h-11 cursor-pointer rounded-[8px] bg-white px-5 text-[14px] font-black text-[#102744] ring-1 ring-[#dce6f4] transition hover:bg-[#f4f8ff] disabled:cursor-not-allowed disabled:text-[#aab3c1]"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onActiveFlashcardIndexChange(activeFlashcardIndex + 1)
                      }
                      disabled={activeFlashcardIndex === flashcards.length - 1}
                      className="h-11 cursor-pointer rounded-[8px] bg-white px-5 text-[14px] font-black text-[#102744] ring-1 ring-[#dce6f4] transition hover:bg-[#f4f8ff] disabled:cursor-not-allowed disabled:text-[#aab3c1]"
                    >
                      Next
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {isActiveFlashcardCompleted ? (
                      <button
                        type="button"
                        onClick={markActiveFlashcardUncompleted}
                        className="h-11 cursor-pointer rounded-[8px] bg-[#fff0f1] px-5 text-[14px] font-black text-[#b42335] transition hover:bg-[#ffe1e5]"
                      >
                        Mark not done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={markActiveFlashcardCompleted}
                        className="h-11 cursor-pointer rounded-[8px] bg-[#d9f8df] px-5 text-[14px] font-black text-[#2e9b55] transition hover:bg-[#c9f1d3]"
                      >
                        Mark done
                      </button>
                    )}

                    {isAnswerVisible ? (
                      <button
                        type="button"
                        onClick={() => setVisibleAnswerCardId(null)}
                        className="h-11 cursor-pointer rounded-[8px] bg-[#eef5ff] px-5 text-[14px] font-black text-[#245895] transition hover:bg-[#dfeeff]"
                      >
                        Hide Answer
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              /* Empty flashcard state */
              <div className="grid min-h-[300px] place-items-center rounded-[10px] border border-dashed border-[#cbd8e8] bg-white px-6 text-center">
                <div>
                  <h3 className="text-[22px] font-black text-[#0f2442]">
                    No flashcards yet
                  </h3>
                  <p className="mt-2 text-[15px] font-semibold text-[#748195]">
                    Saved cards will appear here.
                  </p>
                </div>
              </div>
            )}
          </article>

          {/* Flashcard sidebar with progress, generation input, and card list */}
          <aside className="rounded-[12px] border border-[#dce6f4] bg-white p-5">
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
              Saved Cards
            </p>
            <p className="mt-2 text-[40px] font-black leading-none text-[#0f2442]">
              {completedFlashcardCount}/{flashcards.length}
            </p>
            <p className="mt-2 text-[14px] font-bold text-[#7a879a]">
              cards completed
            </p>

            {/* Completion progress bar */}
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eef5ff]">
              <div
                className="h-full rounded-full bg-[#2e9b55] transition-all duration-500"
                style={{
                  width: flashcards.length
                    ? `${Math.round((completedFlashcardCount / flashcards.length) * 100)}%`
                    : "0%",
                }}
              />
            </div>

            {/* Number input for generating new flashcards */}
            <label className="mt-6 block text-[14px] font-black text-[#102744]">
              New cards
              <input
                type="number"
                min={1}
                max={50}
                value={boundedFlashcardCount}
                onChange={(event) =>
                  onFlashcardCountChange(Number(event.target.value))
                }
                className="mt-2 h-11 w-full rounded-[8px] border border-[#cad6e6] bg-[#f8fbff] px-4 text-[15px] font-black text-[#102744] outline-none transition focus:border-[#245895]"
              />
            </label>

            <button
              type="button"
              onClick={onGenerateFlashcards}
              disabled={isGeneratingFlashcards}
              className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#9ab0ca] disabled:shadow-none"
            >
              <StudyToolIcon tab="flashcards" active />
              {isGeneratingFlashcards ? "Generating..." : "Generate Cards"}
            </button>

            {flashcards.length ? (
              /* Small buttons for jumping to a specific flashcard */
              <div className="mt-6 flex max-h-[148px] flex-wrap gap-2 overflow-y-auto">
                {flashcards.map((card, index) => {
                  const isActive = index === activeFlashcardIndex;
                  const isCompleted = completedFlashcardIds.has(card.id);

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => onActiveFlashcardIndexChange(index)}
                      className={`relative grid h-9 w-9 cursor-pointer place-items-center rounded-[7px] text-[13px] font-black transition ${
                        isActive
                          ? "bg-[#245895] text-white shadow-[0_8px_18px_rgba(36,88,149,0.18)]"
                          : isCompleted
                            ? "bg-[#d9f8df] text-[#2e9b55] hover:bg-[#c9f1d3]"
                            : "bg-[#fff7df] text-[#a66a00] hover:bg-[#ffefbf]"
                      }`}
                      aria-label={`Open card ${index + 1}`}
                      title={isCompleted ? "Completed" : "Not completed"}
                    >
                      {index + 1}

                      {/* <span
                        className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[10px] font-black ring-2 ring-white ${
                          isCompleted
                            ? "bg-[#2e9b55] text-white"
                            : "bg-[#f0b429] text-white"
                        }`}
                        aria-hidden="true"
                      >
                        {isCompleted ? "✓" : "!"}
                      </span> */}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        /* Chat tab content */
        <DocumentChatPanel
          messages={chatMessages}
          chatThreads={chatThreads}
          activeThreadId={activeChatThreadId}
          isSending={isSendingChatMessage}
          deletingThreadId={deletingChatThreadId}
          userAvatarUrl={userAvatarUrl}
          onNewChat={onNewChat}
          onSelectThread={onSelectChatThread}
          onDeleteThread={onDeleteChatThread}
          onSendMessage={onSendChatMessage}
        />
      )}
    </section>
  );
}