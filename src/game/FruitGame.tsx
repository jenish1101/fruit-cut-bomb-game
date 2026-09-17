import { useEffect, useRef, useState } from "react";
import {
  DURATION_OPTIONS,
  FRUITS,
  GOLDEN_FRUIT,
  MAX_HIGH_SCORES,
  type Entity,
  type FruitHalf,
  type GameState,
  type HighScoreEntry,
  type Particle,
  type Ring,
  type Slash,
  type Splat,
  type TextPopup,
  type TrailPoint,
} from "./types";
import { sound } from "./sound";
import { useHighScores } from "./useHighScores";
import { GameOverOverlay, Hud, PauseOverlay, StartScreen } from "./Overlays";
import { FRUIT_ART, OUTLINE, circlePath, drawBomb, makeGlowSprite, paintStaticBackground } from "./art";

const DEFAULT_DURATION = DURATION_OPTIONS[0].seconds;
const COMBO_WINDOW = 650; // ms between slices to keep combo alive
const COMBO_RESET = 950; // ms of inactivity before combo counter clears
const TRAIL_FADE_MS = 170;
const MAX_SPLATS = 22;
const TAU = Math.PI * 2;
// World-space light direction (top-left) used for fruit shading.
const LX = -0.38;
const LY = -0.42;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function pickFruit() {
  const total = FRUITS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FRUITS) {
    if (r < f.weight) return f;
    r -= f.weight;
  }
  return FRUITS[0];
}

function distToSegmentSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy;
}

interface Actions {
  startGame: (durationSeconds: number) => void;
  restartGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  quitToMenu: () => void;
}

interface FinalStats {
  score: number;
  bestCombo: number;
  isNewHighScore: boolean;
  reason: "bomb" | "timeout";
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  sprite: number;
  alpha: number;
}

export default function FruitGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const actionsRef = useRef<Actions | null>(null);
  const selectedDurationRef = useRef(DEFAULT_DURATION);

  const [gameState, setGameStateReact] = useState<GameState>("start");
  const [score, setScoreReact] = useState(0);
  const [timeRemaining, setTimeRemainingReact] = useState(DEFAULT_DURATION);
  const [totalTime, setTotalTimeReact] = useState(DEFAULT_DURATION);
  const [combo, setComboReact] = useState(0);
  const [muted, setMuted] = useState(false);
  const [finalStats, setFinalStats] = useState<FinalStats>({ score: 0, bestCombo: 0, isNewHighScore: false, reason: "timeout" });

  const { scores, addScore } = useHighScores();
  const scoresRef = useRef<HighScoreEntry[]>(scores);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // ---------------------------------------------------------------------
  // Main game engine — a single persistent effect driving a canvas loop.
  // Mutable game data lives in plain closures (not React state) so the
  // render loop can run at 60fps without triggering React re-renders.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = 1;

    let state: GameState = "start";
    const setState = (s: GameState) => {
      state = s;
      setGameStateReact(s);
    };

    let score = 0;
    let duration = DEFAULT_DURATION;
    let timeLeft = DEFAULT_DURATION;
    let comboCount = 0;
    let bestCombo = 0;
    let lastSliceTime = 0;
    let frozen = false;
    let pendingGameOver = false;
    let pendingGameOverTimer = 0;
    let pendingGameOverReason: "bomb" | "timeout" = "bomb";
    let shakeMag = 0;
    let explosionFlash = 0;
    let goldenFlash = 0;
    let slowMoTimer = 0;
    let elapsedPlaying = 0;
    let spawnTimerMs = 500;
    let attractTimerMs = 400;
    let idCounter = 0;
    let lastTime = 0;
    let lastHudTimeUpdate = 0;

    const entities: Entity[] = [];
    const halves: FruitHalf[] = [];
    const particles: Particle[] = [];
    const popups: TextPopup[] = [];
    const trail: TrailPoint[] = [];
    const splats: Splat[] = [];
    const slashes: Slash[] = [];
    const rings: Ring[] = [];

    let bgLayer: HTMLCanvasElement | null = null;
    let stars: Star[] = [];
    let motes: Mote[] = [];
    const moteSprites = [makeGlowSprite(255, 255, 255), makeGlowSprite(255, 209, 102), makeGlowSprite(255, 143, 209)];

    const pointer = { active: false, x: 0, y: 0 };
    const kb = { x: 0, y: 0, active: false, everUsed: false };
    const keysDown = new Set<string>();

    function buildScenery() {
      bgLayer = document.createElement("canvas");
      bgLayer.width = Math.floor(W * dpr);
      bgLayer.height = Math.floor(H * dpr);
      const b = bgLayer.getContext("2d")!;
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintStaticBackground(b, W, H);

      stars = Array.from({ length: 90 }, () => ({
        x: rand(0, W),
        y: rand(0, H * 0.7),
        r: rand(0.5, 1.7),
        phase: rand(0, TAU),
        speed: rand(0.8, 2.2),
      }));
      motes = Array.from({ length: 14 }, () => ({
        x: rand(0, W),
        y: rand(0, H),
        r: rand(14, 44),
        speed: rand(6, 18),
        phase: rand(0, TAU),
        sprite: Math.floor(Math.random() * 3),
        alpha: rand(0.12, 0.28),
      }));
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(W * dpr);
      canvas!.height = Math.floor(H * dpr);
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildScenery();
      kb.x = W / 2;
      kb.y = H * 0.55;
    }

    function addShake(amount: number) {
      shakeMag = Math.min(46, shakeMag + amount);
    }

    function scaleFactor() {
      return clamp(Math.min(W, H) / 760, 0.72, 1.55);
    }

    function gravity() {
      return H * 2.3;
    }

    // ---------------- spawning ----------------
    function spawnSingle(now: number, kindOverride?: "bomb", forceGolden?: boolean) {
      const s = scaleFactor();
      const isBomb = kindOverride === "bomb";
      const golden = !isBomb && forceGolden;
      const def = isBomb ? null : golden ? GOLDEN_FRUIT : pickFruit();

      const apexY = H * rand(0.14, 0.48);
      const y0 = H + 80;
      const riseHeight = y0 - apexY;
      const g = gravity();
      const tUp = Math.sqrt((2 * riseHeight) / g);
      const vy0 = -g * tUp;
      const x0 = rand(W * 0.16, W * 0.84);
      const vx = rand(-1, 1) * rand(90, 220) * s;
      const radiusRange = def ? def.radius : [34, 42];
      const radius = rand(radiusRange[0], radiusRange[1]) * s;

      entities.push({
        id: idCounter++,
        kind: isBomb ? "bomb" : "fruit",
        def,
        x: x0,
        y: y0,
        vx,
        vy: vy0,
        radius,
        rotation: rand(0, TAU),
        rotationSpeed: rand(-3.2, 3.2),
        sliced: false,
        spawnTime: now,
        golden,
        emitTimer: 0,
      });
    }

    function spawnWave(now: number, elapsed: number) {
      const bombChance = clamp(0.1 + elapsed * 0.0016, 0.1, 0.26);
      const goldenChance = 0.055;
      let count = 1;
      if (Math.random() < Math.min(0.55, elapsed / 65)) count++;
      if (Math.random() < Math.min(0.28, elapsed / 140)) count++;

      let bombAdded = false;
      for (let i = 0; i < count; i++) {
        if (!bombAdded && Math.random() < bombChance) {
          spawnSingle(now, "bomb");
          bombAdded = true;
        } else {
          spawnSingle(now, undefined, Math.random() < goldenChance);
        }
      }
    }

    function computeSpawnInterval(elapsed: number) {
      return clamp(1100 - elapsed * 9, 420, 1100);
    }

    // ---------------- effects ----------------
    function pushParticle(p: Particle) {
      particles.push(p);
      if (particles.length > 460) particles.splice(0, particles.length - 460);
    }

    function spawnJuice(e: Entity, angle: number) {
      const def = e.def!;
      const s = scaleFactor();
      for (let i = 0; i < 22; i++) {
        const ang = rand(0, TAU);
        const speed = rand(60, 300);
        pushParticle({
          x: e.x + Math.cos(ang) * e.radius * 0.3,
          y: e.y + Math.sin(ang) * e.radius * 0.3,
          vx: Math.cos(ang) * speed + Math.cos(angle + Math.PI / 2) * rand(-80, 80),
          vy: Math.sin(ang) * speed - 80,
          radius: rand(2, 6) * s,
          color: Math.random() < 0.65 ? def.juiceColor : def.juiceColor2,
          life: rand(0.45, 0.9),
          maxLife: 0.9,
          gravity: 700,
        });
      }
      if (e.golden) {
        for (let i = 0; i < 24; i++) {
          const ang = rand(0, TAU);
          const speed = rand(60, 240);
          pushParticle({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed - 90,
            radius: rand(1.5, 3.5),
            color: "#ffe066",
            life: rand(0.5, 1.1),
            maxLife: 1.1,
            gravity: 160,
            glow: true,
          });
        }
      }
    }

    function spawnSplat(e: Entity, angle: number) {
      const R = e.radius;
      const blobs: Splat["blobs"] = [{ dx: 0, dy: 0, r: R * 0.55 }];
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const along = rand(-1.15, 1.15) * R;
        const perp = rand(-0.4, 0.4) * R;
        blobs.push({
          dx: Math.cos(angle) * along - Math.sin(angle) * perp,
          dy: Math.sin(angle) * along + Math.cos(angle) * perp,
          r: rand(0.14, 0.42) * R,
        });
      }
      splats.push({ x: e.x, y: e.y, color: e.def!.juiceColor, blobs, life: 3.6, maxLife: 3.6 });
      if (splats.length > MAX_SPLATS) splats.shift();
    }

    function spawnExplosion(x: number, y: number) {
      const colors = ["#ffdd55", "#ff8800", "#ff3300", "#7a2e00", "#9e9e9e"];
      for (let i = 0; i < 60; i++) {
        const ang = rand(0, TAU);
        const speed = rand(160, 560);
        pushParticle({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          radius: rand(2, 7),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: rand(0.5, 1.1),
          maxLife: 1.1,
          gravity: 380,
          glow: Math.random() < 0.4,
        });
      }
      for (let i = 0; i < 10; i++) {
        pushParticle({
          x: x + rand(-10, 10),
          y: y + rand(-10, 10),
          vx: rand(-30, 30),
          vy: rand(-90, -30),
          radius: rand(18, 38),
          color: "rgba(120,120,120,0.5)",
          life: rand(0.8, 1.3),
          maxLife: 1.3,
          gravity: -40,
          fade: true,
        });
      }
      rings.push({ x, y, r0: 10, r1: Math.max(W, H) * 0.6, color: "rgba(255,180,120,0.9)", width: 14, life: 0.55, maxLife: 0.55 });
      rings.push({ x, y, r0: 10, r1: 220, color: "rgba(255,80,40,0.9)", width: 10, life: 0.35, maxLife: 0.35 });
    }

    function spawnMissPuff(x: number, y: number) {
      for (let i = 0; i < 8; i++) {
        const ang = rand(-Math.PI, 0);
        const speed = rand(40, 120);
        pushParticle({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          radius: rand(2, 4),
          color: "rgba(255,255,255,0.6)",
          life: rand(0.3, 0.5),
          maxLife: 0.5,
          gravity: 300,
        });
      }
    }

    function spawnHalves(e: Entity, angle: number) {
      const nx = Math.cos(angle + Math.PI / 2);
      const ny = Math.sin(angle + Math.PI / 2);
      const localCut = angle - e.rotation;
      for (const side of [1, -1] as const) {
        halves.push({
          x: e.x + nx * side * 2,
          y: e.y + ny * side * 2,
          vx: e.vx + nx * side * 170,
          vy: e.vy + ny * side * 170 - 60,
          rotation: e.rotation,
          rotationSpeed: e.rotationSpeed + side * 4.5,
          localCut,
          side,
          radius: e.radius,
          fruitKey: e.def!.key,
          life: 1.1,
          maxLife: 1.1,
        });
      }
    }

    function spawnPopup(x: number, y: number, text: string, color: string, scale = 1) {
      popups.push({ x, y, vy: -70, text, color, life: 0.9, maxLife: 0.9, scale });
    }

    // ---------------- gameplay ----------------
    function handleFruitHit(e: Entity, angle: number) {
      e.sliced = true;
      const now = performance.now();
      if (now - lastSliceTime < COMBO_WINDOW) comboCount++;
      else comboCount = 1;
      lastSliceTime = now;
      bestCombo = Math.max(bestCombo, comboCount);
      setComboReact(comboCount);

      const def = e.def!;
      const bonus = e.golden ? def.score : Math.round(def.score * (1 + (comboCount - 1) * 0.22));
      score += bonus;
      setScoreReact(score);

      spawnHalves(e, angle);
      spawnJuice(e, angle);
      spawnSplat(e, angle);
      slashes.push({ x: e.x, y: e.y, angle, len: e.radius * 3, color: def.juiceColor, life: 0.16, maxLife: 0.16 });
      spawnPopup(
        e.x,
        e.y - e.radius * 0.4,
        e.golden ? `+${bonus} GOLD!` : `+${bonus}`,
        e.golden ? "#ffd700" : "#fff8e1",
        e.golden ? 1.5 : 1 + Math.min(0.5, comboCount * 0.08),
      );

      if (e.golden) {
        sound.golden();
        slowMoTimer = 260;
        goldenFlash = 1;
        addShake(9);
        rings.push({ x: e.x, y: e.y, r0: e.radius, r1: e.radius * 5, color: "rgba(255,215,0,0.9)", width: 8, life: 0.45, maxLife: 0.45 });
      } else {
        sound.slice();
        if (comboCount >= 2) sound.combo(comboCount);
        addShake(3.5);
      }
      if (comboCount >= 2) {
        spawnPopup(e.x, e.y - e.radius - 30, `${comboCount}x COMBO`, "#ff8fd1", 1.05);
      }
      if (comboCount >= 3) {
        rings.push({ x: e.x, y: e.y, r0: e.radius * 0.6, r1: e.radius * 3.2, color: "rgba(255,143,209,0.8)", width: 5, life: 0.32, maxLife: 0.32 });
      }
    }

    function endGame(reason: "bomb" | "timeout") {
      setState("gameover");
      if (reason === "timeout") sound.gameOver();
      const list = scoresRef.current;
      const isNew = score > 0 && (list.length < MAX_HIGH_SCORES || score > list[list.length - 1].score);
      setFinalStats({ score, bestCombo, isNewHighScore: isNew, reason });
    }

    function handleBombHit(e: Entity) {
      e.sliced = true;
      frozen = true;
      addShake(32);
      spawnExplosion(e.x, e.y);
      explosionFlash = 1;
      sound.explosion();
      spawnPopup(e.x, e.y - 20, "BOOM!", "#ff5252", 1.8);
      pendingGameOver = true;
      pendingGameOverReason = "bomb";
      pendingGameOverTimer = 850;
    }

    function checkSliceSegment(x1: number, y1: number, x2: number, y2: number) {
      if (state !== "playing" || frozen) return;
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx * dx + dy * dy < 3) return;
      const angle = Math.atan2(dy, dx);
      for (const e of entities) {
        if (e.sliced) continue;
        const rr = e.radius + 9;
        if (distToSegmentSq(e.x, e.y, x1, y1, x2, y2) <= rr * rr) {
          if (e.kind === "bomb") {
            handleBombHit(e);
            return;
          } else {
            handleFruitHit(e, angle);
          }
        }
      }
    }

    function resetEngineState(durationSeconds: number) {
      entities.length = 0;
      halves.length = 0;
      particles.length = 0;
      popups.length = 0;
      trail.length = 0;
      splats.length = 0;
      slashes.length = 0;
      rings.length = 0;
      score = 0;
      duration = durationSeconds;
      timeLeft = durationSeconds;
      comboCount = 0;
      bestCombo = 0;
      lastSliceTime = 0;
      frozen = false;
      pendingGameOver = false;
      pendingGameOverTimer = 0;
      shakeMag = 0;
      explosionFlash = 0;
      goldenFlash = 0;
      slowMoTimer = 0;
      elapsedPlaying = 0;
      spawnTimerMs = 500;
      attractTimerMs = 400;
      lastTime = 0;
      lastHudTimeUpdate = 0;
      setScoreReact(0);
      setTimeRemainingReact(durationSeconds);
      setTotalTimeReact(durationSeconds);
      setComboReact(0);
      kb.x = W / 2;
      kb.y = H * 0.55;
    }

    const startGame = (durationSeconds: number) => {
      resetEngineState(durationSeconds);
      setState("playing");
      sound.start();
    };
    const restartGame = () => {
      sound.click();
      resetEngineState(duration);
      setState("playing");
    };
    const pauseGame = () => {
      if (state !== "playing") return;
      sound.click();
      setState("paused");
    };
    const resumeGame = () => {
      if (state !== "paused") return;
      sound.click();
      lastTime = 0;
      setState("playing");
    };
    const quitToMenu = () => {
      resetEngineState(duration);
      setState("start");
    };

    actionsRef.current = { startGame, restartGame, pauseGame, resumeGame, quitToMenu };

    // ---------------- input ----------------
    function getPos(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onPointerDown(ev: PointerEvent) {
      if (state !== "playing") return;
      pointer.active = true;
      const p = getPos(ev.clientX, ev.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      trail.push({ x: p.x, y: p.y, t: performance.now() });
      try {
        canvas!.setPointerCapture(ev.pointerId);
      } catch {
        /* noop */
      }
    }

    function onPointerMove(ev: PointerEvent) {
      if (!pointer.active) return;
      const p = getPos(ev.clientX, ev.clientY);
      const now = performance.now();
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      if (dx * dx + dy * dy > 4) {
        checkSliceSegment(pointer.x, pointer.y, p.x, p.y);
        pointer.x = p.x;
        pointer.y = p.y;
      }
      trail.push({ x: p.x, y: p.y, t: now });
    }

    function endPointer() {
      pointer.active = false;
    }

    function onKeyDown(ev: KeyboardEvent) {
      const moveKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"];
      if (moveKeys.includes(ev.code)) {
        keysDown.add(ev.code);
        kb.everUsed = true;
        ev.preventDefault();
      }
      if (ev.code === "Escape") {
        if (state === "playing") pauseGame();
        else if (state === "paused") resumeGame();
      }
      if (ev.code === "Space") {
        ev.preventDefault();
        if (state === "playing") pauseGame();
        else if (state === "paused") resumeGame();
        else if (state === "start") startGame(selectedDurationRef.current);
        else if (state === "gameover") restartGame();
      }
    }
    function onKeyUp(ev: KeyboardEvent) {
      keysDown.delete(ev.code);
    }
    function onBlur() {
      keysDown.clear();
      if (state === "playing") pauseGame();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("pointerleave", endPointer);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", resize);

    resize();

    // ---------------- drawing ----------------
    function drawScenery(now: number, rawDt: number) {
      if (bgLayer) ctx!.drawImage(bgLayer, 0, 0, W, H);

      // aurora bands
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      for (let i = 0; i < 2; i++) {
        const cx = W * (0.28 + 0.44 * i) + Math.sin(now / 7000 + i * 2) * W * 0.08;
        const cy = H * (0.22 + 0.14 * i) + Math.cos(now / 9000 + i) * H * 0.03;
        const rx = W * 0.5;
        const ry = H * 0.12;
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(i ? 0.12 : -0.1);
        ctx!.scale(1, ry / rx);
        const g = ctx!.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, i ? "rgba(255,120,190,0.14)" : "rgba(120,110,255,0.16)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(0, 0, rx, 0, TAU);
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.restore();

      // stars
      ctx!.fillStyle = "#fff";
      for (const s of stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((now / 1000) * s.speed + s.phase));
        ctx!.globalAlpha = a * 0.8;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, TAU);
        ctx!.fill();
      }

      // drifting motes
      for (const m of motes) {
        m.y -= m.speed * rawDt;
        m.x += Math.sin(now / 1500 + m.phase) * 12 * rawDt;
        if (m.y < -m.r) {
          m.y = H + m.r;
          m.x = rand(0, W);
        }
        ctx!.globalAlpha = m.alpha * (0.7 + 0.3 * Math.sin(now / 900 + m.phase));
        ctx!.drawImage(moteSprites[m.sprite], m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }
      ctx!.globalAlpha = 1;
    }

    function drawSplats() {
      for (const sp of splats) {
        ctx!.globalAlpha = 0.5 * clamp(sp.life / 1.2, 0, 1);
        ctx!.fillStyle = sp.color;
        ctx!.beginPath();
        for (const b of sp.blobs) {
          ctx!.moveTo(sp.x + b.dx + b.r, sp.y + b.dy);
          ctx!.arc(sp.x + b.dx, sp.y + b.dy, b.r, 0, TAU);
        }
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function drawEntity(e: Entity, now: number) {
      const r = e.radius;
      const art = e.kind === "fruit" ? FRUIT_ART[e.def!.key] : null;
      const c = Math.cos(e.rotation);
      const s = Math.sin(e.rotation);
      const lx = LX * c + LY * s;
      const ly = -LX * s + LY * c;
      const spd = Math.hypot(e.vx, e.vy);
      const k = clamp((spd - 300) / 7000, 0, 0.08);
      const va = Math.atan2(e.vy, e.vx);

      if (e.kind === "bomb") {
        const pulse = 0.6 + 0.4 * Math.sin(now / 110);
        const g = ctx!.createRadialGradient(e.x, e.y, r * 0.4, e.x, e.y, r * 1.6);
        g.addColorStop(0, `rgba(255,70,40,${0.42 * pulse})`);
        g.addColorStop(1, "rgba(255,70,40,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, r * 1.6, 0, TAU);
        ctx!.fill();
      } else if (e.golden) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 90);
        const g = ctx!.createRadialGradient(e.x, e.y, r * 0.3, e.x, e.y, r * 1.7);
        g.addColorStop(0, `rgba(255,215,0,${0.55 * pulse})`);
        g.addColorStop(1, "rgba(255,215,0,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, r * 1.7, 0, TAU);
        ctx!.fill();
      }

      // soft drop shadow
      ctx!.save();
      ctx!.translate(e.x + r * 0.16, e.y + r * 0.22);
      if (k > 0.005) {
        ctx!.rotate(va);
        ctx!.scale(1 + k, 1 - k);
        ctx!.rotate(-va);
      }
      ctx!.rotate(e.rotation);
      ctx!.fillStyle = "rgba(10,0,30,0.28)";
      if (art) art.path(ctx!, r);
      else circlePath(ctx!, r);
      ctx!.fill();
      ctx!.restore();

      // body
      ctx!.save();
      ctx!.translate(e.x, e.y);
      if (k > 0.005) {
        ctx!.rotate(va);
        ctx!.scale(1 + k, 1 - k);
        ctx!.rotate(-va);
      }
      ctx!.rotate(e.rotation);
      if (art) art.drawSkin(ctx!, r, lx, ly);
      else drawBomb(ctx!, r, lx, ly, now);
      ctx!.restore();
    }

    function drawHalf(h: FruitHalf) {
      const art = FRUIT_ART[h.fruitKey];
      if (!art) return;
      const r = h.radius;
      const big = r * 4;
      ctx!.save();
      ctx!.globalAlpha = clamp(h.life / 0.3, 0, 1);
      ctx!.translate(h.x, h.y);
      ctx!.rotate(h.rotation);
      ctx!.save();
      ctx!.rotate(h.localCut);
      ctx!.beginPath();
      if (h.side === 1) ctx!.rect(-big, 0, big * 2, big);
      else ctx!.rect(-big, -big, big * 2, big);
      ctx!.clip();
      ctx!.rotate(-h.localCut);
      art.drawFlesh(ctx!, r);
      // inner skin rim + cut edge highlight (both clipped to the fruit silhouette)
      ctx!.save();
      art.path(ctx!, r);
      ctx!.clip();
      art.path(ctx!, r);
      ctx!.strokeStyle = art.rim;
      ctx!.lineWidth = r * art.rimWidth * 2;
      ctx!.stroke();
      ctx!.rotate(h.localCut);
      ctx!.fillStyle = "rgba(255,255,255,0.4)";
      ctx!.fillRect(-r * 1.3, h.side === 1 ? 0 : -r * 0.07, r * 2.6, r * 0.07);
      ctx!.restore();
      art.path(ctx!, r);
      ctx!.strokeStyle = OUTLINE;
      ctx!.lineWidth = Math.max(1.2, r * 0.05);
      ctx!.stroke();
      ctx!.restore();
      ctx!.restore();
    }

    function drawParticles() {
      let hasGlow = false;
      for (const p of particles) {
        if (p.glow) {
          hasGlow = true;
          continue;
        }
        ctx!.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * (p.fade ? 0.7 : 1);
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, Math.max(0.2, p.radius), 0, TAU);
        ctx!.fill();
      }
      if (hasGlow) {
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        ctx!.shadowBlur = 12;
        for (const p of particles) {
          if (!p.glow) continue;
          ctx!.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
          ctx!.fillStyle = p.color;
          ctx!.shadowColor = p.color;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, Math.max(0.2, p.radius), 0, TAU);
          ctx!.fill();
        }
        ctx!.restore();
      }
      ctx!.globalAlpha = 1;
    }

    function drawEffects() {
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      ctx!.lineCap = "round";
      for (const s of slashes) {
        const t = s.life / s.maxLife;
        const len = s.len * (1.25 - 0.25 * t);
        const c = Math.cos(s.angle) * len * 0.5;
        const sn = Math.sin(s.angle) * len * 0.5;
        ctx!.globalAlpha = t;
        ctx!.strokeStyle = s.color;
        ctx!.lineWidth = 12 * t + 2;
        ctx!.beginPath();
        ctx!.moveTo(s.x - c, s.y - sn);
        ctx!.lineTo(s.x + c, s.y + sn);
        ctx!.stroke();
        ctx!.strokeStyle = "#fff";
        ctx!.lineWidth = 4 * t + 1;
        ctx!.stroke();
      }
      for (const rg of rings) {
        const t = 1 - rg.life / rg.maxLife;
        const e = 1 - Math.pow(1 - t, 3);
        const rad = rg.r0 + (rg.r1 - rg.r0) * e;
        ctx!.globalAlpha = 1 - t;
        ctx!.strokeStyle = rg.color;
        ctx!.lineWidth = rg.width * (1 - t) + 1;
        ctx!.beginPath();
        ctx!.arc(rg.x, rg.y, rad, 0, TAU);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function drawPopups() {
      ctx!.save();
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.lineJoin = "round";
      for (const p of popups) {
        const age = 1 - p.life / p.maxLife;
        const pop = age < 0.18 ? easeOutBack(age / 0.18) : 1;
        const sc = p.scale * pop;
        ctx!.globalAlpha = clamp(p.life / 0.35, 0, 1);
        ctx!.font = `800 ${Math.max(8, Math.round(22 * sc))}px "Baloo 2", "Nunito", sans-serif`;
        ctx!.lineWidth = 5;
        ctx!.strokeStyle = "rgba(30,5,40,0.75)";
        ctx!.strokeText(p.text, p.x, p.y);
        ctx!.fillStyle = p.color;
        ctx!.fillText(p.text, p.x, p.y);
      }
      ctx!.restore();
    }

    function drawTrail(now: number) {
      if (trail.length < 2) return;
      ctx!.save();
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.globalCompositeOperation = "lighter";
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1];
        const p1 = trail[i];
        const age = (now - p1.t) / TRAIL_FADE_MS;
        const alpha = clamp(1 - age, 0, 1);
        if (alpha <= 0) continue;
        ctx!.strokeStyle = `rgba(120,225,255,${alpha * 0.55})`;
        ctx!.lineWidth = Math.max(1, 18 * alpha);
        ctx!.beginPath();
        ctx!.moveTo(p0.x, p0.y);
        ctx!.lineTo(p1.x, p1.y);
        ctx!.stroke();
        ctx!.strokeStyle = `rgba(255,255,255,${alpha * 0.95})`;
        ctx!.lineWidth = Math.max(0.5, 5 * alpha);
        ctx!.beginPath();
        ctx!.moveTo(p0.x, p0.y);
        ctx!.lineTo(p1.x, p1.y);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function drawKeyboardCursor(now: number) {
      if (!kb.everUsed || pointer.active || state !== "playing") return;
      const pulse = 0.7 + 0.3 * Math.sin(now / 160);
      ctx!.save();
      ctx!.globalAlpha = 0.8;
      ctx!.strokeStyle = kb.active ? "#ffe066" : "rgba(255,255,255,0.65)";
      ctx!.lineWidth = 2.5;
      ctx!.beginPath();
      ctx!.arc(kb.x, kb.y, 16 * pulse, 0, TAU);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(kb.x - 24, kb.y);
      ctx!.lineTo(kb.x - 10, kb.y);
      ctx!.moveTo(kb.x + 10, kb.y);
      ctx!.lineTo(kb.x + 24, kb.y);
      ctx!.moveTo(kb.x, kb.y - 24);
      ctx!.lineTo(kb.x, kb.y - 10);
      ctx!.moveTo(kb.x, kb.y + 10);
      ctx!.lineTo(kb.x, kb.y + 24);
      ctx!.stroke();
      ctx!.restore();
    }

    // ---------------- main loop ----------------
    function frame(ts: number) {
      if (!lastTime) lastTime = ts;
      let rawDt = (ts - lastTime) / 1000;
      lastTime = ts;
      rawDt = Math.min(rawDt, 0.035);

      let dt = rawDt;
      if (slowMoTimer > 0) {
        dt = rawDt * 0.32;
        slowMoTimer -= rawDt * 1000;
      }

      const now = performance.now();

      // ----- update -----
      if (state === "playing") {
        elapsedPlaying += dt;

        let mx = 0;
        let my = 0;
        if (keysDown.has("ArrowLeft") || keysDown.has("KeyA")) mx -= 1;
        if (keysDown.has("ArrowRight") || keysDown.has("KeyD")) mx += 1;
        if (keysDown.has("ArrowUp") || keysDown.has("KeyW")) my -= 1;
        if (keysDown.has("ArrowDown") || keysDown.has("KeyS")) my += 1;
        if (mx !== 0 || my !== 0) {
          const len = Math.hypot(mx, my) || 1;
          const speed = 980 * scaleFactor();
          const nx = clamp(kb.x + (mx / len) * speed * dt, 14, W - 14);
          const ny = clamp(kb.y + (my / len) * speed * dt, 14, H - 14);
          checkSliceSegment(kb.x, kb.y, nx, ny);
          trail.push({ x: nx, y: ny, t: now });
          kb.x = nx;
          kb.y = ny;
          kb.active = true;
        } else {
          kb.active = false;
        }

        if (!frozen) {
          spawnTimerMs -= dt * 1000;
          if (spawnTimerMs <= 0) {
            spawnWave(now, elapsedPlaying);
            spawnTimerMs = computeSpawnInterval(elapsedPlaying);
          }

          timeLeft -= rawDt;
          if (now - lastHudTimeUpdate > 90) {
            lastHudTimeUpdate = now;
            setTimeRemainingReact(Math.max(0, timeLeft));
          }
          if (timeLeft <= 0 && !pendingGameOver) {
            timeLeft = 0;
            setTimeRemainingReact(0);
            endGame("timeout");
          }
        }

        if (comboCount > 0 && now - lastSliceTime > COMBO_RESET) {
          comboCount = 0;
          setComboReact(0);
        }

        if (pendingGameOver) {
          pendingGameOverTimer -= rawDt * 1000;
          if (pendingGameOverTimer <= 0) {
            pendingGameOver = false;
            endGame(pendingGameOverReason);
          }
        }
      } else if (state === "start") {
        // attract mode: fruit lazily arcs behind the menu
        attractTimerMs -= dt * 1000;
        if (attractTimerMs <= 0) {
          spawnSingle(now);
          if (Math.random() < 0.4) spawnSingle(now);
          attractTimerMs = rand(900, 1600);
        }
      }

      if (state !== "paused") {
        const g = gravity();
        for (let i = entities.length - 1; i >= 0; i--) {
          const e = entities[i];
          if (e.sliced) {
            entities.splice(i, 1);
            continue;
          }
          e.vy += g * dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.rotation += e.rotationSpeed * dt;

          // fuse sparks / golden shimmer
          e.emitTimer = (e.emitTimer ?? 0) - dt;
          if (e.emitTimer <= 0) {
            if (e.kind === "bomb") {
              e.emitTimer = 0.05;
              const c = Math.cos(e.rotation);
              const s = Math.sin(e.rotation);
              const tx = 0.42 * e.radius;
              const ty = -1.58 * e.radius;
              pushParticle({
                x: e.x + tx * c - ty * s,
                y: e.y + tx * s + ty * c,
                vx: rand(-70, 70),
                vy: rand(-140, -20),
                radius: rand(1, 2.6),
                color: Math.random() < 0.5 ? "#fff59d" : "#ffb300",
                life: rand(0.2, 0.42),
                maxLife: 0.42,
                gravity: 320,
                glow: true,
              });
            } else if (e.golden) {
              e.emitTimer = 0.11;
              const a = rand(0, TAU);
              pushParticle({
                x: e.x + Math.cos(a) * e.radius * 1.1,
                y: e.y + Math.sin(a) * e.radius * 1.1,
                vx: rand(-20, 20),
                vy: rand(-70, -20),
                radius: rand(1.2, 2.6),
                color: "#fff1a8",
                life: rand(0.4, 0.8),
                maxLife: 0.8,
                gravity: -40,
                glow: true,
              });
            } else {
              e.emitTimer = 1;
            }
          }

          if (e.y - e.radius > H + 90) {
            if (e.kind === "fruit" && state === "playing" && !frozen) {
              sound.miss();
              addShake(3);
              spawnMissPuff(clamp(e.x, 20, W - 20), H - 20);
              comboCount = 0;
              setComboReact(0);
            }
            entities.splice(i, 1);
          } else if (e.x < -160 || e.x > W + 160) {
            entities.splice(i, 1);
          }
        }

        for (let i = halves.length - 1; i >= 0; i--) {
          const h = halves[i];
          h.vy += g * 1.05 * dt;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          h.rotation += h.rotationSpeed * dt;
          h.life -= dt;
          if (h.life <= 0 || h.y - h.radius > H + 150) halves.splice(i, 1);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.vx *= 0.985;
          p.vy += p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = popups.length - 1; i >= 0; i--) {
          const p = popups[i];
          p.y += p.vy * dt;
          p.vy *= 0.94;
          p.life -= dt;
          if (p.life <= 0) popups.splice(i, 1);
        }

        for (let i = splats.length - 1; i >= 0; i--) {
          splats[i].life -= dt;
          if (splats[i].life <= 0) splats.splice(i, 1);
        }
        for (let i = slashes.length - 1; i >= 0; i--) {
          slashes[i].life -= rawDt;
          if (slashes[i].life <= 0) slashes.splice(i, 1);
        }
        for (let i = rings.length - 1; i >= 0; i--) {
          rings[i].life -= rawDt;
          if (rings[i].life <= 0) rings.splice(i, 1);
        }
      }

      while (trail.length && now - trail[0].t > TRAIL_FADE_MS) trail.shift();

      shakeMag -= shakeMag * 7 * rawDt;
      if (shakeMag < 0.05) shakeMag = 0;
      explosionFlash = Math.max(0, explosionFlash - rawDt * 1.6);
      goldenFlash = Math.max(0, goldenFlash - rawDt * 3);

      // ----- draw -----
      const offX = (Math.random() * 2 - 1) * shakeMag;
      const offY = (Math.random() * 2 - 1) * shakeMag;
      ctx!.save();
      ctx!.translate(offX, offY);

      drawScenery(now, rawDt);
      drawSplats();
      for (const e of entities) drawEntity(e, now);
      for (const h of halves) drawHalf(h);
      drawParticles();
      drawEffects();
      drawPopups();
      drawTrail(now);
      drawKeyboardCursor(now);

      ctx!.restore();

      if (explosionFlash > 0) {
        ctx!.fillStyle = `rgba(255,90,40,${explosionFlash * 0.35})`;
        ctx!.fillRect(0, 0, W, H);
      }
      if (goldenFlash > 0) {
        ctx!.fillStyle = `rgba(255,240,190,${goldenFlash * 0.2})`;
        ctx!.fillRect(0, 0, W, H);
      }

      rafId = requestAnimationFrame(frame);
    }

    let rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("pointerleave", endPointer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMute = () => {
    const m = sound.toggleMute();
    setMuted(m);
    if (!m) sound.click();
  };

  const handleSubmitName = (name: string) => {
    addScore({ name, score: finalStats.score, combo: finalStats.bestCombo, date: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a2f] font-body select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {(gameState === "playing" || gameState === "paused") && (
        <Hud
          score={score}
          timeRemaining={timeRemaining}
          totalTime={totalTime}
          combo={combo}
          onPause={() => actionsRef.current?.pauseGame()}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === "start" && (
        <StartScreen
          onStart={(durationSeconds) => {
            selectedDurationRef.current = durationSeconds;
            actionsRef.current?.startGame(durationSeconds);
          }}
          onDurationChange={(durationSeconds) => {
            selectedDurationRef.current = durationSeconds;
          }}
          initialDuration={selectedDurationRef.current}
          scores={scores}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === "paused" && (
        <PauseOverlay
          score={score}
          timeRemaining={timeRemaining}
          onResume={() => actionsRef.current?.resumeGame()}
          onRestart={() => actionsRef.current?.restartGame()}
          onQuit={() => actionsRef.current?.quitToMenu()}
        />
      )}

      {gameState === "gameover" && (
        <GameOverOverlay
          score={finalStats.score}
          bestCombo={finalStats.bestCombo}
          scores={scores}
          isNewHighScore={finalStats.isNewHighScore}
          reason={finalStats.reason}
          onSubmitName={handleSubmitName}
          onRestart={() => actionsRef.current?.restartGame()}
          onQuit={() => actionsRef.current?.quitToMenu()}
        />
      )}
    </div>
  );
}
