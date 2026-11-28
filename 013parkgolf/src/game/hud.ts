// 上の情報欄、引っぱり中のガイド線と強さメーター、吹き出し、スコアカード、ホールインワンのスタンプ。

import { HUD_H, PAUSE_BTN, VIEW_BTN, WIDTH } from './constants';
import { COLOR, FONT, outlinedText, rr, text } from './ui';

// --- 上の情報欄 ---------------------------------------------------------------

export interface HudState {
  course: number;
  /** コースの中の何ホール目か（1..3）。 */
  holeNo: number;
  par: number;
  /** このホールで打った数。 */
  strokes: number;
  /** このホールで打てる上限（パー ＋ 3）。 */
  maxStrokes: number;
  /** コースの目標打数と、いままでの合計打数（このホールの打数もふくむ）。 */
  target: number;
  total: number;
  /** 「コースをみる」中か。 */
  viewing?: boolean;
}

export function drawPauseButton(ctx: CanvasRenderingContext2D): void {
  const b = PAUSE_BTN;
  rr(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(b.x + 12, b.y + 11, 4, 14);
  ctx.fillRect(b.x + 20, b.y + 11, 4, 14);
}

export function drawViewButton(ctx: CanvasRenderingContext2D, on: boolean): void {
  const b = VIEW_BTN;
  rr(ctx, b.x, b.y, b.w, b.h, 9);
  ctx.fillStyle = on ? '#f8c3d2' : 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.strokeStyle = on ? '#8a2f52' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  text(ctx, on ? 'もどる' : 'コースをみる', b.x + b.w / 2, b.y + b.h / 2 + 1, 12, on ? '#2a0f1a' : COLOR.ink, true);
}

export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = 'rgba(12,26,20,0.86)';
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  drawPauseButton(ctx);
  drawViewButton(ctx, h.viewing ?? false);
  // 1 行目：ホールとパー、このホールの打数
  text(ctx, `${h.course}-${h.holeNo}  パー${h.par}`, 50, 15, 13, COLOR.ink, true, 'left');
  const left = h.maxStrokes - h.strokes;
  text(ctx, `${h.strokes}打め`, 150, 15, 13, COLOR.pink, true, 'left');
  text(ctx, `（あと ${Math.max(0, left)}打まで）`, 200, 15, 10, left <= 1 ? '#ffb48a' : COLOR.muted, true, 'left');
  // 2 行目：もくひょう ○打　いま ○打
  const over = h.total > h.target;
  const rest = h.target - h.total;
  text(ctx, `もくひょう ${h.target}打`, 50, 35, 13, COLOR.ink, true, 'left');
  text(ctx, `いま ${h.total}打`, 160, 35, 13, over ? '#ff9a7a' : '#ffd84a', true, 'left');
  text(ctx, over ? `${-rest}打 オーバー` : `あと ${rest}打`, 232, 35, 11, over ? '#ff9a7a' : COLOR.muted, true, 'left');
}

// --- 引っぱり中のガイド線と強さメーター ---------------------------------------------

/**
 * 打つ向きの短いガイド線（どう転がるかの予測はしない）。(bx, by) はボールの画面上の位置。
 * power は 0..1。思いきり（0.92 以上）は赤くなる。
 */
export function drawAimGuide(ctx: CanvasRenderingContext2D, bx: number, by: number, aim: number, power: number, cancel: boolean): void {
  const dx = Math.cos(aim);
  const dy = Math.sin(aim);
  const len = 26 + power * 34;
  ctx.save();
  ctx.lineCap = 'round';
  if (cancel) {
    // 少しだけ引いている：打たない
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const col = power > 0.92 ? '#ff6f6f' : power > 0.6 ? '#ffd84a' : '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(bx + dx * 10, by + dy * 10 + 1);
  ctx.lineTo(bx + dx * len, by + dy * len + 1);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx + dx * 10, by + dy * 10);
  ctx.lineTo(bx + dx * len, by + dy * len);
  ctx.stroke();
  ctx.setLineDash([]);
  // 先の矢じり
  const ex = bx + dx * (len + 6);
  const ey = by + dy * (len + 6);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(ex + dx * 4, ey + dy * 4);
  ctx.lineTo(ex - dy * 6 - dx * 5, ey + dx * 6 - dy * 5);
  ctx.lineTo(ex + dy * 6 - dx * 5, ey - dx * 6 - dy * 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 強さメーター（画面の下、まん中）。 */
export function drawPowerMeter(ctx: CanvasRenderingContext2D, power: number, cancel: boolean, keyboard = false, y = 618): void {
  const w = 220;
  const h = 12;
  const x = (WIDTH - w) / 2;
  ctx.save();
  rr(ctx, x - 8, y - 19, w + 16, h + 25, 9);
  ctx.fillStyle = 'rgba(12,26,20,0.78)';
  ctx.fill();
  text(ctx, cancel ? 'はなすと やめる' : keyboard ? 'はなすと うつ' : 'はなすと うつ（もとまで もどすと やめる）', WIDTH / 2, y - 9, 10, COLOR.ink, true);
  rr(ctx, x, y, w, h, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  if (!cancel && power > 0) {
    ctx.save();
    rr(ctx, x, y, w, h, 6);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#8fe09a');
    g.addColorStop(0.6, '#ffd84a');
    g.addColorStop(1, '#ff6f6f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * power, h);
    ctx.restore();
  }
  // 目もり（4 分の 1 ごと）と「おもいきり」の線
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const k of [0.25, 0.5, 0.75]) {
    ctx.moveTo(x + w * k, y + 3);
    ctx.lineTo(x + w * k, y + h - 3);
  }
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.92, y - 2);
  ctx.lineTo(x + w * 0.92, y + h + 2);
  ctx.stroke();
  rr(ctx, x, y, w, h, 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
  ctx.restore();
}

// --- 吹き出し ------------------------------------------------------------------

/** 吹き出し。(x, y) がまん中、(tx, ty) がしっぽの先。small なら小声（点線のふち）。 */
export function say(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  tx: number,
  ty: number,
  size = 14,
  small = false
): void {
  ctx.save();
  ctx.font = `bold ${size}px ${FONT}`;
  const lines = s.split('\n');
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = size * 1.35 * lines.length + 12;
  const bx = Math.max(8 + w / 2, Math.min(WIDTH - 8 - w / 2, x));
  ctx.fillStyle = small ? 'rgba(255,250,240,0.96)' : 'rgba(255,255,255,0.97)';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.6;
  if (small) ctx.setLineDash([4, 3]);
  // しっぽ
  const base = ty > y ? y + h / 2 - 1 : y - h / 2 + 1;
  ctx.beginPath();
  ctx.moveTo(tx - 7 + (x - tx) * 0.3, base);
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx + 7 + (x - tx) * 0.3, base);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rr(ctx, bx - w / 2, y - h / 2, w, h, Math.min(14, h / 2.4));
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillRect(tx - 6 + (x - tx) * 0.3, base - (ty > y ? 3 : -1), 12, 3);
  for (const [i, l] of lines.entries()) {
    text(ctx, l, bx, y - (h - 12) / 2 + size * 1.35 * (i + 0.5), size, '#4a3326', true);
  }
  ctx.restore();
}

// --- スコアカード ------------------------------------------------------------------

export interface CardState {
  course: number;
  courseName: string;
  /** 各ホールの名前・パー・打数（まだなら null）。 */
  holes: { name: string; par: number; strokes: number | null; ace: boolean }[];
  target: number;
  /** 何ホール目まで見せたか（1 つずつ並べる演出）。 */
  shown: number;
  /** 合計とクリアかどうかを見せるか。 */
  showTotal: boolean;
  stars: number;
  cleared: boolean;
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, line: string): void {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr2 = k % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

export function stars(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: number, r: number): void {
  for (let k = 0; k < 3; k++) {
    const on = k < n;
    drawStar(ctx, cx + (k - 1) * r * 2.4, cy, r, on ? '#ffd84a' : 'rgba(120,100,80,0.18)', on ? '#a8761a' : 'rgba(120,100,80,0.4)');
  }
}

/** パーとの差を、スコアカードの書き方（○ = バーディ、◎ = ホールインワン、□ = ボギー）で囲む。 */
function scoreMark(ctx: CanvasRenderingContext2D, x: number, y: number, strokes: number, par: number): void {
  const d = strokes - par;
  ctx.save();
  ctx.strokeStyle = strokes === 1 ? '#d94d78' : d < 0 ? '#d94d78' : '#4a6aa8';
  ctx.lineWidth = 1.6;
  if (strokes === 1 || d <= -2) {
    for (const r of [15, 11]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (d === -1) {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (d === 1) {
    ctx.strokeRect(x - 13, y - 13, 26, 26);
  } else if (d >= 2) {
    ctx.strokeRect(x - 14, y - 14, 28, 28);
    ctx.strokeRect(x - 10, y - 10, 20, 20);
  }
  ctx.restore();
}

/** コースの終わりのスコアカード（紙のカード）。(x, y) は左上、幅 400。 */
export function drawScoreCard(ctx: CanvasRenderingContext2D, x: number, y: number, c: CardState): void {
  const w = 400;
  const h = 300;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, x + 5, y + 7, w, h, 10);
  ctx.fill();
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  ctx.strokeStyle = '#7a8a5a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 見出し
  rr(ctx, x, y, w, 42, 10);
  ctx.fillStyle = '#3f8a5a';
  ctx.fill();
  ctx.fillRect(x, y + 30, w, 12);
  text(ctx, `${c.course}めん  ${c.courseName}`, x + w / 2, y + 22, 16, '#ffffff', true);
  // 表
  const cols = [x + 18, x + 74, x + 238, x + 300, x + 362];
  const ty = y + 60;
  const ink = '#4a3326';
  text(ctx, 'ホール', cols[0]! + 4, ty, 11, '#6a7a5a', true, 'left');
  text(ctx, 'なまえ', cols[1]!, ty, 11, '#6a7a5a', true, 'left');
  text(ctx, 'パー', cols[2]!, ty, 11, '#6a7a5a', true);
  text(ctx, 'だすう', cols[3]!, ty, 11, '#6a7a5a', true);
  text(ctx, '±', cols[4]!, ty, 11, '#6a7a5a', true);
  ctx.strokeStyle = '#c8d0b8';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 12, ty + 12 + i * 44);
    ctx.lineTo(x + w - 12, ty + 12 + i * 44);
    ctx.stroke();
  }
  let parSum = 0;
  let sum = 0;
  for (const [i, hh] of c.holes.entries()) {
    const ry = ty + 34 + i * 44;
    parSum += hh.par;
    text(ctx, `${i + 1}`, cols[0]! + 16, ry, 18, ink, true);
    text(ctx, hh.name, cols[1]!, ry, 13, ink, true, 'left');
    text(ctx, `${hh.par}`, cols[2]!, ry, 16, ink, true);
    if (i < c.shown && hh.strokes !== null) {
      sum += hh.strokes;
      scoreMark(ctx, cols[3]!, ry, hh.strokes, hh.par);
      text(ctx, `${hh.strokes}`, cols[3]!, ry + 1, 20, hh.strokes < hh.par ? '#d94d78' : ink, true);
      const d = hh.strokes - hh.par;
      text(ctx, d === 0 ? '0' : d > 0 ? `+${d}` : `${d}`, cols[4]!, ry, 14, d < 0 ? '#d94d78' : d > 0 ? '#4a6aa8' : ink, true);
      if (hh.ace) drawAceStamp(ctx, x + 196, ry - 2, 0.42, -0.2);
    }
  }
  // 合計
  const sy = ty + 12 + 3 * 44 + 26;
  text(ctx, 'ごうけい', cols[1]!, sy, 14, ink, true, 'left');
  text(ctx, `${parSum}`, cols[2]!, sy, 16, ink, true);
  if (c.showTotal) {
    const over = sum > c.target;
    text(ctx, `${sum}`, cols[3]!, sy, 22, over ? '#c0503a' : '#2f7a3a', true);
    const d = sum - parSum;
    text(ctx, d === 0 ? '0' : d > 0 ? `+${d}` : `${d}`, cols[4]!, sy, 14, ink, true);
  }
  ctx.strokeStyle = '#c8d0b8';
  ctx.beginPath();
  ctx.moveTo(x + 12, sy + 18);
  ctx.lineTo(x + w - 12, sy + 18);
  ctx.stroke();
  text(ctx, `もくひょう ${c.target}打`, x + 24, sy + 40, 13, '#6a7a5a', true, 'left');
  if (c.showTotal) {
    stars(ctx, x + 196, sy + 40, c.stars, 10);
    // 判定のはんこ
    ctx.save();
    ctx.translate(x + 336, sy + 36);
    ctx.rotate(-0.12);
    ctx.strokeStyle = c.cleared ? '#d94d78' : '#6a7aa8';
    ctx.lineWidth = 2.6;
    rr(ctx, -46, -18, 92, 36, 8);
    ctx.stroke();
    text(ctx, c.cleared ? 'クリア！' : 'ざんねん', 0, 1, 18, c.cleared ? '#d94d78' : '#6a7aa8', true);
    ctx.restore();
  }
  ctx.restore();
}

// --- ホールインワン ----------------------------------------------------------------

/** 「ホールインワンきねん」のスタンプ（旗とカップ）。(x, y) がまん中、scale 1 で直径 約 96。 */
export function drawAceStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  rot = -0.15,
  label = 'ホールインワン',
  sub = 'きねん',
  color = '#d94d78'
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  const red = color;
  ctx.strokeStyle = red;
  ctx.fillStyle = red;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();
  // まん中の旗とカップ
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2, 10);
  ctx.lineTo(-2, -18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-1, -18);
  ctx.lineTo(14, -12);
  ctx.lineTo(-1, -6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-2, 12, 12, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, 10, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // 文字（上と下）
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const arcText = (s: string, r: number, mid: number, dir: 1 | -1): void => {
    const chars = [...s];
    const step = 0.24;
    for (const [i, ch] of chars.entries()) {
      const a = mid + (i - (chars.length - 1) / 2) * step * dir;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(0, -r * dir);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  };
  arcText(label, 31, 0, 1);
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(sub, 0, 29);
  // かすれ（はんこらしく）
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let k = 0; k < 14; k++) {
    const a = k * 2.3;
    const r = 10 + ((k * 17) % 34);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.2 + (k % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * ホールごとの「きねんスタンプ」。level 1 = バーディ以上（緑の「ナイスショット」）、
 * level 2 = ホールインワン（赤の「ホールインワン」に、金の星をそえる）。
 */
export function drawHoleStamp(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, scale = 1, rot = -0.15): void {
  if (level >= 2) {
    drawAceStamp(ctx, x, y, scale, rot);
    drawStar(ctx, x + 34 * scale, y - 34 * scale, 11 * scale, '#ffd84a', '#a8761a');
  } else if (level === 1) drawAceStamp(ctx, x, y, scale, rot, 'ナイスショット', 'きねん', '#3f8a5a');
}

/** ホールインワンの大きな文字（とびはねる）。 */
export function drawAceBanner(ctx: CanvasRenderingContext2D, t: number): void {
  const s = 'ホールインワン！';
  const chars = [...s];
  ctx.save();
  for (const [i, ch] of chars.entries()) {
    const k = Math.max(0, Math.min(1, (t - i * 0.06) / 0.25));
    if (k <= 0) continue;
    const x = WIDTH / 2 + (i - (chars.length - 1) / 2) * 34;
    const y = 250 - Math.sin(k * Math.PI) * 30 + Math.sin(t * 6 + i) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
    outlinedText(ctx, ch, 0, 0, 36, i % 2 === 0 ? '#ffd84a' : '#ff8fb0', '#5a2a1a');
    ctx.restore();
  }
  ctx.restore();
}

/** 紙ふぶき（乱数を使わず、時刻から位置を決める）。 */
export function drawConfetti(ctx: CanvasRenderingContext2D, t: number, n = 60): void {
  const cols = ['#ffd84a', '#ff8fb0', '#8fd0ff', '#9fe0b0', '#ffffff'];
  ctx.save();
  for (let k = 0; k < n; k++) {
    const speed = 70 + (k % 7) * 18;
    const x = (k * 53.7 + Math.sin(t * 2 + k) * 20) % WIDTH;
    const y = ((k * 37.1) % 200) - 200 + t * speed;
    if (y > 660) continue;
    ctx.fillStyle = cols[k % cols.length]!;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 4 + k);
    ctx.fillRect(-3, -1.6, 6, 3.2);
    ctx.restore();
  }
  ctx.restore();
}

/** 結果の文字（バーディ！ など）。 */
export function drawResultWord(ctx: CanvasRenderingContext2D, s: string, t: number, good: boolean): void {
  const k = Math.min(1, t / 0.25);
  ctx.save();
  ctx.translate(WIDTH / 2, 230);
  ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  ctx.globalAlpha = Math.min(1, t * 4);
  outlinedText(ctx, s, 0, 0, 34, good ? '#ffd84a' : '#ffffff', good ? '#5a3a1e' : '#1f3a2a');
  ctx.restore();
}
