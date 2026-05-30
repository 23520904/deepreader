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

// Matching game where users connect each question with the correct answer.
// It supports relaxed mode and timed mode.
export function MatchTermsGame({
  cards,
  mode,
  seconds,
  onFinish,
}: {
  // Cards used in this game round.
  cards: StudyFlashcard[];

  // Game mode: relaxed or timed.
  mode: GamePlayMode;

  // Time limit in seconds when the game is in timed mode.
  seconds: number;

  // Called when the game ends and sends the final result to the parent component.
  onFinish: (result: GameResult) => void;
}) {
  // Shuffle answers once when the component first renders.
  // This keeps the answer order different from the question order.
  const [answerCards] = useState(() => shuffleItems(cards));

  // Stores the question card that the user selected first.
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  // Stores ids of cards that have already been matched correctly.
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);

  // Stores ids of cards that the user answered incorrectly at least once.
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);

  // Temporary feedback used to highlight a correct or wrong match.
  const [feedback, setFeedback] = useState<{
    cardId: string;
    answerId: string;
    status: "correct" | "wrong";
  } | null>(null);

  // Game score and combo count.
  // Combo increases after correct answers and resets after a wrong answer.
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // Save the start time once so the final result can calculate total time used.
  const [startedAt] = useState(() => Date.now());

  // Countdown value for timed mode.
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  // Ref used to stop timer updates and prevent finishing the game more than once.
  const isCompleteRef = useRef(false);

  // Starts the countdown timer when the game is in timed mode.
  // The timer stops changing once the game is completed.
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

  // Ends the game when the timer reaches 0 in timed mode.
  // It calculates accuracy from the number of unique wrong cards.
  useEffect(() => {
    if (mode !== "timed" || secondsLeft > 0 || isCompleteRef.current) {
      return;
    }

    isCompleteRef.current = true;

    const uniqueWrongCards = cards.filter((card) =>
      wrongCardIds.includes(card.id),
    );

    onFinish({
      game: "match",
      title: "Puzzle Match",
      score,
      total: cards.length,
      accuracy: Math.round(
        ((cards.length - uniqueWrongCards.length) / Math.max(cards.length, 1)) *
          100,
      ),
      timeLabel: formatGameTime(startedAt),
      wrongCards: uniqueWrongCards,
      message: "Time is up. Nice matching run.",
    });
  }, [cards, mode, onFinish, score, secondsLeft, startedAt, wrongCardIds]);

  // Builds and sends the final result when all pairs are matched.
  function finishMatch(
    nextScore: number,
    nextWrongCardIds: string[],
    message = "Great matching run.",
  ) {
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
      message,
    });
  }

  // Handles answer selection after the user has selected a question.
  // If the answer matches the selected question, score and combo increase.
  // If it is wrong, the card is recorded as weak and combo resets.
  function chooseAnswer(answerCard: StudyFlashcard) {
    if (
      !selectedQuestionId ||
      matchedCardIds.includes(answerCard.id) ||
      isCompleteRef.current
    ) {
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

      // Finish the game shortly after the last correct match,
      // so the user can still see the final correct feedback.
      if (nextMatchedCardIds.length >= cards.length) {
        isCompleteRef.current = true;
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

    // Remove wrong feedback after a short delay.
    window.setTimeout(() => setFeedback(null), 520);
  }

  return (
    <div className="grid gap-5">
      {/* Top stats panel showing current score, matches, combo, and timer/goal. */}
      <div className="grid gap-3 rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0] sm:grid-cols-2 md:grid-cols-4 max-[420px]:p-3">
        <GameMetric label="Score" value={score} />
        <GameMetric
          label="Matches"
          value={`${matchedCardIds.length}/${cards.length}`}
        />
        <GameMetric label="Combo" value={`x${combo}`} />
        <GameMetric
          label={mode === "timed" ? "Timer" : "Goal"}
          value={mode === "timed" ? `${secondsLeft}s` : "All pairs"}
        />
      </div>

      {/* Main game board with questions on the left and shuffled answers on the right. */}
      <div className="grid gap-5 min-[640px]:grid-cols-2">
        {/* Question cards column. */}
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
                className={`min-h-[86px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-black leading-6 transition disabled:cursor-default max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-[14px] ${
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

        {/* Answer cards column. These are shuffled separately from the question list. */}
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
                className={`min-h-[86px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-semibold leading-7 transition disabled:cursor-default max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-[14px] max-[420px]:leading-6 ${
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