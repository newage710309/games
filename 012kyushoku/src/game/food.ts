// 給食の品（スープ・どんぐり・にんじん・シチュー・あぶらあげ・はちみつ・かき氷）と、器・鍋を Canvas2D で描く。
// 器は前の壁を半分すかして、中身の高さと目盛りが見えるようにしている。

import { MARKS, type Rect } from './constants';
import { hash, rr, text } from './ui';

export type FoodKind = 'soup' | 'donguri' | 'ninjin' | 'stew' | 'aburaage' | 'honey' | 'kakigori';

export const FOOD_NAME: Record<FoodKind, string> = {
  soup: 'スープ',
  donguri: 'どんぐり',
  ninjin: 'にんじん',
  stew: 'シチュー',
  aburaage: 'あぶらあげ',
  honey: 'はちみつ',
  kakigori: 'かき氷'
};

/** 汁もの（表面が平ら）か、つぶもの（山になる）か。 */
export const FOOD_LIQUID: Record<FoodKind, boolean> = {
  soup: true,
  donguri: false,
  ninjin: false,
  stew: true,
  aburaage: false,
  honey: true,
  kakigori: false
};

/** 熱いもの（湯気が出る。雪だるまが食べると溶けかける）。 */
export const FOOD_HOT: Record<FoodKind, boolean> = {
  soup: true,
  donguri: false,
  ninjin: false,
  stew: true,
  aburaage: false,
  honey: false,
  kakigori: false
};

const FOOD_COLOR: Record<FoodKind, { main: string; light: string; dark: string }> = {
  soup: { main: '#f2b450', light: '#ffd889', dark: '#c98426' },
  donguri: { main: '#a8703c', light: '#cf9a5c', dark: '#6e4420' },
  ninjin: { main: '#f2843a', light: '#ffb36e', dark: '#c4581c' },
  stew: { main: '#f6ecd2', light: '#fffaf0', dark: '#dccb9e' },
  aburaage: { main: '#e3a748', light: '#f6cd7c', dark: '#b07626' },
  honey: { main: '#f0a81c', light: '#ffd35a', dark: '#c07a08' },
  kakigori: { main: '#ffffff', light: '#ffffff', dark: '#d6e6f4' }
};


// --- 器 ---------------------------------------------------------------------

/** 器の外形。上のふち（y）が広く、下が丸くすぼまる。 */
function bowlPath(ctx: CanvasRenderingContext2D, b: Rect): void {
  const { x, y, w, h } = b;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.bezierCurveTo(x + w, y + h * 0.62, x + w * 0.8, y + h, x + w * 0.5, y + h);
  ctx.bezierCurveTo(x + w * 0.2, y + h, x, y + h * 0.62, x, y);
  ctx.closePath();
}

/** 器の中身の表面の高さ（fill = 器の深さに対する割合）。 */
export const fillY = (b: Rect, fill: number): number => b.y + b.h - b.h * Math.min(fill, 1);

export interface BowlOptions {
  /** 中身の品（null = 空）。 */
  food: FoodKind | null;
  /** 中身の量（器の深さに対する割合。1 をこえると、ふちから山盛りになる）。 */
  fill: number;
  /** 目盛りの濃さ。1 = はっきり（1 めん、名前つき）、0.35 = うすく（2 めんから）。 */
  marks: number;
  /** いまよそっている（湯気・しずく・ふちを光らせる）。 */
  pouring?: boolean;
  t?: number;
}

/** 器を描く。 */
export function drawBowl(ctx: CanvasRenderingContext2D, b: Rect, o: BowlOptions): void {
  const { food, fill, marks, pouring = false, t = 0 } = o;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 影
  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ctx.beginPath();
  ctx.ellipse(b.x + b.w / 2, b.y + b.h + 2, b.w * 0.34, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 器の内側（奥の壁）
  bowlPath(ctx, b);
  ctx.fillStyle = '#eef1f4';
  ctx.fill();
  // 中身
  if (food && fill > 0) {
    ctx.save();
    bowlPath(ctx, b);
    ctx.clip();
    drawContents(ctx, b, food, Math.min(fill, 1), t);
    ctx.restore();
    if (fill > 1) drawHeap(ctx, b, food, fill - 1, t);
  }
  // 前の壁（半分すけている）
  bowlPath(ctx, b);
  const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(220,230,240,0.42)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = pouring ? '#ff8fb0' : '#7c8796';
  ctx.lineWidth = pouring ? 2.6 : 1.8;
  ctx.stroke();
  // 器の模様（桜の帯）
  ctx.strokeStyle = 'rgba(242,131,168,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x + 5, b.y + 5);
  ctx.lineTo(b.x + b.w - 5, b.y + 5);
  ctx.stroke();
  // ふち
  ctx.strokeStyle = '#7c8796';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(b.x - 2, b.y);
  ctx.lineTo(b.x + b.w + 2, b.y);
  ctx.stroke();
  // 目盛り
  if (marks > 0) drawMarks(ctx, b, marks);
  // よそっているあいだは、上からしずく（つぶ）が落ちる
  if (pouring && food) drawStream(ctx, b, food, fill, t);
  ctx.restore();
}

/** 目盛り（すくなめ・ふつう・おおもり）。marks が 0.8 以上なら名前も書く。 */
function drawMarks(ctx: CanvasRenderingContext2D, b: Rect, marks: number): void {
  const list: [number, string][] = [
    [MARKS.small, 'すくなめ'],
    [MARKS.normal, 'ふつう'],
    [MARKS.large, 'おおもり']
  ];
  ctx.save();
  ctx.globalAlpha *= marks;
  for (const [v, name] of list) {
    const y = fillY(b, v);
    ctx.strokeStyle = '#3a6aa3';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.1, y);
    ctx.lineTo(b.x + b.w * 0.9, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // 左はしの切りこみ
    ctx.fillStyle = '#3a6aa3';
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.06, y - 3.5);
    ctx.lineTo(b.x + b.w * 0.12, y);
    ctx.lineTo(b.x + b.w * 0.06, y + 3.5);
    ctx.closePath();
    ctx.fill();
    if (marks >= 0.8) {
      // 1 めん：器の右に名前
      ctx.save();
      ctx.font = `bold 11px sans-serif`;
      const label = name;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.strokeText(label, b.x + b.w + 6, y);
      ctx.fillStyle = '#2c5688';
      ctx.fillText(label, b.x + b.w + 6, y);
      ctx.restore();
    } else if (marks >= 0.5) {
      // 2 めんから：器が並んで名前を書く場所がないので、左に頭の 1 文字（す・ふ・お）
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.font = `bold 10px sans-serif`;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.strokeText(name[0], b.x - 1, y);
      ctx.fillStyle = '#2c5688';
      ctx.fillText(name[0], b.x - 1, y);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 器の中の中身（表面の高さまで）。 */
function drawContents(ctx: CanvasRenderingContext2D, b: Rect, food: FoodKind, fill: number, t: number): void {
  const c = FOOD_COLOR[food];
  const top = fillY(b, fill);
  if (FOOD_LIQUID[food]) {
    const g = ctx.createLinearGradient(0, top, 0, b.y + b.h);
    g.addColorStop(0, c.light);
    g.addColorStop(0.25, c.main);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(b.x - 4, b.y + b.h + 4);
    ctx.lineTo(b.x - 4, top);
    // ゆれる表面
    for (let k = 0; k <= 12; k++) {
      const x = b.x + (b.w * k) / 12;
      ctx.lineTo(x, top + Math.sin(k * 1.3 + t * 3) * 1.1);
    }
    ctx.lineTo(b.x + b.w + 4, top);
    ctx.lineTo(b.x + b.w + 4, b.y + b.h + 4);
    ctx.closePath();
    ctx.fill();
    // 具（スープは青菜とにんじん、シチューはにんじんとブロッコリー）
    if (food === 'soup' || food === 'stew') {
      for (let k = 0; k < 9; k++) {
        const x = b.x + b.w * (0.15 + 0.7 * hash(k, 3));
        const y = top + 4 + (b.y + b.h - top - 6) * hash(k, 7);
        if (y > b.y + b.h - 3) continue;
        ctx.fillStyle = k % 2 === 0 ? '#f2843a' : '#6fae4a';
        rr(ctx, x - 2.5, y - 2, 5, 4, 1.2);
        ctx.fill();
      }
    }
    // つや
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(b.x + b.w * 0.32, top + 3, b.w * 0.14, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // つぶもの：下から順に積む
  const size = food === 'aburaage' ? 13 : food === 'kakigori' ? 8 : 10;
  const rows = Math.ceil((b.y + b.h - top) / (size * 0.72)) + 1;
  if (food === 'kakigori') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 2, top + 3, b.w + 4, b.y + b.h - top);
  }
  for (let r = 0; r < rows; r++) {
    const y = b.y + b.h - size * 0.4 - r * size * 0.72;
    if (y < top + size * 0.25) break;
    const n = Math.ceil(b.w / (size * 0.95)) + 1;
    for (let k = 0; k < n; k++) {
      const x = b.x + (k + (r % 2) * 0.5) * size * 0.95 + (hash(k, r) - 0.5) * 3;
      piece(ctx, food, x, y, size, hash(r, k) * 6.28);
    }
  }
  // 表面の一列
  const n = Math.ceil(b.w / (size * 0.95)) + 1;
  for (let k = 0; k < n; k++) {
    const x = b.x + k * size * 0.95 + (hash(k, 99) - 0.5) * 3;
    piece(ctx, food, x, top + size * 0.25, size, hash(k, 5) * 6.28);
  }
  if (food === 'kakigori') syrup(ctx, b.x, top, b.w);
}

/** ふちをこえた山盛り。 */
function drawHeap(ctx: CanvasRenderingContext2D, b: Rect, food: FoodKind, over: number, t: number): void {
  const c = FOOD_COLOR[food];
  const hh = Math.min(over, 0.4) * b.h;
  const cx = b.x + b.w / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(b.x - 1, b.y + 1);
  ctx.quadraticCurveTo(b.x + b.w * 0.12, b.y - hh, cx, b.y - hh);
  ctx.quadraticCurveTo(b.x + b.w * 0.88, b.y - hh, b.x + b.w + 1, b.y + 1);
  ctx.closePath();
  if (FOOD_LIQUID[food]) {
    ctx.fillStyle = c.main;
    ctx.fill();
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // ふちからこぼれるしずく
    ctx.fillStyle = c.main;
    for (const s of [0.08, 0.92]) {
      const x = b.x + b.w * s;
      const l = 6 + Math.sin(t * 4 + s * 9) * 2;
      ctx.beginPath();
      ctx.moveTo(x - 3, b.y);
      ctx.quadraticCurveTo(x - 3, b.y + l, x, b.y + l + 3);
      ctx.quadraticCurveTo(x + 3, b.y + l, x + 3, b.y);
      ctx.fill();
    }
  } else {
    ctx.save();
    ctx.clip();
    const size = food === 'aburaage' ? 13 : food === 'kakigori' ? 8 : 10;
    if (food === 'kakigori') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x, b.y - hh, b.w, hh + 2);
    }
    for (let r = 0; r < 6; r++) {
      const y = b.y - r * size * 0.7;
      for (let k = 0; k < 12; k++) {
        piece(ctx, food, b.x + (k + (r % 2) * 0.5) * size * 0.95, y, size, hash(k, r + 40) * 6.28);
      }
    }
    if (food === 'kakigori') syrup(ctx, b.x, b.y - hh, b.w);
    ctx.restore();
  }
  ctx.restore();
}

/** かき氷のいちごシロップ。 */
function syrup(ctx: CanvasRenderingContext2D, x: number, top: number, w: number): void {
  ctx.fillStyle = 'rgba(240,80,120,0.78)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, top + 2);
  ctx.quadraticCurveTo(x + w * 0.5, top - 4, x + w * 0.82, top + 2);
  ctx.quadraticCurveTo(x + w * 0.72, top + 9, x + w * 0.62, top + 7);
  ctx.quadraticCurveTo(x + w * 0.56, top + 14, x + w * 0.5, top + 7);
  ctx.quadraticCurveTo(x + w * 0.36, top + 11, x + w * 0.3, top + 6);
  ctx.closePath();
  ctx.fill();
}

/** つぶもの 1 こ。 */
export function piece(ctx: CanvasRenderingContext2D, food: FoodKind, x: number, y: number, s: number, rot = 0): void {
  const c = FOOD_COLOR[food];
  ctx.save();
  ctx.translate(x, y);
  if (food === 'donguri') {
    ctx.rotate(Math.sin(rot) * 0.5);
    ctx.fillStyle = c.main;
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 1, s * 0.36, s * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a5536';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.18, s * 0.4, s * 0.2, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.12, s * 0.08, s * 0.08, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (food === 'ninjin') {
    ctx.fillStyle = c.main;
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.46, s * 0.34, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.light;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.2, s * 0.14, rot, 0, Math.PI * 2);
    ctx.fill();
  } else if (food === 'aburaage') {
    ctx.rotate(Math.sin(rot) * 0.25);
    ctx.fillStyle = c.main;
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 0.8;
    rr(ctx, -s * 0.55, -s * 0.32, s * 1.1, s * 0.64, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.light;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(-s * 0.3 + k * s * 0.3, (k % 2) * 2 - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (food === 'kakigori') {
    ctx.fillStyle = k2(rot) ? '#ffffff' : '#e6f2fc';
    ctx.strokeStyle = 'rgba(120,170,215,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

const k2 = (v: number): boolean => Math.sin(v * 3) > 0;

/** よそっているあいだ、器の上から落ちる流れ。 */
function drawStream(ctx: CanvasRenderingContext2D, b: Rect, food: FoodKind, fill: number, t: number): void {
  const c = FOOD_COLOR[food];
  const cx = b.x + b.w * 0.5;
  const from = b.y - 12;
  const to = fillY(b, fill) - (fill > 1 ? Math.min(fill - 1, 0.4) * b.h : 0);
  // おたまの先
  ctx.save();
  ctx.translate(cx + 6, from - 4);
  ctx.rotate(0.7);
  ctx.fillStyle = '#c9d2dc';
  ctx.strokeStyle = '#6b7684';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#8a96a4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(28, -16);
  ctx.stroke();
  ctx.restore();
  if (FOOD_LIQUID[food]) {
    ctx.strokeStyle = c.main;
    ctx.lineWidth = food === 'honey' ? 3 : 5;
    ctx.beginPath();
    ctx.moveTo(cx, from);
    ctx.quadraticCurveTo(cx - 1, (from + to) / 2, cx + Math.sin(t * 9) * 1.5, to);
    ctx.stroke();
  } else {
    for (let k = 0; k < 3; k++) {
      const p = (t * 2.2 + k / 3) % 1;
      piece(ctx, food, cx + (k - 1) * 4, from + (to - from) * p, 9, k);
    }
  }
}

// --- 鍋 ---------------------------------------------------------------------

export interface PotOptions {
  /** 残りの割合 0..1（中身の表面の高さに使う）。 */
  left: number;
  /** ほぼゼロなら空。省略時は描画用の残量割合から判断する。 */
  empty?: boolean;
  /** さくらちゃんの分が危ない（カタカタ揺れる）。 */
  low: boolean;
  /** いま押している。 */
  pressed: boolean;
  /** PC のキー（1〜4）。 */
  keyLabel?: string;
  t?: number;
}

/** 鍋を r の中に描く。残りの量は数字では出さず、中身の表面の高さだけで見せる。 */
export function drawPot(ctx: CanvasRenderingContext2D, r: Rect, food: FoodKind, o: PotOptions): void {
  const { left, low, pressed, keyLabel, t = 0 } = o;
  const empty = o.empty ?? left <= 0.000001;
  const c = FOOD_COLOR[food];
  const shake = low ? Math.sin(t * 38) * 1.6 : 0;
  const lift = pressed ? -5 : 0;
  ctx.save();
  ctx.translate(shake, lift);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const cx = r.x + r.w / 2;
  const rimY = r.y + 26;
  const rx = r.w * 0.44;
  const ry = Math.min(13, Math.max(9, r.w * 0.1));
  const bottom = r.y + r.h - 8;

  // かまど（台）の影
  ctx.fillStyle = 'rgba(40,30,20,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, r.y + r.h - 4, rx * 1.02, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const style = food === 'kakigori' ? 'ice' : food === 'honey' ? 'jar' : 'metal';
  const body =
    style === 'ice'
      ? ['#d8ecfb', '#9fc8ea', '#4f86c6']
      : style === 'jar'
        ? ['#f7d27a', '#d9973a', '#8c5c31']
        : ['#e9eef3', '#aeb9c5', '#5d6a78'];

  // 取っ手
  ctx.strokeStyle = body[2];
  ctx.lineWidth = 5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * rx * 0.92, rimY + 10);
    ctx.quadraticCurveTo(cx + s * (rx + 16), rimY + 10, cx + s * (rx + 10), rimY + 26);
    ctx.stroke();
  }

  // 胴
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, body[1]);
  g.addColorStop(0.35, body[0]);
  g.addColorStop(1, body[1]);
  ctx.fillStyle = g;
  ctx.strokeStyle = body[2];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - rx, rimY);
  ctx.lineTo(cx - rx * 0.94, bottom - 10);
  ctx.quadraticCurveTo(cx - rx * 0.92, bottom, cx - rx * 0.7, bottom);
  ctx.lineTo(cx + rx * 0.7, bottom);
  ctx.quadraticCurveTo(cx + rx * 0.92, bottom, cx + rx * 0.94, bottom - 10);
  ctx.lineTo(cx + rx, rimY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (style === 'ice') {
    // 霜と雪の結晶
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.moveTo(cx - rx + 6 + k * (rx * 0.3), rimY + 2);
      ctx.lineTo(cx - rx + 10 + k * (rx * 0.3), rimY + 9 + (k % 3) * 3);
      ctx.lineTo(cx - rx + 14 + k * (rx * 0.3), rimY + 2);
      ctx.fill();
    }
  }

  // 口（奥の内側 → 中身の表面 → 手前のふち）
  ctx.fillStyle = body[2];
  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const lv = Math.max(0, Math.min(1, left));
  if (lv > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, rimY, rx - 2, ry - 1.5, 0, 0, Math.PI * 2);
    ctx.clip();
    const sy = rimY + (1 - lv) * ry * 1.6;
    ctx.fillStyle = c.main;
    ctx.beginPath();
    ctx.ellipse(cx, sy, (rx - 3) * (0.75 + 0.25 * lv), (ry - 2) * (0.75 + 0.25 * lv), 0, 0, Math.PI * 2);
    ctx.fill();
    if (!FOOD_LIQUID[food]) {
      for (let k = 0; k < 10; k++) {
        const a = hash(k, 1) * Math.PI * 2;
        const d = hash(k, 2) * 0.8;
        piece(ctx, food, cx + Math.cos(a) * rx * 0.7 * d, sy + Math.sin(a) * ry * 0.6 * d, 10, k);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.3, sy - 1, rx * 0.25, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.strokeStyle = body[2];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 湯気
  if (FOOD_HOT[food] && lv > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.4;
    for (let k = 0; k < 3; k++) {
      const x = cx + (k - 1) * rx * 0.45;
      const ph = t * 1.4 + k * 0.7;
      ctx.beginPath();
      for (let s = 0; s <= 10; s++) {
        const y = rimY - 6 - s * 2.6;
        const xx = x + Math.sin(ph * 3 + s * 0.6) * 3;
        if (s === 0) ctx.moveTo(xx, y);
        else ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
  }

  // おたま（鍋のふちにかけてある）
  ctx.strokeStyle = '#8a96a4';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.45, rimY);
  ctx.lineTo(cx + rx * 0.75, rimY - 30);
  ctx.stroke();

  // 品の名前（胴のまん中）
  const ly = (rimY + ry + bottom) / 2;
  text(ctx, FOOD_NAME[food], cx, ly, r.w < 120 ? 14 : 16, style === 'metal' ? '#3c4856' : '#4a3326', true);

  // PC のキー
  if (keyLabel) {
    rr(ctx, r.x + 2, r.y + 2, 20, 20, 5);
    ctx.fillStyle = 'rgba(15,23,48,0.7)';
    ctx.fill();
    text(ctx, keyLabel, r.x + 12, r.y + 12.5, 12, '#e8f2ff', true);
  }
  ctx.restore();

  // カタカタ
  if (low && !empty) {
    const a = Math.sin(t * 9) > 0 ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, 'カタカタ', cx + rx * 0.5 + 8, r.y + 4, 12, '#ff5a5a', true);
    ctx.restore();
  }
}
