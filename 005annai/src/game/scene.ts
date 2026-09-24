// ゆきまつりの入口（背景・受付・情報欄）と、案内係のさくらちゃんを描く。
import {
  FAR_SCALE,
  FOOTER_H,
  HEIGHT,
  HUD_H,
  LINE_Y,
  NEAR_SCALE,
  PATH_TOP_Y,
  WIDTH
} from './constants';
import { drawSakura, type SakuraOptions } from './sakura';
import { drawSnowGuest } from './snowman';
import { COLOR, FONT, outlinedText, rr, text } from './ui';

const LINE = '#4a3326';
const FIELD_BOTTOM = HEIGHT - FOOTER_H;
/** 雪の地面が始まる高さ（ここより上は空と森）。 */
const GROUND_Y = 150;

/** 道の中心 x と、奥からの距離に応じた大きさ。y は足元。 */
export function pathScale(y: number): number {
  const k = Math.max(0, Math.min(1, (y - PATH_TOP_Y) / (LINE_Y - PATH_TOP_Y)));
  return FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * k;
}

/** 道の左右の端（y での）。 */
function pathEdge(y: number): [number, number] {
  const k = (y - GROUND_Y) / (FIELD_BOTTOM - GROUND_Y);
  const half = 30 + k * 150;
  return [WIDTH / 2 - half, WIDTH / 2 + half];
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const top = y - s * (1 - k * 0.28);
    const w = s * (0.28 + k * 0.12);
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top + s * 0.42);
    ctx.lineTo(x - w, top + s * 0.42);
    ctx.closePath();
  }
  ctx.fill();
  // 枝の雪
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.95, s * 0.08, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 雪あかり（雪のドームの中にろうそく）。 */
function snowLantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const flick = 0.85 + Math.sin(t * 9 + x) * 0.08 + Math.sin(t * 13.7 + y) * 0.05;
  const glow = ctx.createRadialGradient(x, y - 5 * s, 1, x, y - 5 * s, 16 * s);
  glow.addColorStop(0, `rgba(255,200,110,${0.45 * flick})`);
  glow.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - 5 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f8fd';
  ctx.strokeStyle = '#9fb4cc';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(x, y, 7 * s, 2.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y);
  ctx.quadraticCurveTo(x - 6 * s, y - 11 * s, x, y - 11 * s);
  ctx.quadraticCurveTo(x + 6 * s, y - 11 * s, x + 6 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255,190,90,${flick})`;
  ctx.beginPath();
  ctx.arc(x, y - 4.2 * s, 2.6 * s, Math.PI, 0);
  ctx.lineTo(x + 2.6 * s, y - 1.5 * s);
  ctx.lineTo(x - 2.6 * s, y - 1.5 * s);
  ctx.closePath();
  ctx.fill();
}

/** 三角の旗をつないだ飾り。 */
function bunting(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, sag: number): void {
  const colors = ['#f283a8', '#ffd76a', '#8fd0ff', '#a8e0a0'];
  ctx.strokeStyle = 'rgba(80,60,50,0.7)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag * 2, x2, y2);
  ctx.stroke();
  const n = 7;
  for (let k = 1; k < n; k++) {
    const u = k / n;
    const x = (1 - u) * (1 - u) * x1 + 2 * u * (1 - u) * ((x1 + x2) / 2) + u * u * x2;
    const y = (1 - u) * (1 - u) * y1 + 2 * u * (1 - u) * ((y1 + y2) / 2 + sag * 2) + u * u * y2;
    ctx.fillStyle = colors[k % colors.length] ?? '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 8);
    ctx.closePath();
    ctx.fill();
  }
}

/** 会場の案内板（左 = 空の会場、右 = 森の会場）。 */
function venueSign(ctx: CanvasRenderingContext2D, side: -1 | 1, t: number): void {
  const x = side < 0 ? 58 : WIDTH - 58;
  const y = 318;
  // 門（雪をかぶった木のアーチ）
  ctx.fillStyle = '#8a6242';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  for (const dx of [-34, 34]) {
    ctx.beginPath();
    ctx.rect(x + dx - 4, y - 60, 8, 104);
    ctx.fill();
    ctx.stroke();
  }
  rr(ctx, x - 46, y - 74, 92, 16, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y - 75, 48, 5, 0, Math.PI, 0);
  ctx.fill();
  // 看板
  const board = side < 0 ? '#dff0ff' : '#e6f4d8';
  ctx.fillStyle = board;
  rr(ctx, x - 40, y - 52, 80, 58, 8);
  ctx.fill();
  ctx.stroke();
  text(ctx, side < 0 ? 'そらの' : 'もりの', x, y - 40, 13, '#3a4a6a', true);
  text(ctx, 'かいじょう', x, y - 25, 13, '#3a4a6a', true);
  // 矢印（ゆっくり動く）
  const nudge = Math.sin(t * 4) * 3;
  ctx.fillStyle = side < 0 ? '#4f86c6' : '#5aa04a';
  ctx.save();
  ctx.translate(x + side * nudge, y - 7);
  ctx.scale(side, 1);
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(6, -9);
  ctx.lineTo(6, -4);
  ctx.lineTo(-16, -4);
  ctx.lineTo(-16, 4);
  ctx.lineTo(6, 4);
  ctx.lineTo(6, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 目印（鳥の羽 / どんぐり）
  if (side < 0) {
    ctx.fillStyle = '#3a4a6a';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 22);
    ctx.quadraticCurveTo(x - 4, y + 12, x, y + 20);
    ctx.quadraticCurveTo(x + 4, y + 12, x + 10, y + 22);
    ctx.quadraticCurveTo(x + 4, y + 17, x, y + 24);
    ctx.quadraticCurveTo(x - 4, y + 17, x - 10, y + 22);
    ctx.fill();
  } else {
    ctx.fillStyle = '#b47a3c';
    ctx.beginPath();
    ctx.ellipse(x, y + 21, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e4a2a';
    ctx.beginPath();
    ctx.ellipse(x, y + 15.5, 6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 入口のアーチ（奥）。雪だるまはここから追い返す。 */
function entranceArch(ctx: CanvasRenderingContext2D): void {
  const cx = WIDTH / 2;
  const y = GROUND_Y + 4;
  ctx.fillStyle = '#b8483e';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  for (const dx of [-56, 56]) {
    ctx.beginPath();
    ctx.rect(cx + dx - 3.5, y - 66, 7, 66);
    ctx.fill();
    ctx.stroke();
  }
  rr(ctx, cx - 72, y - 80, 144, 22, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, y - 81, 74, 5, 0, Math.PI, 0);
  ctx.fill();
  text(ctx, 'ゆきまつり', cx, y - 68, 15, '#fff6d8', true);
  // ちょうちん
  for (const dx of [-40, 40]) {
    ctx.fillStyle = '#ffcf6a';
    ctx.beginPath();
    ctx.ellipse(cx + dx, y - 50, 5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8483e';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

/** 「ゆきだるま おことわり」の立て札。 */
function refuseSign(ctx: CanvasRenderingContext2D): void {
  const x = WIDTH / 2 + 104;
  const y = GROUND_Y + 30;
  ctx.fillStyle = '#8a6242';
  ctx.fillRect(x - 2, y - 10, 4, 34);
  ctx.fillStyle = '#fff8ea';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  rr(ctx, x - 34, y - 26, 68, 24, 4);
  ctx.fill();
  ctx.stroke();
  drawSnowGuest(ctx, x - 22, y - 5, 'none', { scale: 0.46, shadow: false });
  ctx.strokeStyle = '#d63a3e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 29, y - 23);
  ctx.lineTo(x - 15, y - 5);
  ctx.moveTo(x - 15, y - 23);
  ctx.lineTo(x - 29, y - 5);
  ctx.stroke();
  text(ctx, 'おことわり', x + 8, y - 14, 10, '#b8483e', true);
}

/** ゆきまつりの入口の背景。t は経過時間（あかりのゆらぎ・雪）。 */
export function drawField(ctx: CanvasRenderingContext2D, t: number): void {
  // 夕方の空
  const sky = ctx.createLinearGradient(0, HUD_H, 0, GROUND_Y);
  sky.addColorStop(0, '#2a3668');
  sky.addColorStop(1, '#7a7fb8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, HUD_H, WIDTH, GROUND_Y - HUD_H);
  // 星
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let k = 0; k < 14; k++) {
    const x = (k * 97.3) % WIDTH;
    const y = HUD_H + 6 + ((k * 37.1) % 50);
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // 遠くの森
  for (let k = 0; k < 13; k++) {
    const x = k * 40 + (k % 2) * 12;
    pine(ctx, x, GROUND_Y + 2, 44 + (k % 3) * 10, '#34506e');
  }
  // 雪の地面
  const ground = ctx.createLinearGradient(0, GROUND_Y, 0, FIELD_BOTTOM);
  ground.addColorStop(0, '#dbe7f4');
  ground.addColorStop(1, '#f4f8fd');
  ctx.fillStyle = ground;
  ctx.fillRect(0, GROUND_Y, WIDTH, FIELD_BOTTOM - GROUND_Y);
  // 道（ふみ固めた雪）
  const [l0, r0] = pathEdge(GROUND_Y);
  const [l1, r1] = pathEdge(FIELD_BOTTOM);
  ctx.fillStyle = '#cddcec';
  ctx.beginPath();
  ctx.moveTo(l0, GROUND_Y);
  ctx.lineTo(r0, GROUND_Y);
  ctx.lineTo(r1, FIELD_BOTTOM);
  ctx.lineTo(l1, FIELD_BOTTOM);
  ctx.closePath();
  ctx.fill();
  // 左右の会場へ分かれる道
  ctx.fillStyle = '#d4e1ef';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 + side * 60, 360);
    ctx.quadraticCurveTo(WIDTH / 2 + side * 140, 330, side < 0 ? 0 : WIDTH, 340);
    ctx.lineTo(side < 0 ? 0 : WIDTH, 392);
    ctx.quadraticCurveTo(WIDTH / 2 + side * 140, 390, WIDTH / 2 + side * 90, 430);
    ctx.closePath();
    ctx.fill();
  }
  // 足あと
  ctx.fillStyle = 'rgba(120,150,190,0.22)';
  for (let k = 0; k < 12; k++) {
    const y = GROUND_Y + 20 + k * 28;
    const s = pathScale(y);
    ctx.beginPath();
    ctx.ellipse(WIDTH / 2 + (k % 2 ? 6 : -6) * s, y, 2 * s, 1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  entranceArch(ctx);
  refuseSign(ctx);
  bunting(ctx, 0, 196, 150, 220, 8);
  bunting(ctx, WIDTH, 196, WIDTH - 150, 220, 8);
  venueSign(ctx, -1, t);
  venueSign(ctx, 1, t);
  // 道ばたの雪あかり
  for (const y of [190, 240, 300, 380, 450]) {
    const [l, r] = pathEdge(y);
    const s = pathScale(y) * 0.7;
    if (y > 330 && y < 440) continue;
    snowLantern(ctx, l - 6 * s, y, s, t);
    snowLantern(ctx, r + 6 * s, y, s, t);
  }
}

/** 受付の線（ロープ）と、さくらちゃんのいる受付の床。 */
export function drawCounter(ctx: CanvasRenderingContext2D, danger: number): void {
  // 受付の床
  ctx.fillStyle = 'rgba(242,131,168,0.14)';
  ctx.fillRect(0, LINE_Y + 8, WIDTH, FIELD_BOTTOM - LINE_Y - 8);
  // ロープ（お客さんが近づくと赤く点滅）
  const [l, r] = pathEdge(LINE_Y);
  for (const x of [l - 8, r + 8]) {
    ctx.fillStyle = '#b8483e';
    ctx.fillRect(x - 2.5, LINE_Y - 20, 5, 26);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x, LINE_Y - 21, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = danger > 0 ? `rgba(230,60,70,${0.5 + danger * 0.5})` : '#d8687e';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(l - 8, LINE_Y - 14);
  ctx.quadraticCurveTo(WIDTH / 2, LINE_Y - 4, r + 8, LINE_Y - 14);
  ctx.stroke();
  ctx.setLineDash([]);
  // 受付の立て札
  ctx.fillStyle = '#8a6242';
  ctx.fillRect(30, LINE_Y + 28, 4, 40);
  ctx.fillStyle = '#fff8ea';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  rr(ctx, 6, LINE_Y + 14, 52, 22, 4);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'うけつけ', 32, LINE_Y + 25, 11, '#b8483e', true);
}

/** 案内係のさくらちゃんのポーズ。idle = うろうろ、left / right = 翼で指す、no = 両翼で ✕。 */
export type GuidePose = 'idle' | 'left' | 'right' | 'no' | 'shock' | 'happy';

/** 案内係の帽子（紺に金のふち）。(x, y) は帽子のつばの中心。 */
function guideCap(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  ctx.fillStyle = '#2f4a86';
  ctx.strokeStyle = '#1c2a4a';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-5.6, 0);
  ctx.quadraticCurveTo(-5.4, -6.2, 0, -6.4);
  ctx.quadraticCurveTo(5.4, -6.2, 5.6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8b64a';
  ctx.fillRect(-5.6, -1.6, 11.2, 1.6);
  ctx.fillStyle = '#1c2a4a';
  ctx.beginPath();
  ctx.ellipse(0.8, 0.3, 7, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(0, -3.8, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 案内係のさくらちゃんを (x, y) = 体の中心 に描く。 */
export function drawGuide(ctx: CanvasRenderingContext2D, x: number, y: number, pose: GuidePose, t: number, scale = 2.6): void {
  const s = scale;
  const walkBob = pose === 'idle' ? Math.abs(Math.sin(t * 6)) * 1.5 : 0;
  const cy = y - walkBob;
  if (pose === 'left' || pose === 'right') {
    const dir = pose === 'right' ? 1 : -1;
    drawSakura(ctx, x, cy, { view: pose, scale: s, flap: 0.55 });
    guideCap(ctx, x - dir * 1.5 * s, cy - 13 * s, s, dir * 0.12);
    return;
  }
  const opts: SakuraOptions = { scale: s };
  if (pose === 'shock') opts.eyes = 'shock';
  if (pose === 'happy') opts.eyes = 'happy';
  drawSakura(ctx, x, cy, opts);
  guideCap(ctx, x - 3.2 * s, cy - 13 * s, s, -0.18);
  if (pose === 'no') {
    // 両翼を胸の前で交差して ✕
    ctx.save();
    ctx.translate(x, cy + 6 * s);
    ctx.scale(s, s);
    ctx.fillStyle = '#262024';
    ctx.strokeStyle = '#5e3448';
    ctx.lineWidth = 0.7;
    for (const a of [-0.75, 0.75]) {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.1, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

export interface HudState {
  stage: number;
  /** 1・2 面は残り秒数、3 面は残りの人数。 */
  timeLeft?: number;
  guestsLeft?: number;
  score: number;
  hiScore: number;
}

export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  // ポーズボタン
  ctx.fillStyle = COLOR.panel;
  rr(ctx, 4, 4, 34, 32, 6);
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(15, 12, 4, 16);
  ctx.fillRect(23, 12, 4, 16);
  text(ctx, `${h.stage}めん`, 70, 20, 17, COLOR.pink, true);
  if (h.guestsLeft !== undefined) {
    text(ctx, `のこり ${h.guestsLeft}にん`, 180, 20, 17, COLOR.ink, true);
  } else {
    const sec = Math.ceil(h.timeLeft ?? 0);
    text(ctx, `のこり ${sec}びょう`, 180, 20, 17, sec <= 5 ? '#ff8a8a' : COLOR.ink, true);
  }
  text(ctx, `${h.score}`, 380, 20, 20, '#ffe38a', true, 'right');
  text(ctx, 'てん', 384, 22, 12, COLOR.muted, false, 'left');
  text(ctx, `HI ${h.hiScore}`, 474, 30, 10, COLOR.muted, false, 'right');
}

export function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, FIELD_BOTTOM, WIDTH, FOOTER_H);
  text(ctx, '← とり　　↑ ゆきだるま おことわり　　けもの →', WIDTH / 2, FIELD_BOTTOM + FOOTER_H / 2, 12, COLOR.muted, true);
}

/** 得点のポップ。 */
export function drawPop(ctx: CanvasRenderingContext2D, s: string, x: number, y: number): void {
  outlinedText(ctx, s, x, y, 18, '#ffe38a', '#6a3a20');
}

/** スワイプした向きに流れる線。 */
export function drawSwipeTrail(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const off = (k - 1) * 12;
    const px = x + (dy !== 0 ? off : 0);
    const py = y + (dx !== 0 ? off : 0);
    ctx.lineWidth = 3 - Math.abs(k - 1);
    ctx.beginPath();
    ctx.moveTo(px - dx * 34, py - dy * 34);
    ctx.lineTo(px - dx * 8, py - dy * 8);
    ctx.stroke();
  }
}

export { FONT };
