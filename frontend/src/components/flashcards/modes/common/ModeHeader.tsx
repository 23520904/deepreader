import type { ReactNode } from "react";
import type { StudyDeck } from "@/lib/flashcardStudy";
export function ModeHeader({
  deck,
  label,
  title,
  right,
}: {
  deck: StudyDeck;
  label: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[14px] font-bold text-[#2563eb]">{label}</p>
        <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-black leading-tight text-[#0f172a]">
          {title}
        </h1>
        <p className="mt-2 text-[14px] font-semibold text-[#64748b]">
          {deck.title} - {deck.totalCards} cards
        </p>
      </div>
      {right}
    </div>
  );
}
