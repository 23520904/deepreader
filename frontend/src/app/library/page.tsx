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

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m20 20-4.1-4.1m1.6-5.15a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function UploadIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 15.5V4.75m0 0 4.35 4.35M12 4.75 7.65 9.1M5 15.75v2A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75v-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-9 w-9" viewBox="0 0 24 24">
      <path
        d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function FileGlyph({ format }: { format: LibraryDocument["format"] }) {
  if (format !== "EPUB") {
    return (
      <Image
        src="/assets/images/library/pdf-icon.png"
        alt="PDF file"
        width={78}
        height={78}
        className="h-[78px] w-[78px] object-contain drop-shadow-[0_8px_10px_rgba(23,33,58,0.20)]"
      />
    );
  }

  return (
    <div className="relative grid h-[78px] w-[64px] place-items-end rounded-[14px] bg-white pb-3 shadow-[0_8px_12px_rgba(23,33,58,0.20)]">
      <div className="absolute right-0 top-0 h-0 w-0 border-l-[18px] border-t-[18px] border-l-[#cfd4df] border-t-[#eef1f8]" />
      <span className="rounded-[4px] bg-[#5ca737] px-2 py-1 text-[16px] font-black text-white">
        EPUB
      </span>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.75 12s3.35-6 9.25-6 9.25 6 9.25 6-3.35 6-9.25 6-9.25-6-9.25-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <Image
      src="/assets/images/library/trash-icon.png"
      alt=""
      width={28}
      height={28}
      className="h-7 w-7 object-contain"
    />
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m15 19-7-7 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function BannerIllustration() {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[420px] overflow-hidden rounded-[18px]">
      <Image
        src="/assets/images/library/upload-banner.png"
        alt="Cloud upload illustration"
        fill
        priority
        sizes="(min-width: 768px) 420px, calc(100vw - 42px)"
        className="object-cover"
      />
    </div>
  );
}

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

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function statusBadgeClass(status: LibraryDocument["status"]) {
  if (status === "Ready") {
    return "bg-[#d9f8df] text-[#2e9b55]";
  }

  if (status === "Failed") {
    return "bg-[#ff5c6a] text-[#b92838]";
  }

  return "bg-[#fff0bd] text-[#ba8200]";
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

      <section className="bg-[#e7eaf3]">
        <div className="mx-auto grid min-h-[420px] w-[min(1000px,calc(100%_-_42px))] items-center gap-10 py-12 md:grid-cols-[1fr_380px] lg:min-h-[450px]">
          <div>
            <h1 className="max-w-[460px] text-[clamp(34px,4.6vw,45px)] font-black leading-[1.2] tracking-[0] text-black">
              Upload A New Book To Your Library
            </h1>
            <p className="mt-7 max-w-[470px] text-[17px] font-medium leading-6 text-[#989ca8]">
              Add PDF or EPUB documents to start reading, summarizing, creating
              flashcards, and chatting with your content using AI
            </p>

            <div className="mt-7 flex flex-wrap gap-8">
              <button
                type="button"
                onClick={openUploadModal}
                className="h-[52px] min-w-[150px] cursor-pointer rounded-[6px] bg-[#235895] px-8 text-[14px] font-black text-white shadow-[0_8px_14px_rgba(35,88,149,0.18)] transition hover:bg-[#1d4d86]"
              >
                Upload
              </button>
              <button
                type="button"
                onClick={scrollToLibrary}
                className="h-[52px] min-w-[150px] cursor-pointer rounded-[6px] bg-white px-8 text-[14px] font-black text-[#245895] shadow-[0_8px_14px_rgba(31,44,70,0.08)] transition hover:bg-[#f8fbff]"
              >
                View Library
              </button>
            </div>
          </div>

          <BannerIllustration />
        </div>
      </section>

      <section
        ref={librarySectionRef}
        className="min-h-[900px] bg-white pb-24 pt-12"
      >
        <div className="mx-auto w-[min(1000px,calc(100%_-_42px))]">
          <h2 className="text-[30px] font-black tracking-[0] text-black">
            Your Library Collection
          </h2>

          <div className="mt-12 rounded-[16px] bg-[#245895] p-7 shadow-[0_12px_26px_rgba(36,88,149,0.18)]">
            <div className="grid gap-8 lg:grid-cols-[1fr_180px_180px]">
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/65">
                  <SearchIcon />
                </span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search books, authors, formats..."
                  className="h-[46px] w-full rounded-[999px] border-2 border-white/80 bg-white/5 pl-12 pr-4 text-[14px] font-bold text-white outline-none placeholder:text-white/55"
                />
              </label>

              <select
                value={formatFilter}
                onChange={(event) => {
                  setFormatFilter(event.target.value as FormatFilter);
                  setCurrentPage(1);
                }}
                className="h-[46px] rounded-[6px] border border-[#d8dee9] bg-white px-4 text-[14px] font-black text-[#17213a] outline-none"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF</option>
                <option value="epub">EPUB</option>
                <option value="unknown">Unknown</option>
              </select>

              <select
                value={sortMode}
                onChange={(event) => {
                  setSortMode(event.target.value as SortMode);
                  setCurrentPage(1);
                }}
                className="h-[46px] rounded-[6px] border border-[#d8dee9] bg-white px-4 text-[14px] font-black text-[#17213a] outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>

          {session && loadError ? (
            <div className="mt-10 rounded-[8px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[15px] font-bold text-[#b42335]">
              {loadError}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-20 grid gap-x-[58px] gap-y-[42px] md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[310px] rounded-[16px] bg-white shadow-[0_4px_16px_rgba(21,24,34,0.16)]"
                >
                  <div className="h-[154px] rounded-t-[16px] bg-[#e5e8f1]" />
                  <div className="space-y-4 p-5">
                    <div className="h-4 rounded bg-[#eef1f6]" />
                    <div className="h-4 w-4/5 rounded bg-[#eef1f6]" />
                    <div className="h-10 rounded bg-[#eef1f6]" />
                  </div>
                </div>
              ))}
            </div>
          ) : pagedDocuments.length ? (
            <div className="mt-20 grid gap-x-[58px] gap-y-[42px] md:grid-cols-2 lg:grid-cols-3">
              {pagedDocuments.map((document) => (
                <article
                  key={`${document.source}-${document.id}`}
                  className="overflow-hidden rounded-[16px] bg-white shadow-[0_4px_16px_rgba(21,24,34,0.18)]"
                >
                  <div className="relative flex h-[154px] flex-col justify-end rounded-b-[14px] bg-[#e5e8f1] p-5">
                    <div className="absolute left-4 top-4 rounded-[999px] bg-white px-6 py-2 text-[14px] font-black text-[#245895]">
                      {document.format}
                    </div>
                    <div
                      className={`absolute right-3 top-4 rounded-[999px] px-6 py-2 text-[14px] font-black ${statusBadgeClass(
                        document.status,
                      )}`}
                    >
                      {document.status}
                    </div>
                    <h3 className="line-clamp-2 text-[24px] font-black leading-tight text-[#245895]">
                      {document.title}
                    </h3>
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between border-b border-black/60 pb-3 text-[15px] font-semibold text-[#222]">
                      <span>Chapters</span>
                      <span className="font-black">{document.chapters ?? 9}</span>
                    </div>
                    <div className="flex justify-between pt-4 text-[15px] font-semibold text-[#222]">
                      <span>Format</span>
                      <span className="font-black">{document.format}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-5">
                      <button
                        type="button"
                        className="h-[45px] cursor-pointer rounded-[5px] bg-[#235895] text-[14px] font-black text-white transition hover:bg-[#1d4d86]"
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        className="h-[45px] cursor-pointer rounded-[5px] bg-white text-[14px] font-black text-[#245895] shadow-[0_3px_10px_rgba(21,24,34,0.20)] transition hover:bg-[#f6f8fc]"
                        title={`${document.ownerName} - ${document.source}`}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-20 rounded-[16px] border border-dashed border-[#cbd3e2] bg-[#f9fbff] px-8 py-14 text-center">
              <h3 className="text-[24px] font-black text-black">
                No documents found
              </h3>
              <p className="mx-auto mt-3 max-w-[430px] text-[16px] font-medium text-[#8d929e]">
                {session
                  ? "Upload a PDF or EPUB to start building your library."
                  : "Login to load your library collection."}
              </p>
              <button
                type="button"
                onClick={session ? openUploadModal : () => router.push("/login")}
                className="mt-7 h-[48px] min-w-[150px] cursor-pointer rounded-[6px] bg-[#245895] px-7 text-[14px] font-black text-white transition hover:bg-[#1d4d86]"
              >
                {session ? "Upload" : "Login"}
              </button>
            </div>
          )}

          {shouldShowPagination ? (
            <div className="mt-14 flex items-center justify-center gap-3 text-[16px] font-black">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={safeCurrentPage === 1}
                className="flex cursor-pointer items-center gap-1 rounded-[5px] px-2 py-2 text-[#111827] transition hover:text-[#245895] disabled:cursor-not-allowed disabled:text-[#b5bbc6]"
              >
                <ChevronLeftIcon />
                Prev
              </button>

              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="grid h-12 w-12 place-items-center rounded-[7px] bg-[#eef1f6] text-[#7f8794]"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`grid h-12 w-12 cursor-pointer place-items-center rounded-[7px] transition ${
                      item === safeCurrentPage
                        ? "bg-[#245895] text-white"
                        : "bg-[#eef1f6] text-[#7f8794] hover:bg-[#e1e7f1]"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage === totalPages}
                className="flex cursor-pointer items-center gap-1 rounded-[5px] px-2 py-2 text-[#111827] transition hover:text-[#245895] disabled:cursor-not-allowed disabled:text-[#b5bbc6]"
              >
                Next
                <ChevronRightIcon />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {isUploadModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#121826]/45 px-4 py-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-[min(960px,100%)] overflow-y-auto rounded-[10px] bg-white shadow-[0_26px_80px_rgba(18,24,38,0.32)]">
            <div className="flex items-start justify-between gap-6 px-8 py-7">
              <div>
                <h2 className="text-[26px] font-black tracking-[0] text-black">
                  Add new documents to the Library
                </h2>
                <p className="mt-3 text-[16px] font-medium text-[#8e929d]">
                  Choose PDF or EPUB file format and provider if needed.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadModal}
                className="cursor-pointer text-black transition hover:scale-105"
                aria-label="Close upload dialog"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="border-t border-[#d8dbe3]" />

            <div className="px-8 py-7">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`grid min-h-[250px] cursor-pointer place-items-center rounded-[14px] border-2 border-dashed px-6 text-center transition ${
                  isDragging
                    ? "border-[#245895] bg-[#f3f7ff]"
                    : "border-[#7f838d] bg-white"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.epub,application/pdf,application/epub+zip"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                <div>
                  <div className="relative mx-auto h-[86px] w-[86px]">
                    <div className="absolute left-1 top-0 h-[74px] w-[58px] rounded-[7px] bg-[#989ba3]">
                      <div className="absolute right-0 top-0 h-0 w-0 border-l-[24px] border-t-[24px] border-l-[#787b82] border-t-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 grid h-[52px] w-[52px] place-items-center rounded-full bg-[#245895] text-white">
                      <UploadIcon className="h-8 w-8" />
                    </div>
                  </div>
                  <p className="mt-6 text-[18px] font-medium text-black">
                    Drag and Drop file here or{" "}
                    <span className="border-b-2 border-[#245895] font-black text-[#245895]">
                      Choose file
                    </span>
                  </p>
                </div>
              </label>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
                <p className="text-[16px] font-medium text-[#8f939e]">
                  Supported formats: PDF and EPUB
                </p>

                <label className="flex items-center gap-3 text-[15px] font-black text-[#17213a]">
                  Provider
                  <select
                    value={provider}
                    onChange={(event) => setProvider(event.target.value)}
                    className="h-10 rounded-[6px] border border-[#d7dbe5] bg-white px-4 text-[15px] font-black outline-none"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </label>
              </div>

              {uploadMessage ? (
                <div className="mt-5 rounded-[8px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-3 text-[14px] font-bold text-[#b42335]">
                  {uploadMessage}
                </div>
              ) : null}

              <div className="mt-7 rounded-[14px] bg-[#e8eaf3] px-7 py-6">
                {stagedFile ? (
                  <div className="flex flex-wrap items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <FileGlyph
                        format={
                          stagedFile.name.toLowerCase().endsWith(".epub")
                            ? "EPUB"
                            : "PDF"
                        }
                      />
                      <div>
                        <p className="text-[18px] font-black text-black">
                          {stagedFile.name}
                        </p>
                        <p className="mt-2 text-[16px] font-medium text-[#8d929c]">
                          {formatFileSize(stagedFile.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-5">
                      <button
                        type="button"
                        onClick={previewFile}
                        className="grid h-[56px] w-[56px] cursor-pointer place-items-center rounded-full bg-white text-black shadow-[0_6px_10px_rgba(20,24,34,0.22)] transition hover:scale-105"
                        aria-label="Preview selected file"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStagedFile(null)}
                        className="grid h-[56px] w-[56px] cursor-pointer place-items-center rounded-full bg-white text-black shadow-[0_6px_10px_rgba(20,24,34,0.22)] transition hover:scale-105"
                        aria-label="Remove selected file"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[18px] font-medium text-[#8d929c]">
                    No file selected
                  </p>
                )}
              </div>

              <div className="mt-7 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#e6e8f1] px-7 text-[15px] font-black text-black transition hover:bg-[#dfe2eb]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUpload}
                  disabled={isUploadBlocked}
                  className="h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#245895] px-7 text-[15px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8ca5c7]"
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
