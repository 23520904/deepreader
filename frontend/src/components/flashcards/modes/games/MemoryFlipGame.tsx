"use client";

import { useEffect, useRef, useState } from "react";
import {
  shuffleItems,
  truncateText,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import type { GamePlayMode, GameResult } from "../types";
import { formatGameTime } from "./gameConfig";
import { GameMetric } from "./GameMetric";

type MemoryTile = {
  // Unique id for this tile, usually based on the card id and tile type.
  id: string;

  // Shared id between a question tile and its matching answer tile.
  pairId: string;

  // Tells whether this tile shows the question side or answer side.
  kind: "question" | "answer";

  // Text shown when the tile is flipped open.
  content: string;

  // Original flashcard connected to this tile.
  card: StudyFlashcard;
};

// Memory game where users flip tiles and match each question with its answer.
// It supports both relaxed mode and timed mode.
export function MemoryFlipGame({
  cards,
  mode,
  seconds,
  onFinish,
}: {
  // Cards used to build the memory board.
  cards: StudyFlashcard[];

  // Game mode: relaxed or timed.
  mode: GamePlayMode;

  // Time limit in seconds when timed mode is active.
  seconds: number;

  // Sends the final game result back to the parent component.
  onFinish: (result: GameResult) => void;
}) {
  // Build the memory board only once when the game starts.
  // Each flashcard becomes two tiles: one question tile and one answer tile.
  // The full list is shuffled so the board order is different every round.
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

  // Stores the currently opened tile ids.
  // At most two tiles should be open while the game checks for a match.
  const [openTileIds, setOpenTileIds] = useState<string[]>([]);

  // Stores pair ids that were matched correctly.
  // A pair is complete when both question and answer tiles are found.
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);

  // Counts how many match attempts the user has made.
  const [moves, setMoves] = useState(0);

  // Stores cards from wrong attempts so they can be reviewed after the game.
  const [wrongCards, setWrongCards] = useState<StudyFlashcard[]>([]);

  // Save the start time once so the result screen can show the time used.
  const [startedAt] = useState(() => Date.now());

  // Countdown value used only in timed mode.
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  // Ref used to stop the timer and prevent calling onFinish more than once.
  const isCompleteRef = useRef(false);

  // Countdown timer for timed mode.
  // It decreases secondsLeft every second until the game is completed.
  useEffect(() => {
    if (mode !== "timed") {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((currentSeconds) =>
        isCompleteRef.current ? currentSeconds : Math.max(currentSeconds - 1, 0),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode]);

  // Finish the game automatically when the timer reaches zero.
  // The score is based on matched pairs and number of moves.
  useEffect(() => {
    if (mode !== "timed" || secondsLeft > 0 || isCompleteRef.current) {
      return;
    }

    isCompleteRef.current = true;
    onFinish({
      game: "memory",
      title: "Memory Flip",
      score: Math.max(0, matchedPairIds.length * 120 - moves * 8),
      total: cards.length,
      accuracy: cards.length
        ? Math.round((matchedPairIds.length / cards.length) * 100)
        : 0,
      timeLabel: `${seconds} sec`,
      wrongCards,
      message: "Time is up. Try another memory run.",
    });
  }, [
    cards.length,
    matchedPairIds.length,
    mode,
    moves,
    onFinish,
    seconds,
    secondsLeft,
    wrongCards,
  ]);

  // Handles one tile click.
  // The function opens the tile, checks if two opened tiles match,
  // updates moves/wrong cards, and finishes the game when all pairs are found.
  function chooseTile(tile: MemoryTile) {
    // Ignore clicks when the game is done, the tile is already matched,
    // the tile is already open, or two tiles are already being compared.
    if (
      isCompleteRef.current ||
      matchedPairIds.includes(tile.pairId) ||
      openTileIds.includes(tile.id) ||
      openTileIds.length >= 2
    ) {
      return;
    }

    // First click: open one tile and wait for the second tile.
    if (!openTileIds.length) {
      setOpenTileIds([tile.id]);
      return;
    }

    // Second click: open another tile and count this as one move.
    const firstTile = tiles.find((item) => item.id === openTileIds[0]);
    const nextOpenTileIds = [...openTileIds, tile.id];
    setOpenTileIds(nextOpenTileIds);
    setMoves((currentMoves) => currentMoves + 1);

    // A correct match must have the same pairId and different kinds
    // so a question tile must match with its answer tile.
    if (firstTile?.pairId === tile.pairId && firstTile.kind !== tile.kind) {
      const nextMatchedPairIds = [...matchedPairIds, tile.pairId];
      setMatchedPairIds(nextMatchedPairIds);
      window.setTimeout(() => setOpenTileIds([]), 480);

      // When all pairs are matched, finish the game after a short delay
      // so the user can see the final matched tile animation.
      if (nextMatchedPairIds.length >= cards.length) {
        isCompleteRef.current = true;
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

    // Wrong match: remember the first card as a weak card,
    // then close both opened tiles after a short delay.
    setWrongCards((currentCards) =>
      firstTile ? [...currentCards, firstTile.card] : currentCards,
    );
    window.setTimeout(() => setOpenTileIds([]), 900);
  }

  return (
    <div className="grid gap-5">
      {/* Top stats panel showing moves, matched pairs, opened tiles, and timer/goal. */}
      <div className="grid gap-3 rounded-[18px] bg-[#faf5ff] p-4 ring-1 ring-[#e9d5ff] sm:grid-cols-2 md:grid-cols-4 max-[420px]:p-3">
        <GameMetric label="Moves" value={moves} />
        <GameMetric
          label="Matches"
          value={`${matchedPairIds.length}/${cards.length}`}
        />
        <GameMetric label="Open" value={openTileIds.length} />
        <GameMetric
          label={mode === "timed" ? "Timer" : "Goal"}
          value={mode === "timed" ? `${secondsLeft}s` : "Find pairs"}
        />
      </div>

      {/* Memory board. Each button is one flip tile. */}
      <div className="grid gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          // A tile is open if the user selected it or if its pair was already matched.
          const isOpen =
            openTileIds.includes(tile.id) ||
            matchedPairIds.includes(tile.pairId);

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => chooseTile(tile)}
              className="h-[150px] cursor-pointer rounded-[18px] [perspective:900px] max-[420px]:h-[132px]"
            >
              {/* Flip animation wrapper. It rotates when the tile is open. */}
              <span
                className={`relative block h-full w-full rounded-[18px] transition duration-500 [transform-style:preserve-3d] ${
                  isOpen ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                {/* Back side of the tile shown before it is opened. */}
                <span className="absolute inset-0 grid place-items-center rounded-[18px] bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] text-[18px] font-black text-white shadow-[0_18px_40px_rgba(139,92,246,0.22)] [backface-visibility:hidden] max-[420px]:text-[16px]">
                  Flip
                </span>

                {/* Front side of the tile showing either question or answer text. */}
                <span className="absolute inset-0 grid place-items-center overflow-hidden rounded-[18px] bg-white px-4 text-center text-[13px] font-black leading-5 text-[#0f172a] ring-1 ring-[#e9d5ff] [backface-visibility:hidden] [transform:rotateY(180deg)] max-[420px]:px-3 max-[420px]:text-[12px]">
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