"use client";

import Image from "next/image";
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

type UploadProgressSnapshot = {
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  estimatedSecondsRemaining: number | null;
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

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8083";

  return `${apiBaseUrl}${path}`;
}

function parseUploadResponse(xhr: XMLHttpRequest) {
  if (!xhr.responseText) {
    return null;
  }

  try {
    return JSON.parse(xhr.responseText) as unknown;
  } catch {
    return xhr.responseText;
  }
}

function parseUploadError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return unwrapErrorMessage(payload);
  }

  if (payload && typeof payload === "object") {
    const errorPayload = payload as { error?: unknown; message?: unknown };
    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : typeof errorPayload.message === "string"
          ? errorPayload.message
          : fallback;

    return unwrapErrorMessage(message);
  }

  return fallback;
}

function requestUploadWithProgress<T>(
  url: string,
  token: string,
  formData: FormData,
  fallbackError: string,
  onProgress: (snapshot: UploadProgressSnapshot) => void,
) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startedAt = performance.now();

    function emitProgress(loadedBytes: number, totalBytes: number) {
      const progress =
        totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
      const elapsedSeconds = Math.max(
        0.001,
        (performance.now() - startedAt) / 1000,
      );
      const bytesPerSecond = loadedBytes / elapsedSeconds;
      const remainingBytes = Math.max(0, totalBytes - loadedBytes);
      const estimatedSecondsRemaining =
        bytesPerSecond > 0 && remainingBytes > 0
          ? remainingBytes / bytesPerSecond
          : remainingBytes === 0
            ? 0
            : null;

      onProgress({
        progress,
        loadedBytes,
        totalBytes,
        estimatedSecondsRemaining,
      });
    }

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      emitProgress(event.loaded, event.total);
    };

    xhr.upload.onload = () => {
      const file = formData.get("file");
      const totalBytes = file instanceof File ? file.size : 0;
      emitProgress(totalBytes, totalBytes);
    };
    xhr.onload = () => {
      const payload = parseUploadResponse(xhr);

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseUploadError(payload, fallbackError)));
        return;
      }

      const file = formData.get("file");
      const totalBytes = file instanceof File ? file.size : 0;
      emitProgress(totalBytes, totalBytes);
      resolve(payload as T);
    };

    xhr.onerror = () => reject(new Error(fallbackError));
    xhr.onabort = () => reject(new Error("Upload canceled."));
    xhr.send(formData);
  });
}

function formatEta(seconds: number | null) {
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

function DeleteConfirmDialog({
  documentTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  documentTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!documentTitle) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121826]/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-document-title"
    >
      <div className="w-[min(460px,100%)] rounded-[12px] bg-white p-7 shadow-[0_26px_70px_rgba(18,24,38,0.32)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0f1] text-[#d92d3b]">
          <Image
            src="/assets/images/library/trash-icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
        </div>

        <h2
          id="delete-document-title"
          className="mt-5 text-center text-[24px] font-black text-[#121826]"
        >
          Delete this document?
        </h2>

        <p className="mt-3 text-center text-[15px] font-semibold leading-7 text-[#7b8496]">
          This will remove{" "}
          <span className="font-black text-[#121826]">
            &quot;{documentTitle}&quot;
          </span>{" "}
          from your library.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-12 cursor-pointer rounded-[7px] bg-[#e8ebf4] text-[15px] font-black text-[#121826] transition hover:bg-[#dfe4ef] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-12 cursor-pointer rounded-[7px] bg-[#d92d3b] text-[15px] font-black text-white shadow-[0_8px_18px_rgba(217,45,59,0.26)] transition hover:bg-[#bd2432] disabled:cursor-not-allowed disabled:bg-[#e6a0a7] disabled:shadow-none"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const librarySectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetProgressRef = useRef(0);

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadEtaLabel, setUploadEtaLabel] = useState("");
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [documentPendingDelete, setDocumentPendingDelete] =
    useState<LibraryDocument | null>(null);

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

  useEffect(() => {
    if (!isUploading && !isUploadComplete) {
      return;
    }

    const timer = window.setInterval(() => {
      setUploadProgress((currentProgress) => {
        const targetProgress = uploadTargetProgressRef.current;

        if (currentProgress >= targetProgress) {
          return currentProgress;
        }

        const step = Math.max(1, Math.ceil((targetProgress - currentProgress) / 10));
        return Math.min(targetProgress, currentProgress + step);
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [isUploadComplete, isUploading]);

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
    setUploadProgress(0);
    uploadTargetProgressRef.current = 0;
    setUploadEtaLabel("");
    setIsUploadComplete(false);

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
    setUploadProgress(0);
    uploadTargetProgressRef.current = 0;
    setUploadEtaLabel("");
    setIsUploadComplete(false);
  }

  function scrollToLibrary() {
    librarySectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function stageFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    setUploadProgress(0);
    uploadTargetProgressRef.current = 0;
    setUploadEtaLabel("");
    setIsUploadComplete(false);

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

  function removeFile() {
    if (isUploading) {
      return;
    }

    setStagedFile(null);
    setUploadMessage("");
    setUploadProgress(0);
    uploadTargetProgressRef.current = 0;
    setUploadEtaLabel("");
    setIsUploadComplete(false);
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
    setIsUploadComplete(false);
    uploadTargetProgressRef.current = 1;
    setUploadProgress(1);
    setUploadEtaLabel("Estimated upload time: calculating...");
    setUploadMessage("");

    try {
      const payload = await requestUploadWithProgress<BookUploadResponse>(
        resolveApiUrl(
          `/api/v1/books/upload?provider=${encodeURIComponent(provider)}`,
        ),
        session.token,
        formData,
        "Upload failed.",
        (snapshot) => {
          uploadTargetProgressRef.current = Math.max(
            uploadTargetProgressRef.current,
            snapshot.progress,
          );
          setUploadEtaLabel(formatEta(snapshot.estimatedSecondsRemaining));
        },
      );

      if (payload.book) {
        const nextUserDocument = mapBook(payload.book, "mine", displayName);
        setUserDocuments((documents) => [nextUserDocument, ...documents]);
        setCurrentPage(1);
      }

      setUploadMessage("Upload completed successfully.");
      uploadTargetProgressRef.current = 100;
      setUploadProgress(100);
      setUploadEtaLabel("Upload completed successfully.");
      setIsUploadComplete(true);
      setStagedFile(null);
    } catch (error) {
      uploadTargetProgressRef.current = 0;
      setUploadProgress(0);
      setUploadEtaLabel("");
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function readDocument(document: LibraryDocument) {
    if (document.status !== "Ready") {
      return;
    }

    router.push(`/library/${encodeURIComponent(document.id)}/read`);
  }

  function requestDeleteDocument(document: LibraryDocument) {
    if (deletingDocumentId) {
      return;
    }

    setDocumentPendingDelete(document);
  }

  function closeDeleteDialog() {
    if (deletingDocumentId) {
      return;
    }

    setDocumentPendingDelete(null);
  }

  async function confirmDeleteDocument() {
    if (!session || !documentPendingDelete || deletingDocumentId) {
      return;
    }

    const document = documentPendingDelete;
    setDeletingDocumentId(document.id);
    setLoadError("");

    try {
      await requestJson<unknown>(
        `/api/v1/books/${encodeURIComponent(document.id)}`,
        session.token,
        "Could not delete this document.",
        { method: "DELETE" },
      );
      setUserDocuments((documents) =>
        documents.filter((item) => item.id !== document.id),
      );
      setDocumentPendingDelete(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not delete this document.",
      );
    } finally {
      setDeletingDocumentId("");
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
        deletingDocumentId={deletingDocumentId}
        onReadDocument={readDocument}
        onDeleteDocument={requestDeleteDocument}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        isUploading={isUploading}
        isUploadBlocked={isUploadBlocked}
        isUploadComplete={isUploadComplete}
        uploadProgress={uploadProgress}
        uploadEtaLabel={uploadEtaLabel}
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
        onRemoveFile={removeFile}
        onSubmit={submitUpload}
      />

      <DeleteConfirmDialog
        documentTitle={documentPendingDelete?.title ?? ""}
        isDeleting={Boolean(deletingDocumentId)}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteDocument}
      />
    </main>
  );
}
