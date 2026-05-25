import { forwardRef } from "react";
import { LibraryCard } from "./LibraryCard";
import type { FormatFilter, LibraryDocument, SortMode } from "@/types/library";

type LibraryContentProps = {
  session: unknown;
  loadError: string;
  isLoading: boolean;
  query: string;
  formatFilter: FormatFilter;
  sortMode: SortMode;
  pagedDocuments: LibraryDocument[];
  paginationItems: Array<number | "ellipsis">;
  shouldShowPagination: boolean;
  safeCurrentPage: number;
  totalPages: number;
  onQueryChange: (value: string) => void;
  onFormatFilterChange: (value: FormatFilter) => void;
  onSortModeChange: (value: SortMode) => void;
  onUploadClick: () => void;
  onLoginClick: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  deletingDocumentId: string;
  onReadDocument: (document: LibraryDocument) => void;
  onDeleteDocument: (document: LibraryDocument) => void;
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
          <h2 className="text-[34px] font-black tracking-[-0.025em] text-[#1d355b] max-[700px]:text-[28px]">
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
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Search books, authors, formats..."
                  className="h-[46px] w-full rounded-[999px] border-2 border-white/80 bg-white/5 pl-12 pr-4 text-[14px] font-bold text-white outline-none placeholder:text-white/55"
                />
              </label>

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

          {session && loadError ? (
            <div className="mt-10 rounded-[8px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[15px] font-bold text-[#b42335]">
              {loadError}
            </div>
          ) : null}

          {isLoading ? (
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
