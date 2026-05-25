"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CardModal,
  CardsView,
  EditCardModal,
  EmptyMode,
  GamesView,
  QuizView,
  ReviewView,
} from "@/components/flashcards/modes/FlashcardModeViews";
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
  HIDDEN_CARDS_KEY,
  makeQuizOptions,
  scheduleCardReview,
  safeReadStorage,
  sortCardsForReview,
  STUDY_STATE_KEY,
  writeStorage,
  type CardEdit,
  type CardProgress,
  type GameMode,
  type ReviewRating,
  type StudyDeck,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import { mapBackendBook } from "@/lib/library";
import { normalizeFlashcardRecords } from "@/lib/reading";
import { fetchLibraryBooks } from "@/services/libraryService";
import { fetchDocumentFlashcards } from "@/services/readingService";
import {
  fetchStudyProgress,
  saveStudyProgress,
  studyProgressRecordsToState,
} from "@/services/studyProgressService";
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
  const [isLoading, setIsLoading] = useState(false);
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
      return;
    }

    let ignore = false;
    const token = session.token;
    const displayName = session.username || session.email || "You";

    async function loadDeck() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [books, remoteProgressRecords] = await Promise.all([
          fetchLibraryBooks(token),
          fetchStudyProgress(token).catch(() => []),
        ]);
        const remoteProgress = studyProgressRecordsToState(remoteProgressRecords);
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
        setStudyProgress((currentProgress) => ({
          ...remoteProgress,
          ...currentProgress,
        }));
        setCards(
          mode === "review"
            ? sortCardsForReview(deckCards, {
                ...remoteProgress,
                ...safeReadStorage(STUDY_STATE_KEY, {}),
              })
            : deckCards,
        );
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
  }, [deckId, mode, session]);

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
  const pageErrorMessage = !session
    ? "Please log in to open this flashcard deck."
    : errorMessage;

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

  function updateProgress(cardId: string, rating: ReviewRating) {
    setStudyProgress((currentProgress) => {
      const nextProgress = scheduleCardReview({
        currentProgress: currentProgress[cardId],
        rating,
      });
      const targetCard = visibleCards.find((card) => card.id === cardId);

      if (session?.token && targetCard) {
        void saveStudyProgress({
          token: session.token,
          cardId,
          bookId: targetCard.bookId,
          progress: nextProgress,
        }).catch(() => undefined);
      }

      return {
        ...currentProgress,
        [cardId]: nextProgress,
      };
    });
  }

  function submitQuizAnswer() {
    if (!currentQuizCard || !quizSelectedAnswer || quizSubmitted) {
      return;
    }

    const isCorrect = quizSelectedAnswer === currentQuizCard.answer;
    setQuizSubmitted(true);
    updateProgress(currentQuizCard.id, isCorrect ? "good" : "again");

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

  function goToNextReviewCard() {
    if (activeReviewCard && isAnswerVisible) {
      updateProgress(activeReviewCard.id, "good");
    }

    if (reviewCardIndex + 1 >= reviewCards.length) {
      router.push("/flashcards");
      return;
    }

    setReviewCardIndex((reviewCardIndex + 1) % reviewCards.length);
    setIsAnswerVisible(false);
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
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-[#0f172a]">
      <SiteNavbar activeItem="Flashcards" />

      <section className="mx-auto min-w-0 w-[min(1120px,calc(100%_-_48px))] py-8 max-[700px]:w-[min(100%_-_28px,1120px)] max-[520px]:py-5">
        <div className="mb-5 max-[520px]:mb-4">
          <Link
            href="/flashcards"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-transparent px-1 text-[14px] font-black text-[#1d4ed8] transition hover:text-[#0f172a]"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to decks</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid min-h-[430px] place-items-center rounded-[8px] border border-[#dbe7f5] bg-white max-[520px]:min-h-[260px]">
            <p className="text-[16px] font-black text-[#2563eb]">
              Loading deck...
            </p>
          </div>
        ) : pageErrorMessage ? (
          <div className="rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-5 py-4 text-[14px] font-bold text-[#be123c]">
            {pageErrorMessage}
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
              goToNextReviewCard();
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

