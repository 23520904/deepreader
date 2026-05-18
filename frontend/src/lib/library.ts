import type { BackendBook, DocumentSource, LibraryDocument } from "@/types/library";

export function formatUploadEta(seconds: number | null) {
  if (seconds === null) {
    return "Estimated upload time: calculating...";
  }

  if (seconds <= 0) {
    return "Upload sent. Processing document...";
  }

  if (seconds < 1) {
    return "Estimated upload time: less than 1 sec";
  }

  if (seconds < 60) {
    return `Estimated upload time: about ${Math.ceil(seconds)} sec`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);

  return `Estimated upload time: about ${minutes} min ${remainingSeconds} sec`;
}

export function cleanLibraryTitle(title: string | null | undefined) {
  const fallback = title?.trim() || "Untitled document";
  return fallback.replace(/\.(pdf|epub)$/i, "");
}

export function resolveLibraryFormat(book: BackendBook) {
  const value = book.format?.trim().toUpperCase();

  if (value === "PDF" || value === "EPUB") {
    return value;
  }

  const title = book.title?.toLowerCase() ?? "";

  if (title.endsWith(".pdf")) {
    return "PDF";
  }

  if (title.endsWith(".epub")) {
    return "EPUB";
  }

  return "UNKNOWN";
}

export function normalizeLibraryStatus(status: string | null | undefined) {
  const value = status?.trim().toUpperCase();

  if (value === "FAILED" || value === "ERROR") {
    return "Failed";
  }

  if (value === "PROCESSING" || value === "PENDING" || value === "QUEUED") {
    return "Processing";
  }

  return "Ready";
}

export function mapBackendBook(
  book: BackendBook,
  source: DocumentSource,
  ownerName: string,
): LibraryDocument {
  const title = cleanLibraryTitle(book.title);

  return {
    id:
      book.id ??
      book.aiDocumentId ??
      `${source}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    format: resolveLibraryFormat(book),
    status: normalizeLibraryStatus(book.status),
    chapters: book.totalChapters ?? null,
    source,
    ownerName,
    createdAt: book.createdAt ?? null,
  };
}
