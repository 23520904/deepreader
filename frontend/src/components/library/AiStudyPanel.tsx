"use client";

import { useMemo, useState } from "react";

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
  if (provider.toLowerCase() === "openai") {
    return "OpenAI";
  }

  return "Gemini";
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
  const latestSummary = summaries[0] ?? null;
  const activeFlashcard = flashcards[activeFlashcardIndex] ?? null;
  const isAnswerVisible = activeFlashcard
    ? visibleAnswerCardId === activeFlashcard.id
    : false;

  const boundedFlashcardCount = useMemo(
    () => Math.min(50, Math.max(1, flashcardCount)),
    [flashcardCount],
  );

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
            {latestSummary ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[24px] font-black text-[#0f2442]">
                    Book Summary
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#245895] ring-1 ring-[#dce6f4]">
                      {providerLabel(latestSummary.model)}
                    </span>
                    <span className="rounded-full bg-white px-4 py-2 text-[13px] font-black text-[#5f6c82] ring-1 ring-[#dce6f4]">
                      {formatCreatedAt(latestSummary.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 max-h-[340px] overflow-y-auto rounded-[10px] bg-white px-5 py-4 text-[16px] font-medium leading-8 text-[#17213a] ring-1 ring-[#e4ebf5]">
                  <p className="whitespace-pre-wrap">{latestSummary.content}</p>
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
              onClick={onGenerateSummary}
              disabled={isGeneratingSummary}
              className="mt-7 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#9ab0ca] disabled:shadow-none"
            >
              <SparkIcon />
              {isGeneratingSummary ? "Generating..." : "Generate Summary"}
            </button>
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
              Cards
            </p>
            <p className="mt-2 text-[40px] font-black leading-none text-[#0f2442]">
              {flashcards.length}
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
