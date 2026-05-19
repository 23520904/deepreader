"use client";

import type { RefObject } from "react";
import type { ReadingPage } from "@/types/reading";

type ReadingWorkspaceProps = {
  isLoading: boolean;
  isFocusMode: boolean;
  pages: ReadingPage[];
  activePage: ReadingPage | null;
  activePageKey: string;
  readPageKeys: Set<string>;
  title: string;
  pdfSourceUrl: string;
  pdfPageCount: number;
  isPdfSourceLoading: boolean;
  isPdfPageRendering: boolean;
  pdfRenderMessage: string;
  pdfPagesContainerRef: RefObject<HTMLDivElement | null>;
  setPdfPageCanvasRef: (
    pageNumber: number,
    canvas: HTMLCanvasElement | null,
  ) => void;
  onPageSelect: (index: number) => void;
};

export function ReadingWorkspace({
  isLoading,
  isFocusMode,
  pages,
  activePage,
  activePageKey,
  readPageKeys,
  title,
  pdfSourceUrl,
  pdfPageCount,
  isPdfSourceLoading,
  isPdfPageRendering,
  pdfRenderMessage,
  pdfPagesContainerRef,
  setPdfPageCanvasRef,
  onPageSelect,
}: ReadingWorkspaceProps) {
  if (isLoading) {
    return (
      <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-[520px] rounded-[16px] bg-white/75" />
        <div className="h-[520px] rounded-[16px] bg-white/75" />
      </div>
    );
  }

  const pdfPageNumbers = Array.from(
    { length: Math.max(pdfPageCount, 0) },
    (_, index) => index + 1,
  );

  return (
    <div
      className={`mt-8 grid items-start gap-6 ${
        isFocusMode ? "lg:grid-cols-1" : "lg:grid-cols-[280px_1fr]"
      }`}
    >
      {!isFocusMode ? (
        <aside className="sticky top-[92px] h-[calc(76vh+98px)] min-h-[718px] overflow-hidden rounded-[14px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] max-[1024px]:static max-[1024px]:h-auto max-[1024px]:min-h-0">
          <h2 className="border-b border-[#dce3ef] px-7 py-6 text-[26px] font-black leading-tight text-[#0f2442]">
            Table of Contents
          </h2>

          <div className="h-[calc(100%-88px)] overflow-y-auto py-2">
            {pages.length ? (
              pages.map((page, index) => {
                const isActive = page.key === activePageKey;
                const isRead = readPageKeys.has(page.key);

                return (
                  <button
                    key={page.key}
                    type="button"
                    onClick={() => onPageSelect(index)}
                    className={`flex w-full cursor-pointer items-start gap-4 px-7 py-4 text-left transition ${
                      isActive
                        ? "bg-[#eef5ff] text-[#245895]"
                        : "text-[#111827] hover:bg-[#f5f8fd]"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-7 w-7 shrink-0 rounded-full ${
                        isActive
                          ? "bg-[#245895]"
                          : isRead
                            ? "bg-[#8ce5a5]"
                            : "bg-[#d7dbe4]"
                      }`}
                    />
                    <span>
                      <span className="block text-[20px] font-black leading-tight">
                        {page.title}
                      </span>
                      <span className="mt-1 block text-[14px] font-semibold text-[#6e7788]">
                        {isRead ? "Read" : `Page ${page.pageNumber}`}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-8 py-8 text-[16px] font-semibold text-[#778298]">
                No pages are available for this document yet.
              </p>
            )}
          </div>
        </aside>
      ) : null}

      <div>
        {activePage ? (
          <article className="rounded-[14px] bg-white px-8 py-7 shadow-[0_14px_30px_rgba(18,24,38,0.08)] ring-2 ring-[#a8bdd9]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-[34px] font-black leading-tight text-[#0f2442]">
                {pdfSourceUrl ? title : activePage.title}
              </h2>

              <span className="rounded-full bg-[#eef5ff] px-5 py-2 text-[14px] font-black text-[#245895]">
                {pdfSourceUrl
                  ? `${pdfPageNumbers.length || pages.length} pages`
                  : `Page ${activePage.pageNumber}`}
              </span>
            </div>

            {pdfSourceUrl ? (
              <div className="mt-7 rounded-[8px] border border-[#d6e0ee] bg-[#f8fbff] p-4">
                <div
                  ref={pdfPagesContainerRef}
                  className="flex h-[76vh] min-h-[620px] flex-col items-center gap-8 overflow-y-auto overscroll-contain rounded-[6px] bg-[#edf3fb] p-6"
                >
                  {pdfPageNumbers.length ? (
                    pdfPageNumbers.map((pageNumber) => (
                      <section
                        key={pageNumber}
                        id={`pdf-page-${pageNumber}`}
                        className="flex w-full scroll-mt-6 flex-col items-center gap-3"
                      >
                        <div className="rounded-full bg-white px-4 py-1 text-[13px] font-black text-[#245895] shadow-sm">
                          Page {pageNumber}
                        </div>

                        <canvas
                          ref={(canvas) => setPdfPageCanvasRef(pageNumber, canvas)}
                          aria-label={`${title} - page ${pageNumber}`}
                          className="max-w-full bg-white shadow-[0_16px_32px_rgba(15,36,66,0.14)]"
                        />
                      </section>
                    ))
                  ) : (
                    <div className="grid min-h-[480px] place-items-center text-[16px] font-black text-[#245895]">
                      Preparing PDF preview...
                    </div>
                  )}
                </div>

                {isPdfPageRendering ? (
                  <div className="mt-3 text-center text-[14px] font-black text-[#245895]">
                    Rendering PDF pages...
                  </div>
                ) : null}

                {pdfRenderMessage ? (
                  <div className="mt-3 rounded-[8px] bg-[#fff7d9] px-4 py-3 text-[14px] font-bold text-[#6c4d00]">
                    {pdfRenderMessage}
                  </div>
                ) : null}
              </div>
            ) : isPdfSourceLoading ? (
              <div className="mt-7 grid min-h-[520px] place-items-center rounded-[8px] bg-[#f8fbff] text-[16px] font-black text-[#245895] ring-1 ring-[#d6e0ee]">
                Loading PDF preview...
              </div>
            ) : (
              <pre className="mt-8 whitespace-pre-wrap font-sans text-[18px] font-medium leading-9 text-[#17213a]">
                {activePage.content}
              </pre>
            )}
          </article>
        ) : (
          <div className="rounded-[14px] bg-white px-8 py-10 text-[18px] font-semibold text-[#778298] shadow-[0_14px_30px_rgba(18,24,38,0.08)]">
            This document has no readable pages yet.
          </div>
        )}
      </div>
    </div>
  );
}