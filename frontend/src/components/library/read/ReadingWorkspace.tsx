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
  isPdfSourceLoading: boolean;
  isPdfPageRendering: boolean;
  pdfRenderMessage: string;
  pdfCanvasRef: RefObject<HTMLCanvasElement | null>;
  pdfCanvasContainerRef: RefObject<HTMLDivElement | null>;
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
  isPdfSourceLoading,
  isPdfPageRendering,
  pdfRenderMessage,
  pdfCanvasRef,
  pdfCanvasContainerRef,
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

  return (
    <div
      className={`mt-8 grid items-start gap-6 ${
        isFocusMode ? "lg:grid-cols-1" : "lg:grid-cols-[280px_1fr]"
      }`}
    >
      {!isFocusMode ? (
        <aside className="sticky top-[92px] overflow-hidden rounded-[14px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] max-[1024px]:static">
          <h2 className="border-b border-[#dce3ef] px-7 py-6 text-[26px] font-black leading-tight text-[#0f2442]">
            Table of Contents
          </h2>

          <div className="max-h-[560px] overflow-y-auto py-2">
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
                {activePage.title}
              </h2>

              <span className="rounded-full bg-[#eef5ff] px-5 py-2 text-[14px] font-black text-[#245895]">
                Page {activePage.pageNumber}
              </span>
            </div>

            {pdfSourceUrl ? (
              <div className="mt-7 rounded-[8px] border border-[#d6e0ee] bg-[#f8fbff] p-4">
                <div
                  ref={pdfCanvasContainerRef}
                  className="flex h-[76vh] min-h-[620px] items-start justify-center overflow-auto rounded-[6px] bg-[#edf3fb] p-4"
                >
                  <canvas
                    ref={pdfCanvasRef}
                    aria-label={`${title} - page ${activePage.pageNumber}`}
                    className="max-w-full bg-white shadow-[0_16px_32px_rgba(15,36,66,0.14)]"
                  />
                </div>

                {isPdfPageRendering ? (
                  <div className="mt-3 text-center text-[14px] font-black text-[#245895]">
                    Loading page...
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
