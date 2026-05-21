import { EmptyMode } from "../common/EmptyMode";
import { ModeHeader } from "../common/ModeHeader";
import type { StudyDeck, StudyFlashcard } from "@/lib/flashcardStudy";
export function ReviewView({
  deck,
  reviewCards,
  activeReviewCard,
  reviewCardIndex,
  isAnswerVisible,
  onPrevious,
  onNext,
  onToggleAnswer,
}: {
  deck: StudyDeck;
  reviewCards: StudyFlashcard[];
  activeReviewCard: StudyFlashcard | null;
  reviewCardIndex: number;
  isAnswerVisible: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleAnswer: () => void;
}) {
  if (!activeReviewCard) {
    return (
      <EmptyMode
        title="No cards available for review"
        description="This deck does not have any cards ready for review."
      />
    );
  }

  return (
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <ModeHeader deck={deck} label="Review mode" title="Study flashcards" />

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#2563eb]"
          style={{
            width: `${Math.max(
              4,
              ((reviewCardIndex + 1) / reviewCards.length) * 100,
            )}%`,
          }}
        />
      </div>

      <div className="mt-6 rounded-[8px] border border-[#dbe7f5] bg-[#f8fafc] p-5">
        <div className="mx-auto w-full max-w-[430px]" style={{ perspective: "1600px" }}>
          <div className="relative min-h-[570px]">
            <div
              className="absolute inset-0 rounded-[28px] transition-transform duration-500"
              style={{
                transform: isAnswerVisible ? "rotateY(180deg)" : "rotateY(0deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute inset-0 grid place-items-center overflow-hidden rounded-[28px] bg-[#2418f6] px-8 py-10 text-center text-white shadow-[0_24px_54px_rgba(37,99,235,0.18)] ring-1 ring-[#dbeafe]"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                <div>
                  <p className="text-[14px] font-black text-white/75">
                    Card {reviewCardIndex + 1} of {reviewCards.length}
                  </p>
                  <p className="mt-8 text-[13px] font-black uppercase tracking-[0.12em] text-white/70">
                    Question
                  </p>
                  <h2 className="mt-6 text-[clamp(30px,6vw,48px)] font-black leading-tight">
                    {activeReviewCard.question}
                  </h2>
                </div>
              </div>

              <div
                className="absolute inset-0 grid place-items-center overflow-y-auto rounded-[28px] bg-white px-8 py-10 text-center shadow-[0_24px_54px_rgba(15,118,110,0.14)] ring-1 ring-[#bbf7d0]"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div>
                  <p className="text-[14px] font-black text-[#047857]">
                    Answer
                  </p>
                  <p className="mt-6 whitespace-pre-wrap text-[clamp(22px,4vw,34px)] font-black leading-snug text-[#047857]">
                    {activeReviewCard.answer}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAnswer}
              aria-label={isAnswerVisible ? "Show question" : "Show answer"}
              className="absolute bottom-5 right-5 z-20 grid h-16 w-16 cursor-pointer place-items-center rounded-full bg-[#0f172a]/78 text-white shadow-[0_14px_28px_rgba(15,23,42,0.28)] transition hover:bg-[#0f172a]"
            >
              <svg
                aria-hidden="true"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.75 12.25A7.25 7.25 0 0 1 17.5 7.55M17.5 7.55H13m4.5 0v-4.5M19.25 11.75A7.25 7.25 0 0 1 6.5 16.45m0 0H11m-4.5 0v4.5"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrevious}
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
