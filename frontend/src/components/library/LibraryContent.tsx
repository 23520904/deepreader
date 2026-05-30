import { forwardRef } from "react";
import { LibraryCard } from "./LibraryCard";
import type { FormatFilter, LibraryDocument, SortMode } from "@/types/library";

/**
 * Props for the main library content section.
 * The parent component sends all data, filters, pagination values,
 * and action handlers into this component.
 */
type LibraryContentProps = {
  // Current user session. If it exists, the library can be loaded.
  session: unknown;

  // Error message shown when loading documents fails.
  loadError: string;

  // True while the library documents are being loaded.
  isLoading: boolean;

  // Current search text typed by the user.
  query: string;

  // Current selected document format filter.
  formatFilter: FormatFilter;

  // Current selected sorting mode.
  sortMode: SortMode;

  // Documents for the current page only.
  pagedDocuments: LibraryDocument[];

  // Page numbers and ellipsis values used to render pagination buttons.
  paginationItems: Array<number | "ellipsis">;

  // Controls whether the pagination UI should be displayed.
  shouldShowPagination: boolean;

  // Current page number after being checked and corrected by the parent.
  safeCurrentPage: number;

  // Total number of pages.
  totalPages: number;

  // Called when the user changes the search text.
  onQueryChange: (value: string) => void;

  // Called when the user changes the format filter.
  onFormatFilterChange: (value: FormatFilter) => void;

  // Called when the user changes the sorting mode.
  onSortModeChange: (value: SortMode) => void;

  // Called when the user clicks the upload button.
  onUploadClick: () => void;

  // Called when the user clicks the login button.
  onLoginClick: () => void;

  // Called when the user moves to the previous page.
  onPreviousPage: () => void;

  // Called when the user moves to the next page.
  onNextPage: () => void;

  // Called when the user chooses a specific page number.
  onPageChange: (page: number) => void;

  // Id of the document currently being deleted.
  deletingDocumentId: string;

  // Called when the user wants to read a document.
  onReadDocument: (document: LibraryDocument) => void;

  // Called when the user wants to delete a document.
  onDeleteDocument: (document: LibraryDocument) => void;
};

/**
 * Search icon used inside the search input.
 */
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

/**
 * Right arrow icon used in the Next pagination button.
 */
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

/**
 * Left arrow icon used in the Prev pagination button.
 */
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

/**
 * Main library content section.
 * forwardRef allows the parent component to scroll to this section if needed.
 */
export const LibraryContent = forwardRef<HTMLElement, LibraryContentProps>(
  function LibraryContent(
    {
      session,
      loadError,
      isLoading,
      query,
      formatFilter,
      sortMode,
      pagedDocuments,
      paginationItems,
      shouldShowPagination,
      safeCurrentPage,
      totalPages,
      onQueryChange,
      onFormatFilterChange,
      onSortModeChange,
      onUploadClick,
      onLoginClick,
      onPreviousPage,
      onNextPage,
      onPageChange,
      deletingDocumentId,
      onReadDocument,
      onDeleteDocument,
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className="library-content-section min-h-[900px] scroll-mt-[96px] bg-white pb-24 pt-16"
      >
        <div className="mx-auto w-[min(1220px,calc(100%_-_48px))] max-[700px]:w-[min(calc(100%_-_28px),1220px)]">
          {/* Section title */}
          <h2 className="text-[34px] font-black tracking-[-0.025em] text-[#1d355b] max-[700px]:text-[28px]">
            Your Library Collection
          </h2>

          {/* Search, filter, and sort controls */}
          <div className="mt-12 rounded-[16px] bg-[#245895] p-7 shadow-[0_12px_26px_rgba(36,88,149,0.18)]">
            <div className="grid gap-8 lg:grid-cols-[1fr_180px_180px]">
              {/* Search input */}
              <label className="relative block">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/65">
                  <SearchIcon />
                </span>

                <input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Search books, authors, formats..."
                  className="h-[46px] w-full rounded-[999px] border-2 border-white/80 bg-white/5 pl-12 pr-4 text-[14px] font-bold text-white outline-none placeholder:text-white/55"
                />
              </label>

              {/* Format filter dropdown */}
              <select
                value={formatFilter}
                onChange={(event) =>
                  onFormatFilterChange(event.target.value as FormatFilter)
                }
                className="h-[46px] rounded-[6px] border border-[#d8dee9] bg-white px-4 text-[14px] font-black text-[#17213a] outline-none"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF</option>
                <option value="epub">EPUB</option>
                <option value="unknown">Unknown</option>
              </select>

              {/* Sort mode dropdown */}
              <select
                value={sortMode}
                onChange={(event) =>
                  onSortModeChange(event.target.value as SortMode)
                }
                className="h-[46px] rounded-[6px] border border-[#d8dee9] bg-white px-4 text-[14px] font-black text-[#17213a] outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>

          {/* Error message shown only when the user has a session */}
          {session && loadError ? (
            <div className="mt-10 rounded-[8px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[15px] font-bold text-[#b42335]">
              {loadError}
            </div>
          ) : null}

          {isLoading ? (
            /* Loading skeleton cards */
            <div className="mt-20 grid gap-x-[52px] gap-y-[48px] md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[422px] rounded-[18px] bg-white shadow-[0_10px_24px_rgba(21,36,67,0.12)]"
                >
                  <div className="h-[220px] rounded-t-[18px] bg-[#e9f5ff]" />
                  <div className="space-y-4 p-5">
                    <div className="h-4 rounded bg-[#eef1f6]" />
                    <div className="h-4 w-4/5 rounded bg-[#eef1f6]" />
                    <div className="h-10 rounded bg-[#eef1f6]" />
                  </div>
                </div>
              ))}
            </div>
          ) : pagedDocuments.length ? (
            /* Document card grid */
            <div className="mt-20 grid gap-x-[52px] gap-y-[48px] md:grid-cols-2 xl:grid-cols-3">
              {pagedDocuments.map((document) => (
                <LibraryCard
                  key={`${document.source}-${document.id}`}
                  document={document}
                  isDeleting={deletingDocumentId === document.id}
                  onRead={onReadDocument}
                  onDelete={onDeleteDocument}
                />
              ))}
            </div>
          ) : (
            /* Empty state shown when there are no documents to display */
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
                onClick={session ? onUploadClick : onLoginClick}
                className="mt-7 h-[48px] min-w-[150px] cursor-pointer rounded-[6px] bg-[#245895] px-7 text-[14px] font-black text-white transition hover:bg-[#1d4d86]"
              >
                {session ? "Upload" : "Login"}
              </button>
            </div>
          )}

          {/* Pagination controls */}
          {shouldShowPagination ? (
            <div className="mt-14 flex items-center justify-center gap-3 text-[16px] font-black">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={safeCurrentPage === 1}
                className="flex cursor-pointer items-center gap-1 rounded-[5px] px-2 py-2 text-[#111827] transition hover:text-[#245895] disabled:cursor-not-allowed disabled:text-[#b5bbc6]"
              >
                <ChevronLeftIcon />
                Prev
              </button>

              {/* Page number buttons and ellipsis */}
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
                    onClick={() => onPageChange(item)}
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
                onClick={onNextPage}
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
    );
  },
);