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
import {
  fetchDocumentFlashcards,
  patchCardEdit,
  patchCardHide,
} from "@/services/readingService";
import {
  fetchStudyProgress,
  saveStudyProgress,
  studyProgressRecordsToState,
} from "@/services/studyProgressService";
import type { LibraryDocument } from "@/types/library";

type FlashcardRouteMode = "review" | "quiz" | "games" | "cards";

// This page receives the current study mode from the route.
// The mode decides which screen is shown: review, quiz, games, or card list.
export function FlashcardModePage({ mode }: { mode: FlashcardRouteMode }) {
  const router = useRouter();

  // Read the deck id from the URL params.
  const params = useParams<{ deckId?: string }>();
  const deckId = decodeURIComponent(params.deckId ?? "");

  // Listen to the current auth session.
  // useSyncExternalStore keeps this component updated when the session changes.
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  // Store the document that owns this flashcard deck.
  const [document, setDocument] = useState<LibraryDocument | null>(null);

  // Store all cards loaded from the backend before local edits/hidden cards are applied.
  const [cards, setCards] = useState<StudyFlashcard[]>([]);

  // Store review progress for each card.
  // The first value is loaded from local storage so progress is not lost on refresh.
  const [studyProgress, setStudyProgress] = useState<
    Record<string, CardProgress>
  >(() => safeReadStorage(STUDY_STATE_KEY, {}));

  // Store local edits for card questions and answers.
  const [cardEdits, setCardEdits] = useState<Record<string, CardEdit>>(() =>
    safeReadStorage(CARD_EDITS_KEY, {}),
  );

  // Store card ids that the user has hidden/deleted locally.
  const [hiddenCardIds, setHiddenCardIds] = useState<string[]>(() =>
    safeReadStorage(HIDDEN_CARDS_KEY, []),
  );

  // General page loading and error states.
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // States used by review mode.
  const [reviewCardIndex, setReviewCardIndex] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  // States used by quiz mode.
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizWrongCardIds, setQuizWrongCardIds] = useState<string[]>([]);

  // Store the selected game tab/mode.
  const [activeGame, setActiveGame] = useState<GameMode>("match");

  // Store the card currently opened in the view modal.
  const [viewingCard, setViewingCard] = useState<StudyFlashcard | null>(null);

  // Store the card currently opened in the edit modal.
  const [editingCard, setEditingCard] = useState<StudyFlashcard | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  // Save study progress to local storage whenever it changes.
  useEffect(() => {
    writeStorage(STUDY_STATE_KEY, studyProgress);
  }, [studyProgress]);

  // Save card edits to local storage whenever they change.
  useEffect(() => {
    writeStorage(CARD_EDITS_KEY, cardEdits);
  }, [cardEdits]);

  // Save hidden card ids to local storage whenever they change.
  useEffect(() => {
    writeStorage(HIDDEN_CARDS_KEY, hiddenCardIds);
  }, [hiddenCardIds]);

  // Load the selected deck, its flashcards, and study progress.
  // This runs again when deckId, mode, or session changes.
  useEffect(() => {
    if (!session) {
      return;
    }

    // This flag prevents state updates if the component is already unmounted
    // or if a newer request has replaced this one.
    let ignore = false;
    const token = session.token;
    const displayName = session.username || session.email || "You";

    async function loadDeck() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        // Load library books and study progress at the same time.
        const [books, remoteProgressRecords] = await Promise.all([
          fetchLibraryBooks(token),
          fetchStudyProgress(token).catch(() => []),
        ]);

        // Convert backend progress records into the local progress object format.
        const remoteProgress = studyProgressRecordsToState(remoteProgressRecords);

        // Convert backend book data into the document format used by the UI.
        const libraryDocuments = books.map((book) =>
          mapBackendBook(book, "mine", displayName),
        );

        // Find the document that matches the deck id from the URL.
        const selectedDocument =
          libraryDocuments.find((item) => item.id === deckId) ?? null;

        if (!selectedDocument) {
          throw new Error("This flashcard deck could not be found.");
        }

        // Load flashcards for the selected document.
        const records = await fetchDocumentFlashcards(token, selectedDocument.id);

        // Normalize backend card records and attach document information to each card.
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

        // Merge remote progress with current local progress.
        // Local progress is kept last so the latest browser changes are preserved.
        setStudyProgress((currentProgress) => ({
          ...remoteProgress,
          ...currentProgress,
        }));

        // In review mode, cards are sorted by review priority.
        // In other modes, cards keep their original order.
        setCards(
          mode === "review"
            ? sortCardsForReview(deckCards, {
                ...remoteProgress,
                ...safeReadStorage(STUDY_STATE_KEY, {}),
              })
            : deckCards,
        );

        // Reset review UI when a new deck is loaded.
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

  // Apply local card edits and remove hidden cards before showing them in the UI.
  const visibleCards = useMemo(
    () => applyCardOverrides({ cards, cardEdits, hiddenCardIds }),
    [cardEdits, cards, hiddenCardIds],
  );

  // Build the study deck object used by all flashcard modes.
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

  // Cards used in review mode.
  const reviewCards = useMemo(() => deck?.cards ?? [], [deck]);

  // Show a login message first if the user has no session.
  const pageErrorMessage = !session
    ? "Please log in to open this flashcard deck."
    : errorMessage;

  // Pick the active review card based on the current review index.
  const activeReviewCard = reviewCards.length
    ? reviewCards[reviewCardIndex % reviewCards.length]
    : null;

  // Cards used in quiz mode.
  const quizCards = useMemo(() => visibleCards, [visibleCards]);

  // Current quiz card is null when the quiz is finished or there are no cards.
  const currentQuizCard =
    !quizFinished && quizCards.length ? quizCards[quizIndex] ?? null : null;

  // Build multiple-choice options for the current quiz card.
  const quizOptions = useMemo(
    () => makeQuizOptions(currentQuizCard, quizCards),
    [currentQuizCard, quizCards],
  );

  // Check whether the selected answer matches the current card answer.
  const selectedIsCorrect =
    Boolean(quizSelectedAnswer && currentQuizCard) &&
    quizSelectedAnswer === currentQuizCard?.answer;

  // Convert wrong card ids back into full card objects for the quiz result screen.
  const wrongQuizCards = quizWrongCardIds
    .map((cardId) => quizCards.find((card) => card.id === cardId))
    .filter((card): card is StudyFlashcard => Boolean(card));

  // Update review progress for one card.
  // The new progress is saved locally and also synced to the backend when possible.
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

  // Submit the selected quiz answer.
  // Correct answers increase the score, while wrong answers are saved for review.
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

  // Move to the next quiz question or finish the quiz at the end.
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

  // Reset all quiz state so the user can start again.
  function resetQuiz() {
    setQuizIndex(0);
    setQuizSelectedAnswer("");
    setQuizSubmitted(false);
    setQuizFinished(false);
    setQuizScore(0);
    setQuizWrongCardIds([]);
  }

  // Move to the next review card.
  // If the answer is visible, the current card is marked as reviewed successfully.
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

  // Open the edit modal and fill it with the selected card data.
  function openCardEditor(card: StudyFlashcard) {
    setEditingCard(card);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  }

  // Save edited question and answer.
  // Empty input will keep the old value instead of saving an empty string.
  async function saveCardEdit() {
    if (!editingCard) {
      return;
    }

    const nextQuestion = editQuestion.trim() || editingCard.question;
    const nextAnswer = editAnswer.trim() || editingCard.answer;

    setCardEdits((currentEdits) => ({
      ...currentEdits,
      [editingCard.id]: {
        question: nextQuestion,
        answer: nextAnswer,
      },
    }));
    setEditingCard(null);

    if (session) {
      try {
        await patchCardEdit(session.token, editingCard.id, nextQuestion, nextAnswer);
      } catch (err) {
        console.error("Failed to sync card edit to server:", err);
      }
    }
  }

  // Hide a card from the deck.
  // The card id is saved locally and also synced to the backend when possible.
  async function deleteCard(cardId: string) {
    setHiddenCardIds((cardIds) =>
      cardIds.includes(cardId) ? cardIds : [...cardIds, cardId],
    );

    if (session) {
      try {
        await patchCardHide(session.token, cardId, true);
      } catch (err) {
        console.error("Failed to sync hidden card status to server:", err);
      }
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-[#0f172a]">
      {/* Top navigation bar for the site. */}
      <SiteNavbar activeItem="Flashcards" />

      {/* Main flashcard mode content area. */}
      <section className="mx-auto min-w-0 w-[min(1120px,calc(100%_-_48px))] py-8 max-[700px]:w-[min(100%_-_28px,1120px)] max-[520px]:py-5">
        {/* Back link to return to the flashcard deck list. */}
        <div className="mb-5 max-[520px]:mb-4">
          <Link
            href="/flashcards"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-transparent px-1 text-[14px] font-black text-[#1d4ed8] transition hover:text-[#0f172a]"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to decks</span>
          </Link>
        </div>

        {/* Main screen state: loading, error, empty deck, or selected study mode. */}
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
          /* Review mode screen for studying cards one by one. */
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
          /* Quiz mode screen with multiple-choice questions. */
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
          /* Games mode screen for interactive flashcard games. */
          <GamesView
            deck={deck}
            activeGame={activeGame}
            onGameChange={setActiveGame}
          />
        ) : (
          /* Cards mode screen for viewing, editing, and deleting cards. */
          <CardsView
            deck={deck}
            studyProgress={studyProgress}
            onViewCard={setViewingCard}
            onEditCard={openCardEditor}
            onDeleteCard={deleteCard}
          />
        )}
      </section>

      {/* Modal for viewing one card in detail. */}
      {viewingCard ? (
        <CardModal card={viewingCard} onClose={() => setViewingCard(null)} />
      ) : null}

      {/* Modal for editing the question and answer of one card. */}
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

      {/* Site footer shown at the bottom of the page. */}
      <SiteFooter />
    </main>
  );
}