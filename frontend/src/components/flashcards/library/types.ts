import type {
  DeckSortMode,
  StatusFilter,
  StudyDeck,
} from "@/lib/flashcardStudy";

export type CreateStep = 1 | 2 | 3;
export type DeckLearningStatus = "new" | "learning" | "completed";

export type DeckRoute = (
  deckId: string,
  page: "review" | "quiz" | "games" | "cards",
) => string;

export type FlashcardsToolbarState = {
  query: string;
  documentFilter: string;
  statusFilter: StatusFilter;
  sortMode: DeckSortMode;
};

export type FlashcardsToolbarActions = {
  onQueryChange: (query: string) => void;
  onDocumentFilterChange: (documentId: string) => void;
  onStatusFilterChange: (status: StatusFilter) => void;
  onSortModeChange: (sortMode: DeckSortMode) => void;
};

export type DeckGroup = {
  id: string;
  title: string;
  decks: StudyDeck[];
};
