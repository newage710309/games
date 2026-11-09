// 画面の上の情報欄、カメラの枠、シャッターボタン、撮るたびの採点の小窓、写真の描き直し。

import { FRAME_H, FRAME_W, HEIGHT, HUD_H, PAUSE_BTN, POPUP, SHUTTER, WIDTH } from './constants';
import { drawWorld, type Snapshot } from './world';
import { COLOR, FONT, outlinedText, rr, text } from './ui';

// --- 写真 -------------------------------------------------------------------

/** 撮った瞬間の場面を、枠 (fx, fy) で切り抜いて (dx, dy, dw, dh) に描き直す。 */
export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  fx: number,
  fy: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.translate(dx, dy);
  ctx.scale(dw / FRAME_W, dh / FRAME_H);
  ctx.translate(-fx, -fy);
  drawWorld(ctx, snap);
  ctx.restore();
}

/** 写真の画像を、あとで何度も使えるように小さなキャンバスへ描いておく。 */
export function renderPhotoCanvas(snap: Snapshot, fx: number, fy: number, w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  const k = 2;
  c.width = w * k;
  c.height = h * k;
  const g = c.getContext('2d');
  if (!g) return null;
  g.scale(k, k);
  drawPhoto(g, snap, fx, fy, 0, 0, w, h);
  return c;
}

// --- 上の情報欄 -------------------------------------------------------------

export interface HudState {
  stage: number;
  /** お題の短い文。 */
  theme: string;
  /** お題に合う 60 点以上の写真が撮れたか。 */
  themeOk: boolean;
  /** この面の写真の点数の合計（ボーナス込み）。 */
  total: number;
  /** のこりのフィルム。 */
  film: number;
  filmMax: number;
  /** 場面の残り時間 0..1。 */
  timeLeft: number;
}

export function drawPauseButton(ctx: CanvasRenderingContext2D): void {
  const b = PAUSE_BTN;
  rr(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(b.x + 12, b.y + 11, 4, 14);
  ctx.fillRect(b.x + 20, b.y + 11, 4, 14);
}

/** フィルム 1 こまの絵。 */
function filmCell(ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean): void {
  ctx.fillStyle = used ? 'rgba(255,255,255,0.14)' : '#2b2224';
  rr(ctx, x, y, 11, 14, 2);
  ctx.fill();
  if (!used) {
    ctx.fillStyle = '#f8c3d2';
    ctx.fillRect(x + 2.5, y + 3.5, 6, 7);
  }
  ctx.fillStyle = used ? 'rgba(255,255,255,0.18)' : '#d8d0c8';
  for (const yy of [1, 11]) {
    ctx.fillRect(x + 2, y + yy, 2, 2);
    ctx.fillRect(x + 7, y + yy, 2, 2);
  }
}

export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = 'rgba(10,18,38,0.86)';
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  drawPauseButton(ctx);
  // 1 行目：お題
  const ok = h.themeOk;
  rr(ctx, 46, 4, 18, 18, 4);
  ctx.fillStyle = ok ? '#7fd88a' : 'rgba(255,255,255,0.1)';
  ctx.fill();
  ctx.strokeStyle = ok ? '#2f7a3a' : COLOR.muted;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (ok) checkMark(ctx, 55, 13, 6, '#14401c');
  text(ctx, `${h.stage}めん おだい：${h.theme}`, 70, 13.5, 12, ok ? '#c8f5cf' : COLOR.ink, true, 'left');
  // 2 行目：合計とのこりフィルム
  text(ctx, `ごうけい：${h.total}てん`, 48, 33, 13, COLOR.pink, true, 'left');
  text(ctx, `のこり ${h.film}まい`, 300, 33, 12, COLOR.ink, true, 'right');
  for (let k = 0; k < h.filmMax; k++) filmCell(ctx, 306 + k * 13.2, 26, k >= h.film);
  // 残り時間のバー
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(0, HUD_H - 3, WIDTH, 3);
  ctx.fillStyle = h.timeLeft < 0.2 ? '#ff9a7a' : '#8fd0ff';
  ctx.fillRect(0, HUD_H - 3, WIDTH * Math.max(0, h.timeLeft), 3);
}

export function checkMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width = 2.4): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r * 0.3, y + r * 0.7);
  ctx.lineTo(x + r, y - r * 0.8);
  ctx.stroke();
}

// --- カメラの枠 -------------------------------------------------------------

export interface FrameLook {
  /** 枠の左上。 */
  x: number;
  y: number;
  /** フィルムを巻いている最中（撮れない）0..1 の進み。null なら撮れる。 */
  winding: number | null;
  /** シャッターを切った直後の白い光 0..1。 */
  flash: number;
  /** フィルムがない。 */
  empty: boolean;
  t: number;
}

export function drawCameraFrame(ctx: CanvasRenderingContext2D, f: FrameLook): void {
  const { x, y } = f;
  const w = FRAME_W;
  const h = FRAME_H;
  // 枠の外をうっすら暗くする
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,30,0.22)';
  ctx.beginPath();
  ctx.rect(0, HUD_H, WIDTH, HEIGHT - HUD_H);
  ctx.rect(x + w, y, -w, h);
  ctx.fill('evenodd');
  ctx.restore();

  const busy = f.winding !== null || f.empty;
  const col = busy ? 'rgba(220,226,240,0.7)' : '#ffffff';
  const L = 22;
  ctx.lineCap = 'round';
  for (const [lw, c] of [
    [6, 'rgba(20,30,60,0.55)'],
    [3, col]
  ] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x, y + L);
    ctx.lineTo(x, y);
    ctx.lineTo(x + L, y);
    ctx.moveTo(x + w - L, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + L);
    ctx.moveTo(x + w, y + h - L);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - L, y + h);
    ctx.moveTo(x + L, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - L);
    ctx.stroke();
  }
  // うすい枠線と、まん中のしるし
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy);
  ctx.lineTo(cx + 7, cy);
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx, cy + 7);
  ctx.stroke();

  if (f.winding !== null) {
    // フィルムを巻く「ジー」
    const p = f.winding;
    rr(ctx, cx - 40, y + h - 26, 80, 18, 9);
    ctx.fillStyle = 'rgba(20,30,60,0.7)';
    ctx.fill();
    ctx.fillStyle = '#f8c3d2';
    rr(ctx, cx - 36, y + h - 22, 72 * p, 10, 5);
    ctx.fill();
    text(ctx, 'ジー…', cx, y - 12, 13, '#ffffff', true);
  } else if (f.empty) {
    outlinedText(ctx, 'フィルムが ないよ', cx, y + h / 2 + 26, 13, '#ffffff', '#3a2a40');
  }
  if (f.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${f.flash * 0.85})`;
    ctx.fillRect(x, y, w, h);
  }
}

// --- シャッターボタン ------------------------------------------------------

export function drawShutterButton(ctx: CanvasRenderingContext2D, winding: number | null, pressed: boolean, empty: boolean): void {
  const { x, y, r } = SHUTTER;
  ctx.save();
  ctx.globalAlpha = empty ? 0.5 : 0.92;
  // 外がわの輪（銀色）
  const g = ctx.createLinearGradient(x, y - r, x, y + r);
  g.addColorStop(0, '#f4f6fa');
  g.addColorStop(1, '#9aa3b6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a5068';
  ctx.lineWidth = 2;
  ctx.stroke();
  // ボタン
  const rIn = r * (pressed ? 0.66 : 0.72);
  const g2 = ctx.createRadialGradient(x - rIn * 0.3, y - rIn * 0.35, 2, x, y, rIn);
  const ready = winding === null && !empty;
  g2.addColorStop(0, ready ? '#ff9ab8' : '#d6c8ce');
  g2.addColorStop(1, ready ? '#d94d78' : '#8a7a82');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(x, y + (pressed ? 1.5 : 0), rIn, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,20,40,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // カメラの絵
  ctx.fillStyle = '#ffffff';
  rr(ctx, x - 15, y - 9, 30, 20, 4);
  ctx.fill();
  ctx.fillRect(x - 6, y - 13, 12, 5);
  ctx.fillStyle = ready ? '#d94d78' : '#8a7a82';
  ctx.beginPath();
  ctx.arc(x, y + 1, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y + 1, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // 巻いているあいだの進み
  if (winding !== null) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * winding);
    ctx.stroke();
  }
  ctx.restore();
}

// --- 撮るたびの採点 --------------------------------------------------------

export interface PopupState {
  snap: Snapshot;
  fx: number;
  fy: number;
  score: number;
  reason: string;
  theme: boolean;
  poseName: string | null;
  /** 表示してからの経過（秒）。 */
  age: number;
  /** 描いておいた写真（なければその場で描く）。 */
  image?: HTMLCanvasElement | null;
}

/** 表示時間（秒）。 */
export const POPUP_TIME = 1.6;

export function drawScorePopup(ctx: CanvasRenderingContext2D, p: PopupState): void {
  const { x, y, w, h } = POPUP;
  // 出てくるときと消えるときに、右からすべる
  const inK = Math.min(1, p.age / 0.15);
  const outK = Math.max(0, (p.age - (POPUP_TIME - 0.25)) / 0.25);
  const slide = (1 - inK) * 60 + outK * 180;
  ctx.save();
  ctx.translate(slide, 0);
  ctx.rotate(0);
  // ポラロイド風の台紙
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(0.03);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, x + 3, y + 4, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#fffdf8';
  rr(ctx, x, y, w, h, 6);
  ctx.fill();
  const pw = w - 16;
  const ph = (pw * FRAME_H) / FRAME_W;
  if (p.image) ctx.drawImage(p.image, x + 8, y + 8, pw, ph);
  else drawPhoto(ctx, p.snap, p.fx, p.fy, x + 8, y + 8, pw, ph);
  ctx.strokeStyle = 'rgba(60,40,30,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8, y + 8, pw, ph);
  // お題に合っていれば ✓
  if (p.theme) {
    ctx.fillStyle = '#7fd88a';
    ctx.strokeStyle = '#2f7a3a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x + pw - 6, y + 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    checkMark(ctx, x + pw - 6, y + 18, 6, '#14401c', 2.6);
  }
  const best = p.score >= 80;
  const sy = y + 8 + ph + 18;
  text(ctx, `${p.score} てん`, x + w / 2, sy, 20, best ? '#d94d78' : p.score >= 60 ? '#4a3326' : '#7a6a70', true);
  text(ctx, p.reason, x + w / 2, sy + 20, 11, '#6a5a52', true);
  ctx.restore();

  // 帯（ベストショット・ポーズはっけん）
  let by = y - 2;
  if (best) {
    ribbon(ctx, x + w / 2, by, 'ベストショット！', '#ffd84a', '#8a5a10');
    by += 22;
  }
  if (p.poseName) {
    ribbon(ctx, x + w / 2, y + h - 4, 'ポーズ はっけん！', '#f283a8', '#6a1f3a');
  }
  ctx.restore();
}

function ribbon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: string, fill: string, ink: string): void {
  ctx.font = `bold 13px ${FONT}`;
  const w = ctx.measureText(s).width + 26;
  ctx.fillStyle = fill;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 - 8, cy - 10);
  ctx.lineTo(cx + w / 2 + 8, cy - 10);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx + w / 2 + 8, cy + 10);
  ctx.lineTo(cx - w / 2 - 8, cy + 10);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  text(ctx, s, cx, cy + 0.5, 13, ink, true);
}
