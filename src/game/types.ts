export type GameState = "start" | "playing" | "paused" | "gameover";

export interface FruitDef {
  key: string;
  radius: [number, number];
  juiceColor: string;
  juiceColor2: string;
  score: number;
  weight: number;
}

export interface Entity {
  id: number;
  kind: "fruit" | "bomb";
  def: FruitDef | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  spawnTime: number;
  golden?: boolean;
  emitTimer?: number;
}

export interface FruitHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  /** Cut direction expressed in the fruit's local frame so it tumbles with the piece. */
  localCut: number;
  side: 1 | -1;
  radius: number;
  fruitKey: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  fade?: boolean;
  glow?: boolean;
}

export interface TextPopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export interface Splat {
  x: number;
  y: number;
  color: string;
  blobs: { dx: number; dy: number; r: number }[];
  life: number;
  maxLife: number;
}

export interface Slash {
  x: number;
  y: number;
  angle: number;
  len: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  color: string;
  width: number;
  life: number;
  maxLife: number;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  combo: number;
  date: string;
}

export const FRUITS: FruitDef[] = [
  { key: "apple", radius: [30, 42], juiceColor: "#ff6b6b", juiceColor2: "#fff1d6", score: 10, weight: 5 },
  { key: "orange", radius: [30, 42], juiceColor: "#ffa62b", juiceColor2: "#ffd58a", score: 10, weight: 5 },
  { key: "lemon", radius: [26, 34], juiceColor: "#ffee58", juiceColor2: "#fff9c4", score: 12, weight: 3 },
  { key: "watermelon", radius: [38, 50], juiceColor: "#ff4d6d", juiceColor2: "#ff8fa3", score: 15, weight: 3 },
  { key: "banana", radius: [30, 40], juiceColor: "#ffe082", juiceColor2: "#fff3c4", score: 10, weight: 4 },
  { key: "kiwi", radius: [26, 34], juiceColor: "#9ccc65", juiceColor2: "#d4ec8e", score: 12, weight: 4 },
  { key: "pineapple", radius: [34, 44], juiceColor: "#ffd54f", juiceColor2: "#fff3c4", score: 15, weight: 3 },
  { key: "strawberry", radius: [26, 34], juiceColor: "#ff5c8a", juiceColor2: "#ffc1d1", score: 12, weight: 4 },
  { key: "grapes", radius: [28, 36], juiceColor: "#9575cd", juiceColor2: "#d8f2b4", score: 12, weight: 4 },
  { key: "peach", radius: [28, 38], juiceColor: "#ffab61", juiceColor2: "#ffe0b2", score: 10, weight: 4 },
];

export const GOLDEN_FRUIT: FruitDef = {
  key: "golden",
  radius: [30, 38],
  juiceColor: "#ffd700",
  juiceColor2: "#fff8dc",
  score: 75,
  weight: 0,
};

export const HIGH_SCORE_KEY = "fruitSlash.highScores.v1";
export const MAX_HIGH_SCORES = 8;

export interface DurationOption {
  label: string;
  seconds: number;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];
