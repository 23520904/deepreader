"use client";

import { useMemo, useState, type ReactNode } from "react";

export type AiStudyTab = "summary" | "flashcards";

export type SummaryView = {
  id: string;
  content: string;
  model: string;
  createdAt: string | null;
};

export type FlashcardView = {
  id: string;
  question: string;
  answer: string;
  createdAt: string | null;
};

type AiStudyPanelProps = {
  activeTab: AiStudyTab;
  provider: string;
  summaries: SummaryView[];
  flashcards: FlashcardView[];
  flashcardCount: number;
  activeFlashcardIndex: number;
  isLoading: boolean;
  isGeneratingSummary: boolean;
  isGeneratingFlashcards: boolean;
  errorMessage: string;
  onActiveTabChange: (tab: AiStudyTab) => void;
  onProviderChange: (provider: string) => void;
  onFlashcardCountChange: (count: number) => void;
  onActiveFlashcardIndexChange: (index: number) => void;
  onGenerateSummary: () => void;
  onGenerateFlashcards: () => void;
};

type SummaryBlock =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "quote"; content: string }
  | { type: "list"; ordered: boolean; items: string[] };

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

function providerLabel(provider: string) {
  if (provider.toLowerCase() === "groq") {
    return "Groq";
  }

  if (provider.toLowerCase() === "openai") {
    return "OpenAI";
  }

  return "Gemini";
}

function parseSummaryBlocks(content: string) {
  const blocks: SummaryBlock[] = [];
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let isOrderedList = false;

  function flushParagraph() {
    const paragraph = paragraphLines.join(" ").trim();

    if (paragraph) {
      blocks.push({ type: "paragraph", content: paragraph });
    }

    paragraphLines = [];
  }

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

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);

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

    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", content: quoteMatch[1].trim() });
      return;
    }

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

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(renderLabelledText(text.slice(lastIndex, match.index), `${keyPrefix}-t${lastIndex}`));
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
    nodes.push(renderLabelledText(text.slice(lastIndex), `${keyPrefix}-t${lastIndex}`));
  }

  return nodes;
}

function renderLabelledText(text: string, key: string) {
  const labelMatch = /^([A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9\s/,-]{1,34}):\s+(.+)$/.exec(text);

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

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM18 15l.9 2.6 2.6.9-2.6.9L18 21l-.9-2.6-2.6-.9 2.6-.9L18 15Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 7.5h10M7 12h7M6 4h12a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8 20h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AiStudyPanel({
  activeTab,
  provider,
  summaries,
  flashcards,
  flashcardCount,
  activeFlashcardIndex,
  isLoading,
  isGeneratingSummary,
  isGeneratingFlashcards,
  errorMessage,
  onActiveTabChange,
  onProviderChange,
  onFlashcardCountChange,
  onActiveFlashcardIndexChange,
  onGenerateSummary,
  onGenerateFlashcards,
}: AiStudyPanelProps) {
  const [visibleAnswerCardId, setVisibleAnswerCardId] = useState<string | null>(
    null,
  );
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const latestSummary = summaries[0] ?? null;
  const activeSummary =
    summaries.find((summary) => summary.id === selectedSummaryId) ??
    latestSummary;
  const activeFlashcard = flashcards[activeFlashcardIndex] ?? null;
  const isAnswerVisible = activeFlashcard
    ? visibleAnswerCardId === activeFlashcard.id
    : false;

  const boundedFlashcardCount = useMemo(
    () => Math.min(50, Math.max(1, flashcardCount)),
    [flashcardCount],
  );

  function generateSummaryAndShowLatest() {
    setSelectedSummaryId(null);
    onGenerateSummary();
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[14px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] ring-1 ring-[#dce6f4]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dce6f4] px-6 py-5">
        <div>
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#5f6c82]">
            AI Study
          </p>
          <h2 className="mt-1 text-[28px] font-black leading-tight text-[#0f2442]">
            Summary & Flashcards
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[13px] font-black uppercase tracking-[0.12em] text-[#6c778b]">
            Provider
          </label>
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.target.value)}
            className="h-11 rounded-[8px] border border-[#cad6e6] bg-[#f8fbff] px-4 text-[14px] font-black text-[#102744] outline-none transition focus:border-[#245895]"
          >
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 px-6 pt-5">
        <button
          type="button"
          onClick={() => onActiveTabChange("summary")}
          className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-[8px] px-5 text-[14px] font-black transition ${
            activeTab === "summary"
              ? "bg-[#245895] text-white shadow-[0_10px_20px_rgba(36,88,149,0.18)]"
              : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
          }`}
        >
          <SparkIcon />
          Summary
        </button>

        <button
          type="button"
          onClick={() => onActiveTabChange("flashcards")}
          className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-[8px] px-5 text-[14px] font-black transition ${
            activeTab === "flashcards"
              ? "bg-[#245895] text-white shadow-[0_10px_20px_rgba(36,88,149,0.18)]"
              : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
          }`}
        >
          <CardsIcon />
          Flashcards
        </button>

        <button
          type="button"
          disabled
          className="h-11 cursor-not-allowed rounded-[8px] bg-[#f2f4f8] px-5 text-[14px] font-black text-[#98a2b3]"
        >
          Chat Soon
        </button>
      </div>

      {errorMessage ? (
        <div className="mx-6 mt-5 rounded-[10px] border border-[#ffc4ca] bg-[#fff0f1] px-4 py-3 text-[14px] font-bold text-[#b42335]">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-5 p-6 lg:grid-cols-[1fr_260px]">
          <div className="h-[260px] rounded-[12px] bg-[#f2f6fb]" />
          <div className="h-[260px] rounded-[12px] bg-[#f2f6fb]" />
        </div>
      ) : activeTab === "summary" ? (
        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-h-[280px] rounded-[12px] border border-[#dce6f4] bg-[#f8fbff] p-6">
            {activeSummary ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[24px] font-black text-[#0f2442]">
                    {selectedSummaryId ? "Saved Summary" : "Latest Summary"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#245895] ring-1 ring-[#dce6f4]">
                      {providerLabel(activeSummary.model)}
                    </span>
                    <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#5f6c82] ring-1 ring-[#dce6f4]">
                      {formatCreatedAt(activeSummary.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 max-h-[620px] overflow-y-auto rounded-[12px] bg-white px-6 py-6 ring-1 ring-[#e4ebf5]">
                  <SummaryRenderer content={activeSummary.content} />
                </div>
              </>
            ) : (
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
              <SparkIcon />
              {isGeneratingSummary ? "Generating..." : "Generate Summary"}
            </button>

            {summaries.length ? (
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
                          {providerLabel(summary.model)} ·{" "}
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
      ) : (
        <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="rounded-[12px] border border-[#dce6f4] bg-[#f8fbff] p-6">
            {activeFlashcard ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[24px] font-black text-[#0f2442]">
                    Card {activeFlashcardIndex + 1} of {flashcards.length}
                  </h3>
                  <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#5f6c82] ring-1 ring-[#dce6f4]">
                    {formatCreatedAt(activeFlashcard.createdAt)}
                  </span>
                </div>

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

                  {isAnswerVisible ? (
                    <button
                      type="button"
                      onClick={() => setVisibleAnswerCardId(null)}
                      className="h-11 cursor-pointer rounded-[8px] bg-[#d9f8df] px-5 text-[14px] font-black text-[#2e9b55] transition hover:bg-[#c9f1d3]"
                    >
                      Hide Answer
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
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

          <aside className="rounded-[12px] border border-[#dce6f4] bg-white p-5">
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
              Saved Cards
            </p>
            <p className="mt-2 text-[40px] font-black leading-none text-[#0f2442]">
              {flashcards.length}
            </p>
            <p className="mt-2 text-[14px] font-bold text-[#7a879a]">
              cards stored
            </p>

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
              <CardsIcon />
              {isGeneratingFlashcards ? "Generating..." : "Generate Cards"}
            </button>

            {flashcards.length ? (
              <div className="mt-6 flex max-h-[148px] flex-wrap gap-2 overflow-y-auto">
                {flashcards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onActiveFlashcardIndexChange(index)}
                    className={`grid h-9 w-9 cursor-pointer place-items-center rounded-[7px] text-[13px] font-black transition ${
                      index === activeFlashcardIndex
                        ? "bg-[#245895] text-white"
                        : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
                    }`}
                    aria-label={`Open card ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}
