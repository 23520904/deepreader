import type { LibraryDocument } from "@/types/library";
import type { FlashcardView } from "@/types/study";

export type StudyStatus = "new" | "learning" | "mastered" | "weak";
export type StatusFilter = "all" | "new" | "learning" | "mastered" | "weak";
export type DeckSortMode =
  | "newest"
  | "last-studied"
  | "most-cards"
  | "lowest-accuracy"
  | "highest-progress";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type GameMode = "match" | "speed" | "memory";

export type StudyFlashcard = FlashcardView & {
  bookId: string;
  bookTitle: string;
  bookFormat: LibraryDocument["format"];
};

export type CardProgress = {
  status: StudyStatus;
  reviews: number;
  attempts: number;
  correct: number;
  lastReviewed: string | null;
};

export type CardEdit = {
  question: string;
  answer: string;
};

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

export const STACK_ICON = "/assets/icons/home/stack-icon.png";
export const DOCUMENT_ICON = "/assets/images/library/document-3d.webp";
export const STUDY_STATE_KEY = "deepreader:flashcard-study-state:v1";
export const CARD_EDITS_KEY = "deepreader:flashcard-card-edits:v1";
export const HIDDEN_CARDS_KEY = "deepreader:flashcard-hidden-cards:v1";

export function createdAtTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

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

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

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

export function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

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

export function cardStatus(
  cardId: string,
  progressByCard: Record<string, CardProgress>,
) {
  return progressByCard[cardId]?.status ?? "new";
}

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

export function truncateText(value: string, maxLength = 120) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

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
    })
    .filter((deck) => deck.totalCards > 0);
}
