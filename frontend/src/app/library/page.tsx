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

  // UI reference for the main library list section.
  // It is used when the user clicks "View Library" and the page scrolls down.
  const librarySectionRef = useRef<HTMLElement | null>(null);

  // UI reference for the hidden file input inside the upload modal.
  // The visible upload box uses this input to select files.
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stores the real upload progress target.
  // The progress bar in the UI moves smoothly toward this value.
  const uploadTargetProgressRef = useRef(0);

  // Get the current login session.
  // This is used to decide whether the user can see and upload documents.
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  // Data shown in the library document cards.
  const [userDocuments, setUserDocuments] = useState<LibraryDocument[]>([]);

  // UI state for the search input in the library section.
  const [query, setQuery] = useState("");

  // UI state for the document format filter dropdown/buttons.
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");

  // UI state for the sort option in the library section.
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  // UI state for the current pagination page.
  const [currentPage, setCurrentPage] = useState(1);

  // UI loading state for the library document list.
  const [isLoading, setIsLoading] = useState(false);

  // UI loading state for the upload button and upload modal.
  const [isUploading, setIsUploading] = useState(false);

  // Error message shown above or inside the library UI.
  const [loadError, setLoadError] = useState("");

  // Message shown inside the upload modal.
  // Example: upload success, upload failed, or unsupported file type.
  const [uploadMessage, setUploadMessage] = useState("");

  // Progress number shown in the upload modal progress bar.
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estimated upload time text shown under the progress bar.
  const [uploadEtaLabel, setUploadEtaLabel] = useState("");

  // UI state used to show the upload completed status.
  const [isUploadComplete, setIsUploadComplete] = useState(false);

  // UI state that controls whether the upload modal is visible.
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // File selected by the user before clicking upload.
  // This file is shown inside the upload modal.
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  // UI state for drag-and-drop styling in the upload area.
  const [isDragging, setIsDragging] = useState(false);

  // Stores the document id that is currently being deleted.
  // This is used to disable buttons and show delete loading state.
  const [deletingDocumentId, setDeletingDocumentId] = useState("");

  // Stores the document shown in the delete confirm dialog.
  const [documentPendingDelete, setDocumentPendingDelete] =
    useState<LibraryDocument | null>(null);

  // Name shown in the UI as the document owner.
  const displayName = session?.username || session?.email || "You";

  useEffect(() => {
    const activeSession = session;

    // If the user is not logged in, do not load personal library documents.
    if (!activeSession) {
      return;
    }

    const activeDisplayName = displayName;
    const activeToken = activeSession.token;
    let ignore = false;

    async function loadLibrary() {
      // Show loading UI while documents are being fetched.
      setIsLoading(true);
      setLoadError("");

      try {
        // Fetch documents from the backend.
        const books = await fetchLibraryBooks(activeToken);

        if (!ignore) {
          // Convert backend data to the document card format used by the UI.
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
          // Hide loading UI after fetch finishes.
          setIsLoading(false);
        }
      }
    }

    void loadLibrary();

    return () => {
      // Prevent state updates if the component is no longer active.
      ignore = true;
    };
  }, [displayName, session]);

  useEffect(() => {
    // Only run the progress animation while uploading or when upload just finished.
    if (!isUploading && !isUploadComplete) {
      return;
    }

    const timer = window.setInterval(() => {
      setUploadProgress((currentProgress) => {
        const targetProgress = uploadTargetProgressRef.current;

        // If the progress bar already reached the target, keep it unchanged.
        if (currentProgress >= targetProgress) {
          return currentProgress;
        }

        // Move the UI progress bar smoothly instead of jumping suddenly.
        const step = Math.max(1, Math.ceil((targetProgress - currentProgress) / 10));
        return Math.min(targetProgress, currentProgress + step);
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [isUploadComplete, isUploading]);

  const allDocuments = useMemo(() => {
    // If there is no session, the UI should show no personal documents.
    if (!session) {
      return [];
    }

    return userDocuments;
  }, [session, userDocuments]);

  const visibleDocuments = useMemo(() => {
    // Normalize search text so the UI search is not case-sensitive.
    const normalizedQuery = query.trim().toLowerCase();

    return allDocuments
      .filter((document) => {
        // Check if the document should appear based on the search box.
        const matchesQuery =
          !normalizedQuery ||
          document.title.toLowerCase().includes(normalizedQuery) ||
          document.ownerName.toLowerCase().includes(normalizedQuery) ||
          document.format.toLowerCase().includes(normalizedQuery);

        // Check if the document matches the selected format filter.
        const matchesFormat =
          formatFilter === "all" ||
          document.format.toLowerCase() === formatFilter;

        return matchesQuery && matchesFormat;
      })
      .sort((left, right) => {
        // Sort document cards alphabetically by title.
        if (sortMode === "title") {
          return left.title.localeCompare(right.title);
        }

        // Convert dates to numbers so they can be sorted.
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;

        // Sort document cards by oldest or newest.
        return sortMode === "oldest"
          ? leftTime - rightTime
          : rightTime - leftTime;
      });
  }, [allDocuments, formatFilter, query, sortMode]);

  // Number of document cards shown on each page.
  const pageSize = 6;

  // Total number of pagination pages in the UI.
  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / pageSize));

  // Only show pagination controls if there are more than 6 documents.
  const shouldShowPagination = visibleDocuments.length > pageSize;

  // Keep the active pagination page inside the valid range.
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Documents displayed on the current UI page.
  const pagedDocuments = visibleDocuments.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );

  const paginationItems = useMemo<Array<number | "ellipsis">>(() => {
    // If there are only a few pages, show all page numbers.
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    // If the user is near the start or end, show first pages and last pages.
    if (safeCurrentPage <= 2 || safeCurrentPage >= totalPages - 1) {
      return [1, 2, "ellipsis", totalPages - 1, totalPages];
    }

    // If the user is in the middle, show first page, current page, and last page.
    return [1, "ellipsis", safeCurrentPage, "ellipsis", totalPages];
  }, [safeCurrentPage, totalPages]);

  // Disable the upload button when there is no selected file or upload is running.
  const isUploadBlocked = isUploading || !stagedFile;

  function openUploadModal() {
    // Reset upload UI before opening the modal.
    setUploadMessage("");
    setUploadProgress(0);
    uploadTargetProgressRef.current = 0;
    setUploadEtaLabel("");
    setIsUploadComplete(false);

    // If the user is not logged in, send them to the login page.
    if (!session) {
      router.push("/login");
      return;
    }

    // Show the upload modal UI.
    setIsUploadModalOpen(true);
  }

  function closeUploadModal() {
    // Do not let the user close the modal while the upload is running.
    if (isUploading) {
      return;
    }

    // Clear all upload modal UI states.
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
    // Scroll from the hero section to the library document list.
    librarySectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function stageFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    // Reset upload progress UI when the user selects a new file.
    setUploadProgress(0);
    uploadTargetProgressRef.current = 0;
    setUploadEtaLabel("");
    setIsUploadComplete(false);

    // The upload UI only accepts PDF and EPUB files.
    if (extension !== "pdf" && extension !== "epub") {
      setUploadMessage("Only PDF and EPUB files are supported.");
      return;
    }

    // Save the selected file and show it in the upload modal.
    setStagedFile(file);
    setUploadMessage("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    // Get the file selected from the file picker UI.
    stageFile(event.target.files?.[0]);

    // Clear input value so the same file can be selected again.
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    // Prevent the browser from opening the dropped file.
    event.preventDefault();

    // Remove drag highlight from the upload box.
    setIsDragging(false);

    // Use the first file dropped into the upload area.
    stageFile(event.dataTransfer.files?.[0]);
  }

  function removeFile() {
    // Do not allow removing the file while it is uploading.
    if (isUploading) {
      return;
    }

    // Clear the selected file from the upload modal UI.
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

    // Create a temporary URL so the selected file can be previewed.
    const fileUrl = URL.createObjectURL(stagedFile);

    // Open the preview in a new browser tab.
    window.open(fileUrl, "_blank", "noopener,noreferrer");

    // Clean the temporary URL after preview.
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
  }

  async function submitUpload() {
    // Do not upload if there is no file or no user session.
    if (!stagedFile || !session) {
      return;
    }

    const formData = new FormData();
    formData.append("file", stagedFile);

    // Start upload UI state.
    setIsUploading(true);
    setIsUploadComplete(false);
    uploadTargetProgressRef.current = 1;
    setUploadProgress(1);
    setUploadEtaLabel("Estimated upload time: calculating...");
    setUploadMessage("");

    try {
      // Upload the selected file to the backend.
      const payload = await uploadLibraryBook({
        token: session.token,
        formData,
        onProgress: (snapshot) => {
          // Update the progress bar target.
          uploadTargetProgressRef.current = Math.max(
            uploadTargetProgressRef.current,
            snapshot.progress,
          );

          // Update estimated upload time in the modal.
          setUploadEtaLabel(formatUploadEta(snapshot.estimatedSecondsRemaining));
        },
      });

      if (payload.book) {
        // Add the new document card to the top of the library UI.
        const nextUserDocument = mapBackendBook(payload.book, "mine", displayName);
        setUserDocuments((documents) => [nextUserDocument, ...documents]);

        // Return to the first page so the new document is visible.
        setCurrentPage(1);
      }

      // Show upload success UI.
      setUploadMessage("Upload completed successfully.");
      uploadTargetProgressRef.current = 100;
      setUploadProgress(100);
      setUploadEtaLabel("Upload completed successfully.");
      setIsUploadComplete(true);
      setStagedFile(null);
    } catch (error) {
      // Reset upload UI and show error message.
      uploadTargetProgressRef.current = 0;
      setUploadProgress(0);
      setUploadEtaLabel("");
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      // Stop upload loading UI.
      setIsUploading(false);
    }
  }

  function readDocument(document: LibraryDocument) {
    // Only allow opening documents that are ready.
    if (document.status !== "Ready") {
      return;
    }

    // Navigate to the reading page when the user clicks the read button.
    router.push(`/library/${encodeURIComponent(document.id)}/read`);
  }

  function requestDeleteDocument(document: LibraryDocument) {
    // Do not open another delete dialog while one document is being deleted.
    if (deletingDocumentId) {
      return;
    }

    // Show this document inside the delete confirmation dialog.
    setDocumentPendingDelete(document);
  }

  function closeDeleteDialog() {
    // Do not close the dialog while delete request is running.
    if (deletingDocumentId) {
      return;
    }

    // Hide delete confirmation dialog.
    setDocumentPendingDelete(null);
  }

  async function confirmDeleteDocument() {
    // Make sure the user, selected document, and delete state are valid.
    if (!session || !documentPendingDelete || deletingDocumentId) {
      return;
    }

    const document = documentPendingDelete;

    // Show loading state on the delete button/card.
    setDeletingDocumentId(document.id);
    setLoadError("");

    try {
      // Delete the document from the backend.
      await deleteLibraryBook(session.token, document.id);

      // Remove the document card from the library UI.
      setUserDocuments((documents) =>
        documents.filter((item) => item.id !== document.id),
      );

      // Close the delete confirmation dialog.
      setDocumentPendingDelete(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not delete this document.",
      );
    } finally {
      // Stop delete loading state.
      setDeletingDocumentId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#121826]">
      {/* UI: Top navigation bar of the website */}
      <SiteNavbar activeItem="Library" />

      {/* UI: Hero section at the top of the Library page.
          It usually contains the title, short description, upload button,
          and button to scroll down to the library list. */}
      <LibraryHero
        onUploadClick={openUploadModal}
        onViewLibraryClick={scrollToLibrary}
      />

      {/* UI: Main library content section.
          This part shows search, filters, sort options, document cards,
          loading/error states, and pagination. */}
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
          // UI: Update the search input and reset document list to page 1.
          setQuery(value);
          setCurrentPage(1);
        }}
        onFormatFilterChange={(value) => {
          // UI: Change the selected file format filter and reset to page 1.
          setFormatFilter(value);
          setCurrentPage(1);
        }}
        onSortModeChange={(value) => {
          // UI: Change the selected sort option and reset to page 1.
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

      {/* UI: Upload modal.
          This popup appears when the user clicks the upload button.
          It contains the drag-and-drop upload area, selected file preview,
          upload button, progress bar, ETA text, and upload messages. */}
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

      {/* UI: Delete confirmation dialog.
          This popup appears when the user clicks delete on a document card.
          It asks the user to confirm before the document is removed. */}
      <DeleteConfirmDialog
        documentTitle={documentPendingDelete?.title ?? ""}
        isDeleting={Boolean(deletingDocumentId)}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteDocument}
      />
    </main>
  );
}