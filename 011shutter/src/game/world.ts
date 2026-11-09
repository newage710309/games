// 森の場面を描く。撮った写真もこの関数で描き直す（保存するのは場面の情報だけ）。
// 場面は「奥行き z」を持つ地面の上に、木・雪山・鳥・さくらちゃんを奥から順に並べ、最後に手前の枝や雪を重ねる。

import { drawBird, type BirdKind, type Mood } from './birds';
import { GROUND_FAR, HEIGHT, HUD_H, WIDTH, groundY, parallax, scaleAt } from './constants';
import { drawSakuraActor, type SakuraLook } from './poses';
import { drawSnowball, drawSnowman } from './snowman';
import { drawSnowfall, hash } from './ui';

export type ActorKind = 'sakura' | 'fake' | 'snowman' | 'tiny' | BirdKind;

/** 場面にいるもの（だれが、どこに、どんなようすで）。 */
export interface Actor {
  kind: ActorKind;
  /** 画面上の足元の x。 */
  x: number;
  /** 奥行き 0（奥）..1（手前）。1 を超えると手前の前景（横切る雪だるま）。 */
  z: number;
  /** 足元の y を直接決める（枝にとまっている鳥）。なければ地面。 */
  y?: number;
  /** 大きさを直接決める。なければ奥行きから。 */
  s?: number;
  /** 画面上の速さ（px/秒、写真のブレの判定用）。アルバムには保存しない。 */
  v?: number;
  /** なかまとだんごになっている（3 めんのお題）。 */
  dango?: boolean;
  /** さくらちゃん・そっくりさんの見た目。 */
  look?: SakuraLook;
  /** 鳥の羽ばたき・顔つき・ふくらみ。 */
  flap?: number;
  mood?: Mood;
  puff?: number;
  /** 地面から浮いている高さ（scale 1 あたりの px）。 */
  lift?: number;
  /** 雪だるまの動き。 */
  hop?: number;
  arm?: number;
  face?: number;
}

/** ある瞬間の場面。写真はこれを保存して、あとで描き直す。 */
export interface Snapshot {
  stage: number;
  /** 場面のスクロール量（px）。 */
  camX: number;
  t: number;
  actors: Actor[];
  /** 雪玉が当たって画面が白くなる量 0..1。 */
  flash: number;
  /** 飛んでいる雪玉（画面座標）。 */
  balls: { x: number; y: number; r: number }[];
}

// --- 背景の小物 ---------------------------------------------------------------

export type PropType = 'birch' | 'pine' | 'mound' | 'bush' | 'bigtree' | 'post' | 'grass' | 'rock';

interface Prop {
  type: PropType;
  /** 場面の中での位置（スクロール 0 のときの画面 x）。 */
  wx: number;
  z: number;
  size: number;
  seed: number;
}

/** 手前の前景（隠れる原因になる）。 */
type FgType = 'branch' | 'drift' | 'twig' | 'tuft' | 'fpine';
interface Fg {
  type: FgType;
  wx: number;
  size: number;
  seed: number;
}

/** 手前に立つ若い松（1 めん）の高さ（size 1 のとき）。 */
const FPINE_H = 300;
/** 前景の奥行き（スクロールの速さ）。 */
const FG_Z = 1.3;
/** 1 面のスクロールが進む最大量（これより先の小物は作らない）。 */
const WORLD_LEN = 2600;

function buildProps(stage: number): Prop[] {
  const props: Prop[] = [];
  const add = (type: PropType, wx: number, z: number, size: number, seed: number): void => {
    props.push({ type, wx, z, size, seed });
  };
  if (stage === 1) {
    // 木や しげみが多く、さくらちゃんがよく隠れる
    for (let k = 0; k < 64; k++) {
      const wx = -60 + k * 46 + hash(k, 11) * 30;
      const r = hash(k, 12);
      if (r < 0.36) add('birch', wx, 0.15 + hash(k, 13) * 0.65, 1, k);
      else if (r < 0.5) add('pine', wx, 0.02 + hash(k, 14) * 0.35, 0.8 + hash(k, 15) * 0.5, k);
      else if (r < 0.75) add('mound', wx, 0.3 + hash(k, 16) * 0.6, 0.9 + hash(k, 17) * 0.6, k);
      else add('bush', wx, 0.3 + hash(k, 18) * 0.6, 1 + hash(k, 19) * 0.4, k);
    }
  } else if (stage === 2) {
    // 鳥たちの集まる大きな木が、間をあけて並ぶ
    for (let k = 0; k < 6; k++) add('bigtree', 160 + k * 520 + hash(k, 21) * 60, 0.4 + hash(k, 22) * 0.12, 1, k);
    for (let k = 0; k < 30; k++) {
      const wx = -40 + k * 96 + hash(k, 23) * 50;
      const r = hash(k, 24);
      if (r < 0.4) add('pine', wx, 0.02 + hash(k, 25) * 0.3, 0.7 + hash(k, 26) * 0.4, k);
      else if (r < 0.75) add('bush', wx, 0.55 + hash(k, 27) * 0.35, 1 + hash(k, 28) * 0.4, k);
      else add('mound', wx, 0.6 + hash(k, 29) * 0.3, 0.9 + hash(k, 30) * 0.4, k);
    }
  } else {
    for (let k = 0; k < 34; k++) {
      const wx = -60 + k * 84 + hash(k, 31) * 40;
      const r = hash(k, 32);
      if (r < 0.22) add('pine', wx, 0.02 + hash(k, 33) * 0.3, 0.8 + hash(k, 34) * 0.5, k);
      else if (r < 0.5) add('post', wx, 0.2 + hash(k, 35) * 0.5, 1, k);
      else if (r < 0.8) add('mound', wx, 0.3 + hash(k, 36) * 0.6, 0.8 + hash(k, 37) * 0.7, k);
      else add('rock', wx, 0.3 + hash(k, 38) * 0.5, 0.8 + hash(k, 39) * 0.4, k);
    }
  }
  return props;
}

function buildFg(stage: number): Fg[] {
  const fg: Fg[] = [];
  // 1 めんは手前の枝・吹きだまりが多い
  const gap = stage === 1 ? 140 : 230;
  const n = Math.ceil(3700 / gap);
  for (let k = 0; k < n; k++) {
    const wx = (stage === 1 ? 60 : 200) + k * gap + hash(k, 41 + stage) * (gap * 0.5);
    const r = hash(k, 42 + stage);
    if (stage === 1) fg.push({ type: r < 0.3 ? 'branch' : r < 0.55 ? 'drift' : 'fpine', wx, size: 0.8 + hash(k, 43) * 0.5, seed: k });
    else if (stage === 2) fg.push({ type: r < 0.6 ? 'twig' : 'drift', wx, size: 0.8 + hash(k, 44) * 0.5, seed: k });
    else fg.push({ type: r < 0.6 ? 'tuft' : 'drift', wx, size: 0.8 + hash(k, 45) * 0.5, seed: k });
  }
  return fg;
}

const PROPS = [buildProps(1), buildProps(2), buildProps(3)];
const FGS = [buildFg(1), buildFg(2), buildFg(3)];

/** 小物の画面上の x。 */
const propX = (wx: number, z: number, camX: number): number => wx - camX * parallax(z);

// --- 形（隠れているかの判定にも使う） -----------------------------------------

/** 手前にあって、さくらちゃんを隠すかもしれない形（画面座標）。 */
export type Shape =
  | { kind: 'rect'; x0: number; y0: number; x1: number; y1: number; z: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; z: number }
  | { kind: 'capsule'; ax: number; ay: number; bx: number; by: number; r: number; z: number };

export function insideShape(sh: Shape, x: number, y: number): boolean {
  if (sh.kind === 'rect') return x >= sh.x0 && x <= sh.x1 && y >= sh.y0 && y <= sh.y1;
  if (sh.kind === 'ellipse') {
    const dx = (x - sh.cx) / sh.rx;
    const dy = (y - sh.cy) / sh.ry;
    return dx * dx + dy * dy <= 1;
  }
  const vx = sh.bx - sh.ax;
  const vy = sh.by - sh.ay;
  const l2 = vx * vx + vy * vy;
  const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - sh.ax) * vx + (y - sh.ay) * vy) / l2));
  const dx = x - (sh.ax + vx * u);
  const dy = y - (sh.ay + vy * u);
  return dx * dx + dy * dy <= sh.r * sh.r;
}

/** 大きな木の枝（2 めん）。鳥がとまる場所にもなる。画面座標の線分で返す。 */
export function bigTreeBranches(px: number, z: number): { x0: number; x1: number; y: number }[] {
  const g = groundY(z);
  const s = scaleAt(z) / 2.2;
  return [
    { x0: px - 150 * s, x1: px, y: g - 300 * s },
    { x0: px, x1: px + 170 * s, y: g - 230 * s },
    { x0: px - 130 * s, x1: px, y: g - 150 * s }
  ];
}

function propShapes(p: Prop, x: number): Shape[] {
  const g = groundY(p.z);
  const s = scaleAt(p.z);
  switch (p.type) {
    case 'birch': {
      const w = 6 + 16 * p.z;
      return [{ kind: 'rect', x0: x - w / 2, y0: 0, x1: x + w / 2, y1: g, z: p.z }];
    }
    case 'pine': {
      const h = 60 * s * p.size;
      return [{ kind: 'ellipse', cx: x, cy: g - h * 0.45, rx: h * 0.26, ry: h * 0.5, z: p.z }];
    }
    case 'mound':
      return [{ kind: 'ellipse', cx: x, cy: g, rx: 22 * s * p.size, ry: 10 * s * p.size, z: p.z }];
    case 'bush':
      return [{ kind: 'ellipse', cx: x, cy: g - 5 * s * p.size, rx: 20 * s * p.size, ry: 12 * s * p.size, z: p.z }];
    case 'rock':
      return [{ kind: 'ellipse', cx: x, cy: g - 3 * s * p.size, rx: 14 * s * p.size, ry: 9 * s * p.size, z: p.z }];
    case 'post': {
      const w = 3.4 * s;
      return [{ kind: 'rect', x0: x - w, y0: g - 30 * s, x1: x + w, y1: g, z: p.z }];
    }
    case 'bigtree': {
      const w = 18 * scaleAt(p.z);
      const shapes: Shape[] = [{ kind: 'rect', x0: x - w / 2, y0: 0, x1: x + w / 2, y1: g, z: p.z }];
      for (const b of bigTreeBranches(x, p.z)) shapes.push({ kind: 'capsule', ax: b.x0, ay: b.y, bx: b.x1, by: b.y, r: 5, z: p.z });
      return shapes;
    }
    default:
      return [];
  }
}

function fgShapes(f: Fg, x: number): Shape[] {
  switch (f.type) {
    case 'branch':
      return [
        { kind: 'capsule', ax: x - 20, ay: HUD_H - 10, bx: x + 120 * f.size, by: HUD_H + 120 * f.size, r: 20 * f.size, z: FG_Z }
      ];
    case 'twig':
      return [{ kind: 'capsule', ax: x, ay: HUD_H - 10, bx: x + 40 * f.size, by: HUD_H + 150 * f.size, r: 12 * f.size, z: FG_Z }];
    case 'drift':
      return [{ kind: 'ellipse', cx: x, cy: HEIGHT + 10, rx: 95 * f.size, ry: 62 * f.size, z: FG_Z }];
    case 'tuft':
      return [{ kind: 'ellipse', cx: x, cy: HEIGHT - 10, rx: 34 * f.size, ry: 56 * f.size, z: FG_Z }];
    case 'fpine': {
      // 手前に立つ若い松（とがった形なので、上は細く、下は太く）
      const h = FPINE_H * f.size;
      const base = HEIGHT + 30;
      return [
        { kind: 'ellipse', cx: x, cy: base - h * 0.22, rx: h * 0.36, ry: h * 0.24, z: FG_Z },
        { kind: 'ellipse', cx: x, cy: base - h * 0.55, rx: h * 0.22, ry: h * 0.22, z: FG_Z },
        { kind: 'ellipse', cx: x, cy: base - h * 0.82, rx: h * 0.1, ry: h * 0.16, z: FG_Z }
      ];
    }
    default:
      return [];
  }
}

/** 画面に見えている小物（さくらちゃんの隠れ場所、2 めんの大きな木）。 */
export function visibleProps(stage: number, camX: number): { type: PropType; x: number; z: number; size: number; seed: number }[] {
  const out: { type: PropType; x: number; z: number; size: number; seed: number }[] = [];
  for (const p of PROPS[stage - 1]) {
    const x = propX(p.wx, p.z, camX);
    if (x < -200 || x > WIDTH + 200) continue;
    out.push({ type: p.type, x, z: p.z, size: p.size, seed: p.seed });
  }
  return out;
}

/** 画面に見えている、ものを隠す形をすべて返す（写真の「隠れていない」の判定用）。 */
export function occluders(snap: Snapshot): Shape[] {
  const out: Shape[] = [];
  for (const p of PROPS[snap.stage - 1]) {
    const x = propX(p.wx, p.z, snap.camX);
    if (x < -260 || x > WIDTH + 260) continue;
    out.push(...propShapes(p, x));
  }
  for (const f of FGS[snap.stage - 1]) {
    const x = propX(f.wx, FG_Z, snap.camX);
    if (x < -260 || x > WIDTH + 260) continue;
    out.push(...fgShapes(f, x));
  }
  for (const a of snap.actors) {
    // 手前にいるそっくりさんも、本物を隠す
    if (a.kind === 'fake' && a.look) {
      const s = actorScale(a);
      const fy = actorFootY(a) - a.look.lift * s;
      out.push({ kind: 'ellipse', cx: a.x, cy: fy - 15.5 * s, rx: 13.5 * s, ry: 15 * s, z: a.z });
      continue;
    }
    // 地面を歩く鳥も、手前にいれば隠す（枝の上の鳥・だんごのなかまは数えない）
    if (a.kind === 'yamagara' || a.kind === 'gojukara' || a.kind === 'akagera' || a.kind === 'karasu') {
      if (a.y !== undefined) continue;
      const s = actorScale(a) * 0.92;
      const fy = actorFootY(a);
      out.push({ kind: 'ellipse', cx: a.x, cy: fy - 16 * s, rx: 12 * s, ry: 16 * s, z: a.z });
      continue;
    }
    if (a.kind !== 'snowman' || a.z <= 1) continue;
    const s = actorScale(a);
    const fy = actorFootY(a);
    out.push({ kind: 'ellipse', cx: a.x, cy: fy - 10 * s, rx: 11 * s, ry: 11 * s, z: a.z });
    out.push({ kind: 'ellipse', cx: a.x, cy: fy - 24 * s, rx: 8 * s, ry: 8 * s, z: a.z });
  }
  return out;
}

export const actorScale = (a: Actor): number => a.s ?? scaleAt(Math.min(a.z, 1.2));
export const actorFootY = (a: Actor): number => (a.y ?? groundY(Math.min(a.z, 1.12))) - (a.lift ?? 0) * actorScale(a);

// --- 背景 -------------------------------------------------------------------

export function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#2f6250', snow = 0.95): void {
  ctx.fillStyle = '#6a4a32';
  ctx.fillRect(x - s * 0.06, y - s * 0.12, s * 0.12, s * 0.14);
  for (let k = 0; k < 3; k++) {
    const top = y - s * (1 - k * 0.27);
    const w = s * (0.22 + k * 0.1);
    const h = s * 0.44;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top + h);
    ctx.quadraticCurveTo(x, top + h + s * 0.06, x - w, top + h);
    ctx.closePath();
    ctx.fill();
    if (snow <= 0) continue;
    const cap = k === 0 ? 0.42 : 0.26;
    ctx.fillStyle = `rgba(255,255,255,${snow})`;
    ctx.beginPath();
    ctx.moveTo(x, top + s * 0.015);
    ctx.lineTo(x + w * cap, top + h * cap);
    ctx.quadraticCurveTo(x + w * cap * 0.4, top + h * cap * 0.8, x, top + h * cap * 1.15);
    ctx.quadraticCurveTo(x - w * cap * 0.4, top + h * cap * 0.8, x - w * cap, top + h * cap);
    ctx.closePath();
    ctx.fill();
  }
}

function sky(ctx: CanvasRenderingContext2D, stops: [number, string][]): void {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_FAR);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/** 遠くの丘。scroll はスクロール量 × 奥の速さ。 */
function hills(ctx: CanvasRenderingContext2D, y: number, amp: number, color: string, seed: number, scroll: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = 0; x <= WIDTH; x += 12) {
    const u = x + scroll;
    const h = Math.sin(u * 0.012 + seed) * amp + Math.sin(u * 0.031 + seed * 2.3) * amp * 0.35;
    ctx.lineTo(x, y + h);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

/** 雪の地面。奥行きの帯ごとに、流れる雪の模様を描く。 */
function ground(ctx: CanvasRenderingContext2D, top: string, bottom: string, line: string, camX: number): void {
  const g = ctx.createLinearGradient(0, GROUND_FAR - 10, 0, HEIGHT);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_FAR - 6, WIDTH, HEIGHT - GROUND_FAR + 6);
  ctx.strokeStyle = line;
  for (let k = 1; k <= 9; k++) {
    const z = (k / 9) ** 1.2;
    const y = groundY(z);
    const off = (camX * parallax(z)) % 160;
    ctx.lineWidth = 0.8 + z * 1.6;
    ctx.beginPath();
    for (let j = -1; j < 5; j++) {
      const x = j * 160 - off + hash(k, j) * 30;
      const w = 30 + z * 50;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w / 2, y - 2 - z * 3, x + w, y);
    }
    ctx.stroke();
  }
}

function drawBirch(ctx: CanvasRenderingContext2D, x: number, bottom: number, w: number, seed: number): void {
  ctx.fillStyle = '#f2f0ea';
  ctx.fillRect(x - w / 2, 0, w, bottom);
  ctx.fillStyle = '#3a3532';
  for (let k = 0; k < 12; k++) {
    const y = ((k + 0.5) / 12) * bottom + hash(seed, k) * 10;
    const len = w * (0.3 + hash(k, seed) * 0.5);
    const left = hash(seed + 1, k) > 0.5;
    ctx.fillRect(left ? x - w / 2 : x + w / 2 - len, y, len, Math.max(1.2, w * 0.12));
  }
  ctx.strokeStyle = 'rgba(120,110,100,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, 0, w, bottom);
  // 根元の雪
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, bottom, w * 0.9, w * 0.28, 0, Math.PI, 0);
  ctx.fill();
}

function drawMound(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, tint = '#dbe7f3'): void {
  const g = ctx.createLinearGradient(0, y - ry, 0, y);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, tint);
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(120,145,175,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, stage: number): void {
  const leaf = stage === 3 ? '#5e4a62' : '#3d6a52';
  ctx.fillStyle = leaf;
  for (const [dx, dy, r] of [
    [-12, -4, 9],
    [0, -9, 11],
    [12, -4, 9]
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [
    [-12, -10, 6],
    [0, -17, 7],
    [12, -10, 6]
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, r * s, r * 0.55 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stage === 2) {
    // 赤い実
    ctx.fillStyle = '#d6423c';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(x + (k - 2) * 6 * s, y - (4 + (k % 2) * 5) * s, 1.6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#7a5a46';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 0.8;
  ctx.fillRect(x - 3 * s, y - 30 * s, 6 * s, 30 * s);
  ctx.strokeRect(x - 3 * s, y - 30 * s, 6 * s, 30 * s);
  ctx.fillStyle = '#fff4f0';
  ctx.beginPath();
  ctx.ellipse(x, y - 30 * s, 4.6 * s, 2.6 * s, 0, Math.PI, 0);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#9a8a9e';
  ctx.strokeStyle = '#5a4a62';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y);
  ctx.quadraticCurveTo(x - 15 * s, y - 10 * s, x - 4 * s, y - 12 * s);
  ctx.quadraticCurveTo(x + 12 * s, y - 13 * s, x + 14 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fbeee8';
  ctx.beginPath();
  ctx.ellipse(x - 1 * s, y - 9 * s, 11 * s, 4.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBigTree(ctx: CanvasRenderingContext2D, x: number, z: number): void {
  const g = groundY(z);
  const w = 18 * scaleAt(z);
  const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  grad.addColorStop(0, '#6e4c36');
  grad.addColorStop(0.5, '#8a6448');
  grad.addColorStop(1, '#5a3c2a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, 0);
  ctx.lineTo(x + w / 2, 0);
  ctx.lineTo(x + w / 2 + 6, g);
  ctx.lineTo(x - w / 2 - 6, g);
  ctx.closePath();
  ctx.fill();
  // 木の皮のすじ
  ctx.strokeStyle = 'rgba(60,40,28,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const xx = x - w / 2 + ((k + 0.5) / 4) * w;
    ctx.moveTo(xx, 0);
    ctx.bezierCurveTo(xx - 3, g * 0.3, xx + 3, g * 0.6, xx, g);
  }
  ctx.stroke();
  // 枝（上に雪がつもる）
  for (const b of bigTreeBranches(x, z)) {
    ctx.strokeStyle = '#6e4c36';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y);
    ctx.lineTo(b.x1, b.y);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(b.x0 + 4, b.y - 4.5);
    ctx.lineTo(b.x1 - 4, b.y - 4.5);
    ctx.stroke();
    // 先の小枝
    const tip = b.x0 < x - 1 ? b.x0 : b.x1;
    const d = b.x0 < x - 1 ? -1 : 1;
    ctx.strokeStyle = '#6e4c36';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tip, b.y);
    ctx.lineTo(tip + d * 22, b.y - 16);
    ctx.moveTo(tip - d * 30, b.y);
    ctx.lineTo(tip - d * 18, b.y - 20);
    ctx.stroke();
  }
  // 根元の雪
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, g, w, w * 0.3, 0, Math.PI, 0);
  ctx.fill();
}

function drawProp(ctx: CanvasRenderingContext2D, p: Prop, x: number, stage: number): void {
  const g = groundY(p.z);
  const s = scaleAt(p.z);
  switch (p.type) {
    case 'birch':
      drawBirch(ctx, x, g, 6 + 16 * p.z, p.seed);
      break;
    case 'pine':
      drawPine(ctx, x, g, 60 * s * p.size, stage === 3 ? '#4a3a5a' : '#3b6e58', stage === 3 ? 0.55 : 0.92);
      break;
    case 'mound':
      drawMound(ctx, x, g, 22 * s * p.size, 10 * s * p.size, stage === 3 ? '#efd2cc' : '#dbe7f3');
      break;
    case 'bush':
      drawBush(ctx, x, g, s * p.size * 0.9, stage);
      break;
    case 'post':
      drawPost(ctx, x, g, s);
      break;
    case 'rock':
      drawRock(ctx, x, g, s * p.size);
      break;
    case 'bigtree':
      drawBigTree(ctx, x, p.z);
      break;
    default:
      break;
  }
}

function drawFg(ctx: CanvasRenderingContext2D, f: Fg, x: number, stage: number): void {
  const s = f.size;
  switch (f.type) {
    case 'branch': {
      // 上から垂れる、雪をのせた松の枝
      const ax = x - 20;
      const ay = HUD_H - 10;
      const bx = x + 120 * s;
      const by = HUD_H + 120 * s;
      ctx.strokeStyle = '#5a3e2c';
      ctx.lineWidth = 7 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      for (let k = 0; k < 9; k++) {
        const u = k / 8;
        const px = ax + (bx - ax) * u;
        const py = ay + (by - ay) * u;
        ctx.fillStyle = '#2f5a48';
        ctx.beginPath();
        ctx.ellipse(px, py + 6 * s, 18 * s, 9 * s, 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(px - 3 * s, py - 2 * s, 14 * s, 6 * s, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'twig': {
      // 上から垂れる細い枝と、赤い実
      ctx.strokeStyle = '#4e3626';
      ctx.lineWidth = 4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, HUD_H - 10);
      ctx.quadraticCurveTo(x + 30 * s, HUD_H + 70 * s, x + 40 * s, HUD_H + 150 * s);
      ctx.moveTo(x + 22 * s, HUD_H + 60 * s);
      ctx.lineTo(x - 10 * s, HUD_H + 110 * s);
      ctx.stroke();
      ctx.fillStyle = '#d6423c';
      ctx.strokeStyle = '#7a1f20';
      ctx.lineWidth = 1;
      for (let k = 0; k < 9; k++) {
        const px = x + 38 * s + ((k % 3) - 1) * 7 * s;
        const py = HUD_H + 146 * s + Math.floor(k / 3) * 7 * s;
        ctx.beginPath();
        ctx.arc(px, py, 4.2 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      for (let k = 0; k < 6; k++) {
        const px = x - 10 * s + ((k % 3) - 1) * 6 * s;
        const py = HUD_H + 110 * s + Math.floor(k / 3) * 6 * s;
        ctx.beginPath();
        ctx.arc(px, py, 3.6 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'drift': {
      const g = ctx.createLinearGradient(0, HEIGHT - 60 * s, 0, HEIGHT);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, stage === 3 ? '#f1cfc6' : '#d6e4f1');
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(110,135,165,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, HEIGHT + 10, 95 * s, 62 * s, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'fpine':
      drawPine(ctx, x, HEIGHT + 30, FPINE_H * s, '#2f5a48', 0.95);
      break;
    case 'tuft': {
      // 雪から出た枯れ草
      ctx.strokeStyle = '#b08a5a';
      ctx.lineWidth = 2.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const bx = x + (k - 4) * 6 * s;
        const h = (60 + hash(f.seed, k) * 50) * s;
        ctx.moveTo(bx, HEIGHT);
        ctx.quadraticCurveTo(bx + (k - 4) * 2 * s, HEIGHT - h * 0.6, bx + (k - 4) * 5 * s, HEIGHT - h);
      }
      ctx.stroke();
      ctx.fillStyle = '#fff4f0';
      ctx.beginPath();
      ctx.ellipse(x, HEIGHT, 40 * s, 14 * s, 0, Math.PI, 0);
      ctx.fill();
      break;
    }
  }
}

function drawSkyLayer(ctx: CanvasRenderingContext2D, stage: number, camX: number, t: number): void {
  if (stage === 1) {
    // 雪の森の朝：うす青の空と、のぼったばかりのお日さま
    sky(ctx, [
      [0, '#8ccaf0'],
      [0.7, '#d7ecf6'],
      [1, '#fbe9dc']
    ]);
    const gl = ctx.createRadialGradient(110, 200, 6, 110, 200, 120);
    gl.addColorStop(0, 'rgba(255,246,214,0.95)');
    gl.addColorStop(0.3, 'rgba(255,236,190,0.45)');
    gl.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 60, 260, 260);
    ctx.fillStyle = '#fff8e2';
    ctx.beginPath();
    ctx.arc(110, 200, 20, 0, Math.PI * 2);
    ctx.fill();
    hills(ctx, GROUND_FAR - 40, 16, '#bcd6e8', 0.6, camX * 0.08);
    for (let k = 0; k < 14; k++) {
      const x = ((((k * 52 + hash(k, 1) * 20 - camX * 0.22) % 728) + 728) % 728) - 60;
      drawPine(ctx, x, GROUND_FAR + 2 - hash(k, 2) * 10, 54 + hash(k, 3) * 30, '#6a9e86', 0.85);
    }
  } else if (stage === 2) {
    // 鳥たちの集まる木：晴れた昼の空
    sky(ctx, [
      [0, '#5fa8e6'],
      [0.75, '#bfe0f4'],
      [1, '#e8f4fa']
    ]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x0, y, s] of [
      [90, 96, 1],
      [350, 128, 1.2],
      [226, 180, 0.7]
    ] as const) {
      const dx = ((((x0 - camX * 0.05 + t * 4 * s) % (WIDTH + 160)) + WIDTH + 160) % (WIDTH + 160)) - 40;
      ctx.beginPath();
      ctx.ellipse(dx, y, 34 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(dx - 18, y + 3, 22 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(dx + 18, y + 3, 24 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    hills(ctx, GROUND_FAR - 30, 18, '#a8c8de', 2.1, camX * 0.08);
    for (let k = 0; k < 14; k++) {
      const x = ((((k * 52 + hash(k, 4) * 20 - camX * 0.22) % 728) + 728) % 728) - 60;
      drawPine(ctx, x, GROUND_FAR + 2 - hash(k, 5) * 8, 50 + hash(k, 6) * 26, '#5a8a7a', 0.85);
    }
  } else {
    // 夕暮れの雪原
    sky(ctx, [
      [0, '#3d3a78'],
      [0.45, '#c46a7c'],
      [0.82, '#f3a35e'],
      [1, '#fcd492']
    ]);
    const sx = 330 - camX * 0.02;
    const g = ctx.createRadialGradient(sx, GROUND_FAR - 26, 8, sx, GROUND_FAR - 26, 130);
    g.addColorStop(0, 'rgba(255,240,180,0.95)');
    g.addColorStop(0.28, 'rgba(255,200,120,0.5)');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, GROUND_FAR - 26, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9ad';
    ctx.beginPath();
    ctx.arc(sx, GROUND_FAR - 26, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,230,0.9)';
    for (const [x, y] of [
      [70, 70],
      [150, 120],
      [410, 60],
      [260, 90]
    ] as const) {
      ctx.fillRect(x, y, 2, 2);
    }
    hills(ctx, GROUND_FAR - 16, 14, '#8a5a7e', 1.8, camX * 0.08);
    for (let k = 0; k < 9; k++) {
      const x = ((((k * 81 + hash(k, 7) * 30 - camX * 0.2) % 728) + 728) % 728) - 60;
      drawPine(ctx, x, GROUND_FAR + 4 - hash(k, 8) * 6, 46 + hash(k, 9) * 30, '#5a3f66', 0.38);
    }
  }
}

const GROUND_COLORS: Record<number, [string, string, string]> = {
  1: ['#eaf3fa', '#ffffff', 'rgba(150,180,210,0.35)'],
  2: ['#e6f0f8', '#fbfdff', 'rgba(150,180,210,0.35)'],
  3: ['#f1cdc6', '#fff1ea', 'rgba(190,130,150,0.35)']
};

// --- 場面 -------------------------------------------------------------------

function drawActor(ctx: CanvasRenderingContext2D, a: Actor, t: number): void {
  const s = actorScale(a);
  const fy = actorFootY(a);
  switch (a.kind) {
    case 'sakura':
    case 'fake':
      if (a.look) drawSakuraActor(ctx, a.x, fy, s, a.look, t);
      break;
    case 'snowman':
      drawSnowman(ctx, a.x, fy, { scale: s * 0.95, hop: a.hop ?? 0, lift: a.arm ?? 0, face: a.face ?? 0 });
      break;
    case 'tiny':
      drawSnowman(ctx, a.x, fy, { scale: s * TINY_SCALE, grin: true, face: a.face ?? 0, hop: a.hop ?? 0 });
      break;
    default:
      drawBird(ctx, a.x, fy, a.kind, { scale: s * (a.kind === 'enaga' ? 0.78 : 0.92), flap: a.flap ?? 0, mood: a.mood ?? 'normal', puff: a.puff ?? 0 });
      break;
  }
}

/** 場面を 1 枚描く。ゲーム画面にも、写真の描き直しにも使う。 */
export function drawWorld(ctx: CanvasRenderingContext2D, snap: Snapshot): void {
  const { stage, camX, t } = snap;
  drawSkyLayer(ctx, stage, camX, t);
  const [top, bottom, line] = GROUND_COLORS[stage];
  ground(ctx, top, bottom, line, camX);

  // 奥から順に：小物と、場面にいるもの
  type Item = { z: number; draw: () => void };
  const items: Item[] = [];
  for (const p of PROPS[stage - 1]) {
    const x = propX(p.wx, p.z, camX);
    if (x < -260 || x > WIDTH + 260) continue;
    items.push({ z: p.z, draw: () => drawProp(ctx, p, x, stage) });
  }
  for (const a of snap.actors) {
    if (a.z > 1) continue;
    // 枝にとまっている鳥は、その木の少し手前
    items.push({ z: a.z + 0.0005, draw: () => drawActor(ctx, a, t) });
  }
  items.sort((p, q) => p.z - q.z);
  for (const it of items) it.draw();

  // 手前の前景
  for (const f of FGS[stage - 1]) {
    const x = propX(f.wx, FG_Z, camX);
    if (x < -260 || x > WIDTH + 260) continue;
    drawFg(ctx, f, x, stage);
  }
  for (const a of snap.actors) if (a.z > 1) drawActor(ctx, a, t);
  for (const b of snap.balls) drawSnowball(ctx, b.x, b.y, b.r, t);

  if (stage === 1) drawSnowfall(ctx, t, HEIGHT, 30);
  if (snap.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, snap.flash)})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

export { WORLD_LEN };

/** こっそり写りこむ雪だるまの大きさ（同じ奥行きの さくらちゃんに対する倍率）。 */
export const TINY_SCALE = 0.4;
