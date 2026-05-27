import Link from "next/link";
import type { StudyDeck } from "@/lib/flashcardStudy";
import {
  deckLearningStatus,
  deckMetaText,
  deckStatusClass,
  deckStatusLabel,
} from "@/components/flashcards/library/flashcardLibraryHelpers";
import type { DeckRoute } from "@/components/flashcards/library/types";

type DeckCardProps = {
  deck: StudyDeck;
  deckRoute: DeckRoute;
};

export function DeckCard({ deck, deckRoute }: DeckCardProps) {
  const learningStatus = deckLearningStatus(deck);
  const statusLabel = deckStatusLabel(learningStatus);
  const primaryLabel = learningStatus === "new" ? "Start learning" : "Study now";

  return (
    <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#dbe7f5] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)] max-[420px]:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[12px] font-black text-[#1d4ed8]">
          {deck.format}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-[12px] font-black ring-1 ${deckStatusClass(
            learningStatus,
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      <h2 className="mt-4 line-clamp-2 break-words text-[22px] font-black leading-snug text-[#0f172a] max-[420px]:text-[19px]">
        {deck.title}
      </h2>
      <p className="mt-2 min-w-0 truncate text-[14px] font-semibold text-[#64748b]">
        Source: {deck.sourceTitle}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#475569]">
        {deckMetaText(deck)}
      </p>

      <div className="mt-5">
        <p className="text-[13px] font-black text-[#64748b]">
          Mastery progress
        </p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-[#2563eb]"
            style={{ width: `${deck.progress}%` }}
            aria-label={`Mastery progress ${deck.progress}%`}
          />
        </div>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-2 gap-3">
        <Link
          href={deckRoute(deck.id, "review")}
          className="col-span-2 inline-flex h-10 min-w-0 items-center justify-center rounded-[8px] bg-[#2563eb] px-4 text-center text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
        >
          {primaryLabel}
        </Link>
        <Link
          href={deckRoute(deck.id, "games")}
          className="inline-flex h-10 min-w-0 items-center justify-center rounded-[8px] bg-[#ecfdf5] px-3 text-center text-[14px] font-black text-[#047857] transition hover:bg-[#d1fae5] max-[360px]:col-span-2"
        >
          Mini game
        </Link>
        <Link
          href={deckRoute(deck.id, "cards")}
          className="inline-flex h-10 min-w-0 items-center justify-center rounded-[8px] border border-[#cbd5e1] bg-white px-3 text-center text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9] max-[360px]:col-span-2"
        >
          View cards
        </Link>
      </div>
    </article>
  );
}
