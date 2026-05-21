import type { StudyDeck } from "@/lib/flashcardStudy";
export function GamePlayHeader({
  deck,
  title,
  description,
  onBack,
}: {
  deck: StudyDeck;
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex cursor-pointer items-center gap-2 text-[14px] font-black text-[#2563eb] transition hover:text-[#0f172a]"
        >
          <span aria-hidden="true">&larr;</span>
          Back to Games
        </button>
        <h1 className="text-[38px] font-black leading-tight text-[#0f172a]">
          {title}
        </h1>
        <p className="mt-2 text-[15px] font-semibold text-[#64748b]">
          {deck.title} - {description}
        </p>
      </div>
    </div>
  );
}
