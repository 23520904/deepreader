import { EmptyMode } from "../common/EmptyMode";
import { ModeHeader } from "../common/ModeHeader";
import type { StudyDeck, StudyFlashcard } from "@/lib/flashcardStudy";
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
  deck: StudyDeck;
  quizCards: StudyFlashcard[];
  currentQuizCard: StudyFlashcard | null;
  quizOptions: string[];
  quizIndex: number;
  quizScore: number;
  quizSelectedAnswer: string;
  quizSubmitted: boolean;
  quizFinished: boolean;
  selectedIsCorrect: boolean;
  wrongQuizCards: StudyFlashcard[];
  onSelectAnswer: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  if (quizFinished) {
    return (
      <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <p className="text-[14px] font-bold text-[#2563eb]">Quiz result</p>
        <h1 className="mt-2 text-[42px] font-black text-[#0f172a]">
          {quizScore} / {quizCards.length}
        </h1>
        <p className="mt-2 text-[16px] font-semibold text-[#64748b]">
          Accuracy{" "}
          {quizCards.length ? Math.round((quizScore / quizCards.length) * 100) : 0}
          %
        </p>
        {wrongQuizCards.length ? (
          <div className="mx-auto mt-6 max-w-[760px] rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] p-4 text-left">
            <p className="text-[14px] font-black text-[#be123c]">
              Cards to review again
            </p>
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

  if (!currentQuizCard) {
    return (
      <EmptyMode
        title="No quiz cards available"
        description="This deck does not have enough cards for quiz mode."
      />
    );
  }

  return (
    <section className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <ModeHeader deck={deck} label="Multiple choice" title="Quiz practice" />

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#10b981]"
          style={{
            width: `${Math.max(4, ((quizIndex + 1) / quizCards.length) * 100)}%`,
          }}
        />
      </div>

      <div className="mt-6 rounded-[8px] bg-[#f8fafc] px-6 py-6 ring-1 ring-[#e2e8f0]">
        <p className="text-[13px] font-bold text-[#64748b]">
          Question {quizIndex + 1} of {quizCards.length}
        </p>
        <h2 className="mt-3 text-[26px] font-black leading-snug text-[#0f172a]">
          {currentQuizCard.question}
        </h2>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {quizOptions.map((option, index) => {
          const isSelected = quizSelectedAnswer === option;
          const isCorrect = option === currentQuizCard.answer;

          return (
            <button
              key={`${currentQuizCard.id}-option-${index}`}
              type="button"
              onClick={() => {
                if (!quizSubmitted) {
                  onSelectAnswer(option);
                }
              }}
              disabled={quizSubmitted}
              className={`min-h-[74px] cursor-pointer rounded-[8px] px-5 py-4 text-left text-[15px] font-bold leading-7 transition disabled:cursor-not-allowed ${
                quizSubmitted && isCorrect
                  ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#bbf7d0]"
                  : quizSubmitted && isSelected
                    ? "bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                    : isSelected
                      ? "bg-[#eff6ff] text-[#1d4ed8] ring-2 ring-[#2563eb]"
                      : "bg-white text-[#0f172a] ring-1 ring-[#e2e8f0] hover:bg-[#f8fafc]"
              }`}
            >
              <span className="mr-3 inline-grid h-7 w-7 place-items-center rounded-full bg-[#eff6ff] text-[13px] font-black text-[#1d4ed8]">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {quizSubmitted && selectedIsCorrect ? (
        <div className="mt-5 rounded-[8px] bg-[#ecfdf5] px-5 py-4 text-[15px] font-bold leading-7 text-[#047857] ring-1 ring-[#bbf7d0]">
          Correct. Nice recall.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
        >
          Reset
        </button>
        {quizSubmitted ? (
          <button
            type="button"
            onClick={onNext}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
          >
            {quizIndex + 1 >= quizCards.length ? "See Result" : "Next Question"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!quizSelectedAnswer}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </div>
    </section>
  );
}
