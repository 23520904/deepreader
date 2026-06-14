import type {
  ChatGenerationResponse,
  ChatHistoryRecord,
  DocumentSection,
  FlashcardGenerationResponse,
  FlashcardRecord,
  ReadingPage,
  SummaryRecord,
} from "@/types/reading";
import type {
  ChatMessageView,
  ChatThreadView,
  FlashcardView,
  SummaryView,
} from "@/types/study";

const READ_STATE_PREFIX = "deepreader:read-pages:";

export function cleanDocumentTitle(fileName: string | null | undefined) {
  return (fileName?.trim() || "Untitled document").replace(/\.(pdf|epub)$/i, "");
}

export function resolveDocumentFormat(fileName: string | null | undefined) {
  const lower = fileName?.toLowerCase() ?? "";

  if (lower.endsWith(".pdf")) {
    return "PDF";
  }

  if (lower.endsWith(".epub")) {
    return "EPUB";
  }

  return "DOC";
}

export function iconForDocumentFormat(format: string) {
  if (format === "PDF") {
    return "/assets/images/library/pdf-icon.png";
  }

  return "/assets/images/library/document-3d.webp";
}

export function buildReadingPages(sections: DocumentSection[]): ReadingPage[] {
  const pageMap = new Map<number, DocumentSection[]>();

  sections.forEach((section, index) => {
    const pageNumber =
      section.pageNumber && section.pageNumber > 0 ? section.pageNumber : index + 1;
    const pageSections = pageMap.get(pageNumber) ?? [];
    pageSections.push(section);
    pageMap.set(pageNumber, pageSections);
  });

  return Array.from(pageMap.entries())
    .sort(([leftPage], [rightPage]) => leftPage - rightPage)
    .map(([pageNumber, pageSections]) => {
      const content = pageSections
        .map((section) => section.content?.trim())
        .filter(Boolean)
        .join("\n\n");

      return {
        key: `page-${pageNumber}`,
        pageNumber,
        title: `Page ${pageNumber}`,
        content: content || "No readable content was found for this page.",
      };
    });
}

export function readStateStorageKey(bookId: string) {
  return `${READ_STATE_PREFIX}${bookId}`;
}

export function loadReadPageKeys(bookId: string) {
  if (typeof window === "undefined" || !bookId) {
    return new Set<string>();
  }

  try {
    const savedValue = window.localStorage.getItem(readStateStorageKey(bookId));
    const savedKeys = savedValue ? (JSON.parse(savedValue) as unknown) : [];

    return new Set(
      Array.isArray(savedKeys)
        ? savedKeys.filter((key): key is string => typeof key === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function saveReadPageKeys(bookId: string, readPageKeys: Set<string>) {
  if (typeof window === "undefined" || !bookId) {
    return;
  }

  window.localStorage.setItem(
    readStateStorageKey(bookId),
    JSON.stringify(Array.from(readPageKeys)),
  );
}

export function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function createdAtTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isWeakFlashcardQuestion(question: string | null | undefined) {
  const normalized = question
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized?.trim()) {
    return true;
  }

  return (
    /\b(page|slide)\s*\d+\b/.test(normalized) ||
    /\b(important point|key point|main point|key idea)\b.*\b(page|slide|section|part)\b/.test(
      normalized,
    ) ||
    /^(what|which|name|list|summarize|describe)\b.*\b(page|slide|section)\b/.test(
      normalized,
    ) ||
    normalized.includes("what is one important point") ||
    normalized.includes("what important point") ||
    normalized.includes("what is the key idea in this part") ||
    normalized === "what is the document about" ||
    normalized === "what does the document discuss"
  );
}

export function normalizeSummaryRecords(records: SummaryRecord[]) {
  return records
    .map((record, index): SummaryView | null => {
      const content = record.content?.trim();

      if (!content) {
        return null;
      }

      return {
        id:
          record.id ??
          record.chapterId ??
          `${record.bookId ?? "summary"}-${record.createdAt ?? index}`,
        content,
        model: record.model?.trim() || "AI",
        createdAt: record.createdAt ?? null,
      };
    })
    .filter(isPresent)
    .sort(
      (left, right) =>
        createdAtTime(right.createdAt) - createdAtTime(left.createdAt),
    );
}

export function normalizeFlashcardRecords(records: FlashcardRecord[]) {
  return records
    .map((record, index): FlashcardView | null => {
      const question = record.question?.trim();
      const answer = record.answer?.trim();

      if (!question || !answer || isWeakFlashcardQuestion(question)) {
        return null;
      }

      return {
        id:
          record.id ??
          `${record.bookId ?? "flashcard"}-${record.createdAt ?? index}`,
        question,
        answer,
        createdAt: record.createdAt ?? null,
      };
    })
    .filter(isPresent)
    .sort(
      (left, right) =>
        createdAtTime(right.createdAt) - createdAtTime(left.createdAt),
    );
}

export function normalizeChatRecords(records: ChatHistoryRecord[]) {
  return records
    .map((record, index): ChatMessageView | null => {
      const content = record.content?.trim();
      const role = record.role?.trim().toLowerCase();

      if (!content || (role !== "user" && role !== "assistant")) {
        return null;
      }

      return {
        id:
          record.id ??
          `${record.bookId ?? "chat"}-${record.timestamp ?? record.createdAt ?? index}`,
        threadId: record.threadId ?? null,
        role,
        content,
        createdAt: record.timestamp ?? record.createdAt ?? null,
        sources: record.sources ?? [],
      };
    })
    .filter(isPresent)
    .sort(
      (left, right) =>
        createdAtTime(left.createdAt) - createdAtTime(right.createdAt),
    );
}

export function createChatThreadId(bookId: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${bookId}-thread-${randomId}`;
}

function titleFromMessage(content: string) {
  const title = content.trim().replace(/\s+/g, " ");

  if (!title) {
    return "New chat";
  }

  if (title.length <= 54) {
    return title;
  }

  return `${title.slice(0, 54).trim()}...`;
}

function threadTimestamp(messages: ChatMessageView[], mode: "first" | "last") {
  const message = mode === "first" ? messages[0] : messages[messages.length - 1];

  return message?.createdAt ?? null;
}

function createThreadFromMessages(
  id: string,
  messages: ChatMessageView[],
): ChatThreadView {
  const firstUserMessage =
    messages.find((message) => message.role === "user") ?? messages[0];

  return {
    id,
    title: titleFromMessage(firstUserMessage?.content ?? ""),
    createdAt: threadTimestamp(messages, "first"),
    updatedAt: threadTimestamp(messages, "last"),
    messages,
  };
}

export function createChatThreads(
  bookId: string,
  messages: ChatMessageView[],
) {
  const orderedMessages = [...messages].sort(
    (left, right) => createdAtTime(left.createdAt) - createdAtTime(right.createdAt),
  );
  const threadMap = new Map<string, ChatMessageView[]>();
  const legacyThreads: ChatThreadView[] = [];
  let activeLegacyMessages: ChatMessageView[] = [];
  let activeLegacyThreadId = "";

  function flushLegacyThread() {
    if (!activeLegacyMessages.length) {
      return;
    }

    legacyThreads.push(
      createThreadFromMessages(activeLegacyThreadId, activeLegacyMessages),
    );
    activeLegacyMessages = [];
    activeLegacyThreadId = "";
  }

  orderedMessages.forEach((message, index) => {
    const threadId = message.threadId?.trim();

    if (threadId) {
      flushLegacyThread();
      const messagesForThread = threadMap.get(threadId) ?? [];
      messagesForThread.push(message);
      threadMap.set(threadId, messagesForThread);
      return;
    }

    if (message.role === "user" || !activeLegacyMessages.length) {
      flushLegacyThread();
      activeLegacyThreadId = `${bookId}-legacy-thread-${message.id || index}`;
    }

    activeLegacyMessages.push(message);
  });

  flushLegacyThread();

  const persistedThreads = Array.from(threadMap.entries()).map(
    ([threadId, threadMessages]) =>
      createThreadFromMessages(threadId, threadMessages),
  );

  return [...persistedThreads, ...legacyThreads].sort(
    (left, right) =>
      createdAtTime(right.updatedAt) - createdAtTime(left.updatedAt),
  );
}

export function createChatThread(
  threadId: string,
  messages: ChatMessageView[],
) {
  return createThreadFromMessages(threadId, messages);
}

export function createUserChatMessage(
  bookId: string,
  query: string,
  threadId: string,
) {
  const createdAt = new Date().toISOString();

  return {
    id: `${bookId}-chat-user-${createdAt}`,
    threadId,
    role: "user",
    content: query,
    createdAt,
  } satisfies ChatMessageView;
}

export function createAssistantChatMessage(
  bookId: string,
  payload: ChatGenerationResponse,
  threadId: string,
) {
  const createdAt = new Date().toISOString();

  return {
    id: `${bookId}-chat-assistant-${createdAt}`,
    threadId: payload.threadId?.trim() || threadId,
    role: "assistant",
    content: payload.answer?.trim() || "No answer was returned.",
    createdAt,
    sources: payload.sources ?? [],
  } satisfies ChatMessageView;
}

export function createGeneratedFlashcardViews(
  bookId: string,
  payload: FlashcardGenerationResponse,
) {
  const generatedAt = Date.now();

  return (payload.flashcards ?? [])
    .map((card, index): FlashcardView | null => {
      const question = card.question?.trim();
      const answer = card.answer?.trim();

      if (!question || !answer || isWeakFlashcardQuestion(question)) {
        return null;
      }

      return {
        id: `${bookId}-flashcard-${generatedAt}-${index}`,
        question,
        answer,
        createdAt: new Date(generatedAt + index).toISOString(),
      };
    })
    .filter(isPresent);
}

export function normalizeFlashcardCount(count: number) {
  if (!Number.isFinite(count)) {
    return 1;
  }

  return Math.min(50, Math.max(1, Math.round(count)));
}
