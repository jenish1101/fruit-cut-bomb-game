// Vector illustration toolkit for fruit, bombs and the scenery.
// Every fruit is drawn centred on the origin at radius `r`; callers handle
// translation/rotation. (lx, ly) is the light direction in the fruit's local
// frame so highlights stay "sun-lit" while the fruit tumbles.

export type Ctx = CanvasRenderingContext2D;
export type PathFn = (ctx: Ctx, r: number) => void;

export interface FruitArt {
  path: PathFn;
  drawSkin: (ctx: Ctx, r: number, lx: number, ly: number) => void;
  drawFlesh: (ctx: Ctx, r: number) => void;
  rim: string;
  rimWidth: number;
}

const TAU = Math.PI * 2;
export const OUTLINE = "rgba(35,8,45,0.42)";

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ paths
export const circlePath: PathFn = (ctx, r) => {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
};

const ellipsePath =
  (rx: number, ry: number): PathFn =>
  (ctx, r) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * rx, r * ry, 0, 0, TAU);
  };

const dimpledPath =
  (dip: number, top: number): PathFn =>
  (ctx, r) => {
    ctx.beginPath();
    ctx.moveTo(0, dip * r);
    ctx.bezierCurveTo(0.32 * r, top * r, 1.0 * r, -0.72 * r, 0.97 * r, 0);
    ctx.bezierCurveTo(0.95 * r, 0.62 * r, 0.5 * r, 1.0 * r, 0, 0.95 * r);
    ctx.bezierCurveTo(-0.5 * r, 1.0 * r, -0.95 * r, 0.62 * r, -0.97 * r, 0);
    ctx.bezierCurveTo(-1.0 * r, -0.72 * r, -0.32 * r, top * r, 0, dip * r);
    ctx.closePath();
  };

const applePath = dimpledPath(-0.7, -1.1);
const peachPath = dimpledPath(-0.8, -1.02);
const kiwiPath = ellipsePath(0.92, 1);
const pinePath = ellipsePath(0.74, 0.96);

const bananaPath: PathFn = (ctx, r) => {
  ctx.beginPath();
  ctx.moveTo(-0.98 * r, -0.42 * r);
  ctx.quadraticCurveTo(0, 1.45 * r, 0.98 * r, -0.42 * r);
  ctx.quadraticCurveTo(0, -0.12 * r, -0.98 * r, -0.42 * r);
  ctx.closePath();
};

const strawPath: PathFn = (ctx, r) => {
  ctx.beginPath();
  ctx.moveTo(0, 0.95 * r);
  ctx.bezierCurveTo(0.95 * r, 0.5 * r, 0.9 * r, -0.6 * r, 0, -0.6 * r);
  ctx.bezierCurveTo(-0.9 * r, -0.6 * r, -0.95 * r, 0.5 * r, 0, 0.95 * r);
  ctx.closePath();
};

const lemonPath: PathFn = (ctx, r) => {
  ctx.beginPath();
  ctx.moveTo(-1.05 * r, 0);
  ctx.quadraticCurveTo(-0.7 * r, -0.85 * r, 0, -0.74 * r);
  ctx.quadraticCurveTo(0.7 * r, -0.85 * r, 1.05 * r, 0);
  ctx.quadraticCurveTo(0.7 * r, 0.85 * r, 0, 0.74 * r);
  ctx.quadraticCurveTo(-0.7 * r, 0.85 * r, -1.05 * r, 0);
  ctx.closePath();
};

const GRAPES: [number, number][] = [
  [-0.4, -0.5],
  [0, -0.52],
  [0.4, -0.5],
  [-0.6, -0.1],
  [-0.2, -0.08],
  [0.2, -0.08],
  [0.6, -0.1],
  [-0.4, 0.32],
  [0, 0.34],
  [0.4, 0.32],
  [-0.2, 0.7],
  [0.2, 0.7],
];
const GR = 0.27;
const grapesPath: PathFn = (ctx, r) => {
  ctx.beginPath();
  for (const [x, y] of GRAPES) {
    ctx.moveTo((x + GR) * r, y * r);
    ctx.arc(x * r, y * r, GR * r, 0, TAU);
  }
};

// ---------------------------------------------------------------- helpers
function radialBody(ctx: Ctx, r: number, lx: number, ly: number, c0: string, c1: string, c2: string) {
  const g = ctx.createRadialGradient(lx * r, ly * r, r * 0.08, 0, 0, r * 1.15);
  g.addColorStop(0, c0);
  g.addColorStop(0.55, c1);
  g.addColorStop(1, c2);
  return g;
}

function flatRadial(ctx: Ctx, r: number, c0: string, c1: string) {
  const g = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}

function specular(ctx: Ctx, r: number, lx: number, ly: number, alpha = 0.35, size = 1) {
  const ang = Math.atan2(ly, lx);
  ctx.save();
  ctx.translate(lx * r * 1.05, ly * r * 1.05);
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.27 * size, r * 0.13 * size, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  const d = Math.hypot(lx, ly) * r * 1.3;
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
  ctx.beginPath();
  ctx.arc(Math.cos(ang + 0.55) * d, Math.sin(ang + 0.55) * d, r * 0.07 * size, 0, TAU);
  ctx.fill();
}

function strokePath(ctx: Ctx, path: PathFn, r: number, color: string, w: number) {
  path(ctx, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * w);
  ctx.lineJoin = "round";
  ctx.stroke();
}

function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, rot: number, c0 = "#9be15d", c1 = "#2e7d32") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(-len, 0, len, 0);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -wid, len, 0);
  ctx.quadraticCurveTo(0, wid, -len, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(15,55,20,0.55)";
  ctx.lineWidth = Math.max(1, len * 0.09);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(0.8, len * 0.06);
  ctx.beginPath();
  ctx.moveTo(-len * 0.75, 0);
  ctx.lineTo(len * 0.75, 0);
  ctx.stroke();
  ctx.restore();
}

function stem(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number) {
  ctx.strokeStyle = "#6d4c2a";
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2 + w, (y0 + y1) / 2, x1, y1);
  ctx.stroke();
}

function segments(ctx: Ctx, r: number, n: number, lineColor: string, pithColor: string) {
  ctx.strokeStyle = pithColor;
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1);
    ctx.lineTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84);
    ctx.stroke();
  }
  ctx.fillStyle = lineColor;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.08, 0, TAU);
  ctx.fill();
}

export function sparkle(ctx: Ctx, x: number, y: number, s: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(0, 0, s, 0);
  ctx.quadraticCurveTo(0, 0, 0, s);
  ctx.quadraticCurveTo(0, 0, -s, 0);
  ctx.quadraticCurveTo(0, 0, 0, -s);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, rad: number) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function quadY(y0: number, cy: number, y1: number, t: number) {
  return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
}

function crown(ctx: Ctx, r: number) {
  for (const i of [-3, 3, -2, 2, -1, 1, 0]) {
    const len = r * (0.55 + (3 - Math.abs(i)) * 0.1);
    const w = r * 0.13;
    ctx.save();
    ctx.translate(0, -r * 0.86);
    ctx.rotate(i * 0.3);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, "#2e7d32");
    g.addColorStop(1, "#8bc34a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(-w * 0.4, -len * 0.55, 0, -len);
    ctx.quadraticCurveTo(w * 0.4, -len * 0.55, w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(15,50,20,0.5)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.stroke();
    ctx.restore();
  }
}

function calyx(ctx: Ctx, r: number) {
  for (const i of [-2, 2, -1, 1, 0]) {
    ctx.save();
    ctx.translate(0, -r * 0.5);
    ctx.rotate(i * 0.55);
    const len = r * (0.42 - Math.abs(i) * 0.04);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, "#2e7d32");
    g.addColorStop(1, "#7ed957");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, 0);
    ctx.quadraticCurveTo(-r * 0.06, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(r * 0.06, -len * 0.5, r * 0.13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(15,50,20,0.5)";
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.stroke();
    ctx.restore();
  }
  stem(ctx, 0, -r * 0.55, 0.05 * r, -r * 0.85, Math.max(1.2, r * 0.07));
}

// -------------------------------------------------------- decoration data
const ORANGE_DIMPLES = (() => {
  const R = rng(7);
  return Array.from({ length: 26 }, () => {
    const a = R() * TAU;
    const d = 0.15 + R() * 0.72;
    return [Math.cos(a) * d, Math.sin(a) * d] as const;
  });
})();

const MELON_SEEDS = (() => {
  const R = rng(21);
  return Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU + R() * 0.4;
    const d = 0.3 + R() * 0.4;
    return [Math.cos(a) * d, Math.sin(a) * d, a + Math.PI / 2] as const;
  });
})();

const KIWI_FUZZ = Array.from({ length: 40 }, (_, i) => (i / 40) * TAU);
const KIWI_SPECK = (() => {
  const R = rng(99);
  return Array.from({ length: 24 }, () => {
    const a = R() * TAU;
    const d = R() * 0.8;
    return [Math.cos(a) * d, Math.sin(a) * d] as const;
  });
})();

const STRAW_SEEDS: [number, number][] = [
  [-0.3, -0.25],
  [0.3, -0.25],
  [0, -0.05],
  [-0.45, 0.05],
  [0.45, 0.05],
  [-0.2, 0.2],
  [0.2, 0.2],
  [-0.38, 0.4],
  [0.38, 0.4],
  [0, 0.45],
  [-0.18, 0.65],
  [0.18, 0.65],
];

// ------------------------------------------------------------------ fruit
function makeApple(golden: boolean): FruitArt {
  return {
    path: applePath,
    rim: golden ? "#f2b632" : "#e53935",
    rimWidth: 0.12,
    drawSkin(ctx, r, lx, ly) {
      applePath(ctx, r);
      ctx.fillStyle = golden
        ? radialBody(ctx, r, lx, ly, "#fff8cf", "#ffd23f", "#d98400")
        : radialBody(ctx, r, lx, ly, "#ff9d93", "#e5322d", "#8f1414");
      ctx.fill();
      ctx.save();
      applePath(ctx, r);
      ctx.clip();
      ctx.strokeStyle = golden ? "rgba(255,255,255,0.2)" : "rgba(255,200,120,0.18)";
      ctx.lineWidth = Math.max(1, r * 0.05);
      for (const dx of [-0.35, -0.1, 0.2, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, -0.9 * r);
        ctx.quadraticCurveTo(dx * r * 1.3, 0, dx * r, 0.9 * r);
        ctx.stroke();
      }
      ctx.restore();
      strokePath(ctx, applePath, r, OUTLINE, 0.06);
      stem(ctx, 0, -0.68 * r, 0.1 * r, -1.12 * r, Math.max(1.5, r * 0.11));
      leaf(ctx, 0.36 * r, -1.0 * r, 0.3 * r, 0.28 * r, -0.45);
      specular(ctx, r, lx, ly, golden ? 0.5 : 0.38);
      if (golden) {
        sparkle(ctx, -0.45 * r, -0.2 * r, r * 0.16, 0.95);
        sparkle(ctx, 0.5 * r, 0.35 * r, r * 0.11, 0.85);
        sparkle(ctx, 0.05 * r, 0.7 * r, r * 0.08, 0.8);
      }
    },
    drawFlesh(ctx, r) {
      applePath(ctx, r);
      ctx.fillStyle = flatRadial(ctx, r, golden ? "#fffbe8" : "#fff6dc", golden ? "#ffe9a8" : "#f7dfae");
      ctx.fill();
      ctx.fillStyle = "rgba(190,140,70,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 0.02 * r, 0.2 * r, 0.3 * r, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#3e2723";
      for (const [sx, sy, rot] of [
        [-0.07, -0.02, 0.3],
        [0.07, -0.02, -0.3],
        [0, 0.14, 0],
      ] as const) {
        ctx.save();
        ctx.translate(sx * r, sy * r);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.04 * r, 0.085 * r, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      stem(ctx, 0, -0.68 * r, 0.1 * r, -1.12 * r, Math.max(1.5, r * 0.11));
      leaf(ctx, 0.36 * r, -1.0 * r, 0.3 * r, 0.28 * r, -0.45);
    },
  };
}

const orange: FruitArt = {
  path: circlePath,
  rim: "#ff9f1c",
  rimWidth: 0.11,
  drawSkin(ctx, r, lx, ly) {
    circlePath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#ffd98a", "#ff9c1a", "#d9560b");
    ctx.fill();
    ctx.fillStyle = "rgba(120,50,0,0.14)";
    for (const [x, y] of ORANGE_DIMPLES) {
      ctx.beginPath();
      ctx.arc(x * r, y * r, r * 0.035, 0, TAU);
      ctx.fill();
    }
    strokePath(ctx, circlePath, r, OUTLINE, 0.06);
    ctx.fillStyle = "#8d6e63";
    ctx.beginPath();
    ctx.arc(0, -0.93 * r, r * 0.07, 0, TAU);
    ctx.fill();
    leaf(ctx, 0.3 * r, -0.95 * r, 0.3 * r, 0.26 * r, -0.35);
    specular(ctx, r, lx, ly, 0.35);
  },
  drawFlesh(ctx, r) {
    circlePath(ctx, r);
    ctx.fillStyle = flatRadial(ctx, r, "#ffc46b", "#ff9a1f");
    ctx.fill();
    segments(ctx, r, 9, "rgba(255,255,255,0.8)", "#ffe0b2");
    leaf(ctx, 0.3 * r, -0.95 * r, 0.3 * r, 0.26 * r, -0.35);
  },
};

const lemon: FruitArt = {
  path: lemonPath,
  rim: "#ffeb3b",
  rimWidth: 0.11,
  drawSkin(ctx, r, lx, ly) {
    lemonPath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#fffbb0", "#ffe93b", "#e0a318");
    ctx.fill();
    ctx.fillStyle = "rgba(150,110,0,0.14)";
    for (const [x, y] of ORANGE_DIMPLES) {
      ctx.beginPath();
      ctx.arc(x * r * 1.0, y * r * 0.7, r * 0.03, 0, TAU);
      ctx.fill();
    }
    strokePath(ctx, lemonPath, r, OUTLINE, 0.06);
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(1.0 * r, 0, r * 0.07, 0, TAU);
    ctx.fill();
    leaf(ctx, -0.95 * r, -0.2 * r, 0.26 * r, 0.24 * r, -1.0);
    specular(ctx, r, lx, ly, 0.35, 0.9);
  },
  drawFlesh(ctx, r) {
    lemonPath(ctx, r);
    ctx.fillStyle = flatRadial(ctx, r, "#fffde7", "#fff176");
    ctx.fill();
    ctx.save();
    ctx.scale(1, 0.72);
    segments(ctx, r, 9, "rgba(255,255,255,0.85)", "#fff9c4");
    ctx.restore();
    leaf(ctx, -0.95 * r, -0.2 * r, 0.26 * r, 0.24 * r, -1.0);
  },
};

const watermelon: FruitArt = {
  path: circlePath,
  rim: "#2f8f3b",
  rimWidth: 0.13,
  drawSkin(ctx, r, lx, ly) {
    circlePath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#9be36b", "#3f9d47", "#1e5f24");
    ctx.fill();
    ctx.save();
    circlePath(ctx, r);
    ctx.clip();
    ctx.strokeStyle = "rgba(14,70,24,0.8)";
    ctx.lineCap = "round";
    for (let i = 0; i <= 3; i++) {
      ctx.lineWidth = r * (0.13 - i * 0.02);
      ctx.beginPath();
      if (i === 0) {
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
      } else {
        ctx.ellipse(0, 0, (r * i) / 3.3, r * 1.02, 0, 0, TAU);
      }
      ctx.stroke();
    }
    ctx.restore();
    strokePath(ctx, circlePath, r, OUTLINE, 0.06);
    specular(ctx, r, lx, ly, 0.28);
  },
  drawFlesh(ctx, r) {
    circlePath(ctx, r);
    ctx.fillStyle = flatRadial(ctx, r, "#ff8a94", "#ff4d5e");
    ctx.fill();
    ctx.strokeStyle = "#fbe9e7";
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    for (const [x, y, a] of MELON_SEEDS) {
      ctx.save();
      ctx.translate(x * r, y * r);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.045, r * 0.085, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
};

const banana: FruitArt = {
  path: bananaPath,
  rim: "#ffd54f",
  rimWidth: 0.16,
  drawSkin(ctx, r, lx, ly) {
    bananaPath(ctx, r);
    const g = ctx.createLinearGradient(lx * r, ly * r, -lx * r, -ly * r);
    g.addColorStop(0, "#fff59d");
    g.addColorStop(0.5, "#ffd740");
    g.addColorStop(1, "#f9a825");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    bananaPath(ctx, r);
    ctx.clip();
    ctx.strokeStyle = "rgba(160,100,0,0.28)";
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.moveTo(-0.92 * r, -0.4 * r);
    ctx.quadraticCurveTo(0, 1.05 * r, 0.92 * r, -0.4 * r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.92 * r, -0.4 * r);
    ctx.quadraticCurveTo(0, 0.55 * r, 0.92 * r, -0.4 * r);
    ctx.stroke();
    ctx.restore();
    strokePath(ctx, bananaPath, r, OUTLINE, 0.06);
    ctx.fillStyle = "#5d4037";
    ctx.beginPath();
    ctx.arc(-0.95 * r, -0.42 * r, r * 0.1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.95 * r, -0.42 * r, r * 0.08, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.6 * r, 0.0);
    ctx.quadraticCurveTo(0, 0.82 * r, 0.55 * r, 0.02 * r);
    ctx.stroke();
  },
  drawFlesh(ctx, r) {
    bananaPath(ctx, r);
    ctx.fillStyle = "#fff3c4";
    ctx.fill();
    ctx.strokeStyle = "rgba(200,160,90,0.5)";
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(-0.88 * r, -0.4 * r);
    ctx.quadraticCurveTo(0, 0.68 * r, 0.88 * r, -0.4 * r);
    ctx.stroke();
    ctx.fillStyle = "rgba(90,60,30,0.6)";
    for (const t of [0.3, 0.5, 0.7]) {
      const x = (-0.88 + 1.76 * t) * r;
      const y = quadY(-0.4, 0.68, -0.4, t) * r;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.035, 0, TAU);
      ctx.fill();
    }
  },
};

const kiwi: FruitArt = {
  path: kiwiPath,
  rim: "#6d4c41",
  rimWidth: 0.09,
  drawSkin(ctx, r, lx, ly) {
    kiwiPath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#c5a880", "#8d6e4e", "#4e342e");
    ctx.fill();
    ctx.fillStyle = "rgba(60,35,20,0.25)";
    for (const [x, y] of KIWI_SPECK) {
      ctx.beginPath();
      ctx.arc(x * r * 0.92, y * r, r * 0.03, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(120,85,55,0.8)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.lineCap = "round";
    for (const a of KIWI_FUZZ) {
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * r * 0.92 * 0.97, s * r * 0.97);
      ctx.lineTo(c * r * 0.92 * 1.08, s * r * 1.08);
      ctx.stroke();
    }
    strokePath(ctx, kiwiPath, r, OUTLINE, 0.05);
    specular(ctx, r, lx, ly, 0.16);
  },
  drawFlesh(ctx, r) {
    kiwiPath(ctx, r);
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    g.addColorStop(0, "#d4ec8e");
    g.addColorStop(0.6, "#8bc34a");
    g.addColorStop(1, "#5d9a2a");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.max(1, r * 0.03);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.32);
      ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.92);
      ctx.stroke();
    }
    ctx.fillStyle = "#f4fbe4";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.26, r * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.2;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.48);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.035, r * 0.07, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
};

const pineapple: FruitArt = {
  path: pinePath,
  rim: "#c77800",
  rimWidth: 0.1,
  drawSkin(ctx, r, lx, ly) {
    pinePath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#ffe58a", "#f4a62a", "#a85d05");
    ctx.fill();
    ctx.save();
    pinePath(ctx, r);
    ctx.clip();
    ctx.strokeStyle = "rgba(110,60,5,0.45)";
    ctx.lineWidth = Math.max(1, r * 0.05);
    const step = r * 0.34;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-r + i * step, -r);
      ctx.lineTo(r + i * step, r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r + i * step, -r);
      ctx.lineTo(-r + i * step, r);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,240,180,0.35)";
    for (let j = -3; j <= 3; j++) {
      for (let i = -3; i <= 3; i++) {
        if ((i + j) % 2 !== 0) continue;
        ctx.beginPath();
        ctx.arc(i * step * 0.5, j * step * 0.5, r * 0.045, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    strokePath(ctx, pinePath, r, OUTLINE, 0.06);
    crown(ctx, r);
    specular(ctx, r, lx, ly, 0.22);
  },
  drawFlesh(ctx, r) {
    pinePath(ctx, r);
    ctx.fillStyle = flatRadial(ctx, r, "#fff3c4", "#ffd54f");
    ctx.fill();
    ctx.strokeStyle = "rgba(220,140,20,0.35)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.28);
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff8dc";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.16, r * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,130,20,0.4)";
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.stroke();
    crown(ctx, r);
  },
};

const strawberry: FruitArt = {
  path: strawPath,
  rim: "#e53950",
  rimWidth: 0.1,
  drawSkin(ctx, r, lx, ly) {
    strawPath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#ff97a8", "#e8334f", "#9e1030");
    ctx.fill();
    for (const [x, y] of STRAW_SEEDS) {
      ctx.save();
      ctx.translate(x * r, y * r);
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.04, r * 0.065, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,20,30,0.5)";
      ctx.lineWidth = Math.max(0.8, r * 0.02);
      ctx.stroke();
      ctx.restore();
    }
    strokePath(ctx, strawPath, r, OUTLINE, 0.06);
    calyx(ctx, r);
    specular(ctx, r, lx, ly, 0.3, 0.8);
  },
  drawFlesh(ctx, r) {
    strawPath(ctx, r);
    ctx.fillStyle = flatRadial(ctx, r, "#fff0f2", "#ffb3c1");
    ctx.fill();
    ctx.save();
    ctx.translate(0, 0.05 * r);
    ctx.scale(0.5, 0.6);
    strawPath(ctx, r);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
    ctx.strokeStyle = "rgba(230,60,90,0.25)";
    ctx.lineWidth = Math.max(1, r * 0.03);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2 + 0.1 * r);
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.75 + 0.1 * r);
      ctx.stroke();
    }
    calyx(ctx, r);
  },
};

const grapes: FruitArt = {
  path: grapesPath,
  rim: "#7e57c2",
  rimWidth: 0.07,
  drawSkin(ctx, r, lx, ly) {
    for (const [x, y] of GRAPES) {
      const gr = GR * r;
      ctx.save();
      ctx.translate(x * r, y * r);
      const g = ctx.createRadialGradient(lx * gr * 0.8, ly * gr * 0.8, gr * 0.1, 0, 0, gr * 1.1);
      g.addColorStop(0, "#d9c9f2");
      g.addColorStop(0.55, "#8e5bd6");
      g.addColorStop(1, "#3f1f8a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, gr, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = Math.max(1, r * 0.04);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.arc(lx * gr * 0.9, ly * gr * 0.9, gr * 0.22, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    stem(ctx, 0, -0.78 * r, 0.06 * r, -1.12 * r, Math.max(1.4, r * 0.08));
    leaf(ctx, 0.32 * r, -1.0 * r, 0.28 * r, 0.26 * r, -0.4);
  },
  drawFlesh(ctx, r) {
    for (const [x, y] of GRAPES) {
      const gr = GR * r;
      ctx.fillStyle = "#d8f2b4";
      ctx.beginPath();
      ctx.arc(x * r, y * r, gr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x * r, y * r, gr * 0.45, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#8d6e63";
      ctx.beginPath();
      ctx.ellipse(x * r, y * r, gr * 0.1, gr * 0.18, 0.4, 0, TAU);
      ctx.fill();
    }
    stem(ctx, 0, -0.78 * r, 0.06 * r, -1.12 * r, Math.max(1.4, r * 0.08));
    leaf(ctx, 0.32 * r, -1.0 * r, 0.28 * r, 0.26 * r, -0.4);
  },
};

const peach: FruitArt = {
  path: peachPath,
  rim: "#ffab40",
  rimWidth: 0.1,
  drawSkin(ctx, r, lx, ly) {
    peachPath(ctx, r);
    ctx.fillStyle = radialBody(ctx, r, lx, ly, "#ffe6bf", "#ffab45", "#e0620f");
    ctx.fill();
    ctx.save();
    peachPath(ctx, r);
    ctx.clip();
    const b = ctx.createRadialGradient(0.32 * r, 0.15 * r, 0, 0.32 * r, 0.15 * r, 0.95 * r);
    b.addColorStop(0, "rgba(255,70,110,0.65)");
    b.addColorStop(1, "rgba(255,70,110,0)");
    ctx.fillStyle = b;
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
    ctx.strokeStyle = "rgba(150,50,20,0.35)";
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -0.8 * r);
    ctx.quadraticCurveTo(0.16 * r, 0.05 * r, 0.02 * r, 0.95 * r);
    ctx.stroke();
    ctx.restore();
    strokePath(ctx, peachPath, r, OUTLINE, 0.06);
    leaf(ctx, -0.26 * r, -0.92 * r, 0.3 * r, 0.26 * r, 0.5);
    specular(ctx, r, lx, ly, 0.3);
  },
  drawFlesh(ctx, r) {
    peachPath(ctx, r);
    ctx.fillStyle = flatRadial(ctx, r, "#ffe0b2", "#ffb74d");
    ctx.fill();
    ctx.fillStyle = "#8d4e2a";
    ctx.beginPath();
    ctx.ellipse(0, 0.02 * r, 0.27 * r, 0.34 * r, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,25,5,0.5)";
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.ellipse(0, 0.02 * r, 0.18 * r, 0.24 * r, 0.3, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0.02 * r, 0.1 * r, 0.16 * r, -0.4, 0, TAU);
    ctx.stroke();
    leaf(ctx, -0.26 * r, -0.92 * r, 0.3 * r, 0.26 * r, 0.5);
  },
};

export const FRUIT_ART: Record<string, FruitArt> = {
  apple: makeApple(false),
  golden: makeApple(true),
  orange,
  lemon,
  watermelon,
  banana,
  kiwi,
  pineapple,
  strawberry,
  grapes,
  peach,
};

// ------------------------------------------------------------------- bomb
export function drawBomb(ctx: Ctx, r: number, lx: number, ly: number, now: number) {
  circlePath(ctx, r);
  const g = ctx.createRadialGradient(lx * r, ly * r, r * 0.05, 0, 0, r * 1.15);
  g.addColorStop(0, "#7c7c8a");
  g.addColorStop(0.5, "#2f2f3a");
  g.addColorStop(1, "#050508");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.stroke();

  ctx.save();
  circlePath(ctx, r);
  ctx.clip();
  const rg = ctx.createRadialGradient(-lx * r * 1.2, -ly * r * 1.2, r * 0.1, -lx * r * 1.2, -ly * r * 1.2, r * 1.1);
  rg.addColorStop(0, "rgba(255,90,60,0.4)");
  rg.addColorStop(1, "rgba(255,90,60,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();

  roundRect(ctx, -0.24 * r, -1.08 * r, 0.48 * r, 0.3 * r, 0.06 * r);
  const cg = ctx.createLinearGradient(-0.24 * r, 0, 0.24 * r, 0);
  cg.addColorStop(0, "#6b6b76");
  cg.addColorStop(0.5, "#b9b9c6");
  cg.addColorStop(1, "#5a5a66");
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.stroke();

  ctx.lineCap = "round";
  ctx.strokeStyle = "#c9a56a";
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(0, -1.05 * r);
  ctx.quadraticCurveTo(0.02 * r, -1.6 * r, 0.42 * r, -1.58 * r);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,60,20,0.6)";
  ctx.lineWidth = Math.max(0.8, r * 0.035);
  ctx.stroke();

  const fl = 0.7 + 0.3 * Math.sin(now / 45);
  const tx = 0.42 * r;
  const ty = -1.58 * r;
  const sg = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 0.55 * fl);
  sg.addColorStop(0, "rgba(255,220,90,0.95)");
  sg.addColorStop(0.4, "rgba(255,140,20,0.5)");
  sg.addColorStop(1, "rgba(255,120,0,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.55 * fl, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1, r * 0.04);
  const rot = now / 60;
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    const L = r * 0.3 * fl;
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(a) * L * 0.3, ty + Math.sin(a) * L * 0.3);
    ctx.lineTo(tx + Math.cos(a) * L, ty + Math.sin(a) * L);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.09, 0, TAU);
  ctx.fill();

  specular(ctx, r, lx, ly, 0.3);
}

// -------------------------------------------------------------- scenery
export function paintStaticBackground(ctx: Ctx, W: number, H: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0a0a2f");
  sky.addColorStop(0.3, "#1f1257");
  sky.addColorStop(0.58, "#48196f");
  sky.addColorStop(0.8, "#7b2168");
  sky.addColorStop(1, "#b03a5e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const sun = ctx.createRadialGradient(W * 0.5, H * 0.98, 0, W * 0.5, H * 0.98, Math.max(W, H) * 0.62);
  sun.addColorStop(0, "rgba(255,150,90,0.7)");
  sun.addColorStop(0.35, "rgba(255,100,120,0.28)");
  sun.addColorStop(1, "rgba(255,100,120,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cx = W * 0.5;
  const cy = H * 1.02;
  const L = Math.max(W, H) * 1.3;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.16 + 0.03 * Math.sin(i * 3.1);
    const spread = 0.035 + 0.02 * ((i * 7) % 3);
    const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    g.addColorStop(0, "rgba(255,190,140,0.11)");
    g.addColorStop(0.5, "rgba(255,190,140,0.03)");
    g.addColorStop(1, "rgba(255,190,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - spread) * L, cy + Math.sin(a - spread) * L);
    ctx.lineTo(cx + Math.cos(a + spread) * L, cy + Math.sin(a + spread) * L);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const layers = [
    { base: 0.84, amp: [0.05, 0.02], freq: [1.7, 4.3], color: "rgba(70,28,110,0.85)" },
    { base: 0.9, amp: [0.04, 0.015], freq: [2.3, 5.1], color: "rgba(40,16,74,0.95)" },
    { base: 0.95, amp: [0.03, 0.01], freq: [3.1, 6.7], color: "#170a2e" },
  ];
  layers.forEach((Ly, li) => {
    ctx.fillStyle = Ly.color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y =
        H *
        (Ly.base + Ly.amp[0] * Math.sin(t * Ly.freq[0] * Math.PI + li) + Ly.amp[1] * Math.sin(t * Ly.freq[1] * Math.PI + li * 2.3));
      ctx.lineTo(t * W, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  });

  const v = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(5,2,20,0)");
  v.addColorStop(1, "rgba(5,2,20,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export function makeGlowSprite(r: number, g: number, b: number, size = 64): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const x = c.getContext("2d")!;
  const grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, size, size);
  return c;
}
