import type {
  DocumentSection,
  FlashcardGenerationResponse,
  FlashcardRecord,
  ReadingPage,
  SummaryRecord,
} from "@/types/reading";
import type { FlashcardView, SummaryView } from "@/types/study";

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

      if (!question && !answer) {
        return null;
      }

      return {
        id:
          record.id ??
          `${record.bookId ?? "flashcard"}-${record.createdAt ?? index}`,
        question: question || "Untitled question",
        answer: answer || "No answer available.",
        createdAt: record.createdAt ?? null,
      };
    })
    .filter(isPresent)
    .sort(
      (left, right) =>
        createdAtTime(right.createdAt) - createdAtTime(left.createdAt),
    );
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

      if (!question && !answer) {
        return null;
      }

      return {
        id: `${bookId}-flashcard-${generatedAt}-${index}`,
        question: question || "Untitled question",
        answer: answer || "No answer available.",
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
