import { CloseIcon } from "../common/CloseIcon";
import type { StudyFlashcard } from "@/lib/flashcardStudy";

// Modal for viewing one flashcard in detail.
// It shows the full question and answer, without editing controls.
export function CardModal({
  card,
  onClose,
}: {
  // Flashcard data that will be displayed in the modal.
  card: StudyFlashcard;

  // Closes the flashcard detail modal.
  onClose: () => void;
}) {
  return (
    // Full-screen overlay behind the modal.
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0f172a]/55 px-4 py-4">
      {/* Main modal box for the flashcard detail. */}
      <div className="max-h-[calc(100dvh-32px)] w-[min(720px,100%)] overflow-y-auto rounded-[8px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] max-[520px]:p-4">
        {/* Modal header with the card question and close button. */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">Flashcard</p>
            <h2 className="mt-1 break-words text-[clamp(22px,7vw,26px)] font-black text-[#0f172a]">
              {card.question}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f8fafc] text-[#334155] ring-1 ring-[#e2e8f0] transition hover:bg-[#eff6ff]"
            aria-label="Close flashcard"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Answer section. whitespace-pre-wrap keeps line breaks from the original answer. */}
        <div className="mt-5 rounded-[8px] bg-[#f8fafc] px-5 py-5 ring-1 ring-[#e2e8f0]">
          <p className="text-[13px] font-black text-[#047857]">Answer</p>
          <p className="mt-3 whitespace-pre-wrap break-words text-[16px] font-semibold leading-8 text-[#0f172a] max-[420px]:text-[14px] max-[420px]:leading-7">
            {card.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

// Modal for editing a flashcard locally.
// The parent component controls the question and answer values through props.
export function EditCardModal({
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
  onClose,
  onSave,
}: {
  // Current question text shown inside the question textarea.
  question: string;

  // Current answer text shown inside the answer textarea.
  answer: string;

  // Updates the question value when the user types.
  onQuestionChange: (value: string) => void;

  // Updates the answer value when the user types.
  onAnswerChange: (value: string) => void;

  // Closes the edit modal without saving.
  onClose: () => void;

  // Saves the edited question and answer.
  onSave: () => void;
}) {
  return (
    // Full-screen overlay behind the edit modal.
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0f172a]/55 px-4 py-4">
      {/* Main modal box for editing the flashcard. */}
      <div className="max-h-[calc(100dvh-32px)] w-[min(680px,100%)] overflow-y-auto rounded-[8px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] max-[520px]:p-4">
        {/* Modal header with title and close button. */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">Edit card</p>
            <h2 className="mt-1 text-[clamp(22px,7vw,26px)] font-black text-[#0f172a]">
              Local card edit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f8fafc] text-[#334155] ring-1 ring-[#e2e8f0] transition hover:bg-[#eff6ff]"
            aria-label="Close editor"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Question input controlled by the parent component. */}
        <label className="mt-5 grid gap-2 text-[13px] font-bold text-[#64748b]">
          Question
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            className="min-h-[110px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-[15px] font-bold text-[#0f172a] outline-none focus:border-[#2563eb]"
          />
        </label>

        {/* Answer input controlled by the parent component. */}
        <label className="mt-4 grid gap-2 text-[13px] font-bold text-[#64748b]">
          Answer
          <textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            className="min-h-[140px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-[15px] font-bold leading-7 text-[#0f172a] outline-none focus:border-[#2563eb]"
          />
        </label>

        {/* Footer actions: cancel editing or save the updated card. */}
        <div className="mt-5 flex justify-end gap-3 max-[420px]:grid max-[420px]:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white"
          >
            Save Edit
          </button>
        </div>
      </div>
    </div>
  );
}