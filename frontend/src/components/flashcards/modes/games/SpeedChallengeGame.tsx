"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  makeQuizOptions,
  shuffleItems,
  truncateText,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import type { GameResult } from "../types";
import { GameMetric } from "./GameMetric";
export function SpeedChallengeGame({
  cards,
  seconds,
  onFinish,
}: {
  cards: StudyFlashcard[];
  seconds: number;
  onFinish: (result: GameResult) => void;
}) {
  const [speedCards] = useState(() => shuffleItems(cards));
  const [cardIndex, setCardIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(seconds);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCards, setWrongCards] = useState<StudyFlashcard[]>([]);
  const isCompleteRef = useRef(false);
  const currentCard = speedCards.length
    ? speedCards[cardIndex % speedCards.length]
    : null;
  const options = useMemo(
    () => makeQuizOptions(currentCard, speedCards),
    [currentCard, speedCards],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((currentSeconds) =>
        isCompleteRef.current ? currentSeconds : Math.max(currentSeconds - 1, 0),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0 || isCompleteRef.current) {
      return;
    }

    isCompleteRef.current = true;
    onFinish({
      game: "speed",
      title: "Speed Challenge",
      score,
      total: answeredCount,
      accuracy: answeredCount
        ? Math.round((correctCount / answeredCount) * 100)
        : 0,
      timeLabel: `${seconds} sec`,
      wrongCards,
      message: "Clock stopped. Nice speed run.",
    });
  }, [
    answeredCount,
    correctCount,
    onFinish,
    score,
    seconds,
    secondsLeft,
    wrongCards,
  ]);

  function chooseAnswer(answer: string) {
    if (!currentCard || selectedAnswer || isCompleteRef.current) {
      return;
    }

    const isCorrect = answer === currentCard.answer;
    const nextCombo = isCorrect ? combo + 1 : 0;
    setSelectedAnswer(answer);
    setAnsweredCount((count) => count + 1);

    if (isCorrect) {
      setCorrectCount((count) => count + 1);
      setScore((currentScore) => currentScore + 100 + combo * 25);
      setCombo(nextCombo);
    } else {
      setWrongCards((currentCards) => [...currentCards, currentCard]);
      setCombo(0);
    }

    window.setTimeout(() => {
      if (secondsLeft <= 0 || isCompleteRef.current) {
        return;
      }

      setCardIndex((index) => index + 1);
      setSelectedAnswer("");
    }, 650);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[18px] bg-[#fff7ed] p-4 ring-1 ring-[#fed7aa] sm:grid-cols-2 md:grid-cols-4 max-[420px]:p-3">
        <GameMetric label="Timer" value={`${secondsLeft}s`} />
        <GameMetric label="Score" value={score} />
        <GameMetric label="Combo" value={`x${combo}`} />
        <GameMetric label="Answered" value={answeredCount} />
      </div>

      <div className="rounded-[22px] bg-[#f8fafc] p-5 ring-1 ring-[#e2e8f0] max-[520px]:p-4">
        <div className="h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-[#f97316] transition-all duration-500"
            style={{ width: `${(secondsLeft / seconds) * 100}%` }}
          />
        </div>
        <p className="mt-6 text-[14px] font-black text-[#f97316]">
          Question {speedCards.length ? (cardIndex % speedCards.length) + 1 : 0}
        </p>
        <h2 className="mt-2 break-words text-[clamp(23px,8vw,30px)] font-black leading-tight text-[#0f172a]">
          {currentCard?.question ?? "No question available."}
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = currentCard?.answer === option;

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                onClick={() => chooseAnswer(option)}
                disabled={Boolean(selectedAnswer)}
                className={`min-h-[96px] cursor-pointer rounded-[16px] px-4 py-4 text-left text-[15px] font-semibold leading-7 transition disabled:cursor-default max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-[14px] max-[420px]:leading-6 ${
                  selectedAnswer
                    ? isSelected && isCorrect
                      ? "bg-[#ecfdf5] text-[#047857] ring-1 ring-[#86efac]"
                      : isSelected
                        ? "bg-[#fff1f2] text-[#be123c] ring-1 ring-[#fecdd3]"
                        : "bg-white text-[#334155] opacity-70 ring-1 ring-[#e2e8f0]"
                    : "bg-white text-[#0f172a] ring-1 ring-[#dbe7f5] hover:-translate-y-0.5 hover:ring-[#fdba74]"
                }`}
              >
                <span className="mr-2 inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff7ed] text-[13px] font-black text-[#f97316]">
                  {String.fromCharCode(65 + index)}
                </span>
                {truncateText(option, 220)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
