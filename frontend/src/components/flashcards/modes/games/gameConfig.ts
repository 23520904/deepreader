import type { GameMode } from "@/lib/flashcardStudy";
import type { GameSettings } from "../types";
export const gameConfigs = [
  {
    id: "match" as const,
    title: "Puzzle Match",
    shortTitle: "Match Terms",
    description:
      "Match each concept with the correct definition before time runs out.",
    playingDescription: "Pair concepts with the perfect answer.",
    goal: "Complete all pairs",
    buttonLabel: "Play Match",
    setupRule:
      "Choose a concept, then choose its matching definition. Consecutive correct matches build your combo.",
    gradient: "from-[#d8f8ed] via-[#cef5f5] to-[#dbeafe]",
    glow: "shadow-[0_18px_42px_rgba(20,184,166,0.14)]",
    accentClass: "text-[#0f766e]",
    badgeClass: "bg-white/70 text-[#0f766e] ring-[#99f6e4]",
    iconSrc: "/assets/icons/flashcards/puzzle-icon.png",
  },
  {
    id: "speed" as const,
    title: "Speed Challenge",
    shortTitle: "Speed Run",
    description: "Beat the clock and build your combo.",
    playingDescription: "Answer quickly before the timer hits zero.",
    goal: "Score as high as possible",
    buttonLabel: "Start Speed Run",
    setupRule:
      "Pick the correct answer fast. Correct answers add score and combo points.",
    gradient: "from-[#fff1d8] via-[#fdeec3] to-[#ffe4e6]",
    glow: "shadow-[0_18px_42px_rgba(245,158,11,0.14)]",
    accentClass: "text-[#b45309]",
    badgeClass: "bg-white/70 text-[#b45309] ring-[#fde68a]",
    iconSrc: "/assets/icons/flashcards/speed-icon.png",
  },
  {
    id: "memory" as const,
    title: "Memory Flip",
    shortTitle: "Memory Flip",
    description: "Flip, remember, and find the hidden pairs.",
    playingDescription: "Find matching question-answer pairs.",
    goal: "Find all pairs with fewer moves",
    buttonLabel: "Play Memory",
    setupRule:
      "Flip two cards at a time. Match each question with its answer to clear the board.",
    gradient: "from-[#f0e7ff] via-[#fae8ff] to-[#dbeafe]",
    glow: "shadow-[0_18px_42px_rgba(139,92,246,0.14)]",
    accentClass: "text-[#7e22ce]",
    badgeClass: "bg-white/70 text-[#7e22ce] ring-[#e9d5ff]",
    iconSrc: "/assets/icons/flashcards/memory-icon.png",
  },
];

export function defaultGameSettings(
  totalCards: number,
  game: GameMode = "match",
): GameSettings {
  const safeTotal = Math.max(totalCards, 1);

  return {
    cardCount: Math.min(8, safeTotal),
    pairs: Math.min(6, safeTotal),
    seconds: game === "speed" ? 60 : 90,
    mode: game === "speed" ? "timed" : "relaxed",
  };
}

export function formatGameTime(startedAt: number) {
  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
