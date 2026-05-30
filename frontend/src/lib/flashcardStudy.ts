import type { LibraryDocument } from "@/types/library";
import type { FlashcardView } from "@/types/study";

// Available learning states for a flashcard
export type StudyStatus = "new" | "learning" | "mastered" | "weak";

// Filter options used when displaying cards
export type StatusFilter = "all" | "new" | "learning" | "mastered" | "weak";

// Supported deck sorting modes
export type DeckSortMode =
  | "newest"
  | "last-studied"
  | "most-cards"
  | "lowest-accuracy"
  | "highest-progress";

// User review ratings used in spaced repetition
export type ReviewRating = "again" | "hard" | "good" | "easy";

// Available study game modes
export type GameMode = "match" | "speed" | "memory";

// Flashcard with additional book information
export type StudyFlashcard = FlashcardView & {
  bookId: string;
  bookTitle: string;
  bookFormat: LibraryDocument["format"];
};

// Progress data stored for each flashcard
export type CardProgress = {
  status: StudyStatus;
  reviews: number;
  attempts: number;
  correct: number;
  lastReviewed: string | null;
  dueAt?: string | null;
  intervalDays?: number;
  easeFactor?: number;
};

// User-edited flashcard content
export type CardEdit = {
  question: string;
  answer: string;
};

// Aggregated study deck information used by the UI
export type StudyDeck = {
  id: string;
  title: string;
  sourceTitle: string;
  format: LibraryDocument["format"];
  createdAt: string | null;
  cards: StudyFlashcard[];
  totalCards: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  weakCount: number;
  reviewedCount: number;
  progress: number;
  accuracy: number | null;
  lastStudied: string | null;
};

// Shared assets and localStorage keys
export const STACK_ICON = "/assets/icons/home/stack-icon.png";
export const DOCUMENT_ICON = "/assets/images/library/document-3d.webp";
export const STUDY_STATE_KEY = "deepreader:flashcard-study-state:v1";
export const CARD_EDITS_KEY = "deepreader:flashcard-card-edits:v1";
export const HIDDEN_CARDS_KEY = "deepreader:flashcard-hidden-cards:v1";

/**
 * Convert a date string into a timestamp.
 * Returns 0 when the date is missing or invalid.
 */
export function createdAtTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Format a full date for display in the UI.
 */
export function formatDate(value: string | null) {
  if (!value) {
    return "Not studied yet";
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

/**
 * Format a shorter date version.
 */
export function formatShortDate(value: string | null) {
  if (!value) {
    return "New";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Safely read JSON data from localStorage.
 * Returns the fallback value if parsing fails.
 */
export function safeReadStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);

    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Save data into localStorage.
 */
export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Shuffle items using the Fisher-Yates algorithm.
 */
export function shuffleItems<T>(items: T[]) {
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

/**
 * Check whether a card is currently due for review.
 */
export function isCardDue(
  cardId: string,
  progressByCard: Record<string, CardProgress>,
  now = new Date(),
) {
  const progress = progressByCard[cardId];

  if (!progress?.dueAt) {
    return true;
  }

  const dueTime = new Date(progress.dueAt).getTime();
  return Number.isNaN(dueTime) || dueTime <= now.getTime();
}

/**
 * Calculate the next review state after the user rates a card.
 * Includes spaced repetition scheduling logic.
 */
export function scheduleCardReview({
  currentProgress,
  rating,
  now = new Date(),
}: {
  currentProgress?: CardProgress;
  rating: ReviewRating;
  now?: Date;
}) {
  const currentCard = currentProgress ?? {
    status: "new" as StudyStatus,
    reviews: 0,
    attempts: 0,
    correct: 0,
    lastReviewed: null,
    dueAt: null,
    intervalDays: 0,
    easeFactor: 2.5,
  };

  const nextReviews = currentCard.reviews + 1;
  const remembered = rating !== "again";
  const nextEase = nextEaseFactor(currentCard.easeFactor ?? 2.5, rating);

  const nextInterval = nextIntervalDays({
    previousInterval: currentCard.intervalDays ?? 0,
    reviews: currentCard.reviews,
    rating,
    easeFactor: nextEase,
  });

  const dueAt = addReviewDelay(now, rating, nextInterval).toISOString();

  return {
    status: statusForRating(rating, nextReviews),
    reviews: nextReviews,
    attempts: currentCard.attempts + 1,
    correct: currentCard.correct + (remembered ? 1 : 0),
    lastReviewed: now.toISOString(),
    dueAt,
    intervalDays: nextInterval,
    easeFactor: nextEase,
  };
}

/**
 * Sort cards for review.
 * Due cards and weaker cards are prioritized first.
 */
export function sortCardsForReview(
  cards: StudyFlashcard[],
  progressByCard: Record<string, CardProgress>,
) {
  const now = new Date();

  return shuffleItems(cards).sort((left, right) => {
    const leftDue = isCardDue(left.id, progressByCard, now) ? 0 : 1;
    const rightDue = isCardDue(right.id, progressByCard, now) ? 0 : 1;

    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    const leftPriority = reviewPriority(cardStatus(left.id, progressByCard));
    const rightPriority = reviewPriority(cardStatus(right.id, progressByCard));

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return (
      createdAtTime(progressByCard[left.id]?.dueAt ?? null) -
      createdAtTime(progressByCard[right.id]?.dueAt ?? null)
    );
  });
}

/**
 * Remove duplicates and empty values from a string array.
 */
export function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

/**
 * Generate multiple-choice quiz answers.
 * Includes the correct answer and random distractors.
 */
export function makeQuizOptions(
  card: StudyFlashcard | null,
  cards: StudyFlashcard[],
) {
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

/**
 * Get the current study status of a card.
 */
export function cardStatus(
  cardId: string,
  progressByCard: Record<string, CardProgress>,
) {
  return progressByCard[cardId]?.status ?? "new";
}

/**
 * Convert a review rating into a study status.
 */
function statusForRating(rating: ReviewRating, reviews: number): StudyStatus {
  if (rating === "again") {
    return "weak";
  }

  if (rating === "hard") {
    return "learning";
  }

  if (rating === "easy" || reviews >= 3) {
    return "mastered";
  }

  return "learning";
}

/**
 * Update ease factor used by the spaced repetition algorithm.
 */
function nextEaseFactor(currentEase: number, rating: ReviewRating) {
  if (rating === "again") {
    return Math.max(1.3, currentEase - 0.25);
  }

  if (rating === "hard") {
    return Math.max(1.3, currentEase - 0.15);
  }

  if (rating === "easy") {
    return currentEase + 0.15;
  }

  return currentEase;
}

/**
 * Calculate the next review interval in days.
 */
function nextIntervalDays({
  previousInterval,
  reviews,
  rating,
  easeFactor,
}: {
  previousInterval: number;
  reviews: number;
  rating: ReviewRating;
  easeFactor: number;
}) {
  if (rating === "again") {
    return 0;
  }

  if (rating === "hard") {
    return Math.max(1, Math.round(Math.max(previousInterval, 1) * 1.2));
  }

  if (rating === "easy") {
    return reviews === 0
      ? 4
      : Math.max(4, Math.round(Math.max(previousInterval, 1) * (easeFactor + 0.4)));
  }

  if (reviews === 0) {
    return 1;
  }

  if (reviews === 1) {
    return 3;
  }

  return Math.max(1, Math.round(Math.max(previousInterval, 1) * easeFactor));
}

/**
 * Calculate the next due date for a review.
 */
function addReviewDelay(now: Date, rating: ReviewRating, intervalDays: number) {
  const dueAt = new Date(now);

  if (rating === "again") {
    dueAt.setMinutes(dueAt.getMinutes() + 10);
    return dueAt;
  }

  dueAt.setDate(dueAt.getDate() + intervalDays);
  return dueAt;
}

/**
 * Review priority used when sorting cards.
 */
function reviewPriority(status: StudyStatus) {
  if (status === "weak") {
    return 4;
  }

  if (status === "new") {
    return 3;
  }

  if (status === "learning") {
    return 2;
  }

  return 1;
}

/**
 * Human-readable label for a study status.
 */
export function statusLabel(status: StudyStatus) {
  if (status === "new") {
    return "New";
  }

  if (status === "learning") {
    return "Learning";
  }

  if (status === "mastered") {
    return "Mastered";
  }

  return "Weak";
}

/**
 * Tailwind classes used for status badges.
 */
export function statusClasses(status: StudyStatus) {
  if (status === "mastered") {
    return "bg-[#ecfdf5] text-[#047857] ring-[#bbf7d0]";
  }

  if (status === "learning") {
    return "bg-[#fffbeb] text-[#b45309] ring-[#fde68a]";
  }

  if (status === "weak") {
    return "bg-[#fff1f2] text-[#be123c] ring-[#fecdd3]";
  }

  return "bg-[#eff6ff] text-[#1d4ed8] ring-[#bfdbfe]";
}

/**
 * Limit text length for display purposes.
 */
export function truncateText(value: string, maxLength = 120) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

/**
 * Apply user edits and hidden-card settings to a card list.
 */
export function applyCardOverrides({
  cards,
  cardEdits,
  hiddenCardIds,
}: {
  cards: StudyFlashcard[];
  cardEdits: Record<string, CardEdit>;
  hiddenCardIds: string[];
}) {
  return cards
    .filter((card) => !hiddenCardIds.includes(card.id))
    .map((card) => {
      const edit = cardEdits[card.id];

      if (!edit) {
        return card;
      }

      return {
        ...card,
        question: edit.question,
        answer: edit.answer,
      };
    });
}

/**
 * Build study deck statistics from documents,
 * flashcards, and stored study progress.
 */
export function buildStudyDecks({
  documents,
  cards,
  studyProgress,
}: {
  documents: LibraryDocument[];
  cards: StudyFlashcard[];
  studyProgress: Record<string, CardProgress>;
}) {
  return documents
    .filter((document) => document.status === "Ready")
    .map((document) => {
      const deckCards = cards.filter((card) => card.bookId === document.id);
      const progressValues = deckCards.map((card) => studyProgress[card.id]);
      const statusValues = deckCards.map((card) =>
        cardStatus(card.id, studyProgress),
      );

      const totalAttempts = progressValues.reduce(
        (total, progress) => total + (progress?.attempts ?? 0),
        0,
      );

      const totalCorrect = progressValues.reduce(
        (total, progress) => total + (progress?.correct ?? 0),
        0,
      );

      const lastStudied =
        progressValues
          .map((progress) => progress?.lastReviewed ?? null)
          .sort((left, right) => createdAtTime(right) - createdAtTime(left))[0] ??
        null;

      const reviewedCount = progressValues.filter(
        (progress) => (progress?.reviews ?? 0) > 0,
      ).length;

      const masteredCount = statusValues.filter(
        (status) => status === "mastered",
      ).length;

      return {
        id: document.id,
        title: document.title,
        sourceTitle: document.title,
        format: document.format,
        createdAt: document.createdAt,
        cards: deckCards,
        totalCards: deckCards.length,
        newCount: statusValues.filter((status) => status === "new").length,
        learningCount: statusValues.filter((status) => status === "learning")
          .length,
        masteredCount,
        weakCount: statusValues.filter((status) => status === "weak").length,
        reviewedCount,
        progress: deckCards.length
          ? Math.round((masteredCount / deckCards.length) * 100)
          : 0,
        accuracy: totalAttempts
          ? Math.round((totalCorrect / totalAttempts) * 100)
          : null,
        lastStudied,
      } satisfies StudyDeck;
    });
}