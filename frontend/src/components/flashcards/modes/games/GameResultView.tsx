import Link from "next/link";
import { truncateText, type StudyDeck } from "@/lib/flashcardStudy";
import type { GameResult } from "../types";
import { GameMetric } from "./GameMetric";
export function GameResultView({
  result,
  deck,
  onPlayAgain,
  onAnotherGame,
}: {
  result: GameResult;
  deck: StudyDeck;
  onPlayAgain: () => void;
  onAnotherGame: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-[#dbe7f5] bg-white p-7 text-center shadow-[0_18px_54px_rgba(15,23,42,0.1)] max-[520px]:p-5 max-[420px]:rounded-[18px]">
      <div className="absolute left-8 top-8 h-5 w-5 rounded-full bg-[#facc15]" />
      <div className="absolute right-16 top-14 h-7 w-7 rounded-full bg-[#7dd3fc]" />
      <div className="absolute bottom-12 left-20 h-6 w-6 rounded-full bg-[#c084fc]" />
      <p className="text-[14px] font-black uppercase text-[#2563eb]">
        Game Result
      </p>
      <h1 className="mt-3 text-[clamp(32px,11vw,44px)] font-black leading-tight text-[#0f172a]">
        Great job!
      </h1>
      <p className="mx-auto mt-3 max-w-[620px] text-[16px] font-semibold leading-7 text-[#64748b] max-[420px]:text-[14px] max-[420px]:leading-6">
        {result.message} You practiced {deck.title} and turned your cards into
        active recall.
      </p>
      <div className="mx-auto mt-7 grid max-w-[760px] gap-3 sm:grid-cols-2 md:grid-cols-4">
        <GameMetric label="Score" value={result.score} />
        <GameMetric label="Accuracy" value={`${result.accuracy}%`} />
        <GameMetric label="Cards" value={result.total} />
        <GameMetric label="Time" value={result.timeLabel} />
      </div>
      {result.wrongCards.length ? (
        <div className="mx-auto mt-7 max-w-[760px] rounded-[18px] bg-[#fff1f2] p-4 text-left ring-1 ring-[#fecdd3]">
          <p className="text-[14px] font-black text-[#be123c]">
            Review these cards again
          </p>
          <div className="mt-3 grid gap-2">
            {result.wrongCards.slice(0, 4).map((card) => (
              <p
                key={`${result.game}-${card.id}`}
                className="rounded-[12px] bg-white px-4 py-3 text-[14px] font-bold text-[#0f172a]"
              >
                {truncateText(card.question, 120)}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-7 flex flex-wrap justify-center gap-3 max-[520px]:grid">
        <button
          type="button"
          onClick={onPlayAgain}
          className="h-12 cursor-pointer rounded-[14px] bg-[#2563eb] px-5 text-[15px] font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8] max-[520px]:w-full"
        >
          Play Again
        </button>
        <button
          type="button"
          onClick={onAnotherGame}
          className="h-12 cursor-pointer rounded-[14px] bg-[#eff6ff] px-5 text-[15px] font-black text-[#1d4ed8] transition hover:bg-[#dbeafe] max-[520px]:w-full"
        >
          Try Another Game
        </button>
        <Link
          href={`/flashcards/${encodeURIComponent(deck.id)}/review`}
          className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#ecfdf5] px-5 text-[15px] font-black text-[#047857] transition hover:bg-[#d1fae5] max-[520px]:w-full"
        >
          Review Weak Cards
        </Link>
      </div>
    </section>
  );
}
