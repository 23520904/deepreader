import {
  apiRequestBlob,
  apiRequestJson,
  friendlyProviderError,
} from "@/services/apiClient";
import type {
  ChatGenerationResponse,
  ChatHistoryRecord,
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

export function fetchDocumentChats(token: string, bookId: string) {
  return apiRequestJson<ChatHistoryRecord[]>(
    `/api/v1/books/${encodeURIComponent(bookId)}/chats`,
    {
      token,
      fallbackError: "Could not load saved chat history.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function deleteDocumentChatThread({
  token,
  bookId,
  threadId,
  messageIds,
}: {
  token: string;
  bookId: string;
  threadId: string;
  messageIds: string[];
}) {
  return apiRequestJson<unknown>(
    `/api/v1/books/${encodeURIComponent(bookId)}/chat-threads/delete`,
    {
      token,
      method: "POST",
      body: JSON.stringify({ threadId, messageIds }),
      fallbackError: "Could not delete this chat.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function sendDocumentChatMessage({
  token,
  bookId,
  query,
  threadId,
  limit = 4,
}: {
  token: string;
  bookId: string;
  query: string;
  threadId: string;
  limit?: number;
}) {
  return apiRequestJson<ChatGenerationResponse>(
    `/api/v1/books/${encodeURIComponent(bookId)}/chat`,
    {
      token,
      method: "POST",
      body: JSON.stringify({ query, limit, threadId }),
      fallbackError: "Could not answer this question.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function generateDocumentSummary(token: string, bookId: string) {
  return apiRequestJson<SummaryGenerationResponse>(
    `/api/v1/books/${encodeURIComponent(bookId)}/summary`,
    {
      token,
      method: "POST",
      body: JSON.stringify({}),
      fallbackError: "Could not generate this summary.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function generateDocumentFlashcards({
  token,
  bookId,
  count,
  language,
  type,
  scope,
}: {
  token: string;
  bookId: string;
  count: number;
  language?: string;
  type?: string;
  scope?: string;
}) {
  return apiRequestJson<FlashcardGenerationResponse>(
    `/api/v1/books/${encodeURIComponent(bookId)}/flashcards`,
    {
      token,
      method: "POST",
      body: JSON.stringify({ count, language, type, scope }),
      fallbackError: "Could not generate flashcards.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function patchCardEdit(
  token: string,
  cardId: string,
  question: string,
  answer: string,
) {
  return apiRequestJson<unknown>(
    `/api/v1/flashcards/${encodeURIComponent(cardId)}/edit`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify({ question, answer }),
      fallbackError: "Could not edit this flashcard.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}

export function patchCardHide(
  token: string,
  cardId: string,
  hidden: boolean,
) {
  return apiRequestJson<unknown>(
    `/api/v1/flashcards/${encodeURIComponent(cardId)}/hide`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify({ hidden }),
      fallbackError: "Could not hide this flashcard.",
      transformErrorMessage: friendlyProviderError,
    },
  );
}
