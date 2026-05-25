"use client";

import { useEffect, useRef } from "react";
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
  const wheelNavigationLockedRef = useRef(false);
  const pdfScrollMetricsRef = useRef({
    scrollTop: 0,
    clientHeight: 0,
    scrollHeight: 0,
  });
  const activePageIndex = pages.findIndex((page) => page.key === activePageKey);

  useEffect(() => {
    const container = pdfCanvasContainerRef.current;

    if (!container || activePageIndex < 0) {
      return;
    }

    const scrollContainer = container;
    let metricsFrame: number | null = null;

    const updateScrollMetrics = () => {
      pdfScrollMetricsRef.current = {
        scrollTop: scrollContainer.scrollTop,
        clientHeight: scrollContainer.clientHeight,
        scrollHeight: scrollContainer.scrollHeight,
      };
    };

    const scheduleMetricsUpdate = () => {
      if (metricsFrame !== null) {
        window.cancelAnimationFrame(metricsFrame);
      }

      metricsFrame = window.requestAnimationFrame(() => {
        updateScrollMetrics();
        metricsFrame = null;
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMetricsUpdate);

    scheduleMetricsUpdate();
    resizeObserver?.observe(scrollContainer);

    function handlePdfScroll() {
      pdfScrollMetricsRef.current.scrollTop = scrollContainer.scrollTop;
    }

    function handlePdfWheel(event: WheelEvent) {
      const isVerticalScroll =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX);

      if (!isVerticalScroll) {
        return;
      }

      if (Math.abs(event.deltaY) < 4) {
        return;
      }

      event.preventDefault();

      const isScrollingDown = event.deltaY > 0;
      const { clientHeight, scrollHeight, scrollTop } =
        pdfScrollMetricsRef.current;
      const hasVerticalScroll =
        scrollHeight > clientHeight + 2;
      const isAtTop = scrollTop <= 2;
      const isAtBottom =
        scrollTop + clientHeight >= scrollHeight - 2;

      if (
        hasVerticalScroll &&
        ((isScrollingDown && !isAtBottom) || (!isScrollingDown && !isAtTop))
      ) {
        const nextScrollTop = Math.max(
          0,
          Math.min(scrollTop + event.deltaY, scrollHeight - clientHeight),
        );

        scrollContainer.scrollTop = nextScrollTop;
        pdfScrollMetricsRef.current.scrollTop = nextScrollTop;
        return;
      }

      const nextPageIndex = activePageIndex + (isScrollingDown ? 1 : -1);

      if (nextPageIndex < 0 || nextPageIndex >= pages.length) {
        return;
      }

      if (wheelNavigationLockedRef.current) {
        return;
      }

      wheelNavigationLockedRef.current = true;
      onPageSelect(nextPageIndex);

      window.setTimeout(() => {
        const nextContainer = pdfCanvasContainerRef.current;

        if (nextContainer) {
          nextContainer.scrollTo({
            top: isScrollingDown ? 0 : Number.MAX_SAFE_INTEGER,
            left: 0,
          });
          scheduleMetricsUpdate();
        }

        wheelNavigationLockedRef.current = false;
      }, 420);
    }

    scrollContainer.addEventListener("scroll", handlePdfScroll, {
      passive: true,
    });
    scrollContainer.addEventListener("wheel", handlePdfWheel, {
      passive: false,
    });

    return () => {
      if (metricsFrame !== null) {
        window.cancelAnimationFrame(metricsFrame);
      }

      resizeObserver?.disconnect();
      scrollContainer.removeEventListener("scroll", handlePdfScroll);
      scrollContainer.removeEventListener("wheel", handlePdfWheel);
    };
  }, [activePageIndex, onPageSelect, pages.length, pdfCanvasContainerRef]);

  if (isLoading) {
    return (
      <div className="mt-6 grid gap-4 lg:mt-10 lg:grid-cols-[320px_1fr] lg:gap-6">
        <div className="h-[320px] rounded-[16px] bg-white/75 sm:h-[420px] lg:h-[520px]" />
        <div className="h-[420px] rounded-[16px] bg-white/75 sm:h-[520px]" />
      </div>
    );
  }

  return (
    <div
      className={`mt-5 grid min-w-0 items-start gap-4 lg:mt-8 lg:gap-6 ${
        isFocusMode ? "lg:grid-cols-1" : "lg:grid-cols-[280px_1fr]"
      }`}
    >
      {!isFocusMode ? (
        <aside className="overflow-hidden rounded-[14px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] lg:sticky lg:top-[92px] lg:h-[calc(76vh+98px)] lg:min-h-[718px]">
          <h2 className="border-b border-[#dce3ef] px-4 py-4 text-[20px] font-black leading-tight text-[#0f2442] sm:px-6 sm:py-5 sm:text-[24px] lg:px-7 lg:py-6 lg:text-[26px]">
            Table of Contents
          </h2>

          <div className="max-h-[260px] overflow-y-auto py-2 lg:h-[calc(100%-88px)] lg:max-h-none">
            {pages.length ? (
              pages.map((page, index) => {
                const isActive = page.key === activePageKey;
                const isRead = readPageKeys.has(page.key);

                return (
                  <button
                    key={page.key}
                    type="button"
                    onClick={() => onPageSelect(index)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition sm:gap-4 sm:px-6 sm:py-4 lg:px-7 ${
                      isActive
                        ? "bg-[#eef5ff] text-[#245895]"
                        : "text-[#111827] hover:bg-[#f5f8fd]"
                    }`}
                  >
                    <span
                      className={`mt-1 h-5 w-5 shrink-0 rounded-full sm:h-6 sm:w-6 lg:mt-1.5 lg:h-7 lg:w-7 ${
                        isActive
                          ? "bg-[#245895]"
                          : isRead
                            ? "bg-[#8ce5a5]"
                            : "bg-[#d7dbe4]"
                      }`}
                    />

                    <span className="min-w-0">
                      <span className="block break-words text-[16px] font-black leading-tight sm:text-[18px] lg:text-[20px]">
                        {page.title}
                      </span>

                      <span className="mt-1 block text-[13px] font-semibold text-[#6e7788] sm:text-[14px]">
                        {isRead ? "Read" : `Page ${page.pageNumber}`}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-5 py-6 text-[15px] font-semibold text-[#778298] sm:px-8 sm:py-8 sm:text-[16px]">
                No pages are available for this document yet.
              </p>
            )}
          </div>
        </aside>
      ) : null}

      <div className="min-w-0">
        {activePage ? (
          <article className="min-w-0 rounded-[14px] bg-white px-2 py-3 shadow-[0_14px_30px_rgba(18,24,38,0.08)] ring-2 ring-[#a8bdd9] sm:px-5 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
              <h2 className="min-w-0 break-words text-[22px] font-black leading-tight text-[#0f2442] sm:text-[30px] lg:text-[34px]">
                {activePage.title}
              </h2>

              <span className="rounded-full bg-[#eef5ff] px-4 py-2 text-[13px] font-black text-[#245895] sm:px-5 sm:text-[14px]">
                Page {activePage.pageNumber}
              </span>
            </div>

            {pdfSourceUrl ? (
              <div className="mt-4 rounded-[8px] border border-[#d6e0ee] bg-[#f8fbff] p-1 sm:mt-6 sm:p-3 lg:mt-7 lg:p-4">
                <div
                  ref={pdfCanvasContainerRef}
                  className="flex h-[calc(100dvh-250px)] min-h-[460px] items-start justify-center overflow-y-auto overflow-x-hidden overscroll-contain rounded-[6px] bg-[#edf3fb] p-1 sm:h-[76vh] sm:min-h-[620px] sm:p-3 lg:p-4"
                >
                  <canvas
                    ref={pdfCanvasRef}
                    aria-label={`${title} - page ${activePage.pageNumber}`}
                    className="h-auto w-full max-w-full bg-white shadow-[0_16px_32px_rgba(15,36,66,0.14)]"
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
              <div className="mt-5 grid min-h-[380px] place-items-center rounded-[8px] bg-[#f8fbff] text-[15px] font-black text-[#245895] ring-1 ring-[#d6e0ee] sm:mt-7 sm:min-h-[520px] sm:text-[16px]">
                Loading PDF preview...
              </div>
            ) : (
              <pre className="mt-6 whitespace-pre-wrap break-words font-sans text-[16px] font-medium leading-8 text-[#17213a] sm:mt-8 sm:text-[18px] sm:leading-9">
                {activePage.content}
              </pre>
            )}
          </article>
        ) : (
          <div className="rounded-[14px] bg-white px-5 py-8 text-[16px] font-semibold text-[#778298] shadow-[0_14px_30px_rgba(18,24,38,0.08)] sm:px-8 sm:py-10 sm:text-[18px]">
            This document has no readable pages yet.
          </div>
        )}
      </div>
    </div>
  );
}
