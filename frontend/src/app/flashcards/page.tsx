"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getAuthSessionSnapshot, subscribeAuthSession } from "@/lib/authSession";
import { mapBackendBook } from "@/lib/library";
import { normalizeFlashcardRecords } from "@/lib/reading";
import { fetchLibraryBooks } from "@/services/libraryService";
import { fetchDocumentFlashcards } from "@/services/readingService";
import type { LibraryDocument } from "@/types/library";
import type { FlashcardView } from "@/types/study";

type FlashcardMode = "review" | "quiz";

type StudyFlashcard = FlashcardView & {
  bookId: string;
  bookTitle: string;
  bookFormat: LibraryDocument["format"];
};

const FLASHCARD_ICON = "/assets/icons/sidebar/flashcard-icon.png";

function createdAtTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function shuffleItems<T>(items: T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function makeQuizOptions(card: StudyFlashcard | null, cards: StudyFlashcard[]) {
  if (!card) {
    return [];
  }

  const distractors = uniqueValues(
    cards
      .filter((candidate) => candidate.id !== card.id)
      .map((candidate) => candidate.answer),
  ).slice(0, 12);

  return shuffleItems([card.answer, ...shuffleItems(distractors).slice(0, 3)]);
}

export default function FlashcardsPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [flashcards, setFlashcards] = useState<StudyFlashcard[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<FlashcardMode>("review");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    const token = session.token;
    const displayName = session.username || session.email || "You";
    let ignore = false;

    async function loadFlashcards() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const books = await fetchLibraryBooks(token);
        const libraryDocuments = books.map((book) =>
          mapBackendBook(book, "mine", displayName),
        );
        const readyDocuments = libraryDocuments.filter(
          (document) => document.status === "Ready",
        );
        const cardGroups = await Promise.all(
          readyDocuments.map(async (document) => ({
            document,
            records: await fetchDocumentFlashcards(token, document.id),
          })),
        );

        if (ignore) {
          return;
        }

        const nextFlashcards = cardGroups
          .flatMap(({ document, records }) =>
            normalizeFlashcardRecords(records ?? []).map((card) => ({
              ...card,
              bookId: document.id,
              bookTitle: document.title,
              bookFormat: document.format,
            })),
          )
          .sort(
            (left, right) =>
              createdAtTime(right.createdAt) - createdAtTime(left.createdAt),
          );

        setDocuments(libraryDocuments);
        setFlashcards(nextFlashcards);
        setActiveCardIndex(0);
        setQuizIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
      } catch (error) {
        if (!ignore) {
          setDocuments([]);
          setFlashcards([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load flashcards.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadFlashcards();

    return () => {
      ignore = true;
    };
  }, [router, session]);

  const cardCountsByBook = useMemo(() => {
    const counts = new Map<string, number>();

    flashcards.forEach((card) => {
      counts.set(card.bookId, (counts.get(card.bookId) ?? 0) + 1);
    });

    return counts;
  }, [flashcards]);

  const visibleFlashcards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return flashcards.filter((card) => {
      const matchesBook =
        selectedBookId === "all" || card.bookId === selectedBookId;
      const matchesQuery =
        !normalizedQuery ||
        card.question.toLowerCase().includes(normalizedQuery) ||
        card.answer.toLowerCase().includes(normalizedQuery) ||
        card.bookTitle.toLowerCase().includes(normalizedQuery);

      return matchesBook && matchesQuery;
    });
  }, [flashcards, query, selectedBookId]);

  const activeCard =
    visibleFlashcards[Math.min(activeCardIndex, visibleFlashcards.length - 1)] ??
    null;
  const quizCards = visibleFlashcards;
  const quizTotal = quizCards.length;
  const quizProgress = Math.min(answeredCount, quizTotal);
  const isQuizFinished = quizTotal > 0 && quizIndex >= quizTotal;
  const isLastQuizQuestion = quizTotal > 0 && quizIndex === quizTotal - 1;
  const quizScorePercent = quizTotal
    ? Math.round((quizScore / quizTotal) * 100)
    : 0;

  const currentQuizCard =
    quizTotal > 0 && quizIndex < quizTotal ? quizCards[quizIndex] : null;

  const quizOptions = useMemo(
    () => makeQuizOptions(currentQuizCard, quizCards),
    [currentQuizCard, quizCards],
  );
  const selectedIsCorrect =
    Boolean(selectedAnswer && currentQuizCard) &&
    selectedAnswer === currentQuizCard?.answer;

  function goToCard(index: number) {
    if (!visibleFlashcards.length) {
      setActiveCardIndex(0);
      return;
    }

    setActiveCardIndex(
      (index + visibleFlashcards.length) % visibleFlashcards.length,
    );
  }

  function shuffleReviewDeck() {
    if (!visibleFlashcards.length) {
      return;
    }

    setActiveCardIndex(Math.floor(Math.random() * visibleFlashcards.length));
    setIsAnswerVisible(false);
  }

  function answerQuiz(option: string) {
    if (!currentQuizCard || isAnswerSubmitted || isQuizFinished) {
      return;
    }

    setSelectedAnswer(option);
  }

  function submitQuizAnswer() {
    if (!selectedAnswer || !currentQuizCard || isAnswerSubmitted) {
      return;
    }

    setIsAnswerSubmitted(true);
    setAnsweredCount((count) => Math.min(count + 1, quizTotal));

    if (selectedAnswer === currentQuizCard.answer) {
      setQuizScore((score) => score + 1);
    }
  }

  function nextQuizQuestion() {
    if (!quizCards.length || !isAnswerSubmitted) {
      return;
    }

    if (isLastQuizQuestion) {
      setQuizIndex(quizTotal);
    } else {
      setQuizIndex((index) => Math.min(index + 1, quizCards.length - 1));
    }

    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
  }

  function resetQuiz() {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setAnsweredCount(0);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
  }

  function changeSelectedBook(bookId: string) {
    setSelectedBookId(bookId);
    setActiveCardIndex(0);
    setIsAnswerVisible(false);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#101827]">
      <SiteNavbar activeItem="Flashcards" />

      <section className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-9 max-[700px]:w-[min(100%_-_28px,1180px)]">
        <div className="overflow-hidden rounded-[8px] bg-[#17345d] text-white shadow-[0_18px_38px_rgba(18,31,65,0.18)]">
          <div className="grid gap-8 px-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex items-start gap-5">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] bg-white text-[#245895]">
                <Image
                  src={FLASHCARD_ICON}
                  alt=""
                  width={34}
                  height={34}
                  className="h-8 w-8 object-contain"
                  style={{
                    filter:
                      "invert(26%) sepia(89%) saturate(1558%) hue-rotate(222deg) brightness(91%) contrast(88%)",
                  }}
                />
              </div>
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#78e7d8]">
                  Study Deck
                </p>
                <h1 className="mt-2 text-[clamp(34px,4vw,52px)] font-black leading-tight">
                  Flashcards
                </h1>
                <p className="mt-4 max-w-[690px] text-[16px] font-semibold leading-7 text-[#c9d7ee]">
                  Review cards generated from your documents and test recall with
                  focused multiple choice sessions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[8px] bg-white px-4 py-4 text-[#102744]">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#6f7f96]">
                  Cards
                </p>
                <p className="mt-2 text-[34px] font-black leading-none">
                  {flashcards.length}
                </p>
              </div>
              <div className="rounded-[8px] bg-[#e7fbf8] px-4 py-4 text-[#0f4f4b]">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#42756f]">
                  Docs
                </p>
                <p className="mt-2 text-[34px] font-black leading-none">
                  {cardCountsByBook.size}
                </p>
              </div>
              <div className="rounded-[8px] bg-[#fff4d7] px-4 py-4 text-[#5f4211]">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#8f6c26]">
                  Score
                </p>
                <p className="mt-2 text-[34px] font-black leading-none">
                  {quizScore}/{quizTotal}
                </p>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-[8px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[14px] font-bold text-[#b42335]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="self-start rounded-[8px] bg-white p-5 shadow-[0_12px_26px_rgba(18,31,65,0.08)] ring-1 ring-[#dce6f4]">
            <label className="block text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
              Search
              <input
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                placeholder="Question, answer, document"
                className="mt-3 h-11 w-full rounded-[8px] border border-[#cad6e6] bg-[#f8fbff] px-4 text-[14px] font-bold normal-case tracking-[0] text-[#102744] outline-none transition focus:border-[#245895]"
              />
            </label>

            <label className="mt-5 block text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
              Document
              <select
                value={selectedBookId}
                onChange={(event) => changeSelectedBook(event.target.value)}
                className="mt-3 h-11 w-full rounded-[8px] border border-[#cad6e6] bg-[#f8fbff] px-4 text-[14px] font-bold normal-case tracking-[0] text-[#102744] outline-none transition focus:border-[#245895]"
              >
                <option value="all">All documents</option>
                {documents
                  .filter((document) => cardCountsByBook.has(document.id))
                  .map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                    </option>
                  ))}
              </select>
            </label>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {(["review", "quiz"] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => setMode(nextMode)}
                  className={`h-11 cursor-pointer rounded-[8px] text-[13px] font-black capitalize transition ${
                    mode === nextMode
                      ? "bg-[#245895] text-white shadow-[0_10px_20px_rgba(36,88,149,0.18)]"
                      : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
                  }`}
                >
                  {nextMode}
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-[#e5ecf6] pt-5">
              <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
                Documents
              </p>
              <div className="mt-3 grid max-h-[300px] gap-2 overflow-y-auto pr-1">
                {documents.filter((document) => cardCountsByBook.has(document.id))
                  .length ? (
                  documents
                    .filter((document) => cardCountsByBook.has(document.id))
                    .map((document) => (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => changeSelectedBook(document.id)}
                        className={`rounded-[8px] px-3 py-3 text-left transition ${
                          selectedBookId === document.id
                            ? "bg-[#245895] text-white"
                            : "bg-[#f4f8ff] text-[#102744] hover:bg-[#eaf2ff]"
                        }`}
                      >
                        <span className="block truncate text-[13px] font-black">
                          {document.title}
                        </span>
                        <span
                          className={`mt-1 block text-[12px] font-bold ${
                            selectedBookId === document.id
                              ? "text-white/75"
                              : "text-[#7a879a]"
                          }`}
                        >
                          {cardCountsByBook.get(document.id) ?? 0} cards
                        </span>
                      </button>
                    ))
                ) : (
                  <p className="rounded-[8px] bg-[#f8fbff] px-4 py-4 text-[13px] font-bold leading-6 text-[#7a879a]">
                    No generated cards yet.
                  </p>
                )}
              </div>
            </div>
          </aside>

          <section className="grid gap-5">
            {isLoading ? (
              <div className="grid min-h-[430px] place-items-center rounded-[8px] bg-white ring-1 ring-[#dce6f4]">
                <p className="text-[16px] font-black text-[#245895]">
                  Loading flashcards...
                </p>
              </div>
            ) : !flashcards.length ? (
              <div className="grid min-h-[430px] place-items-center rounded-[8px] bg-white px-6 text-center ring-1 ring-[#dce6f4]">
                <div className="max-w-[460px]">
                  <h2 className="text-[28px] font-black text-[#0f2442]">
                    No flashcards yet
                  </h2>
                  <p className="mt-3 text-[15px] font-semibold leading-7 text-[#748195]">
                    Generate cards inside any document, then they will collect
                    here automatically.
                  </p>
                  <Link
                    href="/library"
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-[8px] bg-[#245895] px-6 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86]"
                  >
                    Open Library
                  </Link>
                </div>
              </div>
            ) : mode === "review" ? (
              <>
                <article className="rounded-[8px] bg-white p-6 shadow-[0_12px_26px_rgba(18,31,65,0.08)] ring-1 ring-[#dce6f4]">
                  {activeCard ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#245895]">
                            {activeCard.bookFormat} Deck
                          </p>
                          <h2 className="mt-1 max-w-[760px] truncate text-[24px] font-black text-[#0f2442]">
                            {activeCard.bookTitle}
                          </h2>
                        </div>
                        <span className="rounded-full bg-[#e7fbf8] px-4 py-2 text-[13px] font-black text-[#0f6f67]">
                          {activeCardIndex + 1} / {visibleFlashcards.length}
                        </span>
                      </div>

                      <div className="mt-5 grid min-h-[340px] overflow-hidden rounded-[8px] border border-[#dce6f4] bg-[#f8fbff]">
                        <div className="h-2 bg-[linear-gradient(90deg,#245895_0%,#74ead4_55%,#f0d45f_100%)]" />
                        <div className="grid gap-6 p-7">
                          <div>
                            <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#245895]">
                              Question
                            </p>
                            <h3 className="mt-4 text-[26px] font-black leading-snug text-[#102744]">
                              {activeCard.question}
                            </h3>
                          </div>

                          {isAnswerVisible ? (
                            <div className="rounded-[8px] border border-[#bfe8c9] bg-[#f0fbf3] px-5 py-5">
                              <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#2e9b55]">
                                Answer
                              </p>
                              <p className="mt-3 whitespace-pre-wrap text-[17px] font-semibold leading-8 text-[#17213a]">
                                {activeCard.answer}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-[8px] border border-dashed border-[#cbd8e8] bg-white px-5 py-5">
                              <p className="text-[15px] font-bold leading-7 text-[#748195]">
                                Recall the answer before revealing it.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => goToCard(activeCardIndex - 1)}
                            className="h-11 cursor-pointer rounded-[8px] bg-white px-5 text-[14px] font-black text-[#102744] ring-1 ring-[#dce6f4] transition hover:bg-[#f4f8ff]"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            onClick={() => goToCard(activeCardIndex + 1)}
                            className="h-11 cursor-pointer rounded-[8px] bg-white px-5 text-[14px] font-black text-[#102744] ring-1 ring-[#dce6f4] transition hover:bg-[#f4f8ff]"
                          >
                            Next
                          </button>
                          <button
                            type="button"
                            onClick={shuffleReviewDeck}
                            className="h-11 cursor-pointer rounded-[8px] bg-[#fff4d7] px-5 text-[14px] font-black text-[#735215] transition hover:bg-[#ffe9ac]"
                          >
                            Shuffle
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsAnswerVisible((value) => !value)}
                          className="h-11 cursor-pointer rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86]"
                        >
                          {isAnswerVisible ? "Hide Answer" : "Show Answer"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid min-h-[320px] place-items-center text-center">
                      <p className="text-[16px] font-bold text-[#748195]">
                        No cards match the current filter.
                      </p>
                    </div>
                  )}
                </article>

                <div className="grid gap-3 md:grid-cols-2">
                  {visibleFlashcards.map((card, index) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setActiveCardIndex(index);
                        setIsAnswerVisible(false);
                      }}
                      className={`min-h-[138px] cursor-pointer rounded-[8px] px-5 py-4 text-left transition ${
                        activeCard?.id === card.id
                          ? "bg-[#245895] text-white shadow-[0_12px_24px_rgba(36,88,149,0.20)]"
                          : "bg-white text-[#102744] ring-1 ring-[#dce6f4] hover:bg-[#f8fbff]"
                      }`}
                    >
                      <span className="block truncate text-[12px] font-black uppercase tracking-[0.12em] opacity-75">
                        {card.bookTitle}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-[16px] font-black leading-6">
                        {card.question}
                      </span>
                      <span className="mt-3 block text-[12px] font-bold opacity-75">
                        {formatDate(card.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <article className="rounded-[8px] bg-white p-6 shadow-[0_12px_26px_rgba(18,31,65,0.08)] ring-1 ring-[#dce6f4]">
                {isQuizFinished ? (
                  <div className="grid min-h-[430px] place-items-center text-center">
                    <div className="max-w-[560px]">
                      <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#245895]">
                        Quiz Completed
                      </p>

                      <h2 className="mt-3 text-[38px] font-black leading-tight text-[#0f2442]">
                        Your score: {quizScore}/{quizTotal}
                      </h2>

                      <div className="mt-5 overflow-hidden rounded-full bg-[#eef5ff]">
                        <div
                          className="h-4 rounded-full bg-[#245895] transition-all duration-500"
                          style={{ width: `${quizScorePercent}%` }}
                        />
                      </div>

                      <p className="mt-4 text-[17px] font-bold leading-7 text-[#748195]">
                        You answered {quizProgress} of {quizTotal} cards and got{" "}
                        {quizScorePercent}% correct.
                      </p>

                      <div className="mt-7 grid gap-3 rounded-[8px] bg-[#f8fbff] p-5 text-left ring-1 ring-[#dce6f4]">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[14px] font-black text-[#6c778b]">
                            Total cards
                          </span>
                          <span className="text-[18px] font-black text-[#102744]">
                            {quizTotal}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[14px] font-black text-[#6c778b]">
                            Correct answers
                          </span>
                          <span className="text-[18px] font-black text-[#2e9b55]">
                            {quizScore}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[14px] font-black text-[#6c778b]">
                            Wrong answers
                          </span>
                          <span className="text-[18px] font-black text-[#b42335]">
                            {quizTotal - quizScore}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={resetQuiz}
                        className="mt-7 h-12 cursor-pointer rounded-[8px] bg-[#245895] px-7 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86]"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  </div>
                ) : currentQuizCard ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#6c778b]">
                          Multiple Choice
                        </p>
                        <h2 className="mt-1 text-[24px] font-black text-[#0f2442]">
                          Question {quizIndex + 1} of {quizTotal}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#e7fbf8] px-4 py-2 text-[13px] font-black text-[#0f6f67]">
                          {quizScore} correct
                        </span>
                        <span className="rounded-full bg-[#fff4d7] px-4 py-2 text-[13px] font-black text-[#735215]">
                          {quizProgress}/{quizTotal} answered
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#eef5ff]">
                      <div
                        className="h-full rounded-full bg-[#245895] transition-all duration-500"
                        style={{
                          width: quizTotal
                            ? `${Math.round((quizProgress / quizTotal) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>

                    <div className="mt-6 rounded-[8px] bg-[#f8fbff] px-6 py-6 ring-1 ring-[#dce6f4]">
                      <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#245895]">
                        {currentQuizCard.bookTitle}
                      </p>
                      <h3 className="mt-3 text-[25px] font-black leading-snug text-[#102744]">
                        {currentQuizCard.question}
                      </h3>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {quizOptions.map((option, index) => {
                        const isSelected = selectedAnswer === option;
                        const isCorrect = option === currentQuizCard.answer;
                        const showResult = isAnswerSubmitted;

                        return (
                          <button
                            key={`${currentQuizCard.id}-option-${index}`}
                            type="button"
                            onClick={() => answerQuiz(option)}
                            disabled={isAnswerSubmitted}
                            className={`min-h-[64px] cursor-pointer rounded-[8px] px-5 py-4 text-left text-[15px] font-bold leading-7 transition disabled:cursor-not-allowed ${
                              showResult && isCorrect
                                ? "bg-[#dff8e7] text-[#1d7b45] ring-1 ring-[#93d8a8]"
                                : showResult && isSelected
                                  ? "bg-[#fff0f1] text-[#b42335] ring-1 ring-[#ffc4ca]"
                                  : isSelected
                                    ? "bg-[#eef5ff] text-[#245895] ring-2 ring-[#245895]"
                                    : "bg-white text-[#102744] ring-1 ring-[#dce6f4] hover:bg-[#eef5ff]"
                            }`}
                          >
                            <span className="mr-3 inline-grid h-7 w-7 place-items-center rounded-full bg-[#eef5ff] text-[13px] font-black text-[#245895]">
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswerSubmitted ? (
                      <div
                        className={`mt-5 rounded-[8px] px-5 py-4 text-[15px] font-bold leading-7 ${
                          selectedIsCorrect
                            ? "bg-[#f0fbf3] text-[#1d7b45] ring-1 ring-[#bfe8c9]"
                            : "bg-[#fff7df] text-[#6d4b13] ring-1 ring-[#f0d45f]"
                        }`}
                      >
                        {selectedIsCorrect
                          ? "Correct."
                          : `Correct answer: ${currentQuizCard.answer}`}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap justify-between gap-3">
                      <button
                        type="button"
                        onClick={resetQuiz}
                        className="h-11 cursor-pointer rounded-[8px] bg-white px-5 text-[14px] font-black text-[#102744] ring-1 ring-[#dce6f4] transition hover:bg-[#f4f8ff]"
                      >
                        Reset
                      </button>

                      {isAnswerSubmitted ? (
                        <button
                          type="button"
                          onClick={nextQuizQuestion}
                          className="h-11 cursor-pointer rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86]"
                        >
                          {isLastQuizQuestion ? "View Score" : "Next Question"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={submitQuizAnswer}
                          disabled={!selectedAnswer}
                          className="h-11 cursor-pointer rounded-[8px] bg-[#245895] px-5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(36,88,149,0.18)] transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#9ab0ca] disabled:shadow-none"
                        >
                          Submit Answer
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="grid min-h-[320px] place-items-center text-center">
                    <p className="text-[16px] font-bold text-[#748195]">
                      No cards match the current filter.
                    </p>
                  </div>
                )}
              </article>
            )}
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
