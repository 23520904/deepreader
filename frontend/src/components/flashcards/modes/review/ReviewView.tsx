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

  const isLastCard = reviewCardIndex + 1 >= reviewCards.length;

  return (
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
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

      <div className="mt-5 rounded-[8px] border border-[#dbe7f5] bg-[#f8fafc] p-3 sm:mt-6 sm:p-5">
        <div
          className="mx-auto w-full max-w-[430px] max-[420px]:max-w-full"
          style={{ perspective: "1600px" }}
        >
          <div className="relative min-h-[min(520px,68dvh)] sm:min-h-[470px] lg:min-h-[570px]">
            <div
              className="absolute inset-0 rounded-[20px] transition-transform duration-500 sm:rounded-[28px]"
              style={{
                transform: isAnswerVisible
                  ? "rotateY(180deg)"
                  : "rotateY(0deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute inset-0 overflow-y-auto rounded-[20px] bg-[#2418f6] px-5 py-8 text-center text-white shadow-[0_24px_54px_rgba(37,99,235,0.18)] ring-1 ring-[#dbeafe] sm:rounded-[28px] sm:px-8 sm:py-10 max-[380px]:px-4"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                <div className="flex min-h-full w-full items-center justify-center">
                  <div className="w-full max-w-full min-w-0">
                    <p className="text-[13px] font-black text-white/75 sm:text-[14px]">
                      Card {reviewCardIndex + 1} of {reviewCards.length}
                    </p>

                    <p className="mt-6 text-[12px] font-black uppercase tracking-[0.12em] text-white/70 sm:mt-8 sm:text-[13px]">
                      Question
                    </p>

                    <h2 className="mx-auto mt-5 max-w-full break-words text-[clamp(20px,6vw,34px)] font-black leading-tight sm:mt-6">
                      {activeReviewCard.question}
                    </h2>
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-0 overflow-y-auto rounded-[20px] bg-white px-5 py-8 text-center shadow-[0_24px_54px_rgba(15,118,110,0.14)] ring-1 ring-[#bbf7d0] sm:rounded-[28px] sm:px-8 sm:py-10 max-[380px]:px-4"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex min-h-full w-full items-center justify-center">
                  <div className="w-full max-w-full min-w-0">
                    <p className="text-[13px] font-black text-[#047857] sm:text-[14px]">
                      Answer
                    </p>

                    <p className="mx-auto mt-5 max-w-full whitespace-pre-wrap break-words text-[clamp(18px,5.4vw,28px)] font-black leading-snug text-[#047857] sm:mt-6">
                      {activeReviewCard.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAnswer}
              aria-label={isAnswerVisible ? "Show question" : "Show answer"}
              className="absolute bottom-4 right-4 z-20 grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-[#0f172a]/78 text-white shadow-[0_14px_28px_rgba(15,23,42,0.28)] transition hover:bg-[#0f172a] sm:bottom-5 sm:right-5 sm:h-16 sm:w-16"
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6 sm:h-8 sm:w-8"
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

        <div className="mt-5 grid grid-cols-2 gap-3 max-[360px]:grid-cols-1">
          <button
            type="button"
            onClick={onPrevious}
            className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-4 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={onNext}
            className={`h-11 cursor-pointer rounded-[8px] px-4 text-[14px] font-black transition ${
              isLastCard
                ? "border border-[#2563eb] bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                : "border border-[#cbd5e1] bg-white text-[#0f172a] hover:bg-[#f1f5f9]"
            }`}
          >
            {isLastCard ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
