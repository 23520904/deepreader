"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";

type ReadDocumentHeaderProps = {
  title: string;
  format: string;
  formatIconSrc: string;
  pageCount: number;
  progress: number;
  isFocusMode: boolean;
  activePageLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canMarkActivePageRead: boolean;
  isActivePageRead: boolean;
  onToggleFocusMode: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onJumpToPage: (pageNumber: number) => void;
  onMarkActivePageRead: () => void;
};

export function ReadDocumentHeader({
  title,
  format,
  formatIconSrc,
  pageCount,
  progress,
  isFocusMode,
  activePageLabel,
  canGoPrevious,
  canGoNext,
  canMarkActivePageRead,
  isActivePageRead,
  onToggleFocusMode,
  onPreviousPage,
  onNextPage,
  onJumpToPage,
  onMarkActivePageRead,
}: ReadDocumentHeaderProps) {
  const activePageNumber = /Page\s+(\d+)/i.exec(activePageLabel)?.[1] ?? "";

  function handleJumpToPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const pageNumber = Number(formData.get("jumpPage"));

    if (!Number.isFinite(pageNumber)) {
      return;
    }

    const safePageNumber = Math.min(Math.max(pageNumber, 1), pageCount);

    if (!safePageNumber) {
      return;
    }

    onJumpToPage(safePageNumber);
  }

  return (
    <>
      <Link
        href="/library"
        className="inline-flex items-center gap-3 text-[16px] font-extrabold text-[#0f2442] transition hover:text-[#245895]"
      >
        <span aria-hidden="true" className="text-[28px] leading-none">
          &larr;
        </span>
        Back to Library
      </Link>

      <div className="mt-5 grid gap-7 rounded-[16px] bg-[#245895] px-8 py-7 text-white shadow-[0_18px_36px_rgba(36,88,149,0.22)] lg:grid-cols-[1fr_320px] max-[700px]:px-5">
        <div className="flex items-center gap-6 max-[700px]:flex-col max-[700px]:items-start">
          <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[16px] bg-white shadow-[0_18px_28px_rgba(8,31,66,0.20)]">
            <Image
              src={formatIconSrc}
              alt=""
              width={120}
              height={120}
              className="h-[74px] w-[74px] object-contain"
              priority
            />
          </div>

          <div>
            <h1 className="max-w-[620px] text-[34px] font-black leading-tight tracking-[0] text-white max-[700px]:text-[28px]">
              {title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-[999px] bg-white px-5 py-2 text-[14px] font-black text-[#245895]">
                {format}
              </span>
              <span className="rounded-[999px] bg-white px-5 py-2 text-[14px] font-black text-[#245895]">
                {pageCount} pages
              </span>
              <span className="rounded-[999px] bg-[#d9f8df] px-5 py-2 text-[14px] font-black text-[#2e9b55]">
                Ready
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-white/35 bg-[#6578d8]/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          <p className="text-[14px] font-bold text-white/90">
            Reading Progress
          </p>
          <p className="mt-2 text-[27px] font-black">{progress}%</p>
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/45">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(18,24,38,0.08)] ring-1 ring-[#dce6f4]">
        <button
          type="button"
          onClick={onToggleFocusMode}
          className={`h-11 cursor-pointer rounded-[8px] px-5 text-[14px] font-black transition ${
            isFocusMode
              ? "bg-[#245895] text-white"
              : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
          }`}
        >
          Focus mode
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={!canGoPrevious}
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-white text-[#0f2442] shadow-[0_8px_18px_rgba(18,24,38,0.10)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
            aria-label="Previous page"
            title="Previous page"
          >
            <Image
              src="/assets/images/library/previous-icon.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </button>

          <span className="rounded-[999px] bg-[#f4f8ff] px-5 py-2 text-[14px] font-black text-[#5f6c82]">
            {activePageLabel}
          </span>

          <form
            onSubmit={handleJumpToPage}
            className="flex items-center gap-2 rounded-[999px] bg-[#f4f8ff] px-3 py-2"
          >
            <span className="text-[13px] font-black text-[#5f6c82]">
              Go to
            </span>

            <input
              key={activePageNumber}
              name="jumpPage"
              type="number"
              min={1}
              max={pageCount || 1}
              defaultValue={activePageNumber}
              disabled={!pageCount}
              className="h-8 w-20 rounded-[999px] border border-[#cad6e6] bg-white px-3 text-center text-[14px] font-black text-[#102744] outline-none transition focus:border-[#245895] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Go to page"
            />

            <button
              type="submit"
              disabled={!pageCount}
              className="h-8 cursor-pointer rounded-[999px] bg-[#245895] px-4 text-[12px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#9ab0ca]"
            >
              Go
            </button>
          </form>

          <button
            type="button"
            onClick={onNextPage}
            disabled={!canGoNext}
            className="grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-white text-[#0f2442] shadow-[0_8px_18px_rgba(18,24,38,0.10)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
            aria-label="Next page"
            title="Next page"
          >
            <Image
              src="/assets/images/library/next-page-icon.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onMarkActivePageRead}
          disabled={!canMarkActivePageRead}
          className={`h-11 cursor-pointer rounded-[8px] px-5 text-[14px] font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
            isActivePageRead
              ? "bg-[#fff0f1] text-[#b42335] hover:bg-[#ffe1e5]"
              : "bg-[#245895] text-white hover:bg-[#1d4d86]"
          }`}
        >
          {isActivePageRead ? "Unmark as read" : "Mark page as read"}
        </button>
      </div>
    </>
  );
}
