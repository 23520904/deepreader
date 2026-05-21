import Image from "next/image";
import { CloseIcon } from "../common/CloseIcon";
import type { GamePlayMode, GameSettings } from "../types";
import { STACK_ICON, type StudyDeck } from "@/lib/flashcardStudy";
import type { gameConfigs } from "./gameConfig";

export function GameSetupModal({
  game,
  deck,
  settings,
  onSettingsChange,
  onClose,
  onStart,
}: {
  game: (typeof gameConfigs)[number];
  deck: StudyDeck;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  const cardOptions = [5, 8, 10, Math.min(deck.totalCards, 15)].filter(
    (value, index, values) =>
      value <= deck.totalCards && values.indexOf(value) === index,
  );

  const pairOptions = [Math.min(deck.totalCards, 4), 6, 8].filter(
    (value, index, values) =>
      value > 0 && value <= deck.totalCards && values.indexOf(value) === index,
  );

  const timeOptions = [30, 60, 90];

  return (
    <div className="fixed inset-0 z-50 grid min-h-0 place-items-center overflow-hidden bg-[#0f172a]/58 px-4 py-4">
      <div className="flex max-h-[calc(100dvh-32px)] w-[min(860px,100%)] min-h-0 flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div
          className={`shrink-0 bg-gradient-to-br ${game.gradient} px-6 py-6 text-[#0f172a]`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[13px] font-black uppercase ${game.accentClass}`}>
                Game Setup
              </p>

              <h2 className="mt-2 text-[34px] font-black leading-tight">
                {game.title}
              </h2>

              <p className="mt-3 max-w-[560px] text-[15px] font-semibold leading-7 text-[#475569]">
                {game.setupRule}
              </p>
            </div>

            <div className="hidden h-20 w-20 shrink-0 place-items-center rounded-[22px] bg-white/58 shadow-[0_16px_34px_rgba(15,23,42,0.1)] ring-1 ring-white/75 sm:grid">
              <Image
                src={game.iconSrc}
                alt=""
                width={58}
                height={58}
                className="h-14 w-14 object-contain"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/62 text-[#334155] ring-1 ring-white/80 transition hover:bg-white"
              aria-label="Close setup"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto bg-[#f8fafc] p-6 md:grid-cols-[1fr_300px]">
          <div className="rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ring-1 ring-[#e2e8f0]">
            <p className={`text-[13px] font-black uppercase ${game.accentClass}`}>
              Round settings
            </p>

            <h3 className="mt-1 text-[24px] font-black text-[#0f172a]">
              Tune your session
            </h3>

            <div className="mt-5 grid gap-4">
              <SetupOptionGroup
                title={game.id === "memory" ? "Pairs" : "Cards"}
                description={
                  game.id === "memory"
                    ? "Choose how many question-answer pairs appear on the board."
                    : "Choose how many cards this game should use."
                }
                values={game.id === "memory" ? pairOptions : cardOptions}
                activeValue={
                  game.id === "memory" ? settings.pairs : settings.cardCount
                }
                suffix={game.id === "memory" ? "pairs" : "cards"}
                onSelect={(value) =>
                  onSettingsChange({
                    ...settings,
                    [game.id === "memory" ? "pairs" : "cardCount"]: value,
                  })
                }
              />

              {game.id === "speed" ? (
                <SetupOptionGroup
                  title="Time limit"
                  description="Pick a timer length for this speed round."
                  values={timeOptions}
                  activeValue={settings.seconds}
                  suffix="sec"
                  onSelect={(value) =>
                    onSettingsChange({
                      ...settings,
                      seconds: value,
                      mode: "timed",
                    })
                  }
                />
              ) : (
                <div className="rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-black text-[#0f172a]">
                        Mode
                      </p>

                      <p className="mt-1 max-w-[380px] text-[13px] font-semibold leading-6 text-[#64748b]">
                        Relaxed keeps the game calm. Timed adds pressure for a
                        faster challenge.
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#64748b] ring-1 ring-[#e2e8f0]">
                      Optional
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(["relaxed", "timed"] as GamePlayMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onSettingsChange({ ...settings, mode })}
                        className={`min-h-[56px] cursor-pointer rounded-[16px] px-4 text-left text-[15px] font-black capitalize transition ${
                          settings.mode === mode
                            ? "bg-[#2563eb] text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]"
                            : "bg-white text-[#334155] ring-1 ring-[#e2e8f0] hover:ring-[#bfdbfe]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ring-1 ring-[#dbe7f5]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-[#eff6ff] ring-1 ring-[#dbeafe]">
                <Image
                  src={STACK_ICON}
                  alt=""
                  width={30}
                  height={30}
                  className="h-7 w-7 object-contain"
                />
              </div>

              <div>
                <p className="text-[13px] font-black text-[#2563eb]">Deck</p>
                <p className="text-[12px] font-bold text-[#64748b]">
                  Ready to play
                </p>
              </div>
            </div>

            <h3 className="mt-5 text-[22px] font-black leading-tight text-[#0f172a]">
              {deck.title}
            </h3>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[16px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
                <p className="text-[12px] font-black text-[#64748b]">Goal</p>
                <p className="mt-1 text-[14px] font-black leading-6 text-[#0f172a]">
                  {game.goal}
                </p>
              </div>

              <div>
                <div className="rounded-[14px] bg-[#eff6ff] px-3 py-3 text-center">
                  <p className="text-[18px] font-black text-[#1d4ed8]">
                    {deck.totalCards}
                  </p>
                  <p className="text-[11px] font-black text-[#64748b]">
                    Cards
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onStart}
              className="mt-5 h-[52px] w-full cursor-pointer rounded-[16px] bg-[#2563eb] text-[15px] font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8]"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupOptionGroup({
  title,
  description,
  values,
  activeValue,
  suffix,
  onSelect,
}: {
  title: string;
  description: string;
  values: number[];
  activeValue: number;
  suffix: string;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="rounded-[18px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-black text-[#0f172a]">{title}</p>

          <p className="mt-1 max-w-[400px] text-[13px] font-semibold leading-6 text-[#64748b]">
            {description}
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[#2563eb] ring-1 ring-[#dbeafe]">
          {activeValue} {suffix}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`min-h-[56px] cursor-pointer rounded-[16px] px-4 text-center text-[15px] font-black transition ${
              activeValue === value
                ? "bg-[#2563eb] text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)]"
                : "bg-white text-[#334155] ring-1 ring-[#e2e8f0] hover:ring-[#bfdbfe]"
            }`}
          >
            {value} {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}