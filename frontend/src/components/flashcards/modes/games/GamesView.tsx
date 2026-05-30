"use client";

import Image from "next/image";
import { useState } from "react";
import { GamePlayHeader } from "./GamePlayHeader";
import { GameResultView } from "./GameResultView";
import { GameSetupModal } from "./GameSetupModal";
import { MatchTermsGame } from "./MatchTermsGame";
import { MemoryFlipGame } from "./MemoryFlipGame";
import { SpeedChallengeGame } from "./SpeedChallengeGame";
import { defaultGameSettings, gameConfigs } from "./gameConfig";
import {
  safeReadStorage,
  shuffleItems,
  STACK_ICON,
  writeStorage,
  type GameMode,
  type StudyDeck,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import type { GameFlowStatus, GameResult, GameSettings } from "../types";

// Main view for the flashcard game area.
// It controls the game flow: lobby -> setup -> playing -> result.
export function GamesView({
  deck,
  activeGame,
  onGameChange,
}: {
  // Current deck used for all game modes.
  deck: StudyDeck;

  // Currently selected game mode.
  activeGame: GameMode;

  // Updates the active game mode in the parent component.
  onGameChange: (game: GameMode) => void;
}) {
  // Tracks which screen the user is currently seeing.
  // "lobby" shows game choices, "setup" shows settings, "playing" starts the game,
  // and "result" shows the final game result.
  const [gameStatus, setGameStatus] = useState<GameFlowStatus>("lobby");

  // Stores settings for the current game, such as number of cards, pairs, time, and mode.
  // The initial settings are based on how many cards are available in this deck.
  const [gameSettings, setGameSettings] = useState<GameSettings>(() =>
    defaultGameSettings(deck.cards.length),
  );

  // Cards selected for the current round.
  // These are shuffled and sliced when the user starts a game.
  const [gameCards, setGameCards] = useState<StudyFlashcard[]>([]);

  // Stores the completed game result.
  // It stays null until a game finishes.
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // Finds the config for the current active game.
  // If no config is found, it falls back to the first game config.
  const activeConfig =
    gameConfigs.find((game) => game.id === activeGame) ?? gameConfigs[0];

  // Called when the user selects a game from the lobby.
  // It updates the active game, resets settings for that game, and opens the setup modal.
  function selectGame(game: GameMode) {
    onGameChange(game);
    setGameSettings((currentSettings) => ({
      ...currentSettings,
      ...defaultGameSettings(deck.cards.length, game),
    }));
    setGameStatus("setup");
  }

  // Starts the selected game with the current settings.
  // It chooses the correct number of cards, shuffles them, and moves the UI to playing mode.
  function startGame() {
    const count =
      activeGame === "memory"
        ? Math.min(gameSettings.pairs, deck.cards.length)
        : Math.min(gameSettings.cardCount, deck.cards.length);

    setGameCards(shuffleItems(deck.cards).slice(0, Math.max(1, count)));
    setGameResult(null);
    setGameStatus("playing");
  }

  // Called when a game mode finishes.
  // It saves the best score in local storage and then shows the result screen.
  function finishGame(result: GameResult) {
    const scoreKey = `${deck.id}:${result.game}`;
    const currentScores = safeReadStorage<Record<string, number>>(
      "deepreader:flashcard-game-best-scores:v1",
      {},
    );

    writeStorage("deepreader:flashcard-game-best-scores:v1", {
      ...currentScores,
      [scoreKey]: Math.max(currentScores[scoreKey] ?? 0, result.score),
    });
    setGameResult(result);
    setGameStatus("result");
  }

  // Playing screen.
  // The actual game component depends on the selected activeGame value.
  if (gameStatus === "playing") {
    return (
      <section className="min-w-0 overflow-hidden rounded-[18px] border border-[#dbe7f5] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] max-[520px]:p-4">
        <GamePlayHeader
          deck={deck}
          title={activeConfig.title}
          description={activeConfig.playingDescription}
          onBack={() => setGameStatus("lobby")}
        />

        {/* Render the selected game mode. */}
        {activeGame === "speed" ? (
          <SpeedChallengeGame
            cards={gameCards}
            seconds={gameSettings.seconds}
            onFinish={finishGame}
          />
        ) : activeGame === "memory" ? (
          <MemoryFlipGame
            cards={gameCards}
            mode={gameSettings.mode}
            seconds={gameSettings.seconds}
            onFinish={finishGame}
          />
        ) : (
          <MatchTermsGame
            cards={gameCards}
            mode={gameSettings.mode}
            seconds={gameSettings.seconds}
            onFinish={finishGame}
          />
        )}
      </section>
    );
  }

  // Result screen shown after a game finishes successfully.
  if (gameStatus === "result" && gameResult) {
    return (
      <GameResultView
        result={gameResult}
        deck={deck}
        onPlayAgain={startGame}
        onAnotherGame={() => setGameStatus("lobby")}
      />
    );
  }

  return (
    // Lobby screen with hero banner, deck summary, game cards, and optional setup modal.
    <section className="grid min-w-0 gap-6">
      {/* Hero banner introducing the game zone. */}
      <div className="relative min-w-0 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#dbeafe_0%,#cffafe_48%,#ede9fe_100%)] px-7 py-8 text-[#0f172a] shadow-[0_24px_64px_rgba(30,64,175,0.12)] ring-1 ring-white/70 max-[520px]:rounded-[18px] max-[520px]:px-5 max-[520px]:py-6">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/38 blur-2xl" />

        {/* Decorative robot image on large screens. */}
        <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative grid h-[360px] w-[520px] place-items-center">
            <Image
              src="/assets/images/flashcards/game-zone-robot-mascot.png"
              alt=""
              width={600}
              height={400}
              className="object-contain drop-shadow-[0_18px_28px_rgba(15,23,42,0.18)]"
              style={{ width: "500px", height: "auto" }}
            />
          </div>
        </div>

        {/* Hero text and deck badges. */}
        <div className="relative max-w-[920px] lg:pr-[520px]">
          <p className="text-[13px] font-black uppercase text-[#2563eb]/70">
            Learning Games
          </p>
          <h1 className="mt-3 whitespace-nowrap text-[42px] font-black leading-tight tracking-[0] max-[1024px]:whitespace-normal max-[700px]:text-[34px] max-[420px]:text-[30px]">
            Flashcard Game Zone
          </h1>
          <p className="mt-4 text-[17px] font-semibold leading-8 text-[#475569] max-[420px]:text-[15px] max-[420px]:leading-7">
            Turn your flashcards into quick challenges, matching games, and
            memory battles.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/62 px-4 py-2 text-[13px] font-black text-[#1d4ed8] ring-1 ring-white/80">
              {deck.totalCards} cards ready
            </span>
            <span className="max-w-full truncate rounded-full bg-white/62 px-4 py-2 text-[13px] font-black text-[#64748b] ring-1 ring-white/80">
              {deck.title}
            </span>
          </div>
        </div>
      </div>

      {/* Current deck summary card with basic learning stats. */}
      <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#dbe7f5] bg-white/92 px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] max-[520px]:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[16px] bg-[#eff6ff] ring-1 ring-[#dbeafe]">
              <Image
                src={STACK_ICON}
                alt=""
                width={34}
                height={34}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black text-[#2563eb]">
                Current deck
              </p>
              <h2 className="mt-1 line-clamp-2 text-[22px] font-black leading-snug text-[#0f172a] max-[420px]:text-[18px]">
                {deck.title}
              </h2>
            </div>
          </div>

          {/* Small stat badges for the current deck. */}
          <div className="flex min-w-0 flex-wrap gap-2">
            <span className="rounded-full bg-[#eff6ff] px-3 py-1.5 text-[12px] font-black text-[#1d4ed8]">
              {deck.totalCards} cards
            </span>
            <span className="rounded-full bg-[#ecfdf5] px-3 py-1.5 text-[12px] font-black text-[#047857]">
              {deck.masteredCount} mastered
            </span>
            <span className="rounded-full bg-[#fff1f2] px-3 py-1.5 text-[12px] font-black text-[#be123c]">
              {deck.weakCount} weak
            </span>
          </div>
        </div>
      </div>

      {/* Game lobby cards. Each card opens the setup modal for that game. */}
      <div className="grid min-w-0 gap-5 pt-1 lg:grid-cols-2 xl:grid-cols-3">
        {gameConfigs.map((game) => (
          <GameLobbyCard
            key={game.id}
            game={game}
            isSelected={activeGame === game.id}
            onSelect={() => selectGame(game.id)}
          />
        ))}
      </div>

      {/* Setup modal appears only after the user selects a game. */}
      {gameStatus === "setup" ? (
        <GameSetupModal
          game={activeConfig}
          deck={deck}
          settings={gameSettings}
          onSettingsChange={setGameSettings}
          onClose={() => setGameStatus("lobby")}
          onStart={startGame}
        />
      ) : null}
    </section>
  );
}

// Card shown in the game lobby.
// It displays one game mode and opens the setup modal when selected.
function GameLobbyCard({
  game,
  isSelected,
  onSelect,
}: {
  // Game configuration used for title, icon, description, colors, and button label.
  game: (typeof gameConfigs)[number];

  // True when this card represents the currently selected game.
  isSelected: boolean;

  // Called when the user clicks this game card.
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative min-h-[300px] min-w-0 cursor-pointer overflow-hidden rounded-[24px] bg-gradient-to-br ${game.gradient} p-5 text-left text-[#0f172a] transition duration-300 hover:-translate-y-1 ${game.glow} max-[420px]:min-h-[260px] max-[420px]:rounded-[18px] max-[420px]:p-4 ${
        isSelected ? "ring-2 ring-[#93c5fd]" : "ring-1 ring-white/70"
      }`}
    >
      {/* Decorative background shape. */}
      <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/32 blur-sm" />

      {/* Game icon shown in the top-right corner. */}
      <div className="absolute right-4 top-4 grid h-[84px] w-[84px] place-items-center rounded-[24px] bg-white/58 shadow-[0_16px_34px_rgba(15,23,42,0.1)] ring-1 ring-white/75 transition duration-300 group-hover:-rotate-3 group-hover:scale-[1.03] max-[420px]:h-[70px] max-[420px]:w-[70px] max-[420px]:rounded-[18px]">
        <Image
          src={game.iconSrc}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 object-contain max-[420px]:h-12 max-[420px]:w-12"
        />
      </div>

      {/* Game title and short description. */}
      <div className="relative pr-20">
        <h3 className="break-words text-[26px] font-black leading-tight max-[420px]:text-[22px]">
          {game.title}
        </h3>
        <p className="mt-3 text-[14px] font-semibold leading-6 text-[#475569]">
          {game.description}
        </p>
      </div>

      {/* Call-to-action label for opening the selected game setup. */}
      <div
        className={`relative mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-white/74 px-4 text-[14px] font-black ${game.accentClass} shadow-[0_14px_28px_rgba(15,23,42,0.1)] ring-1 ring-white/80`}
      >
        {game.buttonLabel}
        <span aria-hidden="true">&rarr;</span>
      </div>
    </button>
  );
}