export type AiStudyTab = "summary" | "flashcards" | "chat";

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

export type ChatSourceReference = {
  documentId?: string | null;
  chunkId?: string | null;
  fileName?: string | null;
  sectionId?: string | null;
  title?: string | null;
  chunkIndex?: number | null;
  content?: string | null;
  score?: number | null;
};

export type ChatMessageView = {
  id: string;
  threadId?: string | null;
  role: "user" | "assistant";
  content: string;
  createdAt: string | null;
  sources?: ChatSourceReference[];
};

export type ChatThreadView = {
  id: string;
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
  messages: ChatMessageView[];
};
