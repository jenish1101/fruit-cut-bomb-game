import { useState } from "react";
import { DURATION_OPTIONS, type HighScoreEntry } from "./types";

function HighScoreTable({ scores, highlightIndex }: { scores: HighScoreEntry[]; highlightIndex?: number }) {
  if (scores.length === 0) {
    return <p className="text-center text-sm text-white/50">No scores yet — be the first legend!</p>;
  }
  return (
    <ol className="flex flex-col gap-1.5">
      {scores.map((s, i) => (
        <li
          key={`${s.date}-${i}`}
          className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-sm ${
            i === highlightIndex
              ? "bg-gradient-to-r from-amber-400/30 to-pink-500/30 ring-1 ring-amber-300/60"
              : "bg-white/5"
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-white/80">
            <span className={`w-5 text-right ${i < 3 ? "text-amber-300" : "text-white/40"}`}>{i + 1}</span>
            <span className="tracking-wide">{s.name || "???"}</span>
          </span>
          <span className="font-display text-base text-white">{s.score.toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}

export function StartScreen({
  onStart,
  onDurationChange,
  initialDuration,
  scores,
  muted,
  onToggleMute,
}: {
  onStart: (durationSeconds: number) => void;
  onDurationChange?: (durationSeconds: number) => void;
  initialDuration?: number;
  scores: HighScoreEntry[];
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [duration, setDuration] = useState(initialDuration ?? DURATION_OPTIONS[0].seconds);

  const selectDuration = (seconds: number) => {
    setDuration(seconds);
    onDurationChange?.(seconds);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#0d0a36]/60 via-[#1f1050]/65 to-[#0a0a2f]/85 p-4 backdrop-blur-md">
      <div className="animate-pop-in flex w-full max-w-md flex-col items-center gap-5 py-6 text-center">
        <div className="flex select-none items-center gap-1 text-5xl">
          <span className="animate-float-slow inline-block" style={{ animationDelay: "0s" }}>
            🍉
          </span>
          <span className="animate-float-slow inline-block" style={{ animationDelay: "0.3s" }}>
            🍊
          </span>
          <span className="animate-float-slow inline-block" style={{ animationDelay: "0.6s" }}>
            💣
          </span>
          <span className="animate-float-slow inline-block" style={{ animationDelay: "0.9s" }}>
            🍓
          </span>
        </div>
        <div>
          <h1 className="font-display bg-gradient-to-r from-amber-200 via-orange-400 to-pink-400 bg-clip-text text-5xl font-extrabold leading-tight text-transparent drop-shadow-[0_4px_12px_rgba(255,120,80,0.35)] sm:text-6xl">
            FRUIT SLASH
          </h1>
          <p className="font-display mt-1 text-lg font-semibold tracking-wide text-white/70">dodge the bombs</p>
        </div>

        <div className="w-full rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="font-display mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">Choose Game Length</p>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.seconds}
                onClick={() => selectDuration(opt.seconds)}
                className={`font-display rounded-xl px-2 py-2.5 text-sm font-bold transition ${
                  duration === opt.seconds
                    ? "bg-gradient-to-b from-amber-300 to-orange-500 text-orange-950 shadow-[0_3px_0_0_#b45309]"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(duration)}
          className="font-display group relative w-56 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-8 py-4 text-2xl font-bold text-orange-950 shadow-[0_8px_0_0_#b45309,0_15px_25px_rgba(0,0,0,0.4)] transition-all active:translate-y-2 active:shadow-[0_2px_0_0_#b45309,0_5px_10px_rgba(0,0,0,0.4)]"
        >
          <span className="animate-shine absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent bg-clip-text opacity-0 group-hover:opacity-100" />
          PLAY
        </button>

        <div className="grid w-full grid-cols-2 gap-3 rounded-2xl bg-white/5 p-4 text-left text-sm text-white/70 ring-1 ring-white/10">
          <div>
            <p className="font-display mb-1 text-xs font-bold uppercase tracking-wider text-amber-300">Touch / Mouse</p>
            <p>Swipe across fruit to slice. One bomb ends the run!</p>
          </div>
          <div>
            <p className="font-display mb-1 text-xs font-bold uppercase tracking-wider text-amber-300">Keyboard</p>
            <p>Arrow keys / WASD move the blade. Space to pause.</p>
          </div>
        </div>

        <div className="w-full rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="font-display mb-2 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
            🏆 High Scores
          </p>
          <HighScoreTable scores={scores} />
        </div>

        <button
          onClick={onToggleMute}
          className="font-display text-xs font-semibold text-white/50 underline decoration-dotted underline-offset-4 hover:text-white/80"
        >
          {muted ? "🔇 Sound Off — tap to enable" : "🔊 Sound On — tap to mute"}
        </button>
      </div>
    </div>
  );
}

export function PauseOverlay({
  score,
  timeRemaining,
  onResume,
  onRestart,
  onQuit,
}: {
  score: number;
  timeRemaining: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const mm = Math.floor(Math.max(0, Math.ceil(timeRemaining)) / 60);
  const ss = Math.max(0, Math.ceil(timeRemaining)) % 60;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a2f]/55 backdrop-blur-md">
      <div className="animate-pop-in flex w-72 flex-col items-center gap-4 rounded-3xl bg-gradient-to-b from-[#2c1560] to-[#170a36] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/15">
        <h2 className="font-display text-3xl font-extrabold tracking-wide text-white">PAUSED</h2>
        <div className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <div className="text-left">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-white/40">Score</p>
            <p className="font-display text-xl font-extrabold text-amber-300">{score.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-white/40">Time Left</p>
            <p className="font-display text-xl font-extrabold text-white">
              {mm}:{ss.toString().padStart(2, "0")}
            </p>
          </div>
        </div>
        <button
          onClick={onResume}
          className="font-display w-full rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500 px-6 py-3 text-lg font-bold text-emerald-950 shadow-[0_5px_0_0_#047857] transition active:translate-y-1 active:shadow-[0_1px_0_0_#047857]"
        >
          ▶ Resume
        </button>
        <button
          onClick={onRestart}
          className="font-display w-full rounded-full bg-gradient-to-b from-sky-300 to-sky-500 px-6 py-3 text-lg font-bold text-sky-950 shadow-[0_5px_0_0_#0369a1] transition active:translate-y-1 active:shadow-[0_1px_0_0_#0369a1]"
        >
          ↻ Restart
        </button>
        <button
          onClick={onQuit}
          className="font-display w-full rounded-full bg-white/10 px-6 py-3 text-base font-bold text-white/70 transition hover:bg-white/15 active:translate-y-0.5"
        >
          ⌂ Main Menu
        </button>
      </div>
    </div>
  );
}

export function GameOverOverlay({
  score,
  bestCombo,
  scores,
  isNewHighScore,
  reason,
  onSubmitName,
  onRestart,
  onQuit,
}: {
  score: number;
  bestCombo: number;
  scores: HighScoreEntry[];
  isNewHighScore: boolean;
  reason: "bomb" | "timeout";
  onSubmitName: (name: string) => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(!isNewHighScore);

  const ensureSaved = () => {
    if (isNewHighScore && !submitted) {
      onSubmitName(name.trim().slice(0, 10) || "YOU");
      setSubmitted(true);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#4a0f2a]/75 via-[#1f1050]/85 to-[#0a0a2f]/92 p-4 backdrop-blur-md">
      <div className="animate-pop-in flex w-full max-w-md flex-col items-center gap-4 py-6 text-center">
        <p className="text-5xl">{reason === "bomb" ? "💥" : "⏰"}</p>
        <h2 className="font-display text-4xl font-extrabold tracking-wide text-red-400">
          {reason === "bomb" ? "BOOM! GAME OVER" : "TIME'S UP!"}
        </h2>

        <div className="flex w-full items-stretch gap-3">
          <div className="flex-1 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-white/50">Score</p>
            <p className="font-display text-3xl font-extrabold text-amber-300">{score.toLocaleString()}</p>
          </div>
          <div className="flex-1 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-white/50">Best Combo</p>
            <p className="font-display text-3xl font-extrabold text-fuchsia-300">×{bestCombo}</p>
          </div>
        </div>

        {!submitted ? (
          <form
            className="flex w-full flex-col items-center gap-2 rounded-2xl bg-amber-400/10 p-4 ring-1 ring-amber-300/40"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitName(name.trim().slice(0, 10) || "YOU");
              setSubmitted(true);
            }}
          >
            <p className="font-display text-sm font-bold text-amber-300">🎉 New High Score! Enter your name:</p>
            <input
              autoFocus
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="YOUR NAME"
              className="font-display w-full rounded-full bg-white/90 px-4 py-2 text-center text-lg font-bold uppercase tracking-widest text-slate-900 outline-none ring-2 ring-transparent focus:ring-amber-400"
            />
            <button
              type="submit"
              className="font-display mt-1 w-full rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-6 py-2.5 text-base font-bold text-orange-950 shadow-[0_4px_0_0_#b45309] transition active:translate-y-1 active:shadow-none"
            >
              Save Score
            </button>
          </form>
        ) : (
          <div className="w-full rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="font-display mb-2 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
              🏆 High Scores
            </p>
            <HighScoreTable scores={scores} highlightIndex={scores.findIndex((s) => s.score === score)} />
          </div>
        )}

        <div className="flex w-full gap-3">
          <button
            onClick={() => {
              ensureSaved();
              onRestart();
            }}
            className="font-display flex-1 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500 px-6 py-3.5 text-lg font-bold text-emerald-950 shadow-[0_5px_0_0_#047857] transition active:translate-y-1 active:shadow-none"
          >
            ↻ Play Again
          </button>
          <button
            onClick={() => {
              ensureSaved();
              onQuit();
            }}
            className="font-display flex-1 rounded-full bg-white/10 px-6 py-3.5 text-base font-bold text-white/70 transition hover:bg-white/15 active:translate-y-0.5"
          >
            ⌂ Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export function Hud({
  score,
  timeRemaining,
  totalTime,
  combo,
  onPause,
  muted,
  onToggleMute,
}: {
  score: number;
  timeRemaining: number;
  totalTime: number;
  combo: number;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const pct = totalTime > 0 ? clampPct(timeRemaining / totalTime) : 0;
  const isLow = timeRemaining <= 10;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3 sm:p-5">
      <div className="pointer-events-auto flex flex-col gap-1.5">
        <div className="font-display rounded-2xl bg-black/30 px-4 py-1.5 text-2xl font-extrabold text-white shadow-lg ring-1 ring-white/10 sm:text-3xl">
          {score.toLocaleString()}
        </div>
        <div
          className={`font-display flex w-fit items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-sm font-bold ring-1 ring-white/10 sm:text-base ${
            isLow ? "animate-pulse text-red-400" : "text-white/85"
          }`}
        >
          <span>⏱</span>
          <span>{formatTime(timeRemaining)}</span>
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/30 ring-1 ring-white/10 sm:w-36">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              isLow ? "bg-red-400" : "bg-gradient-to-r from-amber-300 to-pink-400"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      {combo > 1 && (
        <div className="font-display animate-pop-in pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-4 py-1 text-lg font-extrabold text-white shadow-lg sm:top-6 sm:text-xl">
          ×{combo} COMBO
        </div>
      )}

      <div className="pointer-events-auto flex gap-2">
        <button
          onClick={onToggleMute}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-lg text-white ring-1 ring-white/10 active:scale-90 sm:h-12 sm:w-12"
          aria-label="Toggle sound"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          onClick={onPause}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-lg text-white ring-1 ring-white/10 active:scale-90 sm:h-12 sm:w-12"
          aria-label="Pause"
        >
          ⏸
        </button>
      </div>
    </div>
  );
}

function clampPct(v: number) {
  return Math.max(0, Math.min(1, v));
}
