"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";
import {
  applyCardOverrides,
  buildStudyDecks,
  CARD_EDITS_KEY,
  cardStatus,
  HIDDEN_CARDS_KEY,
  makeQuizOptions,
  safeReadStorage,
  shuffleItems,
  statusClasses,
  statusLabel,
  STUDY_STATE_KEY,
  truncateText,
  writeStorage,
  type CardEdit,
  type CardProgress,
  type GameMode,
  type StudyDeck,
  type StudyFlashcard,
  type StudyStatus,
} from "@/lib/flashcardStudy";
import { mapBackendBook } from "@/lib/library";
import { normalizeFlashcardRecords } from "@/lib/reading";
import { fetchLibraryBooks } from "@/services/libraryService";
import { fetchDocumentFlashcards } from "@/services/readingService";
import type { LibraryDocument } from "@/types/library";

type FlashcardRouteMode = "review" | "quiz" | "games" | "cards";

export function FlashcardModePage({ mode }: { mode: FlashcardRouteMode }) {
  const router = useRouter();
  const params = useParams<{ deckId?: string }>();
  const deckId = decodeURIComponent(params.deckId ?? "");
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  const [document, setDocument] = useState<LibraryDocument | null>(null);
  const [cards, setCards] = useState<StudyFlashcard[]>([]);
  const [studyProgress, setStudyProgress] = useState<
    Record<string, CardProgress>
  >(() => safeReadStorage(STUDY_STATE_KEY, {}));
  const [cardEdits, setCardEdits] = useState<Record<string, CardEdit>>(() =>
    safeReadStorage(CARD_EDITS_KEY, {}),
  );
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() =>
    safeReadStorage(HIDDEN_CARDS_KEY, []),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewCardIndex, setReviewCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizWrongCardIds, setQuizWrongCardIds] = useState<string[]>([]);
  const [activeGame, setActiveGame] = useState<GameMode>("match");
  const [viewingCard, setViewingCard] = useState<StudyFlashcard | null>(null);
  const [editingCard, setEditingCard] = useState<StudyFlashcard | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  useEffect(() => {
    writeStorage(STUDY_STATE_KEY, studyProgress);
  }, [studyProgress]);

  useEffect(() => {
    writeStorage(CARD_EDITS_KEY, cardEdits);
  }, [cardEdits]);

  useEffect(() => {
    writeStorage(HIDDEN_CARDS_KEY, hiddenCardIds);
  }, [hiddenCardIds]);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    let ignore = false;
    const token = session.token;
    const displayName = session.username || session.email || "You";

    async function loadDeck() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const books = await fetchLibraryBooks(token);
        const libraryDocuments = books.map((book) =>
          mapBackendBook(book, "mine", displayName),
        );
        const selectedDocument =
          libraryDocuments.find((item) => item.id === deckId) ?? null;

        if (!selectedDocument) {
          throw new Error("This flashcard deck could not be found.");
        }

        const records = await fetchDocumentFlashcards(token, selectedDocument.id);
        const deckCards = normalizeFlashcardRecords(records ?? []).map((card) => ({
          ...card,
          bookId: selectedDocument.id,
          bookTitle: selectedDocument.title,
          bookFormat: selectedDocument.format,
        }));

        if (ignore) {
          return;
        }

        setDocument(selectedDocument);
        setCards(mode === "review" ? shuffleItems(deckCards) : deckCards);
        setReviewCardIndex(0);
        setIsAnswerVisible(false);
      } catch (error) {
        if (!ignore) {
          setDocument(null);
          setCards([]);
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load this deck.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadDeck();

    return () => {
      ignore = true;
    };
  }, [deckId, mode, router, session]);

  const visibleCards = useMemo(
    () => applyCardOverrides({ cards, cardEdits, hiddenCardIds }),
    [cardEdits, cards, hiddenCardIds],
  );
  const deck = useMemo<StudyDeck | null>(() => {
    if (!document) {
      return null;
    }

    return (
      buildStudyDecks({
        documents: [document],
        cards: visibleCards,
        studyProgress,
      })[0] ?? null
    );
  }, [document, studyProgress, visibleCards]);

  const reviewCards = useMemo(() => deck?.cards ?? [], [deck]);

  const activeReviewCard = reviewCards.length
    ? reviewCards[reviewCardIndex % reviewCards.length]
    : null;
  const quizCards = useMemo(() => visibleCards, [visibleCards]);
  const currentQuizCard =
    !quizFinished && quizCards.length ? quizCards[quizIndex] ?? null : null;
  const quizOptions = useMemo(
    () => makeQuizOptions(currentQuizCard, quizCards),
    [currentQuizCard, quizCards],
  );
  const selectedIsCorrect =
    Boolean(quizSelectedAnswer && currentQuizCard) &&
    quizSelectedAnswer === currentQuizCard?.answer;
  const wrongQuizCards = quizWrongCardIds
    .map((cardId) => quizCards.find((card) => card.id === cardId))
    .filter((card): card is StudyFlashcard => Boolean(card));

  function updateProgress(cardId: string, status: StudyStatus, correct: boolean) {
    setStudyProgress((currentProgress) => {
      const currentCard = currentProgress[cardId] ?? {
        status: "new",
        reviews: 0,
        attempts: 0,
        correct: 0,
        lastReviewed: null,
      };

      return {
        ...currentProgress,
        [cardId]: {
          status,
          reviews: currentCard.reviews + 1,
          attempts: currentCard.attempts + 1,
          correct: currentCard.correct + (correct ? 1 : 0),
          lastReviewed: new Date().toISOString(),
        },
      };
    });
  }

  function submitQuizAnswer() {
    if (!currentQuizCard || !quizSelectedAnswer || quizSubmitted) {
      return;
    }

    const isCorrect = quizSelectedAnswer === currentQuizCard.answer;
    setQuizSubmitted(true);
    updateProgress(currentQuizCard.id, isCorrect ? "mastered" : "weak", isCorrect);

    if (isCorrect) {
      setQuizScore((score) => score + 1);
      return;
    }

    setQuizWrongCardIds((cardIds) => [...cardIds, currentQuizCard.id]);
  }

  function nextQuizQuestion() {
    if (!quizCards.length) {
      return;
    }

    if (quizIndex + 1 >= quizCards.length) {
      setQuizFinished(true);
      setQuizSubmitted(false);
      return;
    }

    setQuizIndex((index) => index + 1);
    setQuizSelectedAnswer("");
    setQuizSubmitted(false);
  }

  function resetQuiz() {
    setQuizIndex(0);
    setQuizSelectedAnswer("");
    setQuizSubmitted(false);
    setQuizFinished(false);
    setQuizScore(0);
    setQuizWrongCardIds([]);
  }

  function openCardEditor(card: StudyFlashcard) {
    setEditingCard(card);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  }

  function saveCardEdit() {
    if (!editingCard) {
      return;
    }

    setCardEdits((currentEdits) => ({
      ...currentEdits,
      [editingCard.id]: {
        question: editQuestion.trim() || editingCard.question,
        answer: editAnswer.trim() || editingCard.answer,
      },
    }));
    setEditingCard(null);
  }

  function deleteCard(cardId: string) {
    setHiddenCardIds((cardIds) =>
      cardIds.includes(cardId) ? cardIds : [...cardIds, cardId],
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <SiteNavbar activeItem="Flashcards" />

      <section className="mx-auto w-[min(1120px,calc(100%_-_48px))] py-8 max-[700px]:w-[min(100%_-_28px,1120px)]">
        <div className="mb-5">
          <Link
            href="/flashcards"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-transparent px-1 text-[14px] font-black text-[#1d4ed8] transition hover:text-[#0f172a]"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to decks</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid min-h-[430px] place-items-center rounded-[8px] border border-[#dbe7f5] bg-white">
            <p className="text-[16px] font-black text-[#2563eb]">
              Loading deck...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-5 py-4 text-[14px] font-bold text-[#be123c]">
            {errorMessage}
          </div>
        ) : !deck ? (
          <EmptyMode
            title="No cards in this deck"
            description="Create flashcards for this document before opening study modes."
          />
        ) : mode === "review" ? (
          <ReviewView
            deck={deck}
            reviewCards={reviewCards}
            activeReviewCard={activeReviewCard}
            reviewCardIndex={reviewCardIndex}
            isAnswerVisible={isAnswerVisible}
            onPrevious={() => {
              setReviewCardIndex(
                (reviewCardIndex - 1 + reviewCards.length) % reviewCards.length,
              );
              setIsAnswerVisible(false);
            }}
            onNext={() => {
              setReviewCardIndex((reviewCardIndex + 1) % reviewCards.length);
              setIsAnswerVisible(false);
            }}
            onToggleAnswer={() => setIsAnswerVisible((value) => !value)}
          />
        ) : mode === "quiz" ? (
          <QuizView
            deck={deck}
            quizCards={quizCards}
            currentQuizCard={currentQuizCard}
            quizOptions={quizOptions}
            quizIndex={quizIndex}
            quizScore={quizScore}
            quizSelectedAnswer={quizSelectedAnswer}
            quizSubmitted={quizSubmitted}
            quizFinished={quizFinished}
            selectedIsCorrect={selectedIsCorrect}
            wrongQuizCards={wrongQuizCards}
            onSelectAnswer={setQuizSelectedAnswer}
            onSubmit={submitQuizAnswer}
            onNext={nextQuizQuestion}
            onReset={resetQuiz}
          />
        ) : mode === "games" ? (
          <GamesView
            deck={deck}
            activeGame={activeGame}
            onGameChange={setActiveGame}
          />
        ) : (
          <CardsView
            deck={deck}
            studyProgress={studyProgress}
            onViewCard={setViewingCard}
            onEditCard={openCardEditor}
            onDeleteCard={deleteCard}
          />
        )}
      </section>

      {viewingCard ? (
        <CardModal card={viewingCard} onClose={() => setViewingCard(null)} />
      ) : null}

      {editingCard ? (
        <EditCardModal
          question={editQuestion}
          answer={editAnswer}
          onQuestionChange={setEditQuestion}
          onAnswerChange={setEditAnswer}
          onClose={() => setEditingCard(null)}
          onSave={saveCardEdit}
        />
      ) : null}

      <SiteFooter />
    </main>
  );
}

function ModeHeader({
  deck,
  label,
  title,
  right,
}: {
  deck: StudyDeck;
  label: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[14px] font-bold text-[#2563eb]">{label}</p>
        <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-black leading-tight text-[#0f172a]">
          {title}
        </h1>
        <p className="mt-2 text-[14px] font-semibold text-[#64748b]">
          {deck.title} - {deck.totalCards} cards
        </p>
      </div>
      {right}
    </div>
  );
}

function ReviewView({
  deck,
  reviewCards,
  activeReviewCard,
  reviewCardIndex,
  isAnswerVisible,
  onPrevious,
  onNext,
  onToggleAnswer,
}: {
  deck: StudyDeck;
  reviewCards: StudyFlashcard[];
  activeReviewCard: StudyFlashcard | null;
  reviewCardIndex: number;
  isAnswerVisible: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleAnswer: () => void;
}) {
  if (!activeReviewCard) {
    return (
      <EmptyMode
        title="No cards available for review"
        description="This deck does not have any cards ready for review."
      />
    );
  }

  return (
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <ModeHeader deck={deck} label="Review mode" title="Study flashcards" />

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#2563eb]"
          style={{
            width: `${Math.max(
              4,
              ((reviewCardIndex + 1) / reviewCards.length) * 100,
            )}%`,
          }}
        />
      </div>

      <div className="mt-6 rounded-[8px] border border-[#dbe7f5] bg-[#f8fafc] p-5">
        <div className="mx-auto w-full max-w-[430px]" style={{ perspective: "1600px" }}>
          <div className="relative min-h-[570px]">
            <div
              className="absolute inset-0 rounded-[28px] transition-transform duration-500"
              style={{
                transform: isAnswerVisible ? "rotateY(180deg)" : "rotateY(0deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute inset-0 grid place-items-center overflow-hidden rounded-[28px] bg-[#2418f6] px-8 py-10 text-center text-white shadow-[0_24px_54px_rgba(37,99,235,0.18)] ring-1 ring-[#dbeafe]"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                <div>
                  <p className="text-[14px] font-black text-white/75">
                    Card {reviewCardIndex + 1} of {reviewCards.length}
                  </p>
                  <p className="mt-8 text-[13px] font-black uppercase tracking-[0.12em] text-white/70">
                    Question
                  </p>
                  <h2 className="mt-6 text-[clamp(30px,6vw,48px)] font-black leading-tight">
                    {activeReviewCard.question}
                  </h2>
                </div>
              </div>

              <div
                className="absolute inset-0 grid place-items-center overflow-y-auto rounded-[28px] bg-white px-8 py-10 text-center shadow-[0_24px_54px_rgba(15,118,110,0.14)] ring-1 ring-[#bbf7d0]"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div>
                  <p className="text-[14px] font-black text-[#047857]">
                    Answer
                  </p>
                  <p className="mt-6 whitespace-pre-wrap text-[clamp(22px,4vw,34px)] font-black leading-snug text-[#047857]">
                    {activeReviewCard.answer}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAnswer}
              aria-label={isAnswerVisible ? "Show question" : "Show answer"}
              className="absolute bottom-5 right-5 z-20 grid h-16 w-16 cursor-pointer place-items-center rounded-full bg-[#0f172a]/78 text-white shadow-[0_14px_28px_rgba(15,23,42,0.28)] transition hover:bg-[#0f172a]"
            >
              <svg
                aria-hidden="true"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.75 12.25A7.25 7.25 0 0 1 17.5 7.55M17.5 7.55H13m4.5 0v-4.5M19.25 11.75A7.25 7.25 0 0 1 6.5 16.45m0 0H11m-4.5 0v4.5"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrevious}
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

function QuizView({
  deck,
  quizCards,
  currentQuizCard,
  quizOptions,
  quizIndex,
  quizScore,
  quizSelectedAnswer,
  quizSubmitted,
  quizFinished,
  selectedIsCorrect,
  wrongQuizCards,
  onSelectAnswer,
  onSubmit,
  onNext,
  onReset,
}: {
  deck: StudyDeck;
  quizCards: StudyFlashcard[];
  currentQuizCard: StudyFlashcard | null;
  quizOptions: string[];
  quizIndex: number;
  quizScore: number;
  quizSelectedAnswer: string;
  quizSubmitted: boolean;
  quizFinished: boolean;
  selectedIsCorrect: boolean;
  wrongQuizCards: StudyFlashcard[];
  onSelectAnswer: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  if (quizFinished) {
    return (
      <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <p className="text-[14px] font-bold text-[#2563eb]">Quiz result</p>
        <h1 className="mt-2 text-[42px] font-black text-[#0f172a]">
          {quizScore} / {quizCards.length}
        </h1>
        <p className="mt-2 text-[16px] font-semibold text-[#64748b]">
          Accuracy{" "}
          {quizCards.length ? Math.round((quizScore / quizCards.length) * 100) : 0}
          %
        </p>
        {wrongQuizCards.length ? (
          <div className="mx-auto mt-6 max-w-[760px] rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] p-4 text-left">
            <p className="text-[14px] font-black text-[#be123c]">
              Cards to review again
            </p>
            <div className="mt-3 grid gap-2">
              {wrongQuizCards.slice(0, 5).map((card) => (
                <p
                  key={card.id}
                  className="rounded-[8px] bg-white px-3 py-3 text-[14px] font-bold text-[#0f172a]"
                >
                  {card.question}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="mt-6 h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
        >
          Retry Quiz
        </button>
      </section>
    );
  }

  if (!currentQuizCard) {
    return (
      <EmptyMode
        title="No quiz cards available"
        description="This deck does not have enough cards for quiz mode."
      />
    );
  }

  return (
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <ModeHeader deck={deck} label="Multiple choice" title="Quiz practice" />

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#10b981]"
          style={{
            width: `${Math.max(4, ((quizIndex + 1) / quizCards.length) * 100)}%`,
          }}
        />
      </div>

      <div className="mt-6 rounded-[8px] bg-[#f8fafc] px-6 py-6 ring-1 ring-[#e2e8f0]">
        <p className="text-[13px] font-bold text-[#64748b]">
          Question {quizIndex + 1} of {quizCards.length}
        </p>
        <h2 className="mt-3 text-[26px] font-black leading-snug text-[#0f172a]">
          {currentQuizCard.question}
        </h2>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {quizOptions.map((option, index) => {
          const isSelected = quizSelectedAnswer === option;
          const isCorrect = option === currentQuizCard.answer;

          return (
            <button
              key={`${currentQuizCard.id}-option-${index}`}
              type="button"
              onClick={() => {
                if (!quizSubmitted) {
                  onSelectAnswer(option);
                }
              }}
              disabled={quizSubmitted}
              className={`min-h-[74px] cursor-pointer rounded-[8px] px-5 py-4 text-left text-[15px] font-bold leading-7 transition disabled:cursor-not-allowed ${
                quizSubmitted && isCorrect
                  ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#bbf7d0]"
                  : quizSubmitted && isSelected
                    ? "bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                    : isSelected
                      ? "bg-[#eff6ff] text-[#1d4ed8] ring-2 ring-[#2563eb]"
                      : "bg-white text-[#0f172a] ring-1 ring-[#e2e8f0] hover:bg-[#f8fafc]"
              }`}
            >
              <span className="mr-3 inline-grid h-7 w-7 place-items-center rounded-full bg-[#eff6ff] text-[13px] font-black text-[#1d4ed8]">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {quizSubmitted && selectedIsCorrect ? (
        <div className="mt-5 rounded-[8px] bg-[#ecfdf5] px-5 py-4 text-[15px] font-bold leading-7 text-[#047857] ring-1 ring-[#bbf7d0]">
          Correct. Nice recall.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
        >
          Reset
        </button>
        {quizSubmitted ? (
          <button
            type="button"
            onClick={onNext}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
          >
            {quizIndex + 1 >= quizCards.length ? "See Result" : "Next Question"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!quizSelectedAnswer}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </div>
    </section>
  );
}

function GamesView({
  deck,
  activeGame,
  onGameChange,
}: {
  deck: StudyDeck;
  activeGame: GameMode;
  onGameChange: (game: GameMode) => void;
}) {
  return (
    <section className="grid gap-5">
      <div className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <ModeHeader deck={deck} label="Practice games" title="Choose a game" />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            [
              "match",
              "Match Terms",
              "Match each concept with the correct definition.",
              "Easy",
            ],
            [
              "speed",
              "Speed Challenge",
              "Answer as many questions as possible in 60 seconds.",
              "Medium",
            ],
            [
              "memory",
              "Memory Flip",
              "Flip cards and find matching question-answer pairs.",
              "Hard",
            ],
          ].map(([game, title, description, difficulty]) => (
            <button
              key={game}
              type="button"
              onClick={() => onGameChange(game as GameMode)}
              className={`cursor-pointer rounded-[8px] p-5 text-left transition ${
                activeGame === game
                  ? "bg-[#eff6ff] ring-2 ring-[#2563eb]"
                  : "bg-[#f8fafc] ring-1 ring-[#e2e8f0] hover:bg-white"
              }`}
            >
              <p className="text-[18px] font-black text-[#0f172a]">{title}</p>
              <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                {description}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#2563eb] ring-1 ring-[#bfdbfe]">
                {difficulty}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <GamePreview game={activeGame} deck={deck} />
      </div>
    </section>
  );
}

function CardsView({
  deck,
  studyProgress,
  onViewCard,
  onEditCard,
  onDeleteCard,
}: {
  deck: StudyDeck;
  studyProgress: Record<string, CardProgress>;
  onViewCard: (card: StudyFlashcard) => void;
  onEditCard: (card: StudyFlashcard) => void;
  onDeleteCard: (cardId: string) => void;
}) {
  return (
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <ModeHeader deck={deck} label="Cards" title="Cards in this deck" />
      <div className="mt-5 overflow-hidden rounded-[8px] border border-[#e2e8f0]">
        {deck.cards.map((card) => {
          const status = cardStatus(card.id, studyProgress);

          return (
            <div
              key={card.id}
              className="grid gap-3 border-b border-[#e2e8f0] px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_180px]"
            >
              <button
                type="button"
                onClick={() => onViewCard(card)}
                className="cursor-pointer text-left"
              >
                <span className="line-clamp-2 text-[15px] font-black leading-6 text-[#0f172a]">
                  {card.question}
                </span>
              </button>
              <p className="line-clamp-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                {truncateText(card.answer, 150)}
              </p>
              <span
                className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] font-black ring-1 ${statusClasses(status)}`}
              >
                {statusLabel(status)}
              </span>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => onEditCard(card)}
                  className="h-9 cursor-pointer rounded-[8px] bg-[#f8fafc] px-3 text-[13px] font-black text-[#0f172a] ring-1 ring-[#e2e8f0] transition hover:bg-[#eff6ff]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCard(card.id)}
                  className="h-9 cursor-pointer rounded-[8px] bg-[#fff1f2] px-3 text-[13px] font-black text-[#be123c] transition hover:bg-[#ffe4e6]"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GamePreview({ game, deck }: { game: GameMode; deck: StudyDeck }) {
  const sampleCards = deck.cards.slice(0, 4);

  if (game === "speed") {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">
              Speed Challenge
            </p>
            <h2 className="mt-1 text-[28px] font-black text-[#0f172a]">
              60 sec practice
            </h2>
          </div>
          <span className="rounded-full bg-[#fffbeb] px-4 py-2 text-[13px] font-black text-[#b45309]">
            60 sec
          </span>
        </div>
        <div className="mt-5 rounded-[8px] bg-[#f8fafc] p-5 ring-1 ring-[#e2e8f0]">
          <p className="text-[22px] font-black text-[#0f172a]">
            {sampleCards[0]?.question ?? "No question available."}
          </p>
          <button
            type="button"
            className="mt-5 h-11 rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white"
          >
            Start Speed Round
          </button>
        </div>
      </div>
    );
  }

  if (game === "memory") {
    return (
      <div>
        <p className="text-[14px] font-bold text-[#2563eb]">Memory Flip</p>
        <h2 className="mt-1 text-[28px] font-black text-[#0f172a]">
          Find matching pairs
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...sampleCards, ...sampleCards].slice(0, 8).map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className="grid min-h-[120px] place-items-center rounded-[8px] bg-[#eff6ff] px-4 text-center text-[14px] font-black text-[#1d4ed8] ring-1 ring-[#bfdbfe]"
            >
              Card {index + 1}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[14px] font-bold text-[#2563eb]">Match Terms</p>
      <h2 className="mt-1 text-[28px] font-black text-[#0f172a]">
        Match concepts with definitions
      </h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3">
          {sampleCards.map((card, index) => (
            <div
              key={card.id}
              className="rounded-[8px] bg-[#eff6ff] px-4 py-4 text-[14px] font-black text-[#1d4ed8]"
            >
              {index + 1}. {card.question}
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          {shuffleItems(sampleCards).map((card, index) => (
            <div
              key={`${card.id}-answer-${index}`}
              className="rounded-[8px] bg-[#f8fafc] px-4 py-4 text-[14px] font-semibold leading-6 text-[#475569] ring-1 ring-[#e2e8f0]"
            >
              {String.fromCharCode(65 + index)}. {truncateText(card.answer, 130)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyMode({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-[8px] border border-[#dbe7f5] bg-white text-center">
      <div className="max-w-[480px] px-5">
        <h1 className="text-[28px] font-black text-[#0f172a]">{title}</h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-[#64748b]">
          {description}
        </p>
        <Link
          href="/flashcards"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
        >
          Back to decks
        </Link>
      </div>
    </div>
  );
}

function CardModal({
  card,
  onClose,
}: {
  card: StudyFlashcard;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/55 px-4">
      <div className="w-[min(720px,100%)] rounded-[8px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">Flashcard</p>
            <h2 className="mt-1 text-[26px] font-black text-[#0f172a]">
              {card.question}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-4 text-[14px] font-black text-[#0f172a]"
          >
            Close
          </button>
        </div>
        <div className="mt-5 rounded-[8px] bg-[#f8fafc] px-5 py-5 ring-1 ring-[#e2e8f0]">
          <p className="text-[13px] font-black text-[#047857]">Answer</p>
          <p className="mt-3 whitespace-pre-wrap text-[16px] font-semibold leading-8 text-[#0f172a]">
            {card.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function EditCardModal({
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
  onClose,
  onSave,
}: {
  question: string;
  answer: string;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/55 px-4">
      <div className="w-[min(680px,100%)] rounded-[8px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">Edit card</p>
            <h2 className="mt-1 text-[26px] font-black text-[#0f172a]">
              Local card edit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-4 text-[14px] font-black text-[#0f172a]"
          >
            Close
          </button>
        </div>
        <label className="mt-5 grid gap-2 text-[13px] font-bold text-[#64748b]">
          Question
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            className="min-h-[110px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-[15px] font-bold text-[#0f172a] outline-none focus:border-[#2563eb]"
          />
        </label>
        <label className="mt-4 grid gap-2 text-[13px] font-bold text-[#64748b]">
          Answer
          <textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            className="min-h-[140px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-[15px] font-bold leading-7 text-[#0f172a] outline-none focus:border-[#2563eb]"
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white"
          >
            Save Edit
          </button>
        </div>
      </div>
    </div>
  );
}
