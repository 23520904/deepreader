import {
  apiRequestBlob,
  apiRequestJson,
  friendlyProviderError,
} from "@/services/apiClient";
import type {
  DocumentContentResponse,
  FlashcardGenerationResponse,
  FlashcardRecord,
  SummaryGenerationResponse,
  SummaryRecord,
} from "@/types/reading";

export function fetchDocumentContent(token: string, bookId: string) {
  return apiRequestJson<DocumentContentResponse>(
    `/api/v1/books/${encodeURIComponent(bookId)}/content`,
    {
      token,
      fallbackError: "Could not load this document.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function fetchDocumentSource(token: string, bookId: string) {
  return apiRequestBlob(`/api/v1/books/${encodeURIComponent(bookId)}/source`, {
    token,
    fallbackError: "Could not load the original PDF preview.",
    transformErrorMessage: friendlyProviderError,
  });
}

export function fetchDocumentSummaries(token: string, bookId: string) {
  return apiRequestJson<SummaryRecord[]>(
    `/api/v1/books/${encodeURIComponent(bookId)}/summaries`,
    {
      token,
      fallbackError: "Could not load saved summaries.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function fetchDocumentFlashcards(token: string, bookId: string) {
  return apiRequestJson<FlashcardRecord[]>(
    `/api/v1/books/${encodeURIComponent(bookId)}/flashcards`,
    {
      token,
      fallbackError: "Could not load saved flashcards.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function generateDocumentSummary(
  token: string,
  bookId: string,
  provider: string,
) {
  return apiRequestJson<SummaryGenerationResponse>(
    `/api/v1/books/${encodeURIComponent(bookId)}/summary`,
    {
      token,
      method: "POST",
      body: JSON.stringify({ provider }),
      fallbackError: "Could not generate this summary.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function generateDocumentFlashcards({
  token,
  bookId,
  provider,
  count,
}: {
  token: string;
  bookId: string;
  provider: string;
  count: number;
}) {
  return apiRequestJson<FlashcardGenerationResponse>(
    `/api/v1/books/${encodeURIComponent(bookId)}/flashcards`,
    {
      token,
      method: "POST",
      body: JSON.stringify({ provider, count }),
      fallbackError: "Could not generate flashcards.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}
