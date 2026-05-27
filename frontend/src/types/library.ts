export type BackendBook = {
  id?: string | null;
  userId?: string | null;
  aiDocumentId?: string | null;
  title?: string | null;
  status?: string | null;
  totalChapters?: number | null;
  format?: string | null;
  provider?: string | null;
  createdAt?: string | null;
};

export type BookUploadResponse = {
  book?: BackendBook | null;
  provider?: string | null;
  aiDocumentId?: string | null;
  chunkCount?: number | null;
};

export type DocumentSource = "mine";
export type FormatFilter = "all" | "pdf" | "epub" | "unknown";
export type SortMode = "newest" | "oldest" | "title";

export type LibraryDocument = {
  id: string;
  title: string;
  format: "PDF" | "EPUB" | "UNKNOWN";
  status: "Ready" | "Processing" | "Failed";
  chapters: number | null;
  provider: string | null;
  source: DocumentSource;
  ownerName: string;
  createdAt: string | null;
};

export type UploadProgressSnapshot = {
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  estimatedSecondsRemaining: number | null;
};
