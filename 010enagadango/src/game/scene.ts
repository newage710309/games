// 面の背景・枝とかたむき・かたむきメーター・「つぎに来る鳥」の列・注文の吹き出し・情報欄を描く。
// デザイン確認とゲーム本体の両方で使う。
import { BIRD_HALF_W, BIRD_H, BIRD_NAME, BIRD_WEIGHT, drawBird, drawWeightDots, type BirdKind, type Mood } from './birds';
import {
  BIRD_SCALE,
  BRANCH_T,
  HEIGHT,
  HUD_H,
  MAX_ANGLE,
  METER_H,
  METER_W,
  METER_X,
  METER_Y,
  PANEL_Y,
  PIVOT_X,
  PIVOT_Y,
  QUEUE_H,
  QUEUE_Y,
  SAKURA_SCALE,
  UNDO_BTN,
  WIDTH,
  slotSpacing
} from './constants';
import { drawSakura, drawSakuraFlower } from './sakura';
import { drawSnowGuest } from './snowman';
import { COLOR, drawSnowfall, hash, outlinedText, rr, text } from './ui';
import type { Order } from './rules';

export type { Order };

// --- 注文 -----------------------------------------------------------------

export function orderText(o: Order): string {
  if (o.type === 'near') return `${BIRD_NAME[o.who]}の となりがいい`;
  if (o.type === 'avoid') return `${BIRD_NAME[o.who]}の となりは こわい`;
  return 'はしっこが いい';
}

// --- 背景 -----------------------------------------------------------------

const HORIZON = 330;

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

/** 白樺の幹（1 めんの森の入り口）。 */
function drawBirch(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, w: number): void {
  ctx.fillStyle = '#f2f0ea';
  ctx.fillRect(x - w / 2, top, w, bottom - top);
  ctx.fillStyle = '#3a3532';
  for (let k = 0; k < 9; k++) {
    const y = top + ((k + 0.5) / 9) * (bottom - top) + hash(x, k) * 10;
    const len = w * (0.3 + hash(k, x) * 0.5);
    const left = hash(x + 1, k) > 0.5;
    ctx.fillRect(left ? x - w / 2 : x + w / 2 - len, y, len, 2.4);
  }
  ctx.strokeStyle = 'rgba(120,110,100,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, top, w, bottom - top);
}

function sky(ctx: CanvasRenderingContext2D, stops: [number, string][]): void {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function hills(ctx: CanvasRenderingContext2D, y: number, amp: number, color: string, seed: number, bottom = HEIGHT): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= WIDTH; x += 12) {
    const h = Math.sin(x * 0.012 + seed) * amp + Math.sin(x * 0.031 + seed * 2.3) * amp * 0.35;
    ctx.lineTo(x, y + h);
  }
  ctx.lineTo(WIDTH, bottom);
  ctx.closePath();
  ctx.fill();
}

/** 雪の谷の山（左右からせまる）。 */
function mountain(ctx: CanvasRenderingContext2D, x: number, peak: number, w: number, color: string, snow: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w, HORIZON + 20);
  ctx.lineTo(x - w * 0.12, peak + 6);
  ctx.quadraticCurveTo(x, peak - 4, x + w * 0.12, peak + 6);
  ctx.lineTo(x + w, HORIZON + 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, peak + 6);
  ctx.quadraticCurveTo(x, peak - 4, x + w * 0.12, peak + 6);
  ctx.lineTo(x + w * 0.34, peak + 46);
  ctx.lineTo(x + w * 0.18, peak + 38);
  ctx.lineTo(x + w * 0.04, peak + 52);
  ctx.lineTo(x - w * 0.1, peak + 36);
  ctx.lineTo(x - w * 0.24, peak + 48);
  ctx.lineTo(x - w * 0.34, peak + 46);
  ctx.closePath();
  ctx.fill();
}

/** 面の背景。stage は 1..3。t はアニメーション時間。 */
export function drawStageBackground(ctx: CanvasRenderingContext2D, stage: number, t: number): void {
  if (stage === 1) {
    // 森の入り口（晴れた冬の朝）
    sky(ctx, [
      [0, '#7cc0ee'],
      [0.75, '#cbe9f7'],
      [1, '#eef8fb']
    ]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, s] of [
      [90, 96, 1],
      [350, 78, 1.2],
      [226, 150, 0.7]
    ] as const) {
      const dx = (x + t * 4 * s) % (WIDTH + 120);
      ctx.beginPath();
      ctx.ellipse(dx - 40, y, 34 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(dx - 58, y + 3, 22 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(dx - 22, y + 3, 24 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    hills(ctx, HORIZON - 30, 12, '#c4dcea', 0.6);
    for (let k = 0; k < 11; k++) drawPine(ctx, 8 + k * 46 + hash(k, 1) * 20, HORIZON + 4 - hash(k, 2) * 10, 70 + hash(k, 3) * 40, '#5a9878', 0.8);
    hills(ctx, HORIZON + 8, 6, '#f4f9fc', 2.2);
    // 森へ入っていく小道
    ctx.fillStyle = '#e2ecf4';
    ctx.beginPath();
    ctx.moveTo(214, HORIZON + 14);
    ctx.quadraticCurveTo(170, 470, 120, HEIGHT);
    ctx.lineTo(360, HEIGHT);
    ctx.quadraticCurveTo(290, 470, 246, HORIZON + 14);
    ctx.closePath();
    ctx.fill();
    // 手前の白樺と松
    drawBirch(ctx, 28, 40, HEIGHT, 22);
    drawBirch(ctx, 452, 70, HEIGHT, 18);
    drawBirch(ctx, 76, 180, HEIGHT, 12);
    drawPine(ctx, 420, 470, 130, '#2f6250');
    drawPine(ctx, 112, 476, 110, '#3b6e58');
  } else if (stage === 2) {
    // 雪の谷（くもり空、雪がふる）
    sky(ctx, [
      [0, '#9fb3cf'],
      [0.7, '#d4dfeb'],
      [1, '#eef3f8']
    ]);
    mountain(ctx, 70, 120, 200, '#8ea4c2', '#f6f9fc');
    mountain(ctx, 420, 96, 220, '#7f95b6', '#f6f9fc');
    mountain(ctx, 250, 190, 150, '#a6b8d2', '#ffffff');
    hills(ctx, HORIZON, 10, '#e6eef6', 1.3);
    for (const [x, y, s] of [
      [30, 380, 90],
      [70, 400, 70],
      [400, 380, 96],
      [450, 410, 76],
      [150, 350, 46],
      [330, 350, 50]
    ] as const) {
      drawPine(ctx, x, y, s, '#4a6d7a', 0.95);
    }
    hills(ctx, 430, 14, '#f7fafd', 4.1);
    // 谷底の凍った川
    ctx.fillStyle = 'rgba(160,200,230,0.6)';
    ctx.beginPath();
    ctx.ellipse(240, 470, 120, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSnowfall(ctx, t, HEIGHT, 40);
  } else {
    // 夕暮れの森
    sky(ctx, [
      [0, '#3d3a78'],
      [0.45, '#c46a7c'],
      [0.82, '#f3a35e'],
      [1, '#fcd492']
    ]);
    const g = ctx.createRadialGradient(330, HORIZON - 30, 8, 330, HORIZON - 30, 130);
    g.addColorStop(0, 'rgba(255,240,180,0.95)');
    g.addColorStop(0.28, 'rgba(255,200,120,0.5)');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(330, HORIZON - 30, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9ad';
    ctx.beginPath();
    ctx.arc(330, HORIZON - 30, 26, 0, Math.PI * 2);
    ctx.fill();
    // 一番星
    ctx.fillStyle = 'rgba(255,255,230,0.9)';
    for (const [x, y] of [
      [70, 70],
      [150, 120],
      [410, 60]
    ] as const) {
      ctx.fillRect(x, y, 2, 2);
    }
    hills(ctx, HORIZON - 10, 14, '#8a5a7e', 1.8);
    for (let k = 0; k < 11; k++) drawPine(ctx, 6 + k * 46 + hash(k, 5) * 20, HORIZON + 14 - hash(k, 6) * 9, 70 + hash(k, 7) * 46, '#5a3f66', 0.38);
    hills(ctx, HORIZON + 30, 8, '#f3d6c8', 3.2);
    drawPine(ctx, 36, 480, 150, '#3c2b4a', 0.3);
    drawPine(ctx, 446, 470, 140, '#3c2b4a', 0.3);
  }
}

// --- 枝 -------------------------------------------------------------------

/** 枝の上の、ひとつの場所にあるもの。 */
export type SlotThing =
  | { kind: 'bird'; bird: BirdKind; order?: Order; ok?: boolean; mood?: Mood; puff?: number; snowball?: boolean }
  | { kind: 'snow'; weight: number };

export interface BranchLook {
  stage: number;
  /** 片側のとまれる場所の数（3 か 4）。 */
  perSide: number;
  /** 枝の角度（ラジアン）。右下がりが正。 */
  angle: number;
  /** 場所 -perSide..perSide に置かれたもの（添え字 = 場所 + perSide）。真ん中は使わない。 */
  slots: (SlotThing | null)[];
  /** 選んでいる場所。 */
  cursor?: number | null;
  /** 選んでいる場所にとまったときの角度（薄く重ねる）。 */
  ghostAngle?: number | null;
  /** 選んでいる場所の上で羽ばたいている鳥。 */
  incoming?: BirdKind | null;
  /** 雪玉がくる場所の予告。 */
  snowTargets?: number[];
  /** とまれる場所のしるしを描くか（デモでは描かない）。 */
  marks?: boolean;
  /** だんごに寄り集まる度合い 0..1（すき間なしでクリアしたとき）。1 で真ん中へぎゅっと押し合う。 */
  dango?: number;
  /** 真ん中のさくらちゃん。none = 空き（花のしるし）、on = とまっている、jump = 飛びこみ中（0..1）。 */
  sakura?: { state: 'none' } | { state: 'on'; happy?: boolean } | { state: 'jump'; p: number };
  t: number;
}

/** 枝の上の場所 pos の、画面上の位置（枝の上面）。 */
export function slotPoint(perSide: number, pos: number, angle: number): { x: number; y: number } {
  const d = pos * slotSpacing(perSide);
  return { x: PIVOT_X + Math.cos(angle) * d, y: PIVOT_Y + Math.sin(angle) * d };
}

/** だんごのときの、ふくらみ・重なり・内向きの傾き。 */
const DANGO_PUFF = 0.2;
const DANGO_OVERLAP = 7;
const DANGO_LEAN = 0.1;

/** 枝の上のものの横幅の半分（画面の px、ふくらみ込み）。 */
function thingHalfW(thing: SlotThing, puff: number): number {
  if (thing.kind === 'snow') return 15 + thing.weight * 3;
  return BIRD_HALF_W[thing.bird] * BIRD_SCALE * (1 + puff);
}

/**
 * 枝の上のものを描く横位置（真ん中からの距離）。ふだんは場所の位置そのまま。
 * だんごのときは、真ん中のさくらちゃんから外へ向かって、となりと重なるくらいまで詰めて並べる。
 */
export function thingOffsets(look: Pick<BranchLook, 'perSide' | 'slots' | 'dango'>): number[] {
  const sp = slotSpacing(look.perSide);
  const d = look.dango ?? 0;
  const xs: number[] = [];
  for (let p = -look.perSide; p <= look.perSide; p++) xs.push(p * sp);
  if (d <= 0) return xs;
  const sakuraHalf = 14.3 * SAKURA_SCALE * (1 + DANGO_PUFF * d);
  for (const s of [-1, 1]) {
    let edge = sakuraHalf - DANGO_OVERLAP;
    for (let k = 1; k <= look.perSide; k++) {
      const p = s * k;
      const thing = look.slots[p + look.perSide];
      if (!thing) break;
      const hw = thingHalfW(thing, DANGO_PUFF);
      const x = s * (edge + hw);
      edge = edge + hw * 2 - DANGO_OVERLAP;
      xs[p + look.perSide] = p * sp + (x - p * sp) * d;
    }
  }
  return xs;
}

/** かたむき（重さの差）から、枝の角度を決める。余裕ちょうどで MAX_ANGLE、それ以上は少しだけ大きく。 */
export function angleFor(tilt: number, limit: number): number {
  const r = tilt / limit;
  const c = Math.max(-1.35, Math.min(1.35, r));
  return c * MAX_ANGLE;
}

/** 枝の長さ（真ん中から片方の先まで）。 */
const halfLen = (perSide: number): number => perSide * slotSpacing(perSide) + 30;

/** 支える幹（画面の下から支点まで）。 */
function drawTrunk(ctx: CanvasRenderingContext2D, stage: number): void {
  const bark = stage === 3 ? '#5a3c3a' : '#7a5636';
  const dark = stage === 3 ? '#3d2628' : '#5a3d26';
  const top = PIVOT_Y + BRANCH_T + 2;
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(PIVOT_X - 30, HEIGHT);
  ctx.quadraticCurveTo(PIVOT_X - 20, 520, PIVOT_X - 13, top + 8);
  ctx.quadraticCurveTo(PIVOT_X, top - 6, PIVOT_X + 13, top + 8);
  ctx.quadraticCurveTo(PIVOT_X + 20, 520, PIVOT_X + 30, HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [x0, y0, len] of [
    [-6, 440, 30],
    [5, 470, 40],
    [-2, 520, 50],
    [9, 560, 30]
  ] as const) {
    ctx.moveTo(PIVOT_X + x0, y0);
    ctx.quadraticCurveTo(PIVOT_X + x0 + 3, y0 + len / 2, PIVOT_X + x0, y0 + len);
  }
  ctx.stroke();
  // 支点の三角（枝を受ける台）
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(PIVOT_X - 12, top + 10);
  ctx.lineTo(PIVOT_X, top - 4);
  ctx.lineTo(PIVOT_X + 12, top + 10);
  ctx.closePath();
  ctx.fill();
}

/** 枝そのもの（回転した座標で、x = 真ん中からの距離、y = 0 が上面）。 */
function branchShape(ctx: CanvasRenderingContext2D, perSide: number): void {
  const L = halfLen(perSide);
  ctx.beginPath();
  ctx.moveTo(-L, 2);
  ctx.quadraticCurveTo(-L - 6, BRANCH_T * 0.5, -L + 2, BRANCH_T - 3);
  ctx.quadraticCurveTo(0, BRANCH_T + 3, L - 2, BRANCH_T - 3);
  ctx.quadraticCurveTo(L + 6, BRANCH_T * 0.5, L, 2);
  ctx.quadraticCurveTo(0, -2, -L, 2);
  ctx.closePath();
}

function drawBranchWood(ctx: CanvasRenderingContext2D, look: BranchLook): void {
  const L = halfLen(look.perSide);
  const evening = look.stage === 3;
  // 先の小枝と葉（とまれない飾り）
  ctx.strokeStyle = evening ? '#5a3c3a' : '#6e4c30';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * (L - 10), 4);
    ctx.quadraticCurveTo(s * (L + 6), -6, s * (L + 16), -16);
    ctx.moveTo(s * (L - 22), 8);
    ctx.quadraticCurveTo(s * (L - 12), 18, s * (L + 2), 24);
  }
  ctx.stroke();
  ctx.fillStyle = evening ? '#5b6b4a' : '#4f8a5e';
  for (const s of [-1, 1]) {
    for (const [x, y, a] of [
      [L + 16, -16, -0.6],
      [L + 3, 24, 0.5],
      [L + 8, -10, 0.3]
    ] as const) {
      ctx.save();
      ctx.translate(s * x, y);
      ctx.rotate(s * a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // 枝
  const g = ctx.createLinearGradient(0, -2, 0, BRANCH_T + 3);
  g.addColorStop(0, evening ? '#a07462' : '#b88a5e');
  g.addColorStop(0.5, evening ? '#7c5448' : '#8d6340');
  g.addColorStop(1, evening ? '#55363a' : '#5f3f26');
  ctx.fillStyle = g;
  branchShape(ctx, look.perSide);
  ctx.fill();
  ctx.strokeStyle = evening ? '#3d2628' : '#4a3020';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 木目
  ctx.strokeStyle = 'rgba(60,35,20,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = -5; k <= 5; k++) {
    const x = k * (L / 5.6) + hash(k, 7) * 10;
    ctx.moveTo(x - 9, 6 + hash(k, 8) * 3);
    ctx.quadraticCurveTo(x, 4 + hash(k, 9) * 4, x + 9, 6 + hash(k, 8) * 3);
  }
  ctx.stroke();
  // 雪の面では、枝の上にうっすら雪
  if (look.stage >= 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(-L + 4, 1.5);
    for (let x = -L + 4; x <= L - 4; x += 8) ctx.lineTo(x, -0.5 - hash(x, 3) * 1.8);
    ctx.lineTo(L - 4, 1.5);
    ctx.quadraticCurveTo(0, 0.5, -L + 4, 1.5);
    ctx.fill();
  }
  // 支点の留め具
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.arc(0, BRANCH_T * 0.5, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9a070';
  ctx.beginPath();
  ctx.arc(-0.8, BRANCH_T * 0.5 - 0.8, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

/** とまれる場所のしるし（枝の上面の小さなくぼみ）。真ん中はさくらちゃんの花のしるし。 */
function drawSlotMarks(ctx: CanvasRenderingContext2D, look: BranchLook): void {
  const sp = slotSpacing(look.perSide);
  for (let p = -look.perSide; p <= look.perSide; p++) {
    const x = p * sp;
    if (p === 0) {
      if (look.sakura === undefined || look.sakura.state !== 'on') drawSakuraFlower(ctx, x, -1, 7, -0.25, true);
      continue;
    }
    if (look.slots[p + look.perSide] !== null) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeStyle = 'rgba(74,48,32,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, 0, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** 積もった雪。重さに応じて大きくなる。足元 (0, 0) = 枝の上面。 */
export function drawSnowPile(ctx: CanvasRenderingContext2D, x: number, weight: number, scale = 1): void {
  ctx.save();
  ctx.translate(x, 0.5);
  ctx.scale(scale, scale);
  const w = 15 + weight * 3;
  const h = 9 + weight * 6;
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d5e4f2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.9, -h * 0.7, -w * 0.45, -h, 0, -h);
  ctx.bezierCurveTo(w * 0.45, -h, w * 0.9, -h * 0.7, w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7c95b4';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.3, -h * 0.7, w * 0.22, h * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  drawWeightDots(ctx, 0, -5, weight, 1.6, 4.4);
  ctx.restore();
}

/** 雪玉（飛んでくるもの・頭にのったもの）。 */
export function drawSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r * 1.15);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c9dcef');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6f88a8';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(111,136,168,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(r * 0.2, r * 0.1, r * 0.5, 0.4, 2.2);
  ctx.stroke();
  ctx.restore();
}

/** 雪玉がくる場所の予告（点線の輪と矢印）。 */
function drawSnowTarget(ctx: CanvasRenderingContext2D, x: number, t: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -t * 12;
  ctx.strokeStyle = `rgba(80,140,220,${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(x, -22, 20, 26, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#3f78c8';
  ctx.beginPath();
  ctx.moveTo(x - 7, -62 - pulse * 4);
  ctx.lineTo(x + 7, -62 - pulse * 4);
  ctx.lineTo(x, -52 - pulse * 4);
  ctx.closePath();
  ctx.fill();
}

/** 枝と、その上のもの全部。 */
export function drawBranch(ctx: CanvasRenderingContext2D, look: BranchLook): void {
  const sp = slotSpacing(look.perSide);
  drawTrunk(ctx, look.stage);

  // 薄いかたむきの予告（選んでいる場所にとまったら、こうなる）
  if (look.ghostAngle !== undefined && look.ghostAngle !== null && Math.abs(look.ghostAngle - look.angle) > 0.002) {
    ctx.save();
    ctx.translate(PIVOT_X, PIVOT_Y);
    ctx.rotate(look.ghostAngle);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffffff';
    branchShape(ctx, look.perSide);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -look.t * 10;
    ctx.strokeStyle = '#ff6f98';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(PIVOT_X, PIVOT_Y);
  ctx.rotate(look.angle);
  drawBranchWood(ctx, look);
  if (look.marks !== false) drawSlotMarks(ctx, look);
  if (look.cursor !== undefined && look.cursor !== null) {
    const x = look.cursor * sp;
    const pulse = 0.5 + 0.5 * Math.sin(look.t * 7);
    ctx.strokeStyle = `rgba(255,111,152,${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, 0, 14 + pulse * 2, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const st of look.snowTargets ?? []) drawSnowTarget(ctx, st * sp, look.t);

  // 積もった雪と鳥（鳥は枝といっしょに傾く）。だんごでは外側から描き、内側の鳥が手前に重なるようにする。
  const d = look.dango ?? 0;
  const xs = thingOffsets(look);
  const order: number[] = [];
  for (let k = look.perSide; k >= 1; k--) order.push(-k, k);
  for (const p of order) {
    const thing = look.slots[p + look.perSide];
    if (!thing) continue;
    const x = xs[p + look.perSide]!;
    if (thing.kind === 'snow') {
      drawSnowPile(ctx, x, thing.weight);
      continue;
    }
    const sway = Math.sin(look.t * 2.2 + p * 1.3) * 0.03 * (1 - d);
    const squeeze = d > 0 ? Math.sin(look.t * 5 + Math.abs(p)) * 0.025 * d : 0;
    drawBird(ctx, x, 0, thing.bird, {
      scale: BIRD_SCALE,
      mood: thing.mood,
      puff: (thing.puff ?? 0) + DANGO_PUFF * d + squeeze,
      dots: d === 0,
      rotate: sway - Math.sign(p) * DANGO_LEAN * d
    });
    if (thing.snowball) drawSnowball(ctx, x, -BIRD_H[thing.bird] * BIRD_SCALE - 4, 9);
  }
  // さくらちゃん（真ん中・支点の上）
  if (look.sakura && look.sakura.state === 'on') {
    ctx.save();
    ctx.scale(1 + DANGO_PUFF * d, 1 - DANGO_PUFF * 0.3 * d);
    drawSakura(ctx, 0, -15 * SAKURA_SCALE, { scale: SAKURA_SCALE, eyes: look.sakura.happy ? 'happy' : 'dot', shadow: false });
    ctx.restore();
  }
  ctx.restore();

  // 注文の吹き出し（枝が傾いても、まっすぐ上に出す）
  for (let p = -look.perSide; p <= look.perSide; p++) {
    const thing = look.slots[p + look.perSide];
    if (!thing || thing.kind !== 'bird' || !thing.order) continue;
    const off = xs[p + look.perSide]!;
    const pt = { x: PIVOT_X + Math.cos(look.angle) * off, y: PIVOT_Y + Math.sin(look.angle) * off };
    const top = pt.y - BIRD_H[thing.bird] * BIRD_SCALE - (thing.snowball ? 18 : 0);
    drawOrderBubble(ctx, pt.x, top - 6, thing.order, thing.ok ?? true, look.t + p);
  }

  // 飛んでくる鳥（選んでいる場所の上で羽ばたく）
  if (look.incoming && look.cursor !== undefined && look.cursor !== null) {
    const pt = slotPoint(look.perSide, look.cursor, look.angle);
    const bob = Math.sin(look.t * 9) * 3;
    drawBird(ctx, pt.x, pt.y - 58 + bob, look.incoming, {
      scale: BIRD_SCALE,
      flap: 0.5 + 0.5 * Math.sin(look.t * 18),
      dots: true,
      alpha: 0.95
    });
  }

  // 飛びこむさくらちゃん
  if (look.sakura && look.sakura.state === 'jump') {
    const p = look.sakura.p;
    const x = PIVOT_X - 170 * (1 - p);
    const y = PIVOT_Y - 15 * SAKURA_SCALE - 150 * (1 - p) + -Math.sin(p * Math.PI) * 60;
    drawSakura(ctx, x, y, { scale: SAKURA_SCALE, view: 'right', flap: 0.5 + 0.5 * Math.sin(look.t * 20), shadow: false, rotate: 0.3 * (1 - p) });
  }
}

// --- 注文の吹き出し ----------------------------------------------------------

/** 小さな鳥の顔（吹き出しの中）。 */
function miniBird(ctx: CanvasRenderingContext2D, x: number, y: number, kind: BirdKind): void {
  drawBird(ctx, x, y + 8, kind, { scale: 0.48 });
}

/**
 * 注文の吹き出し。(x, y) が口の先（鳥の頭の上）。
 * 注文がかなっていないあいだは、赤いふちで小さくはずませて目立たせる。
 */
export function drawOrderBubble(ctx: CanvasRenderingContext2D, x: number, y: number, o: Order, ok: boolean, t: number): void {
  const bounce = ok ? 0 : Math.abs(Math.sin(t * 5)) * 3;
  const w = o.type === 'edge' ? 38 : 40;
  const h = 26;
  const cx = x;
  const cy = y - 9 - h / 2 - bounce;
  ctx.save();
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.96)' : '#ffe1e6';
  ctx.strokeStyle = ok ? '#4a3326' : '#e0365a';
  ctx.lineWidth = ok ? 1.4 : 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + h / 2 - 1);
  ctx.lineTo(x, y - bounce);
  ctx.lineTo(cx + 5, cy + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rr(ctx, cx - w / 2, cy - h / 2, w, h, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(cx - 4, cy + h / 2 - 2.5, 8, 4);

  if (o.type === 'edge') {
    // はしっこ：枝の先を指す矢印
    ctx.strokeStyle = '#6e4c30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 6);
    ctx.lineTo(cx + 12, cy + 6);
    ctx.stroke();
    ctx.fillStyle = '#e0365a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 15, cy - 3);
      ctx.lineTo(cx + s * 8, cy - 8);
      ctx.lineTo(cx + s * 8, cy + 2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    miniBird(ctx, cx + 6, cy + 2, o.who);
    if (o.type === 'near') {
      heart(ctx, cx - 11, cy, 6, '#f2557f');
    } else {
      // こわい：×じるし
      ctx.strokeStyle = '#e0365a';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 5);
      ctx.lineTo(cx - 6, cy + 5);
      ctx.moveTo(cx - 6, cy - 5);
      ctx.lineTo(cx - 16, cy + 5);
      ctx.stroke();
    }
  }
  if (ok) {
    // かなっている：小さな ✓
    ctx.strokeStyle = '#2f9e5a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + w / 2 - 7, cy - h / 2 - 1);
    ctx.lineTo(cx + w / 2 - 3, cy - h / 2 + 3);
    ctx.lineTo(cx + w / 2 + 4, cy - h / 2 - 6);
    ctx.stroke();
  }
  ctx.restore();
}

export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.8, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
  ctx.fill();
}

// --- つぎに来る鳥 -------------------------------------------------------------

export type QueueItem = { kind: 'bird'; bird: BirdKind; order?: Order } | { kind: 'snowball'; pos: number; weight: number };

/** 「つぎに来る鳥」の列。items[0] が今とまる鳥（大きく、枠つき）。perSide は雪玉の予告図に使う。 */
export function drawQueue(ctx: CanvasRenderingContext2D, items: QueueItem[], perSide: number, t: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.62)';
  rr(ctx, 8, QUEUE_Y, WIDTH - 16, QUEUE_H, 12);
  ctx.fill();
  text(ctx, 'つぎに 来る', 44, QUEUE_Y + 13, 11, COLOR.muted, true);
  if (items.length === 0) {
    text(ctx, 'みんな とまった！', WIDTH / 2, QUEUE_Y + QUEUE_H / 2 + 4, 16, COLOR.pink, true);
    return;
  }
  // 今の 1 羽
  const first = items[0]!;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = '#ff6f98';
  ctx.lineWidth = 2.4;
  rr(ctx, 16, QUEUE_Y + 20, 64, 46, 10);
  ctx.fill();
  ctx.stroke();
  drawQueueIcon(ctx, first, 48, QUEUE_Y + 62, 1.05, perSide, t);
  // そのあと
  let x = 112;
  for (const it of items.slice(1)) {
    if (x > WIDTH - 30) {
      text(ctx, '…', x - 8, QUEUE_Y + 44, 16, COLOR.muted, true);
      break;
    }
    drawQueueIcon(ctx, it, x, QUEUE_Y + 62, 0.95, perSide, t);
    x += 50;
  }
}

function drawQueueIcon(ctx: CanvasRenderingContext2D, it: QueueItem, x: number, y: number, s: number, perSide: number, t: number): void {
  if (it.kind === 'bird') {
    drawBird(ctx, x - 3 * s, y, it.bird, { scale: s, dots: true });
    if (it.order) {
      // 注文のある鳥は、小さな吹き出しのしるし
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4a3326';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 12 * s, y - 34 * s, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      text(ctx, '!', x + 12 * s, y - 34 * s, 9, '#e0365a', true);
    }
    return;
  }
  // 雪玉：どこに来るかを小さな枝の図で見せる
  drawSnowball(ctx, x, y - 22 * s, 11 * s, t);
  const w = 34 * s;
  const n = perSide * 2 + 1;
  ctx.strokeStyle = '#b88a5e';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - 4);
  ctx.lineTo(x + w / 2, y - 4);
  ctx.stroke();
  for (let k = 0; k < n; k++) {
    const p = k - perSide;
    const px = x - w / 2 + (k / (n - 1)) * w;
    ctx.fillStyle = p === it.pos ? '#3f78c8' : p === 0 ? '#f283a8' : 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(px, y - 4, p === it.pos ? 3 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- かたむきメーター -------------------------------------------------------

/**
 * かたむきメーター。tilt = 右 − 左 の重さの差、limit = 余裕（これを超えると落ちる）。
 * 余裕の内側は緑〜黄、外側は赤。ghost は選んでいる場所にとまったときの針（薄く）。
 */
export function drawMeter(ctx: CanvasRenderingContext2D, tilt: number, limit: number, ghost: number | null, t: number): void {
  const x0 = METER_X;
  const w = METER_W;
  const y = METER_Y;
  const h = METER_H;
  const range = limit + Math.max(2, Math.ceil(limit * 0.4));
  const toX = (v: number): number => x0 + w / 2 + (Math.max(-range, Math.min(range, v)) / range) * (w / 2);

  text(ctx, 'ひだり', x0 - 30, y + h / 2, 11, COLOR.ink, true);
  text(ctx, 'みぎ', x0 + w + 26, y + h / 2, 11, COLOR.ink, true);

  ctx.save();
  rr(ctx, x0, y, w, h, h / 2);
  ctx.clip();
  // 赤（落ちる）
  ctx.fillStyle = '#e0465f';
  ctx.fillRect(x0, y, w, h);
  // 余裕の内側
  const a = toX(-limit);
  const b = toX(limit);
  const g = ctx.createLinearGradient(a, 0, b, 0);
  g.addColorStop(0, '#ffd45e');
  g.addColorStop(0.3, '#8fdc8a');
  g.addColorStop(0.5, '#6fd08a');
  g.addColorStop(0.7, '#8fdc8a');
  g.addColorStop(1, '#ffd45e');
  ctx.fillStyle = g;
  ctx.fillRect(a, y, b - a, h);
  // 1 めもりずつ
  ctx.fillStyle = 'rgba(20,40,30,0.25)';
  for (let v = -range; v <= range; v++) {
    if (v === 0) continue;
    ctx.fillRect(toX(v) - 0.5, y + h - 5, 1, 5);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.6;
  rr(ctx, x0, y, w, h, h / 2);
  ctx.stroke();
  // 真ん中
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0 + w / 2 - 1.5, y - 4, 3, h + 8);
  drawSakuraFlower(ctx, x0 + w / 2, y - 6, 5, -0.25, false);

  // 予告の針（薄く）
  if (ghost !== null && ghost !== tilt) needle(ctx, toX(ghost), y, h, 0.45, Math.abs(ghost) > limit, t);
  needle(ctx, toX(tilt), y, h, 1, Math.abs(tilt) > limit, t);
}

function needle(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, alpha: number, danger: boolean, t: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const shake = danger ? Math.sin(t * 40) * 1.5 : 0;
  ctx.translate(x + shake, 0);
  ctx.fillStyle = danger ? '#ffffff' : '#2a1c24';
  ctx.strokeStyle = danger ? '#e0365a' : '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, y - 10);
  ctx.lineTo(7, y - 10);
  ctx.lineTo(0, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-1.5, y, 3, h);
  ctx.restore();
}

// --- 下の操作欄 --------------------------------------------------------------

export interface PanelState {
  /** 今の鳥の注文や、案内の文。 */
  message: string;
  messageColor?: string;
  tilt: number;
  limit: number;
  ghost: number | null;
  canUndo: boolean;
  t: number;
}

export function drawPanel(ctx: CanvasRenderingContext2D, p: PanelState): void {
  ctx.fillStyle = 'rgba(10,18,38,0.78)';
  ctx.fillRect(0, PANEL_Y, WIDTH, HEIGHT - PANEL_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, PANEL_Y, WIDTH, 1);
  text(ctx, p.message, WIDTH / 2, PANEL_Y + 18, 14, p.messageColor ?? COLOR.ink, true);
  drawMeter(ctx, p.tilt, p.limit, p.ghost, p.t);
  const b = UNDO_BTN;
  ctx.fillStyle = p.canUndo ? '#2a3c68' : 'rgba(42,60,104,0.4)';
  ctx.strokeStyle = p.canUndo ? '#8fb0e8' : 'rgba(143,176,232,0.3)';
  ctx.lineWidth = 1.6;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, '↶ ひとつもどす', b.x + b.w / 2, b.y + b.h / 2, 15, p.canUndo ? COLOR.ink : 'rgba(232,242,255,0.35)', true);
}

// --- 上の情報欄 --------------------------------------------------------------

export interface HudState {
  stage: number;
  /** 面の中の問題番号（1 から）と、その面の問題数。 */
  puzzle: number;
  puzzles: number;
  score: number;
  hiScore: number;
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, line: string): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 === 0 ? r : r * 0.46;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  text(ctx, '❚❚', 21, HUD_H / 2 + 1, 15, COLOR.muted, true);
  text(ctx, `${h.stage}めん`, 70, HUD_H / 2, 15, COLOR.ink, true);
  text(ctx, 'もんだい', 150, 12, 10, COLOR.muted, true);
  text(ctx, `${h.puzzle} / ${h.puzzles}`, 150, 27, 15, '#8fd0ff', true);
  text(ctx, 'てんすう', 270, 12, 10, COLOR.muted, true);
  text(ctx, h.score.toLocaleString('en-US'), 270, 27, 15, COLOR.ink, true);
  text(ctx, 'ハイスコア', 400, 12, 10, COLOR.muted, true);
  text(ctx, h.hiScore.toLocaleString('en-US'), 400, 27, 15, COLOR.muted, true);
}

// --- そのほか ----------------------------------------------------------------

/** 雪玉を投げる雪だるま（3 めん、枝の横の地面）。 */
export function drawThrower(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, windup = 0): void {
  // 枝より高い、雪の崖の上に立つ
  ctx.fillStyle = '#f4ecf0';
  ctx.strokeStyle = 'rgba(120,90,120,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 46, y + 60);
  ctx.quadraticCurveTo(x - 40, y - 2, x, y - 2);
  ctx.quadraticCurveTo(x + 40, y - 2, x + 60, y + 60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawSnowGuest(ctx, x, y + 2, 'none', { scale: 1.7, hop: t * 0.4, rotate: windup * 0.25 });
  if (windup > 0) drawSnowball(ctx, x - 22 + windup * 6, y - 62 - windup * 8, 9, t);
}

/** ふきだし。(x, y) がまん中、(tx, ty) が口の先。 */
export function say(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, tx: number, ty: number, size = 16): void {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  const w = Math.max(64, s.length * size * 0.98 + 24);
  const h = size + 18;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + h / 2 - 1);
  ctx.lineTo(tx, ty);
  ctx.lineTo(x + 9, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 2.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.fillRect(x - 8, y + h / 2 - 3, 16, 4);
  text(ctx, s, x, y, size, '#4a3326', true);
  ctx.restore();
}

/** 飛び立つときの羽根。 */
export function drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, color = '#ffffff'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(74,51,38,0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.restore();
}

/** ばさばさっ（失敗のときの文字）。 */
export function drawBigWord(ctx: CanvasRenderingContext2D, s: string, y: number, size: number, color: string, outline: string): void {
  outlinedText(ctx, s, WIDTH / 2, y, size, color, outline);
}

export { BIRD_WEIGHT };
