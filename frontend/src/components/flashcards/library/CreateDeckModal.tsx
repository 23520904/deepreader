"use client";

import Image from "next/image";
import Link from "next/link";
import Lottie from "lottie-react";
import { useEffect } from "react";
import sandyLoadingAnimation from "@/assets/animations/sandy-loading.json";
import {
  DOCUMENT_ICON,
  formatDate,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import type { LibraryDocument } from "@/types/library";
import type { CreateStep } from "@/components/flashcards/library/types";

type CreateDeckModalProps = {
  documents: LibraryDocument[];
  createStep: CreateStep;
  createBookId: string;
  createCount: number;
  createLanguage: string;
  createType: string;
  createScope: string;
  createPreviewCards: StudyFlashcard[];
  createErrorMessage: string;
  isGenerating: boolean;
  onClose: () => void;
  onStepChange: (step: CreateStep) => void;
  onBookChange: (bookId: string) => void;
  onCountChange: (count: number) => void;
  onLanguageChange: (language: string) => void;
  onTypeChange: (type: string) => void;
  onScopeChange: (scope: string) => void;
  onGenerate: () => void;
};

export function CreateDeckModal({
  documents,
  createStep,
  createBookId,
  createCount,
  createLanguage,
  createType,
  createScope,
  createPreviewCards,
  createErrorMessage,
  isGenerating,
  onClose,
  onStepChange,
  onBookChange,
  onCountChange,
  onLanguageChange,
  onTypeChange,
  onScopeChange,
  onGenerate,
}: CreateDeckModalProps) {
  const readyDocuments = documents.filter(
    (document) => document.status === "Ready",
  );

  useEffect(() => {
    const scrollY = window.scrollY;

    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;

      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden overscroll-none bg-[#0f172a]/55 px-4 py-8 max-[640px]:items-end max-[640px]:px-0 max-[640px]:py-0">
      <div className="flex max-h-[90vh] w-[min(980px,100%)] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] max-[640px]:h-[calc(100dvh_-_18px)] max-[640px]:max-h-none max-[640px]:w-full max-[640px]:rounded-b-none max-[640px]:rounded-t-[24px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e2e8f0] px-6 py-5 max-[640px]:px-4 max-[640px]:py-4">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-[#2563eb] max-[420px]:text-[13px]">
              Create from Documents
            </p>
            <h2 className="mt-1 text-[28px] font-black text-[#0f172a] max-[640px]:text-[24px] max-[420px]:text-[22px]">
              Build a study deck
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#cbd5e1] bg-white text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Close create deck modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 max-[640px]:px-4 max-[640px]:py-4">
          <div className="grid gap-6 max-[640px]:gap-4">
            <CreateStepProgress createStep={createStep} />

            {createErrorMessage ? (
              <div className="rounded-[10px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[14px] font-bold leading-6 text-[#be123c]">
                {createErrorMessage}
              </div>
            ) : null}

            {createStep === 1 ? (
              <DocumentStep
                documents={documents}
                selectedBookId={createBookId}
                onBookChange={onBookChange}
              />
            ) : createStep === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <OptionGroup
                  label="Number of cards"
                  value={createCount.toString()}
                  options={["10", "20", "30", "40"]}
                  onChange={(value) => onCountChange(Number(value))}
                />
                <OptionGroup
                  label="Language"
                  value={createLanguage}
                  options={["English", "Vietnamese", "Bilingual"]}
                  onChange={onLanguageChange}
                />
                <OptionGroup
                  label="Question type"
                  value={createType}
                  options={[
                    "Definition",
                    "Concept",
                    "Comparison",
                    "Example",
                    "Mixed",
                  ]}
                  onChange={onTypeChange}
                />
                <OptionGroup
                  label="Content scope"
                  value={createScope}
                  options={["Whole document", "Key sections", "Weak topics"]}
                  onChange={onScopeChange}
                />
              </div>
            ) : (
              <PreviewStep createPreviewCards={createPreviewCards} />
            )}
          </div>
        </div>

        <div className="relative z-10 shrink-0 border-t border-[#e2e8f0] bg-white px-6 py-5 max-[640px]:px-4 max-[640px]:py-4">
          <div className="flex flex-wrap justify-between gap-3 max-[480px]:grid max-[480px]:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                createStep === 1
                  ? onClose()
                  : onStepChange(Math.max(1, createStep - 1) as CreateStep)
              }
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9] max-[480px]:w-full max-[380px]:px-3"
            >
              {createStep === 1 ? "Cancel" : "Back"}
            </button>

            {createStep === 1 ? (
              <button
                type="button"
                onClick={() => onStepChange(2)}
                disabled={!createBookId || !readyDocuments.length}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 max-[480px]:w-full max-[380px]:px-3"
              >
                Continue
              </button>
            ) : createStep === 2 ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 max-[480px]:w-full max-[380px]:px-3"
              >
                {isGenerating ? "Generating..." : "Generate Preview"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] max-[480px]:w-full max-[380px]:px-3"
              >
                Add to Library
              </button>
            )}
          </div>
        </div>
      </div>

      {isGenerating ? <GenerateLoadingPopup /> : null}
    </div>
  );
}

function CreateStepProgress({ createStep }: { createStep: CreateStep }) {
  const steps: Array<{ step: CreateStep; label: string }> = [
    { step: 1, label: "Document" },
    { step: 2, label: "Generate" },
    { step: 3, label: "Preview" },
  ];

  return (
    <div className="rounded-[12px] bg-[#f8fafc] px-5 py-4 ring-1 ring-[#e2e8f0] max-[520px]:px-3 max-[520px]:py-3">
      <div className="grid grid-cols-[auto_minmax(18px,1fr)_auto_minmax(18px,1fr)_auto] items-start gap-3 max-[520px]:gap-2">
        {steps.map(({ step, label }, index) => {
          const isActive = createStep === step;
          const isComplete = createStep > step;
          const isHighlighted = isActive || isComplete;

          return (
            <div key={step} className="contents">
              <div className="grid justify-items-center gap-2 text-center">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-[15px] font-black ring-2 transition max-[520px]:h-8 max-[520px]:w-8 max-[520px]:text-[13px] ${
                    isHighlighted
                      ? "bg-[#2563eb] text-white ring-[#bfdbfe]"
                      : "bg-white text-[#64748b] ring-[#dbeafe]"
                  }`}
                >
                  {step}
                </span>
                <span
                  className={`text-[13px] font-black max-[520px]:text-[11px] ${
                    isHighlighted ? "text-[#1d4ed8]" : "text-[#64748b]"
                  }`}
                >
                  {label}
                </span>
              </div>

              {index < steps.length - 1 ? (
                <div
                  className={`mt-5 h-1 rounded-full transition max-[520px]:mt-4 ${
                    createStep > step ? "bg-[#2563eb]" : "bg-[#dbeafe]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenerateLoadingPopup() {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#0f172a]/35 px-4 backdrop-blur-[2px]">
      <div className="w-[min(420px,100%)] rounded-[16px] border border-[#dbeafe] bg-white px-6 py-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.28)] max-[420px]:px-4 max-[420px]:py-6">
        <div className="mx-auto h-44 w-44 max-[420px]:h-36 max-[420px]:w-36">
          <Lottie animationData={sandyLoadingAnimation} loop autoplay />
        </div>

        <h3 className="mt-2 text-[26px] font-black text-[#0f172a] max-[420px]:text-[22px]">
          Generating flashcards
        </h3>

        <p className="mt-2 text-[15px] font-semibold leading-6 text-[#64748b] max-[420px]:text-[14px]">
          DeepReader is preparing a clean study deck from your document.
        </p>
      </div>
    </div>
  );
}

function DocumentStep({
  documents,
  selectedBookId,
  onBookChange,
}: {
  documents: LibraryDocument[];
  selectedBookId: string;
  onBookChange: (bookId: string) => void;
}) {
  if (!documents.length) {
    return (
      <div className="rounded-[12px] bg-[#f8fafc] px-6 py-10 text-center ring-1 ring-[#e2e8f0] max-[420px]:px-4 max-[420px]:py-8">
        <h3 className="text-[22px] font-black text-[#0f172a] max-[420px]:text-[20px]">
          No documents available
        </h3>
        <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
          Please upload a document in the Documents page first.
        </p>
        <Link
          href="/library"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white"
        >
          Go to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="grid max-h-[52vh] gap-3 overflow-y-auto overscroll-contain pr-1 max-[640px]:max-h-none max-[640px]:overflow-visible max-[640px]:pr-0">
      {documents.map((documentItem) => {
        const isReady = documentItem.status === "Ready";

        return (
          <button
            key={documentItem.id}
            type="button"
            disabled={!isReady}
            onClick={() => onBookChange(documentItem.id)}
            className={`grid min-w-0 cursor-pointer gap-3 rounded-[12px] px-4 py-4 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 md:grid-cols-[54px_minmax(0,1fr)_140px] max-[640px]:grid-cols-[46px_minmax(0,1fr)] max-[420px]:px-3 ${
              selectedBookId === documentItem.id
                ? "bg-[#eff6ff] ring-[#2563eb]"
                : "bg-[#f8fafc] ring-[#e2e8f0] hover:bg-white"
            }`}
          >
            <Image
              src={DOCUMENT_ICON}
              alt=""
              width={52}
              height={52}
              className="h-[52px] w-[52px] rounded-[8px] object-cover max-[640px]:h-[46px] max-[640px]:w-[46px]"
            />

            <span className="min-w-0">
              <span className="block truncate text-[16px] font-black text-[#0f172a] max-[420px]:text-[15px]">
                {documentItem.title}
              </span>

              <span className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[#64748b] max-[420px]:text-[12px]">
                {documentItem.format} · {documentItem.chapters ?? 0} sections ·{" "}
                {formatDate(documentItem.createdAt)}
              </span>

              <span
                className={`mt-2 hidden w-fit rounded-full px-3 py-1 text-[12px] font-black max-[640px]:inline-flex ${
                  isReady
                    ? "bg-[#ecfdf5] text-[#047857]"
                    : "bg-[#fffbeb] text-[#b45309]"
                }`}
              >
                {isReady ? "Ready" : documentItem.status}
              </span>
            </span>

            <span
              className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] font-black max-[640px]:hidden ${
                isReady
                  ? "bg-[#ecfdf5] text-[#047857]"
                  : "bg-[#fffbeb] text-[#b45309]"
              }`}
            >
              {isReady ? "Ready" : documentItem.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PreviewStep({
  createPreviewCards,
}: {
  createPreviewCards: StudyFlashcard[];
}) {
  return (
    <div className="grid max-h-[52vh] gap-3 overflow-y-auto overscroll-contain pr-1 max-[640px]:max-h-none max-[640px]:overflow-visible max-[640px]:pr-0">
      {createPreviewCards.length ? (
        createPreviewCards.map((card, index) => (
          <div
            key={card.id}
            className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4 max-[420px]:p-3"
          >
            <p className="text-[12px] font-black text-[#2563eb]">
              Card {index + 1}
            </p>

            <p className="mt-2 break-words text-[16px] font-black leading-6 text-[#0f172a] max-[420px]:text-[15px]">
              {card.question}
            </p>

            <p className="mt-2 break-words text-[14px] font-semibold leading-6 text-[#64748b] max-[420px]:text-[13px]">
              {card.answer}
            </p>
          </div>
        ))
      ) : (
        <div className="rounded-[12px] bg-[#f8fafc] px-6 py-10 text-center ring-1 ring-[#e2e8f0] max-[420px]:px-4 max-[420px]:py-8">
          <h3 className="text-[22px] font-black text-[#0f172a] max-[420px]:text-[20px]">
            Ready to generate preview
          </h3>
          <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
            Review generated cards here before using the deck in Library.
          </p>
        </div>
      )}
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[12px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0] max-[420px]:p-3">
      <p className="text-[14px] font-black text-[#0f172a]">{label}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 max-[360px]:grid-cols-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-10 cursor-pointer rounded-[8px] px-3 py-2 text-[13px] font-black leading-5 transition ${
              value === option
                ? "bg-[#2563eb] text-white"
                : "bg-white text-[#475569] ring-1 ring-[#e2e8f0] hover:bg-[#eff6ff]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}