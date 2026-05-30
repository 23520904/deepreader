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

/**
 * Fetches the extracted text/content of a document.
 * token is used for authentication.
 * bookId identifies which book/document should be loaded.
 */
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

/**
 * Fetches the original source file of the document as a Blob.
 * This is useful for showing a PDF preview or downloading the source file.
 */
export function fetchDocumentSource(token: string, bookId: string) {
  return apiRequestBlob(`/api/v1/books/${encodeURIComponent(bookId)}/source`, {
    token,
    fallbackError: "Could not load the original PDF preview.",
    transformErrorMessage: friendlyProviderError,
  });
}

/**
 * Loads all saved summaries for a document.
 * The response is an array because one document can have multiple saved summaries.
 */
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

/**
 * Loads all saved flashcards for a document.
 * Each flashcard belongs to the selected book/document.
 */
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

/**
 * Loads saved chat history for a document.
 * This allows the UI to show previous questions and answers.
 */
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

/**
 * Deletes a chat thread from a document.
 * threadId identifies the conversation.
 * messageIds tells the backend which messages belong to that thread.
 */
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

/**
 * Sends a user's question to the document chat endpoint.
 * query is the user's message.
 * threadId keeps the message inside the correct chat conversation.
 * limit controls how many related document chunks can be used for the answer.
 */
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

/**
 * Requests the backend to generate a new summary for a document.
 * The empty body is still sent because this endpoint expects a POST request.
 */
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

/**
 * Requests the backend to generate flashcards for a document.
 * count decides how many flashcards to create.
 * language, type, and scope are optional settings for the generation.
 */
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

/**
 * Updates the question and answer text of one flashcard.
 * cardId identifies the flashcard that should be edited.
 */
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

/**
 * Updates the hidden status of one flashcard.
 * hidden decides whether the flashcard should be hidden or shown.
 */
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