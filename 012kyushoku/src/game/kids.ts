// 列に並ぶ森の子たち（小鳥・リス・ウサギ・キツネ・クマ・雪だるま）と、そのリアクション・吹き出し・待ち時間のゲージ・評価。
// 絵は birds.ts（011）、guests.ts（005）、bear.ts（009）、snowman.ts（011）をそのまま使い、リアクションの印を上に重ねる。
// (x, y) = 足元の中心。

import { drawBear, type BearFace } from './bear';
import { drawBird } from './birds';
import { drawAnimal } from './guests';
import { drawSnowman } from './snowman';
import { FONT, rr, text } from './ui';

export type KidKind = 'enaga' | 'yamagara' | 'risu' | 'usagi' | 'kitsune' | 'kuma' | 'snowman';

export const KID_NAME: Record<KidKind, string> = {
  enaga: 'エナガ',
  yamagara: 'ヤマガラ',
  risu: 'リス',
  usagi: 'ウサギ',
  kitsune: 'キツネ',
  kuma: 'クマ',
  snowman: 'ゆきだるま'
};

/**
 * リアクション。normal = ふつう、happy = にっこり、eat = もぐもぐ、sad = しょんぼり、
 * fidget = そわそわ（待ち時間が切れそう）、melt = 溶けかけ（雪だるまに熱いもの）。
 */
export type Reaction = 'normal' | 'happy' | 'eat' | 'sad' | 'fidget' | 'melt';

/** カウンターの前での大きさ（量の段階が見た目で分かるように、体の大きさをはっきり変える）。 */
export const KID_SCALE: Record<KidKind, number> = {
  enaga: 1.5,
  yamagara: 1.55,
  risu: 1.5,
  usagi: 2.05,
  kitsune: 2.15,
  kuma: 0.4,
  snowman: 2.3
};

/** scale 1 のときの、足元から頭のてっぺんまでの高さ（吹き出しやゲージを置く位置に使う）。 */
const BASE_H: Record<KidKind, number> = {
  enaga: 33,
  yamagara: 31,
  risu: 40,
  usagi: 50,
  kitsune: 38,
  kuma: 285,
  snowman: 38
};

/** 足元から頭のてっぺんまでの高さ（ピクセル）。 */
export const kidHeight = (kind: KidKind, k = 1): number => BASE_H[kind] * KID_SCALE[kind] * k;

export interface KidOptions {
  reaction?: Reaction;
  /** 大きさの倍率（KID_SCALE に掛ける。奥の席では小さくする）。 */
  size?: number;
  /** 歩く動きの位相（0..1 でひと跳ね）。 */
  hop?: number;
  /** お盆を持っている（列に並んでいるあいだ）。 */
  tray?: boolean;
  /** 時間（アニメーション用）。 */
  t?: number;
  alpha?: number;
}

/** 森の子を (x, y) = 足元 に描く。 */
export function drawKid(ctx: CanvasRenderingContext2D, x: number, y: number, kind: KidKind, o: KidOptions = {}): void {
  const { reaction = 'normal', size = 1, hop = 0, tray = false, t = 0, alpha = 1 } = o;
  const s = KID_SCALE[kind] * size;
  const h = kidHeight(kind, size);
  let dx = 0;
  let dy = 0;
  let ph = hop;
  if (reaction === 'fidget') {
    // 足ぶみ：小きざみに左右へゆれて、ぴょこぴょこ跳ねる
    dx = Math.sin(t * 22) * 2.2;
    ph = (t * 3.2) % 1;
  } else if (reaction === 'eat') {
    dy = -Math.abs(Math.sin(t * 7)) * 1.6;
  } else if (reaction === 'happy') {
    ph = (t * 1.6) % 1;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (reaction === 'sad') {
    // しょんぼり：少し前かがみ
    ctx.translate(x, y);
    ctx.scale(1.04, 0.95);
    ctx.translate(-x, -y);
  }
  const mood = reaction === 'happy' || reaction === 'eat' ? 'happy' : reaction === 'sad' ? 'puzzled' : 'normal';
  const px = x + dx;
  const py = y + dy;
  if (kind === 'enaga' || kind === 'yamagara') {
    drawBird(ctx, px, py - Math.abs(Math.sin(ph * Math.PI)) * 3 * s, kind, {
      scale: s,
      mood: reaction === 'sad' ? 'normal' : mood === 'puzzled' ? 'normal' : mood
    });
  } else if (kind === 'risu' || kind === 'usagi' || kind === 'kitsune') {
    drawAnimal(ctx, px, py, kind, { scale: s, hop: ph, mood: mood === 'puzzled' ? 'normal' : mood });
  } else if (kind === 'kuma') {
    const face: BearFace =
      reaction === 'happy' ? 'excited' : reaction === 'eat' ? 'grin' : reaction === 'sad' ? 'away' : reaction === 'fidget' ? 'shock' : 'normal';
    drawBear(ctx, px, py - Math.abs(Math.sin(ph * Math.PI)) * 2, { scale: s, noKine: true, face, sweat: reaction === 'fidget' });
  } else {
    drawSnowman(ctx, px, py, {
      scale: s,
      hop: ph,
      grin: reaction === 'happy' || reaction === 'eat',
      melt: reaction === 'melt' ? 0.75 : 0
    });
  }
  if (tray) drawHeldTray(ctx, px, py - h * 0.3, Math.max(26, h * 0.62));
  ctx.restore();

  // リアクションの印
  const top = y - h;
  if (reaction === 'happy') sparkles(ctx, x, top, h, t);
  else if (reaction === 'eat') mogumogu(ctx, x, top, h, t);
  else if (reaction === 'sad' || reaction === 'melt') gloom(ctx, x, top, h);
  else if (reaction === 'fidget') sweat(ctx, x, top, h, t);
}

/** 列に並ぶ子が胸の前に持つ、空のお盆。 */
function drawHeldTray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.fillStyle = '#e9b97a';
  ctx.strokeStyle = '#8c5c31';
  ctx.lineWidth = 1.2;
  rr(ctx, x - w / 2, y - 3, w, 7, 2.5);
  ctx.fill();
  ctx.stroke();
}

function sparkles(ctx: CanvasRenderingContext2D, x: number, top: number, h: number, t: number): void {
  const r = Math.max(4, h * 0.08);
  for (const [ox, oy, k] of [
    [-0.55, 0.15, 0],
    [0.6, 0.0, 1],
    [0.45, 0.45, 2]
  ] as const) {
    const a = 0.6 + 0.4 * Math.sin(t * 6 + k * 2);
    ctx.save();
    ctx.globalAlpha *= a;
    heart(ctx, x + ox * h * 0.7, top + oy * h, r);
    ctx.restore();
  }
}

/** ハート（にっこり）。 */
export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#ff6f98'): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fill();
}

function mogumogu(ctx: CanvasRenderingContext2D, x: number, top: number, h: number, t: number): void {
  const size = Math.max(10, Math.min(14, h * 0.18));
  const on = Math.floor(t * 4) % 2 === 0;
  ctx.save();
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  const s = on ? 'もぐ' : 'もぐもぐ';
  ctx.strokeText(s, x + h * 0.45, top + 2);
  ctx.fillStyle = '#8c5c31';
  ctx.fillText(s, x + h * 0.45, top + 2);
  ctx.restore();
}

/** しょんぼりの縦線。 */
function gloom(ctx: CanvasRenderingContext2D, x: number, top: number, h: number): void {
  ctx.strokeStyle = 'rgba(80,110,170,0.75)';
  ctx.lineWidth = 1.6;
  const w = Math.max(14, h * 0.36);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const xx = x - w / 2 + (k * w) / 3;
    ctx.moveTo(xx, top - 4);
    ctx.lineTo(xx, top + h * 0.12 + (k % 2) * 3);
  }
  ctx.stroke();
  // ためいき
  ctx.save();
  ctx.font = `bold ${Math.max(11, Math.min(15, h * 0.2))}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('…', x + w / 2 + 2, top + h * 0.1);
  ctx.fillStyle = '#3a4f80';
  ctx.fillText('…', x + w / 2 + 2, top + h * 0.1);
  ctx.restore();
}

/** そわそわの汗。 */
function sweat(ctx: CanvasRenderingContext2D, x: number, top: number, h: number, t: number): void {
  const r = Math.max(3, h * 0.05);
  const fall = (t * 1.5) % 1;
  for (const s of [-1, 1]) {
    const xx = x + s * h * 0.34;
    const yy = top + h * 0.18 + fall * 6;
    ctx.fillStyle = '#8fd0ff';
    ctx.strokeStyle = '#4c86b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xx, yy - r * 2);
    ctx.quadraticCurveTo(xx - r, yy, xx, yy + r * 0.8);
    ctx.quadraticCurveTo(xx + r, yy, xx, yy - r * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 足もとの動きの線
  ctx.strokeStyle = 'rgba(74,51,38,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(x + s * h * 0.36, top + h - 2);
    ctx.lineTo(x + s * h * 0.48, top + h - 6);
    ctx.moveTo(x + s * h * 0.36, top + h + 3);
    ctx.lineTo(x + s * h * 0.5, top + h + 1);
  }
  ctx.stroke();
}

// --- 頭の上のもの -----------------------------------------------------------

/** 待ち時間のゲージ（left = 残りの割合 0..1）。(x, y) = ゲージのまん中。 */
export function drawWaitGauge(ctx: CanvasRenderingContext2D, x: number, y: number, left: number, w = 58): void {
  const h = 9;
  rr(ctx, x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 6);
  ctx.fillStyle = 'rgba(30,24,20,0.55)';
  ctx.fill();
  const v = Math.max(0, Math.min(1, left));
  const color = v > 0.5 ? '#7fd88a' : v > 0.25 ? '#ffd84a' : '#ff6f6f';
  if (v > 0) {
    rr(ctx, x - w / 2, y - h / 2, w * v, h, 4.5);
    ctx.fillStyle = color;
    ctx.fill();
  }
  // 時計の印
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - w / 2 - 9, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 9, y - 3.5);
  ctx.lineTo(x - w / 2 - 9, y);
  ctx.lineTo(x - w / 2 - 6.5, y + 1.5);
  ctx.stroke();
}

/** 吹き出し（注文など）。(x, y) = 吹き出しのまん中、(tx, ty) = しっぽの先。 */
export function drawBubble(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  tx: number,
  ty: number,
  size = 14,
  color = '#4a3326',
  bg = 'rgba(255,255,255,0.97)'
): void {
  ctx.save();
  ctx.font = `bold ${size}px ${FONT}`;
  const w = ctx.measureText(s).width + 22;
  const h = size + 14;
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 7, y + h / 2 - 1);
  ctx.lineTo(tx, ty);
  ctx.lineTo(x + 7, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 2.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 6, y + h / 2 - 3, 12, 4);
  text(ctx, s, x, y + 0.5, size, color, true);
  ctx.restore();
}

/** おなかが鳴っている「ぐぅ〜」（文字がふるえる）。(x, y) = 文字のまん中。size = 大きさの倍率。 */
export function drawHungry(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, size = 1): void {
  ctx.save();
  const wob = Math.sin(t * 14) * 1.5;
  ctx.translate(x + wob, y);
  ctx.scale(size, size);
  ctx.rotate(-0.12 + Math.sin(t * 7) * 0.05);
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('ぐぅ〜', 0, 0);
  ctx.fillStyle = '#d2577f';
  ctx.fillText('ぐぅ〜', 0, 0);
  // ふるえの線
  ctx.strokeStyle = '#d2577f';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 26, -6);
    ctx.quadraticCurveTo(s * 30, 0, s * 26, 6);
  }
  ctx.stroke();
  ctx.restore();
}

// --- 評価 -------------------------------------------------------------------

export type Rating = 'perfect' | 'good' | 'ok' | 'bad';

export const RATING_LABEL: Record<Rating, string> = {
  perfect: 'ぴったり！',
  good: 'いいね',
  ok: 'まあまあ',
  bad: 'がっかり'
};

const RATING_STYLE: Record<Rating, { fill: string; line: string; size: number }> = {
  perfect: { fill: '#ff6f98', line: '#ffffff', size: 24 },
  good: { fill: '#3fae5a', line: '#ffffff', size: 20 },
  ok: { fill: '#d49a1c', line: '#ffffff', size: 18 },
  bad: { fill: '#5a6fa8', line: '#ffffff', size: 20 }
};

/** 1 人ごとの評価を、その子の頭の上に出す。age = 出てからの秒数（はじめにぽんと大きくなる）。 */
export function drawRating(ctx: CanvasRenderingContext2D, x: number, y: number, r: Rating, age = 0.5, points?: number, bonus?: number): void {
  const st = RATING_STYLE[r];
  const pop = age < 0.15 ? 0.6 + (age / 0.15) * 0.55 : age < 0.3 ? 1.15 - ((age - 0.15) / 0.15) * 0.15 : 1;
  const rise = Math.min(age, 1) * 10;
  ctx.save();
  ctx.translate(x, y - rise);
  ctx.scale(pop, pop);
  if (r === 'perfect') {
    // ぴったり！の星
    ctx.fillStyle = '#ffe38a';
    ctx.strokeStyle = '#d49a1c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const rad = k % 2 === 0 ? 62 : 46;
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad * 0.48);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.font = `bold ${st.size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = st.line;
  ctx.strokeText(RATING_LABEL[r], 0, 0);
  ctx.fillStyle = st.fill;
  ctx.fillText(RATING_LABEL[r], 0, 0);
  if (points !== undefined && r !== 'bad') {
    ctx.font = `bold 12px ${FONT}`;
    ctx.lineWidth = 3;
    ctx.strokeText(`+${points}`, 0, st.size * 0.9);
    ctx.fillStyle = '#4a3326';
    ctx.fillText(`+${points}`, 0, st.size * 0.9);
    if (bonus) {
      // 残り時間ボーナス
      ctx.font = `bold 11px ${FONT}`;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(`はやい +${bonus}`, 0, st.size * 0.9 + 14);
      ctx.fillStyle = '#2f7d4f';
      ctx.fillText(`はやい +${bonus}`, 0, st.size * 0.9 + 14);
    }
  }
  ctx.restore();
}
