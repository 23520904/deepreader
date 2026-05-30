import { EmptyMode } from "../common/EmptyMode";
import { ModeHeader } from "../common/ModeHeader";
import type { StudyDeck, StudyFlashcard } from "@/lib/flashcardStudy";

// Shows the multiple-choice quiz screen for one flashcard deck.
// The quiz flow is controlled by props from the parent component.
export function QuizView({
  deck,
  quizCards,
  currentQuizCard,
  quizOptions,
  quizIndex,
  quizScore,
  quizSelectedAnswer,
  quizSubmitted,
  quizFinished,
  selectedIsCorrect,
  wrongQuizCards,
  onSelectAnswer,
  onSubmit,
  onNext,
  onReset,
}: {
  // Current deck shown in the quiz header.
  deck: StudyDeck;

  // All cards used in this quiz session.
  quizCards: StudyFlashcard[];

  // The card currently being asked. It can be null when quiz mode cannot start.
  currentQuizCard: StudyFlashcard | null;

  // Multiple-choice answer options for the current question.
  quizOptions: string[];

  // Current question index, starting from 0.
  quizIndex: number;

  // Number of correct answers so far.
  quizScore: number;

  // The answer currently selected by the user.
  quizSelectedAnswer: string;

  // True after the user submits an answer for the current question.
  quizSubmitted: boolean;

  // True when all quiz questions have been completed.
  quizFinished: boolean;

  // Tells whether the submitted answer is correct.
  selectedIsCorrect: boolean;

  // Cards answered incorrectly, shown again on the result screen.
  wrongQuizCards: StudyFlashcard[];

  // Callback functions passed from the parent component.
  onSelectAnswer: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  // Result screen shown after the user finishes all quiz questions.
  if (quizFinished) {
    return (
      <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.06)] max-[520px]:p-4">
        {/* Final quiz score and accuracy. */}
        <p className="text-[14px] font-bold text-[#2563eb]">Quiz result</p>
        <h1 className="mt-2 text-[clamp(32px,12vw,42px)] font-black text-[#0f172a]">
          {quizScore} / {quizCards.length}
        </h1>
        <p className="mt-2 text-[16px] font-semibold text-[#64748b]">
          Accuracy{" "}
          {quizCards.length ? Math.round((quizScore / quizCards.length) * 100) : 0}
          %
        </p>

        {/* Review section appears only when the user answered some cards incorrectly. */}
        {wrongQuizCards.length ? (
          <div className="mx-auto mt-6 max-w-[760px] rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] p-4 text-left">
            <p className="text-[14px] font-black text-[#be123c]">
              Cards to review again
            </p>

            {/* Show only the first 5 wrong cards to keep the result screen short. */}
            <div className="mt-3 grid gap-2">
              {wrongQuizCards.slice(0, 5).map((card) => (
                <p
                  key={card.id}
                  className="rounded-[8px] bg-white px-3 py-3 text-[14px] font-bold text-[#0f172a]"
                >
                  {card.question}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {/* Restarts the quiz from the beginning. */}
        <button
          type="button"
          onClick={onReset}
          className="mt-6 h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
        >
          Retry Quiz
        </button>
      </section>
    );
  }

  // Empty state shown when there is no current quiz card available.
  if (!currentQuizCard) {
    return (
      <EmptyMode
        title="No quiz cards available"
        description="This deck does not have enough cards for quiz mode."
      />
    );
  }

  return (
    // Main quiz practice screen.
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] max-[520px]:p-4">
      {/* Header for quiz mode with deck information. */}
      <ModeHeader deck={deck} label="Multiple choice" title="Quiz practice" />

      {/* Progress bar showing how far the user is through the quiz. */}
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#10b981]"
          style={{
            width: `${Math.max(4, ((quizIndex + 1) / quizCards.length) * 100)}%`,
          }}
        />
      </div>

      {/* Current question card. */}
      <div className="mt-6 rounded-[8px] bg-[#f8fafc] px-6 py-6 ring-1 ring-[#e2e8f0] max-[520px]:px-4 max-[520px]:py-5">
        <p className="text-[13px] font-bold text-[#64748b]">
          Question {quizIndex + 1} of {quizCards.length}
        </p>
        <h2 className="mt-3 break-words text-[clamp(21px,7vw,26px)] font-black leading-snug text-[#0f172a]">
          {currentQuizCard.question}
        </h2>
      </div>

      {/* Multiple-choice answer options. */}
      <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
        {quizOptions.map((option, index) => {
          // These values control the answer button styles.
          const isSelected = quizSelectedAnswer === option;
          const isCorrect = option === currentQuizCard.answer;

          return (
            <button
              key={`${currentQuizCard.id}-option-${index}`}
              type="button"
              onClick={() => {
                // Prevent changing the answer after it has been submitted.
                if (!quizSubmitted) {
                  onSelectAnswer(option);
                }
              }}
              disabled={quizSubmitted}
              className={`min-h-[74px] min-w-0 cursor-pointer rounded-[8px] px-5 py-4 text-left text-[15px] font-bold leading-7 transition disabled:cursor-not-allowed max-[520px]:px-4 max-[420px]:text-[14px] max-[420px]:leading-6 ${
                quizSubmitted && isCorrect
                  ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#bbf7d0]"
                  : quizSubmitted && isSelected
                    ? "bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                    : isSelected
                      ? "bg-[#eff6ff] text-[#1d4ed8] ring-2 ring-[#2563eb]"
                      : "bg-white text-[#0f172a] ring-1 ring-[#e2e8f0] hover:bg-[#f8fafc]"
              }`}
            >
              <span className="mr-3 inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eff6ff] text-[13px] font-black text-[#1d4ed8]">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="break-words">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Success feedback shown after submitting a correct answer. */}
      {quizSubmitted && selectedIsCorrect ? (
        <div className="mt-5 rounded-[8px] bg-[#ecfdf5] px-5 py-4 text-[15px] font-bold leading-7 text-[#047857] ring-1 ring-[#bbf7d0]">
          Correct. Nice recall.
        </div>
      ) : null}

      {/* Bottom actions: reset, submit, or move to the next question/result. */}
      <div className="mt-5 flex flex-wrap justify-between gap-3 max-[420px]:grid">
        <button
          type="button"
          onClick={onReset}
          className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9] max-[420px]:w-full"
        >
          Reset
        </button>
        {quizSubmitted ? (
          <button
            type="button"
            onClick={onNext}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] max-[420px]:w-full"
          >
            {quizIndex + 1 >= quizCards.length ? "See Result" : "Next Question"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!quizSelectedAnswer}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 max-[420px]:w-full"
          >
            Submit
          </button>
        )}
      </div>
    </section>
  );
}