"use client";

import { useState } from "react";
import { shuffleItems, truncateText, type StudyFlashcard } from "@/lib/flashcardStudy";
import type { GameResult } from "../types";
import { formatGameTime } from "./gameConfig";
import { GameMetric } from "./GameMetric";
type MemoryTile = {
  id: string;
  pairId: string;
  kind: "question" | "answer";
  content: string;
  card: StudyFlashcard;
};

export function MemoryFlipGame({
  cards,
  onFinish,
}: {
  cards: StudyFlashcard[];
  onFinish: (result: GameResult) => void;
}) {
  const [tiles] = useState<MemoryTile[]>(() =>
    shuffleItems(
      cards.flatMap((card) => [
        {
          id: `${card.id}-question`,
          pairId: card.id,
          kind: "question" as const,
          content: card.question,
          card,
        },
        {
          id: `${card.id}-answer`,
          pairId: card.id,
          kind: "answer" as const,
          content: card.answer,
          card,
        },
      ]),
    ),
  );
  const [openTileIds, setOpenTileIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [wrongCards, setWrongCards] = useState<StudyFlashcard[]>([]);
  const [startedAt] = useState(() => Date.now());

  function chooseTile(tile: MemoryTile) {
    if (
      matchedPairIds.includes(tile.pairId) ||
      openTileIds.includes(tile.id) ||
      openTileIds.length >= 2
    ) {
      return;
    }

    if (!openTileIds.length) {
      setOpenTileIds([tile.id]);
      return;
    }

    const firstTile = tiles.find((item) => item.id === openTileIds[0]);
    const nextOpenTileIds = [...openTileIds, tile.id];
    setOpenTileIds(nextOpenTileIds);
    setMoves((currentMoves) => currentMoves + 1);

    if (firstTile?.pairId === tile.pairId && firstTile.kind !== tile.kind) {
      const nextMatchedPairIds = [...matchedPairIds, tile.pairId];
      setMatchedPairIds(nextMatchedPairIds);
      window.setTimeout(() => setOpenTileIds([]), 480);

      if (nextMatchedPairIds.length >= cards.length) {
        const nextScore = Math.max(100, cards.length * 150 - moves * 12);
        window.setTimeout(() => {
          onFinish({
            game: "memory",
            title: "Memory Flip",
            score: nextScore,
            total: cards.length,
            accuracy: Math.round(
              (cards.length / Math.max(cards.length + wrongCards.length, 1)) *
                100,
            ),
            timeLabel: formatGameTime(startedAt),
            wrongCards,
            message: "Memory board cleared.",
          });
        }, 680);
      }
      return;
    }

    setWrongCards((currentCards) =>
      firstTile ? [...currentCards, firstTile.card] : currentCards,
    );
    window.setTimeout(() => setOpenTileIds([]), 900);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[18px] bg-[#faf5ff] p-4 ring-1 ring-[#e9d5ff] md:grid-cols-4">
        <GameMetric label="Moves" value={moves} />
        <GameMetric label="Matches" value={`${matchedPairIds.length}/${cards.length}`} />
        <GameMetric label="Open" value={openTileIds.length} />
        <GameMetric label="Goal" value="Find pairs" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const isOpen =
            openTileIds.includes(tile.id) || matchedPairIds.includes(tile.pairId);

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => chooseTile(tile)}
              className="h-[150px] cursor-pointer rounded-[18px] [perspective:900px]"
            >
              <span
                className={`relative block h-full w-full rounded-[18px] transition duration-500 [transform-style:preserve-3d] ${
                  isOpen ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <span className="absolute inset-0 grid place-items-center rounded-[18px] bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] text-[18px] font-black text-white shadow-[0_18px_40px_rgba(139,92,246,0.22)] [backface-visibility:hidden]">
                  Flip
                </span>
                <span className="absolute inset-0 grid place-items-center rounded-[18px] bg-white px-4 text-center text-[13px] font-black leading-5 text-[#0f172a] ring-1 ring-[#e9d5ff] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {tile.kind === "question" ? "Q: " : "A: "}
                  {truncateText(tile.content, 96)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
