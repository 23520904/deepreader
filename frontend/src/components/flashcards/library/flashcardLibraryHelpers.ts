import { formatShortDate, type StudyDeck } from "@/lib/flashcardStudy";
import type { DeckLearningStatus } from "@/components/flashcards/library/types";

export function deckLearningStatus(deck: StudyDeck): DeckLearningStatus {
  if (deck.totalCards > 0 && deck.masteredCount >= deck.totalCards) {
    return "completed";
  }

  if (
    deck.reviewedCount > 0 ||
    deck.learningCount > 0 ||
    deck.masteredCount > 0 ||
    deck.weakCount > 0
  ) {
    return "learning";
  }

  return "new";
}

export function deckStatusLabel(status: DeckLearningStatus) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "learning") {
    return "In progress";
  }

  return "New";
}

export function deckStatusClass(status: DeckLearningStatus) {
  if (status === "completed") {
    return "bg-[#ecfdf5] text-[#047857] ring-[#bbf7d0]";
  }

  if (status === "learning") {
    return "bg-[#eff6ff] text-[#1d4ed8] ring-[#bfdbfe]";
  }

  return "bg-[#f8fafc] text-[#64748b] ring-[#e2e8f0]";
}

export function deckMetaText(deck: StudyDeck) {
  const studiedText = deck.lastStudied
    ? `Last studied ${formatShortDate(deck.lastStudied)}`
    : "Not started yet";

  return `${formatCountLabel(deck.totalCards, "card")} · ${studiedText}`;
}

export function formatCountLabel(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
