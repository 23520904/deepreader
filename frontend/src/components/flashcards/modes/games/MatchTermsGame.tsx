"use client";

import { useState } from "react";
import {
  shuffleItems,
  truncateText,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import type { GameResult } from "../types";
import { formatGameTime } from "./gameConfig";
import { GameMetric } from "./GameMetric";

export function MatchTermsGame({
  cards,
  onFinish,
}: {
  cards: StudyFlashcard[];
  onFinish: (result: GameResult) => void;
}) {
  const [answerCards] = useState(() => shuffleItems(cards));
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    cardId: string;
    answerId: string;
    status: "correct" | "wrong";
  } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [startedAt] = useState(() => Date.now());

  function finishMatch(nextScore: number, nextWrongCardIds: string[]) {
    const uniqueWrongCards = cards.filter((card) =>
      nextWrongCardIds.includes(card.id),
    );

    onFinish({
      game: "match",
      title: "Puzzle Match",
      score: nextScore,
      total: cards.length,
      accuracy: Math.round(
        ((cards.length - uniqueWrongCards.length) / Math.max(cards.length, 1)) *
          100,
      ),
      timeLabel: formatGameTime(startedAt),
      wrongCards: uniqueWrongCards,
      message: "Great matching run.",
    });
  }

  function chooseAnswer(answerCard: StudyFlashcard) {
    if (!selectedQuestionId || matchedCardIds.includes(answerCard.id)) {
      return;
    }

    const isCorrect = selectedQuestionId === answerCard.id;

    if (isCorrect) {
      const nextMatchedCardIds = [...matchedCardIds, answerCard.id];
      const nextCombo = combo + 1;
      const nextScore = score + 100 + combo * 25;

      setMatchedCardIds(nextMatchedCardIds);
      setScore(nextScore);
      setCombo(nextCombo);
      setFeedback({
        cardId: selectedQuestionId,
        answerId: answerCard.id,
        status: "correct",
      });
      setSelectedQuestionId("");

      if (nextMatchedCardIds.length >= cards.length) {
        window.setTimeout(() => finishMatch(nextScore, wrongCardIds), 700);
      }

      return;
    }

    const nextWrongCardIds = wrongCardIds.includes(selectedQuestionId)
      ? wrongCardIds
      : [...wrongCardIds, selectedQuestionId];

    setWrongCardIds(nextWrongCardIds);
    setCombo(0);
    setFeedback({
      cardId: selectedQuestionId,
      answerId: answerCard.id,
      status: "wrong",
    });

    window.setTimeout(() => setFeedback(null), 520);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0] sm:grid-cols-2 md:grid-cols-4">
        <GameMetric label="Score" value={score} />
        <GameMetric
          label="Matches"
          value={`${matchedCardIds.length}/${cards.length}`}
        />
        <GameMetric label="Combo" value={`x${combo}`} />
        <GameMetric label="Goal" value="All pairs" />
      </div>

      <div className="grid gap-5 min-[640px]:grid-cols-2">
        <div className="grid min-w-0 content-start gap-3">
          <p className="text-[13px] font-black text-[#2563eb]">Concepts</p>

          {cards.map((card, index) => {
            const isMatched = matchedCardIds.includes(card.id);
            const isSelected = selectedQuestionId === card.id;
            const isWrong =
              feedback?.cardId === card.id && feedback.status === "wrong";

            return (
              <button
                key={card.id}
                type="button"
                disabled={isMatched}
                onClick={() => setSelectedQuestionId(card.id)}
                className={`min-h-[86px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-black leading-6 transition disabled:cursor-default ${
                  isMatched
                    ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#86efac]"
                    : isWrong
                      ? "animate-[shake_0.35s_ease-in-out] bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                      : isSelected
                        ? "bg-[#eff6ff] text-[#1d4ed8] ring-2 ring-[#2563eb]"
                        : "bg-white text-[#0f172a] ring-1 ring-[#dbe7f5] hover:-translate-y-0.5 hover:ring-[#93c5fd]"
                }`}
              >
                <span className="mr-2 text-[#2563eb]">{index + 1}.</span>
                {card.question}
              </button>
            );
          })}
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <p className="text-[13px] font-black text-[#047857]">Definitions</p>

          {answerCards.map((card, index) => {
            const isMatched = matchedCardIds.includes(card.id);
            const isWrong =
              feedback?.answerId === card.id && feedback.status === "wrong";

            return (
              <button
                key={`${card.id}-answer`}
                type="button"
                disabled={isMatched}
                onClick={() => chooseAnswer(card)}
                className={`min-h-[86px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-semibold leading-7 transition disabled:cursor-default ${
                  isMatched
                    ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#86efac]"
                    : isWrong
                      ? "animate-[shake_0.35s_ease-in-out] bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                      : "bg-[#f8fafc] text-[#334155] ring-1 ring-[#dbe7f5] hover:-translate-y-0.5 hover:bg-white hover:ring-[#67e8f9]"
                }`}
              >
                <span className="mr-2 font-black text-[#2563eb]">
                  {String.fromCharCode(65 + index)}.
                </span>
                {truncateText(card.answer, 180)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}