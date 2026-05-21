import { CloseIcon } from "../common/CloseIcon";
import type { StudyFlashcard } from "@/lib/flashcardStudy";
export function CardModal({
  card,
  onClose,
}: {
  card: StudyFlashcard;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/55 px-4">
      <div className="w-[min(720px,100%)] rounded-[8px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">Flashcard</p>
            <h2 className="mt-1 text-[26px] font-black text-[#0f172a]">
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
        <div className="mt-5 rounded-[8px] bg-[#f8fafc] px-5 py-5 ring-1 ring-[#e2e8f0]">
          <p className="text-[13px] font-black text-[#047857]">Answer</p>
          <p className="mt-3 whitespace-pre-wrap text-[16px] font-semibold leading-8 text-[#0f172a]">
            {card.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function EditCardModal({
  question,
  answer,
  onQuestionChange,
  onAnswerChange,
  onClose,
  onSave,
}: {
  question: string;
  answer: string;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/55 px-4">
      <div className="w-[min(680px,100%)] rounded-[8px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">Edit card</p>
            <h2 className="mt-1 text-[26px] font-black text-[#0f172a]">
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
        <label className="mt-5 grid gap-2 text-[13px] font-bold text-[#64748b]">
          Question
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            className="min-h-[110px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-[15px] font-bold text-[#0f172a] outline-none focus:border-[#2563eb]"
          />
        </label>
        <label className="mt-4 grid gap-2 text-[13px] font-bold text-[#64748b]">
          Answer
          <textarea
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            className="min-h-[140px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-[15px] font-bold leading-7 text-[#0f172a] outline-none focus:border-[#2563eb]"
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
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
