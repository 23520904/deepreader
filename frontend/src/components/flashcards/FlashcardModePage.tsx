"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  STACK_ICON,
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
type GameFlowStatus = "lobby" | "setup" | "playing" | "result";
type GamePlayMode = "relaxed" | "timed";

type GameSettings = {
  cardCount: number;
  pairs: number;
  seconds: number;
  mode: GamePlayMode;
};

type GameResult = {
  game: GameMode;
  title: string;
  score: number;
  total: number;
  accuracy: number;
  timeLabel: string;
  wrongCards: StudyFlashcard[];
  message: string;
};

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
  const [gameStatus, setGameStatus] = useState<GameFlowStatus>("lobby");
  const [gameSettings, setGameSettings] = useState<GameSettings>(() =>
    defaultGameSettings(deck.cards.length),
  );
  const [gameCards, setGameCards] = useState<StudyFlashcard[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const activeConfig = gameConfigs.find((game) => game.id === activeGame) ?? gameConfigs[0];

  function selectGame(game: GameMode) {
    onGameChange(game);
    setGameSettings((currentSettings) => ({
      ...currentSettings,
      ...defaultGameSettings(deck.cards.length, game),
    }));
    setGameStatus("setup");
  }

  function startGame() {
    const count =
      activeGame === "memory"
        ? Math.min(gameSettings.pairs, deck.cards.length)
        : Math.min(gameSettings.cardCount, deck.cards.length);
    setGameCards(shuffleItems(deck.cards).slice(0, Math.max(1, count)));
    setGameResult(null);
    setGameStatus("playing");
  }

  function finishGame(result: GameResult) {
    const scoreKey = `${deck.id}:${result.game}`;
    const currentScores = safeReadStorage<Record<string, number>>(
      "deepreader:flashcard-game-best-scores:v1",
      {},
    );

    writeStorage("deepreader:flashcard-game-best-scores:v1", {
      ...currentScores,
      [scoreKey]: Math.max(currentScores[scoreKey] ?? 0, result.score),
    });
    setGameResult(result);
    setGameStatus("result");
  }

  if (gameStatus === "playing") {
    return (
      <section className="rounded-[18px] border border-[#dbe7f5] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <GamePlayHeader
          deck={deck}
          title={activeConfig.title}
          description={activeConfig.playingDescription}
          onBack={() => setGameStatus("lobby")}
        />
        {activeGame === "speed" ? (
          <SpeedChallengeGame
            cards={gameCards}
            seconds={gameSettings.seconds}
            onFinish={finishGame}
          />
        ) : activeGame === "memory" ? (
          <MemoryFlipGame cards={gameCards} onFinish={finishGame} />
        ) : (
          <MatchTermsGame cards={gameCards} onFinish={finishGame} />
        )}
      </section>
    );
  }

  if (gameStatus === "result" && gameResult) {
    return (
      <GameResultView
        result={gameResult}
        deck={deck}
        onPlayAgain={startGame}
        onAnotherGame={() => setGameStatus("lobby")}
      />
    );
  }

  return (
    <section className="grid gap-6">
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#dbeafe_0%,#cffafe_48%,#ede9fe_100%)] px-7 py-8 text-[#0f172a] shadow-[0_24px_64px_rgba(30,64,175,0.12)] ring-1 ring-white/70">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/38 blur-2xl" />
        <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative grid h-[360px] w-[520px] place-items-center">
            <Image
              src="/assets/images/flashcards/game-zone-mascot.png"
              alt=""
              width={560}
              height={319}
              className="object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.18)]"
              style={{ width: "500px", height: "auto" }}
            />
          </div>
        </div>
        <div className="relative max-w-[920px] lg:pr-[520px]">
          <p className="text-[13px] font-black uppercase text-[#2563eb]/70">
            Learning Games
          </p>
          <h1 className="mt-3 whitespace-nowrap text-[42px] font-black leading-tight tracking-[0] max-[1024px]:whitespace-normal max-[700px]:text-[34px]">
            Flashcard Game Zone
          </h1>
          <p className="mt-4 text-[17px] font-semibold leading-8 text-[#475569]">
            Turn your flashcards into quick challenges, matching games, and
            memory battles.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/62 px-4 py-2 text-[13px] font-black text-[#1d4ed8] ring-1 ring-white/80">
              {deck.totalCards} cards ready
            </span>
            <span className="max-w-full truncate rounded-full bg-white/62 px-4 py-2 text-[13px] font-black text-[#64748b] ring-1 ring-white/80">
              {deck.title}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-[#dbe7f5] bg-white/92 px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] bg-[#eff6ff] ring-1 ring-[#dbeafe]">
              <Image
                src={STACK_ICON}
                alt=""
                width={34}
                height={34}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black text-[#2563eb]">
                Current deck
              </p>
              <h2 className="mt-1 truncate text-[22px] font-black text-[#0f172a]">
                {deck.title}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-[12px] font-black text-[#1d4ed8]">
              {deck.totalCards} cards
            </span>
            <span className="rounded-full bg-[#ecfdf5] px-3 py-1.5 text-[12px] font-black text-[#047857]">
              {deck.masteredCount} mastered
            </span>
            <span className="rounded-full bg-[#fff1f2] px-3 py-1.5 text-[12px] font-black text-[#be123c]">
              {deck.weakCount} weak
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 pt-1 lg:grid-cols-3">
        {gameConfigs.map((game) => (
          <GameLobbyCard
            key={game.id}
            game={game}
            isSelected={activeGame === game.id}
            onSelect={() => selectGame(game.id)}
          />
        ))}
      </div>

      {gameStatus === "setup" ? (
        <GameSetupModal
          game={activeConfig}
          deck={deck}
          settings={gameSettings}
          onSettingsChange={setGameSettings}
          onClose={() => setGameStatus("lobby")}
          onStart={startGame}
        />
      ) : null}
    </section>
  );
}

const gameConfigs = [
  {
    id: "match" as const,
    title: "Puzzle Match",
    shortTitle: "Match Terms",
    description:
      "Match each concept with the correct definition before time runs out.",
    playingDescription: "Pair concepts with the perfect answer.",
    difficulty: "Easy",
    goal: "Complete all pairs",
    buttonLabel: "Play Match",
    setupRule:
      "Choose a concept, then choose its matching definition. Consecutive correct matches build your combo.",
    gradient: "from-[#d8f8ed] via-[#cef5f5] to-[#dbeafe]",
    glow: "shadow-[0_18px_42px_rgba(20,184,166,0.14)]",
    accentClass: "text-[#0f766e]",
    badgeClass: "bg-white/70 text-[#0f766e] ring-[#99f6e4]",
    iconSrc: "/assets/icons/flashcards/puzzle-icon.png",
  },
  {
    id: "speed" as const,
    title: "Speed Challenge",
    shortTitle: "Speed Run",
    description: "Beat the clock and build your combo.",
    playingDescription: "Answer quickly before the timer hits zero.",
    difficulty: "Medium",
    goal: "Score as high as possible",
    buttonLabel: "Start Speed Run",
    setupRule:
      "Pick the correct answer fast. Correct answers add score and combo points.",
    gradient: "from-[#fff1d8] via-[#fdeec3] to-[#ffe4e6]",
    glow: "shadow-[0_18px_42px_rgba(245,158,11,0.14)]",
    accentClass: "text-[#b45309]",
    badgeClass: "bg-white/70 text-[#b45309] ring-[#fde68a]",
    iconSrc: "/assets/icons/flashcards/speed-icon.png",
  },
  {
    id: "memory" as const,
    title: "Memory Flip",
    shortTitle: "Memory Flip",
    description: "Flip, remember, and find the hidden pairs.",
    playingDescription: "Find matching question-answer pairs.",
    difficulty: "Hard",
    goal: "Find all pairs with fewer moves",
    buttonLabel: "Play Memory",
    setupRule:
      "Flip two cards at a time. Match each question with its answer to clear the board.",
    gradient: "from-[#f0e7ff] via-[#fae8ff] to-[#dbeafe]",
    glow: "shadow-[0_18px_42px_rgba(139,92,246,0.14)]",
    accentClass: "text-[#7e22ce]",
    badgeClass: "bg-white/70 text-[#7e22ce] ring-[#e9d5ff]",
    iconSrc: "/assets/icons/flashcards/memory-icon.png",
  },
];

function defaultGameSettings(
  totalCards: number,
  game: GameMode = "match",
): GameSettings {
  const safeTotal = Math.max(totalCards, 1);

  return {
    cardCount: Math.min(8, safeTotal),
    pairs: Math.min(6, safeTotal),
    seconds: game === "speed" ? 60 : 90,
    mode: game === "speed" ? "timed" : "relaxed",
  };
}

function formatGameTime(startedAt: number) {
  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function GameLobbyCard({
  game,
  isSelected,
  onSelect,
}: {
  game: (typeof gameConfigs)[number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative min-h-[300px] cursor-pointer overflow-hidden rounded-[24px] bg-gradient-to-br ${game.gradient} p-5 text-left text-[#0f172a] transition duration-300 hover:-translate-y-1 ${game.glow} ${
        isSelected ? "ring-2 ring-[#93c5fd]" : "ring-1 ring-white/70"
      }`}
    >
      <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/32 blur-sm" />
      <div className="absolute right-4 top-4 grid h-[84px] w-[84px] place-items-center rounded-[24px] bg-white/58 shadow-[0_16px_34px_rgba(15,23,42,0.1)] ring-1 ring-white/75 transition duration-300 group-hover:-rotate-3 group-hover:scale-[1.03]">
        <Image
          src={game.iconSrc}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 object-contain"
        />
      </div>
      <div className="relative pr-20">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-black ring-1 ${game.badgeClass}`}
        >
          {game.difficulty}
        </span>
        <h3 className="mt-5 text-[26px] font-black leading-tight">
          {game.title}
        </h3>
        <p className="mt-3 text-[14px] font-semibold leading-6 text-[#475569]">
          {game.description}
        </p>
      </div>
      <div
        className={`relative mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-white/74 px-4 text-[14px] font-black ${game.accentClass} shadow-[0_14px_28px_rgba(15,23,42,0.1)] ring-1 ring-white/80`}
      >
        {game.buttonLabel}
        <span aria-hidden="true">&rarr;</span>
      </div>
    </button>
  );
}

function GameSetupModal({
  game,
  deck,
  settings,
  onSettingsChange,
  onClose,
  onStart,
}: {
  game: (typeof gameConfigs)[number];
  deck: StudyDeck;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  const cardOptions = [5, 8, 10, Math.min(deck.totalCards, 15)].filter(
    (value, index, values) => value <= deck.totalCards && values.indexOf(value) === index,
  );
  const pairOptions = [Math.min(deck.totalCards, 4), 6, 8].filter(
    (value, index, values) =>
      value > 0 && value <= deck.totalCards && values.indexOf(value) === index,
  );
  const timeOptions = [30, 60, 90];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/58 px-4">
      <div className="w-[min(860px,100%)] overflow-hidden rounded-[24px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className={`bg-gradient-to-br ${game.gradient} px-6 py-6 text-[#0f172a]`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[13px] font-black uppercase ${game.accentClass}`}>
                Game Setup
              </p>
              <h2 className="mt-2 text-[34px] font-black leading-tight">
                {game.title}
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] font-semibold leading-7 text-[#475569]">
                {game.setupRule}
              </p>
            </div>
            <div className="hidden h-20 w-20 shrink-0 place-items-center rounded-[22px] bg-white/58 shadow-[0_16px_34px_rgba(15,23,42,0.1)] ring-1 ring-white/75 sm:grid">
              <Image
                src={game.iconSrc}
                alt=""
                width={58}
                height={58}
                className="h-14 w-14 object-contain"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/62 text-[#334155] ring-1 ring-white/80 transition hover:bg-white"
              aria-label="Close setup"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="grid gap-5 bg-[#f8fafc] p-6 md:grid-cols-[1fr_300px]">
          <div className="rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ring-1 ring-[#e2e8f0]">
            <p className={`text-[13px] font-black uppercase ${game.accentClass}`}>
              Round settings
            </p>
            <h3 className="mt-1 text-[24px] font-black text-[#0f172a]">
              Tune your session
            </h3>
            <div className="mt-5 grid gap-4">
            <SetupOptionGroup
              title={game.id === "memory" ? "Pairs" : "Cards"}
              description={
                game.id === "memory"
                  ? "Choose how many question-answer pairs appear on the board."
                  : "Choose how many cards this game should use."
              }
              values={game.id === "memory" ? pairOptions : cardOptions}
              activeValue={game.id === "memory" ? settings.pairs : settings.cardCount}
              suffix={game.id === "memory" ? "pairs" : "cards"}
              onSelect={(value) =>
                onSettingsChange({
                  ...settings,
                  [game.id === "memory" ? "pairs" : "cardCount"]: value,
                })
              }
            />
            {game.id === "speed" ? (
              <SetupOptionGroup
                title="Time limit"
                description="Pick a timer length for this speed round."
                values={timeOptions}
                activeValue={settings.seconds}
                suffix="sec"
                onSelect={(value) =>
                  onSettingsChange({ ...settings, seconds: value, mode: "timed" })
                }
              />
            ) : (
              <div className="rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-black text-[#0f172a]">
                      Mode
                    </p>
                    <p className="mt-1 max-w-[380px] text-[13px] font-semibold leading-6 text-[#64748b]">
                      Relaxed keeps the game calm. Timed adds pressure for a
                      faster challenge.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#64748b] ring-1 ring-[#e2e8f0]">
                    Optional
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(["relaxed", "timed"] as GamePlayMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, mode })}
                      className={`min-h-[56px] cursor-pointer rounded-[16px] px-4 text-left text-[15px] font-black capitalize transition ${
                        settings.mode === mode
                          ? "bg-[#2563eb] text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]"
                          : "bg-white text-[#334155] ring-1 ring-[#e2e8f0] hover:ring-[#bfdbfe]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
          <div className="rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ring-1 ring-[#dbe7f5]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#eff6ff] ring-1 ring-[#dbeafe]">
                <Image
                  src={STACK_ICON}
                  alt=""
                  width={30}
                  height={30}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div>
                <p className="text-[13px] font-black text-[#2563eb]">Deck</p>
                <p className="text-[12px] font-bold text-[#64748b]">
                  Ready to play
                </p>
              </div>
            </div>
            <h3 className="mt-5 text-[22px] font-black leading-tight text-[#0f172a]">
              {deck.title}
            </h3>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[16px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
                <p className="text-[12px] font-black text-[#64748b]">Goal</p>
                <p className="mt-1 text-[14px] font-black leading-6 text-[#0f172a]">
                  {game.goal}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[14px] bg-[#eff6ff] px-3 py-3 text-center">
                  <p className="text-[18px] font-black text-[#1d4ed8]">
                    {deck.totalCards}
                  </p>
                  <p className="text-[11px] font-black text-[#64748b]">Cards</p>
                </div>
                <div className={`rounded-[14px] bg-[#f8fafc] px-3 py-3 text-center ring-1 ring-[#e2e8f0] ${game.accentClass}`}>
                  <p className="text-[18px] font-black">{game.difficulty}</p>
                  <p className="text-[11px] font-black text-[#64748b]">
                    Level
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="mt-5 h-[52px] w-full cursor-pointer rounded-[16px] bg-[#2563eb] text-[15px] font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8]"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupOptionGroup({
  title,
  description,
  values,
  activeValue,
  suffix,
  onSelect,
}: {
  title: string;
  description: string;
  values: number[];
  activeValue: number;
  suffix: string;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-black text-[#0f172a]">{title}</p>
          <p className="mt-1 max-w-[400px] text-[13px] font-semibold leading-6 text-[#64748b]">
            {description}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#2563eb] ring-1 ring-[#dbeafe]">
          {activeValue} {suffix}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`min-h-[56px] cursor-pointer rounded-[16px] px-4 text-center text-[15px] font-black transition ${
              activeValue === value
                ? "bg-[#2563eb] text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]"
                : "bg-white text-[#334155] ring-1 ring-[#e2e8f0] hover:ring-[#bfdbfe]"
            }`}
          >
            {value} {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

function GamePlayHeader({
  deck,
  title,
  description,
  onBack,
}: {
  deck: StudyDeck;
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex cursor-pointer items-center gap-2 text-[14px] font-black text-[#2563eb] transition hover:text-[#0f172a]"
        >
          <span aria-hidden="true">&larr;</span>
          Back to Games
        </button>
        <h1 className="text-[38px] font-black leading-tight text-[#0f172a]">
          {title}
        </h1>
        <p className="mt-2 text-[15px] font-semibold text-[#64748b]">
          {deck.title} - {description}
        </p>
      </div>
    </div>
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

function MatchTermsGame({
  cards,
  onFinish,
}: {
  cards: StudyFlashcard[];
  onFinish: (result: GameResult) => void;
}) {
  const [answerCards] = useState(() => shuffleItems(cards));
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    cardId: string;
    answerId: string;
    status: "correct" | "wrong";
  } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [startedAt] = useState(() => Date.now());

  function finishMatch(nextScore: number, nextWrongCardIds: string[]) {
    const uniqueWrongCards = cards.filter((card) =>
      nextWrongCardIds.includes(card.id),
    );

    onFinish({
      game: "match",
      title: "Puzzle Match",
      score: nextScore,
      total: cards.length,
      accuracy: Math.round(
        ((cards.length - uniqueWrongCards.length) / Math.max(cards.length, 1)) *
          100,
      ),
      timeLabel: formatGameTime(startedAt),
      wrongCards: uniqueWrongCards,
      message: "Great matching run.",
    });
  }

  function chooseAnswer(answerCard: StudyFlashcard) {
    if (!selectedQuestionId || matchedCardIds.includes(answerCard.id)) {
      return;
    }

    const isCorrect = selectedQuestionId === answerCard.id;

    if (isCorrect) {
      const nextMatchedCardIds = [...matchedCardIds, answerCard.id];
      const nextCombo = combo + 1;
      const nextScore = score + 100 + combo * 25;
      setMatchedCardIds(nextMatchedCardIds);
      setScore(nextScore);
      setCombo(nextCombo);
      setFeedback({
        cardId: selectedQuestionId,
        answerId: answerCard.id,
        status: "correct",
      });
      setSelectedQuestionId("");

      if (nextMatchedCardIds.length >= cards.length) {
        window.setTimeout(() => finishMatch(nextScore, wrongCardIds), 700);
      }
      return;
    }

    const nextWrongCardIds = wrongCardIds.includes(selectedQuestionId)
      ? wrongCardIds
      : [...wrongCardIds, selectedQuestionId];
    setWrongCardIds(nextWrongCardIds);
    setCombo(0);
    setFeedback({
      cardId: selectedQuestionId,
      answerId: answerCard.id,
      status: "wrong",
    });

    window.setTimeout(() => setFeedback(null), 520);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0] md:grid-cols-4">
        <GameMetric label="Score" value={score} />
        <GameMetric label="Matches" value={`${matchedCardIds.length}/${cards.length}`} />
        <GameMetric label="Combo" value={`x${combo}`} />
        <GameMetric label="Goal" value="All pairs" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3">
          <p className="text-[13px] font-black text-[#2563eb]">Concepts</p>
          {cards.map((card, index) => {
            const isMatched = matchedCardIds.includes(card.id);
            const isSelected = selectedQuestionId === card.id;
            const isWrong =
              feedback?.cardId === card.id && feedback.status === "wrong";

            return (
              <button
                key={card.id}
                type="button"
                disabled={isMatched}
                onClick={() => setSelectedQuestionId(card.id)}
                className={`min-h-[86px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-black leading-6 transition disabled:cursor-default ${
                  isMatched
                    ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#86efac]"
                    : isWrong
                      ? "animate-[shake_0.35s_ease-in-out] bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                      : isSelected
                        ? "bg-[#eff6ff] text-[#1d4ed8] ring-2 ring-[#2563eb]"
                        : "bg-white text-[#0f172a] ring-1 ring-[#dbe7f5] hover:-translate-y-0.5 hover:ring-[#93c5fd]"
                }`}
              >
                <span className="mr-2 text-[#2563eb]">{index + 1}.</span>
                {card.question}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3">
          <p className="text-[13px] font-black text-[#047857]">Definitions</p>
          {answerCards.map((card, index) => {
            const isMatched = matchedCardIds.includes(card.id);
            const isWrong =
              feedback?.answerId === card.id && feedback.status === "wrong";

            return (
              <button
                key={`${card.id}-answer`}
                type="button"
                disabled={isMatched}
                onClick={() => chooseAnswer(card)}
                className={`min-h-[86px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-semibold leading-7 transition disabled:cursor-default ${
                  isMatched
                    ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#86efac]"
                    : isWrong
                      ? "animate-[shake_0.35s_ease-in-out] bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                      : "bg-[#f8fafc] text-[#334155] ring-1 ring-[#dbe7f5] hover:-translate-y-0.5 hover:bg-white hover:ring-[#67e8f9]"
                }`}
              >
                <span className="mr-2 font-black text-[#2563eb]">
                  {String.fromCharCode(65 + index)}.
                </span>
                {truncateText(card.answer, 180)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SpeedChallengeGame({
  cards,
  seconds,
  onFinish,
}: {
  cards: StudyFlashcard[];
  seconds: number;
  onFinish: (result: GameResult) => void;
}) {
  const [speedCards] = useState(() => shuffleItems(cards));
  const [cardIndex, setCardIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCards, setWrongCards] = useState<StudyFlashcard[]>([]);
  const isCompleteRef = useRef(false);
  const currentCard = speedCards.length
    ? speedCards[cardIndex % speedCards.length]
    : null;
  const options = useMemo(
    () => makeQuizOptions(currentCard, speedCards),
    [currentCard, speedCards],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((currentSeconds) =>
        isCompleteRef.current ? currentSeconds : Math.max(currentSeconds - 1, 0),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0 || isCompleteRef.current) {
      return;
    }

    isCompleteRef.current = true;
    onFinish({
      game: "speed",
      title: "Speed Challenge",
      score,
      total: answeredCount,
      accuracy: answeredCount
        ? Math.round((correctCount / answeredCount) * 100)
        : 0,
      timeLabel: `${seconds} sec`,
      wrongCards,
      message: "Clock stopped. Nice speed run.",
    });
  }, [
    answeredCount,
    correctCount,
    onFinish,
    score,
    seconds,
    secondsLeft,
    wrongCards,
  ]);

  function chooseAnswer(answer: string) {
    if (!currentCard || selectedAnswer || isCompleteRef.current) {
      return;
    }

    const isCorrect = answer === currentCard.answer;
    const nextCombo = isCorrect ? combo + 1 : 0;
    setSelectedAnswer(answer);
    setAnsweredCount((count) => count + 1);

    if (isCorrect) {
      setCorrectCount((count) => count + 1);
      setScore((currentScore) => currentScore + 100 + combo * 25);
      setCombo(nextCombo);
    } else {
      setWrongCards((currentCards) => [...currentCards, currentCard]);
      setCombo(0);
    }

    window.setTimeout(() => {
      if (secondsLeft <= 0 || isCompleteRef.current) {
        return;
      }

      setCardIndex((index) => index + 1);
      setSelectedAnswer("");
    }, 650);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[18px] bg-[#fff7ed] p-4 ring-1 ring-[#fed7aa] md:grid-cols-4">
        <GameMetric label="Timer" value={`${secondsLeft}s`} />
        <GameMetric label="Score" value={score} />
        <GameMetric label="Combo" value={`x${combo}`} />
        <GameMetric label="Answered" value={answeredCount} />
      </div>

      <div className="rounded-[22px] bg-[#f8fafc] p-5 ring-1 ring-[#e2e8f0]">
        <div className="h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-[#f97316] transition-all duration-500"
            style={{ width: `${(secondsLeft / seconds) * 100}%` }}
          />
        </div>
        <p className="mt-6 text-[14px] font-black text-[#f97316]">
          Question {speedCards.length ? (cardIndex % speedCards.length) + 1 : 0}
        </p>
        <h2 className="mt-2 text-[30px] font-black leading-tight text-[#0f172a]">
          {currentCard?.question ?? "No question available."}
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = currentCard?.answer === option;

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => chooseAnswer(option)}
                disabled={Boolean(selectedAnswer)}
                className={`min-h-[96px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-semibold leading-7 transition disabled:cursor-default ${
                  selectedAnswer
                    ? isSelected && isCorrect
                      ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#86efac]"
                      : isSelected
                        ? "bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                        : "bg-white text-[#334155] opacity-70 ring-1 ring-[#e2e8f0]"
                    : "bg-white text-[#0f172a] ring-1 ring-[#dbe7f5] hover:-translate-y-0.5 hover:ring-[#fdba74]"
                }`}
              >
                <span className="mr-2 inline-grid h-8 w-8 place-items-center rounded-full bg-[#fff7ed] text-[13px] font-black text-[#f97316]">
                  {String.fromCharCode(65 + index)}
                </span>
                {truncateText(option, 220)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type MemoryTile = {
  id: string;
  pairId: string;
  kind: "question" | "answer";
  content: string;
  card: StudyFlashcard;
};

function MemoryFlipGame({
  cards,
  onFinish,
}: {
  cards: StudyFlashcard[];
  onFinish: (result: GameResult) => void;
}) {
  const [tiles] = useState<MemoryTile[]>(() =>
    shuffleItems(
      cards.flatMap((card) => [
        {
          id: `${card.id}-question`,
          pairId: card.id,
          kind: "question" as const,
          content: card.question,
          card,
        },
        {
          id: `${card.id}-answer`,
          pairId: card.id,
          kind: "answer" as const,
          content: card.answer,
          card,
        },
      ]),
    ),
  );
  const [openTileIds, setOpenTileIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [wrongCards, setWrongCards] = useState<StudyFlashcard[]>([]);
  const [startedAt] = useState(() => Date.now());

  function chooseTile(tile: MemoryTile) {
    if (
      matchedPairIds.includes(tile.pairId) ||
      openTileIds.includes(tile.id) ||
      openTileIds.length >= 2
    ) {
      return;
    }

    if (!openTileIds.length) {
      setOpenTileIds([tile.id]);
      return;
    }

    const firstTile = tiles.find((item) => item.id === openTileIds[0]);
    const nextOpenTileIds = [...openTileIds, tile.id];
    setOpenTileIds(nextOpenTileIds);
    setMoves((currentMoves) => currentMoves + 1);

    if (firstTile?.pairId === tile.pairId && firstTile.kind !== tile.kind) {
      const nextMatchedPairIds = [...matchedPairIds, tile.pairId];
      setMatchedPairIds(nextMatchedPairIds);
      window.setTimeout(() => setOpenTileIds([]), 480);

      if (nextMatchedPairIds.length >= cards.length) {
        const nextScore = Math.max(100, cards.length * 150 - moves * 12);
        window.setTimeout(() => {
          onFinish({
            game: "memory",
            title: "Memory Flip",
            score: nextScore,
            total: cards.length,
            accuracy: Math.round(
              (cards.length / Math.max(cards.length + wrongCards.length, 1)) *
                100,
            ),
            timeLabel: formatGameTime(startedAt),
            wrongCards,
            message: "Memory board cleared.",
          });
        }, 680);
      }
      return;
    }

    setWrongCards((currentCards) =>
      firstTile ? [...currentCards, firstTile.card] : currentCards,
    );
    window.setTimeout(() => setOpenTileIds([]), 900);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[18px] bg-[#faf5ff] p-4 ring-1 ring-[#e9d5ff] md:grid-cols-4">
        <GameMetric label="Moves" value={moves} />
        <GameMetric label="Matches" value={`${matchedPairIds.length}/${cards.length}`} />
        <GameMetric label="Open" value={openTileIds.length} />
        <GameMetric label="Goal" value="Find pairs" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const isOpen =
            openTileIds.includes(tile.id) || matchedPairIds.includes(tile.pairId);

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => chooseTile(tile)}
              className="h-[150px] cursor-pointer rounded-[18px] [perspective:900px]"
            >
              <span
                className={`relative block h-full w-full rounded-[18px] transition duration-500 [transform-style:preserve-3d] ${
                  isOpen ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <span className="absolute inset-0 grid place-items-center rounded-[18px] bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] text-[18px] font-black text-white shadow-[0_18px_40px_rgba(139,92,246,0.22)] [backface-visibility:hidden]">
                  Flip
                </span>
                <span className="absolute inset-0 grid place-items-center rounded-[18px] bg-white px-4 text-center text-[13px] font-black leading-5 text-[#0f172a] ring-1 ring-[#e9d5ff] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {tile.kind === "question" ? "Q: " : "A: "}
                  {truncateText(tile.content, 96)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GameMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] bg-white px-4 py-3 ring-1 ring-[#e2e8f0]">
      <p className="text-[12px] font-black text-[#64748b]">{label}</p>
      <p className="mt-1 text-[22px] font-black text-[#0f172a]">{value}</p>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
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

function GameResultView({
  result,
  deck,
  onPlayAgain,
  onAnotherGame,
}: {
  result: GameResult;
  deck: StudyDeck;
  onPlayAgain: () => void;
  onAnotherGame: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-[#dbe7f5] bg-white p-7 text-center shadow-[0_18px_54px_rgba(15,23,42,0.1)]">
      <div className="absolute left-8 top-8 h-5 w-5 rounded-full bg-[#facc15]" />
      <div className="absolute right-16 top-14 h-7 w-7 rounded-full bg-[#7dd3fc]" />
      <div className="absolute bottom-12 left-20 h-6 w-6 rounded-full bg-[#c084fc]" />
      <p className="text-[14px] font-black uppercase text-[#2563eb]">
        Game Result
      </p>
      <h1 className="mt-3 text-[44px] font-black leading-tight text-[#0f172a]">
        Great job!
      </h1>
      <p className="mx-auto mt-3 max-w-[620px] text-[16px] font-semibold leading-7 text-[#64748b]">
        {result.message} You practiced {deck.title} and turned your cards into
        active recall.
      </p>
      <div className="mx-auto mt-7 grid max-w-[760px] gap-3 md:grid-cols-4">
        <GameMetric label="Score" value={result.score} />
        <GameMetric label="Accuracy" value={`${result.accuracy}%`} />
        <GameMetric label="Cards" value={result.total} />
        <GameMetric label="Time" value={result.timeLabel} />
      </div>
      {result.wrongCards.length ? (
        <div className="mx-auto mt-7 max-w-[760px] rounded-[18px] bg-[#fff1f2] p-4 text-left ring-1 ring-[#fecdd3]">
          <p className="text-[14px] font-black text-[#be123c]">
            Review these cards again
          </p>
          <div className="mt-3 grid gap-2">
            {result.wrongCards.slice(0, 4).map((card) => (
              <p
                key={`${result.game}-${card.id}`}
                className="rounded-[12px] bg-white px-4 py-3 text-[14px] font-bold text-[#0f172a]"
              >
                {truncateText(card.question, 120)}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="h-12 cursor-pointer rounded-[14px] bg-[#2563eb] px-5 text-[15px] font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8]"
        >
          Play Again
        </button>
        <button
          type="button"
          onClick={onAnotherGame}
          className="h-12 cursor-pointer rounded-[14px] bg-[#eff6ff] px-5 text-[15px] font-black text-[#1d4ed8] transition hover:bg-[#dbeafe]"
        >
          Try Another Game
        </button>
        <Link
          href={`/flashcards/${encodeURIComponent(deck.id)}/review`}
          className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#ecfdf5] px-5 text-[15px] font-black text-[#047857] transition hover:bg-[#d1fae5]"
        >
          Review Weak Cards
        </Link>
      </div>
    </section>
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
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f8fafc] text-[#334155] ring-1 ring-[#e2e8f0] transition hover:bg-[#eff6ff]"
            aria-label="Close flashcard"
          >
            <CloseIcon />
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
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f8fafc] text-[#334155] ring-1 ring-[#e2e8f0] transition hover:bg-[#eff6ff]"
            aria-label="Close editor"
          >
            <CloseIcon />
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
