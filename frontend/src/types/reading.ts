export type DocumentSection = {
  sectionId: string;
  title: string | null;
  pageNumber: number | null;
  summary: string | null;
  content: string | null;
};

export type DocumentContentResponse = {
  documentId: string;
  fileName: string;
  provider?: string | null;
  sections: DocumentSection[];
};

export type SummaryRecord = {
  id?: string | null;
  chapterId?: string | null;
  bookId?: string | null;
  content?: string | null;
  model?: string | null;
  createdAt?: string | null;
};

export type FlashcardRecord = {
  id?: string | null;
  chapterId?: string | null;
  bookId?: string | null;
  userId?: string | null;
  question?: string | null;
  answer?: string | null;
  createdAt?: string | null;
};

export type ChatHistoryRecord = {
  id?: string | null;
  userId?: string | null;
  bookId?: string | null;
  role?: string | null;
  content?: string | null;
  threadId?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
  sources?: ChatGenerationResponse["sources"];
};

export type ChatGenerationResponse = {
  query?: string | null;
  answer?: string | null;
  threadId?: string | null;
  sources?: Array<{
    index?: number | null;
    pageNumber?: number | null;
    documentId?: string | null;
    chunkId?: string | null;
    fileName?: string | null;
    sectionId?: string | null;
    title?: string | null;
    chunkIndex?: number | null;
    content?: string | null;
    snippet?: string | null;
    score?: number | null;
  }> | null;
};

export type SummaryGenerationResponse = {
  documentId?: string | null;
  provider?: string | null;
  summary?: string | null;
};

export type FlashcardGenerationResponse = {
  documentId?: string | null;
  provider?: string | null;
  flashcards?: Array<{
    question?: string | null;
    answer?: string | null;
  }> | null;
};

export type ReadingPage = {
  key: string;
  pageNumber: number;
  title: string;
  content: string;
};
