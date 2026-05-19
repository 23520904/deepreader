"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DeleteConfirmDialog } from "@/components/library/DeleteConfirmDialog";
import { LibraryContent } from "@/components/library/LibraryContent";
import { LibraryHero } from "@/components/library/LibraryHero";
import { UploadModal } from "@/components/library/UploadModal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getAuthSessionSnapshot, subscribeAuthSession } from "@/lib/authSession";
import { formatUploadEta, mapBackendBook } from "@/lib/library";
import {
  deleteLibraryBook,
  fetchLibraryBooks,
  uploadLibraryBook,
} from "@/services/libraryService";
import type { FormatFilter, LibraryDocument, SortMode } from "@/types/library";

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
        const books = await fetchLibraryBooks(activeToken);

        if (!ignore) {
          setUserDocuments(
            books.map((book) => mapBackendBook(book, "mine", activeDisplayName)),
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
      const payload = await uploadLibraryBook({
        token: session.token,
        formData,
        onProgress: (snapshot) => {
          uploadTargetProgressRef.current = Math.max(
            uploadTargetProgressRef.current,
            snapshot.progress,
          );
          setUploadEtaLabel(formatUploadEta(snapshot.estimatedSecondsRemaining));
        },
      });

      if (payload.book) {
        const nextUserDocument = mapBackendBook(payload.book, "mine", displayName);
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
      await deleteLibraryBook(session.token, document.id);
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
        uploadMessage={uploadMessage}
        fileInputRef={fileInputRef}
        onClose={closeUploadModal}
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
