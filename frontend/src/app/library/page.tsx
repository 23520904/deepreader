"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { LibraryContent } from "@/components/library/LibraryContent";
import { LibraryHero } from "@/components/library/LibraryHero";
import { UploadModal } from "@/components/library/UploadModal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getAuthSessionSnapshot, subscribeAuthSession } from "@/lib/auth";

type BackendBook = {
  id?: string | null;
  userId?: string | null;
  aiDocumentId?: string | null;
  title?: string | null;
  status?: string | null;
  totalChapters?: number | null;
  format?: string | null;
  createdAt?: string | null;
};

type BookUploadResponse = {
  book?: BackendBook | null;
  provider?: string | null;
  aiDocumentId?: string | null;
  chunkCount?: number | null;
};

type DocumentSource = "mine";
type FormatFilter = "all" | "pdf" | "epub" | "unknown";
type SortMode = "newest" | "oldest" | "title";

type LibraryDocument = {
  id: string;
  title: string;
  format: "PDF" | "EPUB" | "UNKNOWN";
  status: "Ready" | "Processing" | "Failed";
  chapters: number | null;
  source: DocumentSource;
  ownerName: string;
  createdAt: string | null;
};

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string;
    };

    return unwrapErrorMessage(payload.error ?? payload.message ?? fallback);
  } catch {
    return fallback;
  }
}

function unwrapErrorMessage(value: string) {
  let message = value;

  for (let index = 0; index < 3; index += 1) {
    const trimmed = message.trim();

    if (!trimmed.startsWith("{")) {
      break;
    }

    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      message = parsed.error ?? parsed.message ?? message;
    } catch {
      break;
    }
  }

  return message;
}

async function requestJson<T>(
  url: string,
  token: string,
  fallbackError: string,
  options?: RequestInit,
) {
  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackError));
  }

  return (await response.json()) as T;
}

function cleanTitle(title: string | null | undefined) {
  const fallback = title?.trim() || "Untitled document";
  return fallback.replace(/\.(pdf|epub)$/i, "");
}

function resolveFormat(book: BackendBook) {
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

function normalizeStatus(status: string | null | undefined) {
  const value = status?.trim().toUpperCase();

  if (value === "FAILED" || value === "ERROR") {
    return "Failed";
  }

  if (value === "PROCESSING" || value === "PENDING" || value === "QUEUED") {
    return "Processing";
  }

  return "Ready";
}

function mapBook(
  book: BackendBook,
  source: DocumentSource,
  ownerName: string,
): LibraryDocument {
  const title = cleanTitle(book.title);

  return {
    id:
      book.id ??
      book.aiDocumentId ??
      `${source}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    format: resolveFormat(book),
    status: normalizeStatus(book.status),
    chapters: book.totalChapters ?? null,
    source,
    ownerName,
    createdAt: book.createdAt ?? null,
  };
}

export default function LibraryPage() {
  const router = useRouter();
  const librarySectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  const [userDocuments, setUserDocuments] = useState<LibraryDocument[]>([]);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [provider, setProvider] = useState("gemini");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayName = session?.username || session?.email || "You";

  useEffect(() => {
    const activeSession = session;

    if (!activeSession) {
      return;
    }

    const activeDisplayName = displayName;
    const activeToken = activeSession.token;
    let ignore = false;

    async function loadLibrary() {
      setIsLoading(true);
      setLoadError("");

      try {
        const books = await requestJson<BackendBook[]>(
          "/api/v1/books",
          activeToken,
          "Could not load your library.",
        );

        if (!ignore) {
          setUserDocuments(
            books.map((book) => mapBook(book, "mine", activeDisplayName)),
          );
        }
      } catch (error) {
        if (!ignore) {
          setUserDocuments([]);
          setLoadError(
            error instanceof Error ? error.message : "Could not load library.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadLibrary();

    return () => {
      ignore = true;
    };
  }, [displayName, session]);

  const allDocuments = useMemo(() => {
    if (!session) {
      return [];
    }

    return userDocuments;
  }, [session, userDocuments]);

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allDocuments
      .filter((document) => {
        const matchesQuery =
          !normalizedQuery ||
          document.title.toLowerCase().includes(normalizedQuery) ||
          document.ownerName.toLowerCase().includes(normalizedQuery) ||
          document.format.toLowerCase().includes(normalizedQuery);

        const matchesFormat =
          formatFilter === "all" ||
          document.format.toLowerCase() === formatFilter;

        return matchesQuery && matchesFormat;
      })
      .sort((left, right) => {
        if (sortMode === "title") {
          return left.title.localeCompare(right.title);
        }

        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;

        return sortMode === "oldest"
          ? leftTime - rightTime
          : rightTime - leftTime;
      });
  }, [allDocuments, formatFilter, query, sortMode]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / pageSize));
  const shouldShowPagination = visibleDocuments.length > pageSize;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedDocuments = visibleDocuments.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  const paginationItems = useMemo<Array<number | "ellipsis">>(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (safeCurrentPage <= 2 || safeCurrentPage >= totalPages - 1) {
      return [1, 2, "ellipsis", totalPages - 1, totalPages];
    }

    return [1, "ellipsis", safeCurrentPage, "ellipsis", totalPages];
  }, [safeCurrentPage, totalPages]);

  const isUploadBlocked = isUploading || !stagedFile;

  function openUploadModal() {
    setUploadMessage("");

    if (!session) {
      router.push("/login");
      return;
    }

    setIsUploadModalOpen(true);
  }

  function closeUploadModal() {
    if (isUploading) {
      return;
    }

    setIsUploadModalOpen(false);
    setIsDragging(false);
    setStagedFile(null);
    setUploadMessage("");
  }

  function scrollToLibrary() {
    librarySectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function stageFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "pdf" && extension !== "epub") {
      setUploadMessage("Only PDF and EPUB files are supported.");
      return;
    }

    setStagedFile(file);
    setUploadMessage("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    stageFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    stageFile(event.dataTransfer.files?.[0]);
  }

  function previewFile() {
    if (!stagedFile) {
      return;
    }

    const fileUrl = URL.createObjectURL(stagedFile);
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
  }

  async function submitUpload() {
    if (!stagedFile || !session) {
      return;
    }

    const formData = new FormData();
    formData.append("file", stagedFile);
    setIsUploading(true);
    setUploadMessage("");

    try {
      const payload = await requestJson<BookUploadResponse>(
        `/api/v1/books/upload?provider=${encodeURIComponent(provider)}`,
        session.token,
        "Upload failed.",
        {
          method: "POST",
          body: formData,
        },
      );

      if (payload.book) {
        const nextUserDocument = mapBook(payload.book, "mine", displayName);
        setUserDocuments((documents) => [nextUserDocument, ...documents]);
        setCurrentPage(1);
      }

      setUploadMessage(
        `Uploaded ${stagedFile.name} with ${
          provider === "gemini" ? "Gemini" : "OpenAI"
        }.`,
      );
      setStagedFile(null);
      setIsUploadModalOpen(false);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#121826]">
      <SiteNavbar activeItem="Library" />

      <LibraryHero
        onUploadClick={openUploadModal}
        onViewLibraryClick={scrollToLibrary}
      />

      <LibraryContent
        ref={librarySectionRef}
        session={session}
        loadError={loadError}
        isLoading={isLoading}
        query={query}
        formatFilter={formatFilter}
        sortMode={sortMode}
        pagedDocuments={pagedDocuments}
        paginationItems={paginationItems}
        shouldShowPagination={shouldShowPagination}
        safeCurrentPage={safeCurrentPage}
        totalPages={totalPages}
        onQueryChange={(value) => {
          setQuery(value);
          setCurrentPage(1);
        }}
        onFormatFilterChange={(value) => {
          setFormatFilter(value);
          setCurrentPage(1);
        }}
        onSortModeChange={(value) => {
          setSortMode(value);
          setCurrentPage(1);
        }}
        onUploadClick={openUploadModal}
        onLoginClick={() => router.push("/login")}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() =>
          setCurrentPage((page) => Math.min(totalPages, page + 1))
        }
        onPageChange={setCurrentPage}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        isUploading={isUploading}
        isUploadBlocked={isUploadBlocked}
        isDragging={isDragging}
        stagedFile={stagedFile}
        provider={provider}
        uploadMessage={uploadMessage}
        fileInputRef={fileInputRef}
        onClose={closeUploadModal}
        onProviderChange={setProvider}
        onFileChange={handleFileChange}
        onDragOver={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onPreviewFile={previewFile}
        onRemoveFile={() => setStagedFile(null)}
        onSubmit={submitUpload}
      />
    </main>
  );
}