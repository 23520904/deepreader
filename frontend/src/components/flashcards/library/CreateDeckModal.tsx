import Image from "next/image";
import Link from "next/link";
import Lottie from "lottie-react";
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/55 px-4 py-8">
      <div className="max-h-[90vh] w-[min(980px,100%)] overflow-y-auto rounded-[8px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2e8f0] px-6 py-5">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">
              Create from Documents
            </p>
            <h2 className="mt-1 text-[28px] font-black text-[#0f172a]">
              Build a study deck
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#cbd5e1] bg-white text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Close create deck modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6">
          <CreateStepProgress createStep={createStep} />

          {createErrorMessage ? (
            <div className="rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[14px] font-bold text-[#be123c]">
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

          <div className="flex flex-wrap justify-between gap-3 border-t border-[#e2e8f0] pt-5">
            <button
              type="button"
              onClick={() =>
                createStep === 1
                  ? onClose()
                  : onStepChange(Math.max(1, createStep - 1) as CreateStep)
              }
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              {createStep === 1 ? "Cancel" : "Back"}
            </button>
            {createStep === 1 ? (
              <button
                type="button"
                onClick={() => onStepChange(2)}
                disabled={!createBookId || !readyDocuments.length}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            ) : createStep === 2 ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Preview"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
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
    <div className="rounded-[8px] bg-[#f8fafc] px-5 py-4 ring-1 ring-[#e2e8f0]">
      <div className="grid grid-cols-[auto_minmax(24px,1fr)_auto_minmax(24px,1fr)_auto] items-start gap-3">
        {steps.map(({ step, label }, index) => {
          const isActive = createStep === step;
          const isComplete = createStep > step;
          const isHighlighted = isActive || isComplete;

          return (
            <div key={step} className="contents">
              <div className="grid justify-items-center gap-2 text-center">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-[15px] font-black ring-2 transition ${
                    isHighlighted
                      ? "bg-[#2563eb] text-white ring-[#bfdbfe]"
                      : "bg-white text-[#64748b] ring-[#dbeafe]"
                  }`}
                >
                  {step}
                </span>
                <span
                  className={`text-[13px] font-black ${
                    isHighlighted ? "text-[#1d4ed8]" : "text-[#64748b]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`mt-5 h-1 rounded-full transition ${
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
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0f172a]/35 px-4 backdrop-blur-[2px]">
      <div className="w-[min(420px,100%)] rounded-[8px] border border-[#dbeafe] bg-white px-6 py-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
        <div className="mx-auto h-44 w-44">
          <Lottie animationData={sandyLoadingAnimation} loop autoplay />
        </div>
        <h3 className="mt-2 text-[26px] font-black text-[#0f172a]">
          Generating flashcards
        </h3>
        <p className="mt-2 text-[15px] font-semibold leading-6 text-[#64748b]">
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
      <div className="rounded-[8px] bg-[#f8fafc] px-6 py-10 text-center">
        <h3 className="text-[22px] font-black text-[#0f172a]">
          No documents available
        </h3>
        <p className="mt-2 text-[14px] font-semibold text-[#64748b]">
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
    <div className="grid gap-3">
      {documents.map((documentItem) => {
        const isReady = documentItem.status === "Ready";

        return (
          <button
            key={documentItem.id}
            type="button"
            disabled={!isReady}
            onClick={() => onBookChange(documentItem.id)}
            className={`grid cursor-pointer gap-3 rounded-[8px] px-4 py-4 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 md:grid-cols-[54px_minmax(0,1fr)_140px] ${
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
              className="h-13 w-13 rounded-[8px] object-cover"
            />
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-black text-[#0f172a]">
                {documentItem.title}
              </span>
              <span className="mt-1 block text-[13px] font-semibold text-[#64748b]">
                {documentItem.format} - {documentItem.chapters ?? 0} sections -{" "}
                {formatDate(documentItem.createdAt)}
              </span>
            </span>
            <span
              className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] font-black ${
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
    <div className="grid gap-3">
      {createPreviewCards.length ? (
        createPreviewCards.map((card, index) => (
          <div
            key={card.id}
            className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] p-4"
          >
            <p className="text-[12px] font-black text-[#2563eb]">
              Card {index + 1}
            </p>
            <p className="mt-2 text-[16px] font-black text-[#0f172a]">
              {card.question}
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
              {card.answer}
            </p>
          </div>
        ))
      ) : (
        <div className="rounded-[8px] bg-[#f8fafc] px-6 py-10 text-center ring-1 ring-[#e2e8f0]">
          <h3 className="text-[22px] font-black text-[#0f172a]">
            Ready to generate preview
          </h3>
          <p className="mt-2 text-[14px] font-semibold text-[#64748b]">
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
    <div className="rounded-[8px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
      <p className="text-[14px] font-black text-[#0f172a]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`h-10 cursor-pointer rounded-[8px] px-4 text-[13px] font-black transition ${
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
