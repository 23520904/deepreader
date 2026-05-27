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
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-[#2563eb]">{label}</p>
        <h1 className="mt-1 break-words text-[clamp(28px,9vw,44px)] font-black leading-tight text-[#0f172a]">
          {title}
        </h1>
        <p className="mt-2 break-words text-[14px] font-semibold leading-6 text-[#64748b]">
          {deck.title} - {deck.totalCards} cards
        </p>
      </div>
      {right}
    </div>
  );
}
