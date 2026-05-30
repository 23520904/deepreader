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
  // Deck data used to display title, source, progress, cards, and status.
  deck: StudyDeck;

  // Function used to build links for review, games, and cards pages.
  deckRoute: DeckRoute;
};

// Displays one flashcard deck card in the library.
// The card has two UI states: an empty deck state and a normal study deck state.
export function DeckCard({ deck, deckRoute }: DeckCardProps) {
  // Calculate the current learning status of this deck.
  // Example statuses can be new, in progress, or completed depending on helper logic.
  const learningStatus = deckLearningStatus(deck);

  // Convert the learning status into a readable label for the UI.
  const statusLabel = deckStatusLabel(learningStatus);

  // The main button text changes depending on whether the deck is new or already studied.
  const primaryLabel = learningStatus === "new" ? "Start learning" : "Study now";

  // Empty deck UI.
  // This is shown when the deck exists but has no flashcards yet.
  if (deck.totalCards === 0) {
    return (
      <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#cbd5e1] border-dashed bg-[#f8fafc] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.06)] max-[420px]:p-4">
        {/* Top badges: document format and empty status. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-[12px] font-black text-[#64748b]">
            {deck.format}
          </span>
          <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-[12px] font-black text-[#64748b] ring-1 ring-[#cbd5e1]">
            Empty
          </span>
        </div>

        {/* Deck title and source document information. */}
        <h2 className="mt-4 line-clamp-2 break-words text-[22px] font-black leading-snug text-[#475569] opacity-75 max-[420px]:text-[19px]">
          {deck.title}
        </h2>
        <p className="mt-2 min-w-0 truncate text-[14px] font-semibold text-[#94a3b8]">
          Source: {deck.sourceTitle}
        </p>

        {/* Warning message telling the user that this deck has no cards yet. */}
        <p className="mt-4 text-[14px] font-bold text-[#f59e0b]">
          ⚠️ Chưa có thẻ ghi nhớ
        </p>

        {/* Main action for empty decks: generate flashcards with AI. */}
        <div className="mt-6">
          <Link
            href={`/library?bookId=${deck.id}&action=generate`}
            className="col-span-2 inline-flex w-full h-10 min-w-0 items-center justify-center rounded-[8px] bg-[#2563eb] px-4 text-center text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
          >
            ✨ Tạo thẻ bằng AI
          </Link>
        </div>
      </article>
    );
  }

  // Normal deck UI.
  // This is shown when the deck already has flashcards.
  return (
    <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#dbe7f5] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)] max-[420px]:p-4">
      {/* Top badges: document format and learning status. */}
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

      {/* Main deck information: title, source document, and metadata. */}
      <h2 className="mt-4 line-clamp-2 break-words text-[22px] font-black leading-snug text-[#0f172a] max-[420px]:text-[19px]">
        {deck.title}
      </h2>
      <p className="mt-2 min-w-0 truncate text-[14px] font-semibold text-[#64748b]">
        Source: {deck.sourceTitle}
      </p>
      <p className="mt-2 text-[14px] font-bold text-[#475569]">
        {deckMetaText(deck)}
      </p>

      {/* Mastery progress bar showing how much of the deck has been learned. */}
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

      {/* Action buttons for studying, playing mini games, or viewing all cards. */}
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