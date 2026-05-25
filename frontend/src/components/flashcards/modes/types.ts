import type { GameMode, StudyFlashcard } from "@/lib/flashcardStudy";

export type GameFlowStatus = "lobby" | "setup" | "playing" | "result";
export type GamePlayMode = "relaxed" | "timed";

export type GameSettings = {
  cardCount: number;
  pairs: number;
  seconds: number;
  mode: GamePlayMode;
};

export type GameResult = {
  game: GameMode;
  title: string;
  score: number;
  total: number;
  accuracy: number;
  timeLabel: string;
  wrongCards: StudyFlashcard[];
  message: string;
};