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
