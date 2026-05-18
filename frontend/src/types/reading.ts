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
