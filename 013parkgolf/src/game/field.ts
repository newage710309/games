// コースの絵（真上から見た地面・坂・水・木・根・橋・かまくら・まわりの景色）。
// 当たりは course.ts の形をそのまま使うので、ここで描いた形がそのままボールの当たりになる。

import { HEIGHT, WIDTH } from './constants';
import {
  KAMAKURA_R,
  TUNNEL_IN_R,
  inShape,
  polyPoints,
  shapePath,
  snowmanPos,
  surfaceAt,
  type Area,
  type Hole,
  type Obstacle,
  type Root,
  type Shape,
  type Slope,
  type Tunnel
} from './course';
import { drawCup, drawTee } from './golfer';
import { drawSnowman } from './snowman';
import { hash } from './ui';

export type Theme = 'spring' | 'autumn' | 'winter';

interface Palette {
  ob: string;
  obDark: string;
  rough: string;
  roughTuft: string;
  fairway: string;
  stripe: string;
  edge: string;
  water: string;
  waterDeep: string;
  waterEdge: string;
}

const PAL: Record<Theme, Palette> = {
  spring: {
    ob: '#a9d47e',
    obDark: '#8cbf63',
    rough: '#5e9f4c',
    roughTuft: '#4b8a3d',
    fairway: '#86c65a',
    stripe: '#93d067',
    edge: '#3f7a35',
    water: '#6cbde6',
    waterDeep: '#4a9fd0',
    waterEdge: '#d8efc0'
  },
  autumn: {
    ob: '#6b5631',
    obDark: '#58462a',
    rough: '#7a8c3e',
    roughTuft: '#66772f',
    fairway: '#a7b956',
    stripe: '#b3c562',
    edge: '#4f5a26',
    water: '#5d9fc4',
    waterDeep: '#467fa6',
    waterEdge: '#9a8a5a'
  },
  winter: {
    ob: '#dbe6f1',
    obDark: '#c6d6e7',
    rough: '#f6f9fd',
    roughTuft: '#dfe8f3',
    fairway: '#e4edf6',
    stripe: '#d8e4f0',
    edge: '#a9bdd3',
    water: '#6aa8d0',
    waterDeep: '#4c88b4',
    waterEdge: '#ffffff'
  }
};

export interface CourseView {
  hole: Hole;
  theme: Theme;
  /** カメラの上はし（ワールド座標）。 */
  camY: number;
  /** 時間（水のゆらぎ・雪だるま）。 */
  t: number;
  /** 雪だるまの動きに使う時刻（ふつうは t と同じ）。 */
  snowT?: number;
  /** 描く範囲の縦の長さ（ふつうは画面の高さ。全体図ではホールの長さ）。 */
  viewH?: number;
}

// --- まわりの景色（コースの外）の置きもの ----------------------------------------

interface Deco {
  k: 'tree' | 'flower' | 'bush' | 'mushroom' | 'mound' | 'reeds';
  x: number;
  y: number;
  r: number;
  v: number;
}

const decoCache = new WeakMap<Hole, Deco[]>();

/** コースの外に、面ごとの木や花を、乱数を使わずに並べる（ホールごとに 1 回だけ作る）。 */
function decosFor(hole: Hole, theme: Theme): Deco[] {
  const hit = decoCache.get(hole);
  if (hit) return hit;
  const out: Deco[] = [];
  const step = 34;
  for (let gy = -step; gy < hole.h + step * 2; gy += step) {
    for (let gx = 0; gx < WIDTH + step; gx += step) {
      const h1 = hash(gx * 0.13 + 1.7, gy * 0.11 + 3.1);
      const h2 = hash(gx * 0.07 + 9.1, gy * 0.19 + 0.3);
      const x = gx + (h1 - 0.5) * step * 0.9;
      const y = gy + (h2 - 0.5) * step * 0.9;
      // コースのわくから少しはなれた所だけ
      let near = false;
      for (const [dx, dy] of [
        [0, 0],
        [18, 0],
        [-18, 0],
        [0, 18],
        [0, -18]
      ] as const) {
        if (surfaceAt(hole, x + dx, y + dy) !== 'ob' || inShape(hole.areas[0]!.shape, x + dx, y + dy)) near = true;
      }
      if (near && !(y < 0 || y > hole.h)) continue;
      const r3 = hash(gx * 0.31, gy * 0.27);
      let k: Deco['k'];
      if (theme === 'spring') k = r3 < 0.34 ? 'tree' : r3 < 0.8 ? 'flower' : 'bush';
      else if (theme === 'autumn') k = r3 < 0.6 ? 'tree' : r3 < 0.78 ? 'mushroom' : 'bush';
      else k = r3 < 0.42 ? 'tree' : r3 < 0.8 ? 'mound' : 'bush';
      const far = Math.min(Math.abs(x - 240) - 160, 200);
      if (k === 'tree' && far < 0 && theme !== 'autumn') k = 'flower';
      out.push({ k, x, y, r: k === 'tree' ? 22 + h1 * 14 : 6 + h2 * 6, v: Math.floor(hash(gx, gy + 5) * 3) });
    }
  }
  // 木は奥（上）から順に描く
  out.sort((a, b) => a.y - b.y);
  decoCache.set(hole, out);
  return out;
}

// --- 木・岩 ---------------------------------------------------------------------

const TREE_COLORS: Record<Theme, readonly [string, string, string][]> = {
  // [葉, 明るい所, 輪郭]
  spring: [
    ['#f4b3c6', '#ffd8e4', '#c27890'],
    ['#5f9e48', '#86c260', '#3d6e2e'],
    ['#f7c4d3', '#ffe4ec', '#c98aa0']
  ],
  autumn: [
    ['#cc4a30', '#ec7a52', '#8a2c1c'],
    ['#e2b23a', '#f6d466', '#9c7618'],
    ['#d9772b', '#f2a054', '#94481a']
  ],
  winter: [
    ['#3f7a5a', '#5d9a76', '#24503a'],
    ['#4a8466', '#6aa682', '#2a5a40'],
    ['#3f7a5a', '#5d9a76', '#24503a']
  ]
};

/** 真上から見た木（丸い葉の固まり）。冬はとがった針葉樹に雪がつもる。 */
export function drawTreeTop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, theme: Theme, v = 0, t = 0): void {
  const [leaf, light, line] = TREE_COLORS[theme][v % 3]!;
  ctx.save();
  // 影
  ctx.fillStyle = theme === 'winter' ? 'rgba(80,110,150,0.22)' : 'rgba(20,40,10,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.28, y + r * 0.34, r * 1.02, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  if (theme === 'winter') {
    // 上から見た針葉樹：とがった星形を 2 段重ねて、雪をのせる
    for (const [k, rr, col] of [
      [0, r, leaf],
      [1, r * 0.68, light]
    ] as const) {
      ctx.fillStyle = col;
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const n = 9;
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 + k * 0.3;
        const rad = i % 2 === 0 ? rr : rr * 0.66;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      if (k === 0) ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.5 - 1, y + Math.sin(a) * r * 0.5 - 1.5, r * 0.22, r * 0.14, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // 丸い葉の固まり（まわりに 6 つ、まん中に 1 つ）
  ctx.fillStyle = leaf;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + v;
    const cx = x + Math.cos(a) * r * 0.5;
    const cy = y + Math.sin(a) * r * 0.5;
    ctx.moveTo(cx + r * 0.52, cy);
    ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // 明るい所（左上）
  ctx.fillStyle = light;
  for (let i = 0; i < 4; i++) {
    const a = -2.3 + i * 0.55;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }
  // 春の桜は花びら、秋は色の点
  if (theme === 'spring' && v % 3 !== 1) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + v;
      const d = r * (0.2 + hash(i, v) * 0.6);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'autumn') {
    ctx.fillStyle = 'rgba(255,240,180,0.5)';
    for (let i = 0; i < 5; i++) {
      const a = i * 2.1 + v;
      const d = r * (0.25 + hash(i, v + 2) * 0.5);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  void t;
  ctx.restore();
}

export function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, theme: Theme): void {
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,20,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r * 1.1);
  g.addColorStop(0, '#c9c6bd');
  g.addColorStop(1, '#8a877e');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#55524c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rad = r * (0.86 + hash(x + i, y) * 0.2);
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (theme === 'winter') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y - r * 0.3, r * 0.65, r * 0.42, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.2);
    ctx.lineTo(x - r * 0.1, y - r * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

/** 切り株（年輪）。 */
export function drawStump(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,10,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5330';
  ctx.strokeStyle = '#4a2f18';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d8b07a';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,40,0.55)';
  ctx.lineWidth = 0.9;
  for (const k of [0.55, 0.32]) {
    ctx.beginPath();
    ctx.arc(x + 0.6, y - 0.4, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, t: number): void {
  if (o.k === 'tree') drawTreeTop(ctx, o.x, o.y, o.r, theme, o.v ?? 0, t);
  else if (o.k === 'rock') drawRock(ctx, o.x, o.y, o.r, theme);
  else drawStump(ctx, o.x, o.y, o.r);
}

function drawDeco(ctx: CanvasRenderingContext2D, d: Deco, theme: Theme, t: number): void {
  if (d.k === 'tree') {
    drawTreeTop(ctx, d.x, d.y, d.r, theme, d.v, t);
    return;
  }
  ctx.save();
  if (d.k === 'flower') {
    const cols = ['#ffffff', '#ffe066', '#f7a8c0'];
    ctx.fillStyle = cols[d.v % 3]!;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(d.x + Math.cos(a) * 2.4, d.y + Math.sin(a) * 2.4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f0a020';
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.k === 'bush') {
    ctx.fillStyle = theme === 'winter' ? '#ffffff' : theme === 'autumn' ? '#8a6a2a' : '#6aaa50';
    ctx.strokeStyle = theme === 'winter' ? '#b9cce0' : 'rgba(30,50,20,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) ctx.arc(d.x - d.r * 0.6 + i * d.r * 0.6, d.y - (i === 1 ? d.r * 0.3 : 0), d.r * 0.62, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.k === 'mushroom') {
    ctx.fillStyle = '#f2e6d0';
    ctx.fillRect(d.x - 1.4, d.y - 1, 2.8, 4);
    ctx.fillStyle = d.v === 0 ? '#d8452f' : '#b0703a';
    ctx.beginPath();
    ctx.arc(d.x, d.y - 1, 4.2, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(d.x - 1.6, d.y - 3, 0.9, 0, Math.PI * 2);
    ctx.arc(d.x + 1.4, d.y - 2.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.k === 'mound') {
    ctx.fillStyle = 'rgba(150,175,205,0.35)';
    ctx.beginPath();
    ctx.ellipse(d.x + 2, d.y + 2, d.r * 1.6, d.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r * 1.5, d.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- 地面 -------------------------------------------------------------------------

function bbox(s: Shape): { x0: number; y0: number; x1: number; y1: number } {
  if (s.k === 'circle') return { x0: s.x - s.r, y0: s.y - s.r, x1: s.x + s.r, y1: s.y + s.r };
  const p = s.k === 'poly' ? polyPoints(s) : s.pts;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < p.length; i += 2) {
    x0 = Math.min(x0, p[i]!);
    x1 = Math.max(x1, p[i]!);
    y0 = Math.min(y0, p[i + 1]!);
    y1 = Math.max(y1, p[i + 1]!);
  }
  const m = s.k === 'band' ? s.w / 2 : 0;
  return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
}

function withClip(ctx: CanvasRenderingContext2D, s: Shape, paint: () => void): void {
  ctx.save();
  shapePath(ctx, s);
  ctx.clip('nonzero');
  paint();
  ctx.restore();
}

/** 外わく（ラフ）の縁：少し濃い線と白いくい（OB のしるし）。 */
function drawBoundary(ctx: CanvasRenderingContext2D, area: Area, theme: Theme, y0: number, y1: number): void {
  const s = area.shape;
  if (s.k !== 'poly') return;
  const p = polyPoints(s);
  ctx.save();
  ctx.strokeStyle = PAL[theme].edge;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  shapePath(ctx, s);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // 白いくい（OB）：外わくにそって一定の間かくで立てる
  let acc = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const x1 = p[i * 2]!;
    const yy1 = p[i * 2 + 1]!;
    const x2 = p[((i + 1) % n) * 2]!;
    const yy2 = p[((i + 1) % n) * 2 + 1]!;
    const l = Math.hypot(x2 - x1, yy2 - yy1);
    while (acc < l) {
      const u = acc / l;
      const x = x1 + (x2 - x1) * u;
      const y = yy1 + (yy2 - yy1) * u;
      if (y > y0 - 20 && y < y1 + 20) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 1, y - 1, 3, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1.5, y - 7, 3, 8);
        ctx.fillStyle = '#e2574c';
        ctx.fillRect(x - 1.5, y - 7, 3, 2.4);
      }
      acc += 46;
    }
    acc -= l;
  }
  ctx.restore();
}

function fillRough(ctx: CanvasRenderingContext2D, s: Shape, theme: Theme, y0: number, y1: number): void {
  const P = PAL[theme];
  shapePath(ctx, s);
  ctx.fillStyle = P.rough;
  ctx.fill();
  withClip(ctx, s, () => {
    // 草の小さな束（冬は雪のでこぼこ）
    ctx.strokeStyle = P.roughTuft;
    ctx.lineWidth = theme === 'winter' ? 2 : 1.2;
    ctx.beginPath();
    const st = 15;
    for (let y = Math.floor(y0 / st) * st; y < y1; y += st) {
      for (let x = 0; x < WIDTH; x += st) {
        const h = hash(x * 0.37, y * 0.53);
        const px = x + h * st;
        const py = y + hash(x * 0.11, y * 0.7) * st;
        if (theme === 'winter') {
          ctx.moveTo(px - 4, py);
          ctx.quadraticCurveTo(px, py - 3, px + 4, py);
        } else {
          ctx.moveTo(px - 2, py + 2);
          ctx.lineTo(px - 1, py - 2);
          ctx.moveTo(px + 1, py + 2);
          ctx.lineTo(px + 2, py - 2.4);
        }
      }
    }
    ctx.stroke();
    if (theme === 'winter') {
      // 深い雪のきらきら
      ctx.fillStyle = 'rgba(160,200,240,0.6)';
      for (let y = Math.floor(y0 / 22) * 22; y < y1; y += 22)
        for (let x = 0; x < WIDTH; x += 22) {
          if (hash(x, y) > 0.3) continue;
          ctx.fillRect(x + hash(y, x) * 20, y + hash(x + 1, y) * 20, 1.5, 1.5);
        }
    }
  });
}

function fillFairway(ctx: CanvasRenderingContext2D, s: Shape, theme: Theme, y0: number, y1: number): void {
  const P = PAL[theme];
  shapePath(ctx, s);
  ctx.fillStyle = P.fairway;
  ctx.fill();
  withClip(ctx, s, () => {
    // 芝刈りのしま（冬は圧雪車のすじ）
    const st = 36;
    ctx.fillStyle = P.stripe;
    for (let y = Math.floor(y0 / (st * 2)) * st * 2; y < y1; y += st * 2) ctx.fillRect(0, y, WIDTH, st);
    if (theme === 'winter') {
      ctx.strokeStyle = 'rgba(160,185,215,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = Math.floor(y0 / 6) * 6; y < y1; y += 6) {
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
      }
      ctx.stroke();
    }
  });
  // 縁取り
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  if (s.k === 'band') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  ctx.restore();
}

function fillWater(ctx: CanvasRenderingContext2D, a: Area, theme: Theme, t: number, y0: number, y1: number): void {
  const P = PAL[theme];
  const s = a.shape;
  // 岸（少し外側）
  ctx.save();
  if (s.k === 'band') {
    ctx.strokeStyle = P.waterEdge;
    ctx.lineWidth = s.w + 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.pts[0]!, s.pts[1]!);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i]!, s.pts[i + 1]!);
    ctx.stroke();
  } else {
    shapePath(ctx, s);
    ctx.strokeStyle = P.waterEdge;
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
  shapePath(ctx, s);
  ctx.fillStyle = P.water;
  ctx.fill();
  const b = bbox(s);
  withClip(ctx, s, () => {
    // 深い所（まん中ほど濃く）
    if (s.k !== 'band') {
      const cx = (b.x0 + b.x1) / 2;
      const cy = (b.y0 + b.y1) / 2;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.5);
      g.addColorStop(0, P.waterDeep);
      g.addColorStop(1, P.water);
      ctx.fillStyle = g;
      ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }
    // さざなみ（川・小川は流れる）
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const flow = a.look === 'pond' ? 0 : t * 18;
    for (let y = Math.max(b.y0, y0 - 20); y < Math.min(b.y1, y1 + 20); y += 13) {
      for (let x = b.x0; x < b.x1; x += 26) {
        const h = hash(x * 0.21, y * 0.37);
        const px = x + h * 20 + (a.look === 'river' ? 0 : flow % 26);
        const py = y + (a.look === 'river' ? -(flow % 13) : 0) + Math.sin(t * 1.5 + h * 6) * 1.5;
        ctx.moveTo(px - 4, py);
        ctx.quadraticCurveTo(px, py - 2, px + 4, py);
      }
    }
    ctx.stroke();
  });
  // 小川の岸の石
  if (a.look === 'stream' && s.k === 'band') {
    ctx.fillStyle = theme === 'winter' ? '#ffffff' : '#a89c88';
    for (let i = 0; i + 3 < s.pts.length; i += 2) {
      const x1 = s.pts[i]!;
      const yy1 = s.pts[i + 1]!;
      const x2 = s.pts[i + 2]!;
      const yy2 = s.pts[i + 3]!;
      const l = Math.hypot(x2 - x1, yy2 - yy1);
      const nx = -(yy2 - yy1) / l;
      const ny = (x2 - x1) / l;
      for (let d = 8; d < l; d += 19) {
        const u = d / l;
        for (const side of [-1, 1]) {
          const off = s.w / 2 + 3 + hash(d, side + i) * 2;
          ctx.beginPath();
          ctx.ellipse(x1 + (x2 - x1) * u + nx * off * side, yy1 + (yy2 - yy1) * u + ny * off * side, 3.2, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function fillLeaves(ctx: CanvasRenderingContext2D, s: Shape): void {
  shapePath(ctx, s);
  ctx.fillStyle = '#c98a3c';
  ctx.fill();
  const b = bbox(s);
  withClip(ctx, s, () => {
    const cols = ['#e2683a', '#f0b23e', '#b8442c', '#d98d30', '#8a5a2a'];
    for (let y = b.y0; y < b.y1; y += 7) {
      for (let x = b.x0; x < b.x1; x += 7) {
        const h = hash(x * 0.3, y * 0.7);
        ctx.fillStyle = cols[Math.floor(h * 5)]!;
        ctx.save();
        ctx.translate(x + hash(y, x) * 7, y + hash(x + 3, y) * 7);
        ctx.rotate(h * 6.3);
        ctx.beginPath();
        // もみじ・葉っぱの形（小さなひし形）
        ctx.moveTo(0, -3.6);
        ctx.quadraticCurveTo(2.8, 0, 0, 3.6);
        ctx.quadraticCurveTo(-2.8, 0, 0, -3.6);
        ctx.fill();
        ctx.restore();
      }
    }
  });
  ctx.save();
  shapePath(ctx, s);
  ctx.strokeStyle = 'rgba(120,70,20,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 4]);
  ctx.stroke();
  ctx.restore();
}

function fillSnow(ctx: CanvasRenderingContext2D, s: Shape): void {
  shapePath(ctx, s);
  ctx.fillStyle = '#fbfdff';
  ctx.fill();
  const b = bbox(s);
  withClip(ctx, s, () => {
    // ふかふかの雪のかたまり（青い影つき）
    for (let y = b.y0; y < b.y1; y += 12) {
      for (let x = b.x0; x < b.x1; x += 14) {
        const h = hash(x * 0.4, y * 0.3);
        const px = x + h * 10;
        const py = y + hash(y, x) * 8;
        ctx.fillStyle = 'rgba(170,195,225,0.55)';
        ctx.beginPath();
        ctx.ellipse(px + 1.5, py + 2, 6, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(px, py, 6, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  ctx.save();
  shapePath(ctx, s);
  ctx.strokeStyle = 'rgba(150,180,215,0.7)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

function fillIce(ctx: CanvasRenderingContext2D, s: Shape, t: number): void {
  shapePath(ctx, s);
  ctx.fillStyle = '#bfe4f6';
  ctx.fill();
  const b = bbox(s);
  withClip(ctx, s, () => {
    const g = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(120,180,220,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    // 光る線（ゆっくり動く）
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const sh = (t * 12) % 60;
    for (let k = b.x0 - 60 + sh; k < b.x1 + b.y1 - b.y0; k += 60) {
      ctx.moveTo(k, b.y0);
      ctx.lineTo(k - 18, b.y0 + 18);
      ctx.moveTo(k - 30, b.y0 + 30);
      ctx.lineTo(k - 38, b.y0 + 38);
    }
    for (let y = b.y0 + 20; y < b.y1; y += 50) {
      const x = b.x0 + hash(y, 2) * (b.x1 - b.x0);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 12, y + 12);
    }
    ctx.stroke();
    // ひび
    ctx.strokeStyle = 'rgba(90,150,200,0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let y = b.y0 + 14; y < b.y1; y += 46) {
      const x = b.x0 + 10 + hash(y, 7) * (b.x1 - b.x0 - 20);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8, y + 6);
      ctx.lineTo(x + 6, y + 14);
      ctx.moveTo(x + 8, y + 6);
      ctx.lineTo(x + 16, y + 4);
    }
    ctx.stroke();
  });
  ctx.save();
  shapePath(ctx, s);
  ctx.strokeStyle = 'rgba(110,170,210,0.8)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

/** 橋（小川をわたる板）。上下の向きにわたる（板は横、手すりは左右）。 */
function drawBridge(ctx: CanvasRenderingContext2D, s: Shape): void {
  const b = bbox(s);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(b.x0 + 3, b.y0 + 4, b.x1 - b.x0, b.y1 - b.y0);
  ctx.fillStyle = '#b98a56';
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.strokeStyle = '#6e4a26';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = b.y0 + 6; y < b.y1; y += 6) {
    ctx.moveTo(b.x0, y);
    ctx.lineTo(b.x1, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,190,0.25)';
  for (let y = b.y0 + 1; y < b.y1; y += 12) ctx.fillRect(b.x0, y, b.x1 - b.x0, 2);
  // 手すり
  for (const x of [b.x0 - 2, b.x1 - 2]) {
    ctx.fillStyle = '#7a5330';
    ctx.fillRect(x, b.y0 - 3, 4, b.y1 - b.y0 + 6);
    ctx.fillStyle = '#5a3a1e';
    for (const y of [b.y0 - 3, (b.y0 + b.y1) / 2 - 2, b.y1 - 1]) ctx.fillRect(x - 1, y, 6, 4);
  }
  ctx.restore();
}

/** 傾斜：下る向きに芝を濃くし、小さな矢印（強いほど 2 重）を並べる。 */
function drawSlope(ctx: CanvasRenderingContext2D, sl: Slope, theme: Theme, t: number, y0: number, y1: number): void {
  const b = bbox(sl.shape);
  if (b.y1 < y0 || b.y0 > y1) return;
  const dx = Math.cos(sl.dir);
  const dy = Math.sin(sl.dir);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const half = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2;
  withClip(ctx, sl.shape, () => {
    const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    const dark = theme === 'winter' ? 'rgba(80,120,170,0.24)' : 'rgba(20,60,10,0.26)';
    g.addColorStop(0, 'rgba(255,255,255,0.07)');
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    // 矢印（ゆっくり坂の下へ流れる）
    const strong = sl.g >= 26;
    const st = 34;
    const flow = (t * 6) % st;
    ctx.strokeStyle = theme === 'winter' ? 'rgba(70,110,160,0.55)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let gy = b.y0 - st; gy < b.y1 + st; gy += st) {
      for (let gx = b.x0 - st; gx < b.x1 + st; gx += st) {
        const ox = gx + ((Math.floor(gy / st) % 2) * st) / 2 + dx * flow;
        const oy = gy + dy * flow;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(sl.dir);
        ctx.beginPath();
        ctx.moveTo(-3, -4);
        ctx.lineTo(1.5, 0);
        ctx.lineTo(-3, 4);
        if (strong) {
          ctx.moveTo(-8, -4);
          ctx.lineTo(-3.5, 0);
          ctx.lineTo(-8, 4);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  });
}

/** 木の根のでこぼこ（地面に出た根）。 */
function drawRoot(ctx: CanvasRenderingContext2D, r: Root): void {
  ctx.save();
  ctx.lineCap = 'round';
  const dx = r.x2 - r.x1;
  const dy = r.y2 - r.y1;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    const N = 6;
    for (let k = 1; k <= N; k++) {
      const u = k / N;
      const w = Math.sin(u * Math.PI * 3) * 3;
      ctx.lineTo(r.x1 + dx * u + nx * w, r.y1 + dy * u + ny * w);
    }
  };
  ctx.strokeStyle = 'rgba(30,20,10,0.3)';
  ctx.lineWidth = 7;
  ctx.translate(1.5, 2);
  path();
  ctx.stroke();
  ctx.translate(-1.5, -2);
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 6;
  path();
  ctx.stroke();
  ctx.strokeStyle = '#8a5f36';
  ctx.lineWidth = 3;
  path();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,0.4)';
  ctx.lineWidth = 1;
  ctx.translate(-0.8, -0.8);
  path();
  ctx.stroke();
  ctx.restore();
}

/** かまくら（入口と出口）。同じ色のちょうちんで、つながっていることを見せる。 */
export function drawKamakura(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, exit: boolean, t: number): void {
  const R = exit ? KAMAKURA_R * 0.8 : KAMAKURA_R;
  ctx.save();
  ctx.fillStyle = 'rgba(90,120,160,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 6, R * 1.05, R * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, 2, x, y, R * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#cddcec');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#8fa6c2';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 雪のブロックの線
  ctx.strokeStyle = 'rgba(140,165,200,0.45)';
  ctx.lineWidth = 1;
  for (const k of [0.45, 0.75]) {
    ctx.beginPath();
    ctx.arc(x, y, R * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 穴（face の向き）
  const hx = x + Math.cos(face) * R * 0.78;
  const hy = y + Math.sin(face) * R * 0.78;
  ctx.fillStyle = '#2c3348';
  ctx.beginPath();
  ctx.ellipse(hx, hy, TUNNEL_IN_R, TUNNEL_IN_R * 0.75, face + Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,190,110,0.35)';
  ctx.beginPath();
  ctx.ellipse(hx, hy, TUNNEL_IN_R * 0.6, TUNNEL_IN_R * 0.4, face + Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();
  // ちょうちん（入口と出口で同じもの）
  const lx = x + Math.cos(face + 1.1) * R * 0.95;
  const ly = y + Math.sin(face + 1.1) * R * 0.95;
  const sw = Math.sin(t * 2.2) * 1.2;
  ctx.fillStyle = '#ff7a4a';
  ctx.strokeStyle = '#8a2a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(lx + sw, ly, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,150,0.8)';
  ctx.beginPath();
  ctx.ellipse(lx + sw - 1, ly - 1, 1.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  if (exit) {
    // 出口のしるし（出てくる向きの矢印）
    ctx.strokeStyle = 'rgba(70,100,150,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const ax = hx + Math.cos(face) * 16;
    const ay = hy + Math.sin(face) * 16;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(face) * 8, hy + Math.sin(face) * 8);
    ctx.lineTo(ax, ay);
    ctx.moveTo(ax + Math.cos(face + 2.5) * 5, ay + Math.sin(face + 2.5) * 5);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + Math.cos(face - 2.5) * 5, ay + Math.sin(face - 2.5) * 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTunnel(ctx: CanvasRenderingContext2D, tn: Tunnel, t: number): void {
  drawKamakura(ctx, tn.ix, tn.iy, tn.face, false, t);
  drawKamakura(ctx, tn.ox, tn.oy, tn.dir, true, t);
}

/** 雪だるま（コースの上では小さめ）。足元はボールの当たりの円のまん中より少し下。 */
export function drawCourseSnowman(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number, bump = 0): void {
  drawSnowman(ctx, x, y + 9, { scale: 0.78, hop: t * 1.2, face: dir, lift: bump * 6 });
}

// --- まとめて描く ---------------------------------------------------------------------

/** 背景とコースの地面（ボールや人物より下にあるもの）を描く。ctx はワールド座標（camY ずらし済み）で呼ぶ。 */
export function drawGround(ctx: CanvasRenderingContext2D, v: CourseView): void {
  const { hole, theme, camY, t } = v;
  const P = PAL[theme];
  const vh = v.viewH ?? HEIGHT;
  const y0 = camY;
  const y1 = camY + vh;
  // コースの外
  ctx.fillStyle = P.ob;
  ctx.fillRect(0, y0, WIDTH, vh);
  ctx.fillStyle = P.obDark;
  for (let y = Math.floor(y0 / 40) * 40; y < y1; y += 40) {
    for (let x = 0; x < WIDTH; x += 40) {
      if (hash(x * 0.17, y * 0.23) < 0.5) continue;
      ctx.beginPath();
      ctx.ellipse(x + hash(y, x) * 30, y + hash(x, y + 1) * 30, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 地面
  for (const [i, a] of hole.areas.entries()) {
    const b = bbox(a.shape);
    if (b.y1 < y0 - 10 || b.y0 > y1 + 10) continue;
    if (a.surf === 'rough' || (a.surf === 'snow' && i === 0)) fillRough(ctx, a.shape, theme, y0, y1);
    else if (a.surf === 'fairway') fillFairway(ctx, a.shape, theme, y0, y1);
    else if (a.surf === 'water') fillWater(ctx, a, theme, t, y0, y1);
    else if (a.surf === 'leaves') fillLeaves(ctx, a.shape);
    else if (a.surf === 'snow') fillSnow(ctx, a.shape);
    else if (a.surf === 'ice') fillIce(ctx, a.shape, t);
    else if (a.surf === 'bridge') drawBridge(ctx, a.shape);
    if (i === 0) drawBoundary(ctx, a, theme, y0, y1);
  }
  for (const sl of hole.slopes) drawSlope(ctx, sl, theme, t, y0, y1);
  for (const r of hole.roots) drawRoot(ctx, r);
  drawTee(ctx, hole.tee.x, hole.tee.y, hole.teeAim);
  drawCup(ctx, hole.cup.x, hole.cup.y);
}

/** ボールより上にあるもの（木・岩・かまくら・雪だるま・まわりの景色）を描く。 */
export function drawAbove(ctx: CanvasRenderingContext2D, v: CourseView): void {
  const { hole, theme, camY, t } = v;
  const y0 = camY - 40;
  const y1 = camY + (v.viewH ?? HEIGHT) + 40;
  for (const d of decosFor(hole, theme)) if (d.y > y0 && d.y < y1) drawDeco(ctx, d, theme, t);
  for (const o of hole.obstacles) if (o.y > y0 && o.y < y1) drawObstacle(ctx, o, theme, t);
  for (const tn of hole.tunnels) drawTunnel(ctx, tn, t);
  const st = v.snowT ?? t;
  for (const sm of hole.snowmen) {
    const p = snowmanPos(sm, st);
    drawCourseSnowman(ctx, p.x, p.y, p.dir, st);
  }
}

/** コース全体（デザイン確認・タイトルの背景用）。 */
export function drawCourseAll(ctx: CanvasRenderingContext2D, v: CourseView): void {
  ctx.save();
  ctx.translate(0, -v.camY);
  drawGround(ctx, v);
  drawAbove(ctx, v);
  ctx.restore();
}
