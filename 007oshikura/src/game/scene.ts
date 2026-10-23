// 背景・フィールドの枠・上の情報欄・右側の欄（つぎ・雪だるまの予告・さくらちゃん）・下の操作説明を描く。
import { cellX, drawPiece, type Piece } from './board';
import {
  CELL,
  FIELD_H,
  FIELD_W,
  FIELD_X,
  FIELD_Y,
  FOOTER_H,
  HEIGHT,
  HUD_H,
  SIDE_W,
  SIDE_X,
  SPAWN_COL,
  WIDTH
} from './constants';
import { isTouchDevice } from './device';
import { drawSakura } from './sakura';
import { drawSnowGuest } from './snowman';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';

/** 夜の森の背景（フィールドのうしろ全体）。 */
export function drawBackground(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#2f4479');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // 右の欄のうしろの木と雪の地面
  for (const [x, y, s] of [
    [SIDE_X + 30, 520, 110],
    [SIDE_X + 140, 500, 130]
  ] as const) {
    pine(ctx, x, y, s);
  }
  ctx.fillStyle = '#e9f1fa';
  ctx.beginPath();
  ctx.moveTo(SIDE_X - 8, 556);
  ctx.quadraticCurveTo(SIDE_X + 80, 530, WIDTH, 548);
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(SIDE_X - 8, HEIGHT);
  ctx.closePath();
  ctx.fill();
  drawSnowfall(ctx, t, HEIGHT, 30);
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#24405e';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const top = y - s * (1 - k * 0.28);
    const w = s * (0.3 + k * 0.12);
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top + s * 0.44);
    ctx.lineTo(x - w, top + s * 0.44);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let k = 0; k < 3; k++) {
    const top = y - s * (1 - k * 0.28);
    ctx.beginPath();
    ctx.ellipse(x, top + s * 0.06, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * フィールドの枠と中。雪の壁でかこんだ広場。
 * danger（0..1）で、出てくる場所の目印が赤く光る。
 */
export function drawFieldFrame(ctx: CanvasRenderingContext2D, danger = 0): void {
  // 雪の壁
  ctx.fillStyle = '#dbe8f5';
  rr(ctx, FIELD_X - 7, FIELD_Y - 4, FIELD_W + 14, FIELD_H + 11, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, FIELD_X - 7, FIELD_Y - 4, FIELD_W + 14, 8, 4);
  ctx.fill();
  // 中（夜の雪の広場）
  const g = ctx.createLinearGradient(0, FIELD_Y, 0, FIELD_Y + FIELD_H);
  g.addColorStop(0, '#1d2c58');
  g.addColorStop(1, '#2b4274');
  ctx.fillStyle = g;
  ctx.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
  // うすいます目
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < FIELD_W / CELL; c++) {
    ctx.moveTo(FIELD_X + c * CELL + 0.5, FIELD_Y);
    ctx.lineTo(FIELD_X + c * CELL + 0.5, FIELD_Y + FIELD_H);
  }
  ctx.stroke();
  // 出てくる場所の目印（ここがふさがるとおしまい）
  const x = cellX(SPAWN_COL);
  ctx.save();
  ctx.strokeStyle = danger > 0 ? `rgba(255,110,110,${0.4 + danger * 0.6})` : 'rgba(248,195,210,0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  rr(ctx, x + 4, FIELD_Y + 4, CELL - 8, CELL - 8, 10);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = danger > 0 ? '#ff6e6e' : COLOR.accent;
  ctx.beginPath();
  ctx.moveTo(x + CELL / 2 - 7, FIELD_Y - 12);
  ctx.lineTo(x + CELL / 2 + 7, FIELD_Y - 12);
  ctx.lineTo(x + CELL / 2, FIELD_Y - 4);
  ctx.closePath();
  ctx.fill();
}

export interface HudState {
  stage: number;
  /** あと何匹消したら面クリアか。 */
  left: number;
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
  text(ctx, `のこり ${h.left}ひき`, 180, 20, 17, h.left <= 8 ? '#ffe38a' : COLOR.ink, true);
  text(ctx, `${h.score}`, 380, 20, 20, '#ffe38a', true, 'right');
  text(ctx, 'てん', 384, 22, 12, COLOR.muted, false, 'left');
  text(ctx, `HI ${h.hiScore}`, 474, 30, 10, COLOR.muted, false, 'right');
}

export function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, HEIGHT - FOOTER_H, WIDTH, FOOTER_H);
  const s = isTouchDevice()
    ? '← → スワイプ いどう　タップ まわす　↓ スワイプ はやく'
    : '← → いどう　↑ / スペース まわす　↓ はやく';
  text(ctx, s, WIDTH / 2, HEIGHT - FOOTER_H / 2, 12, COLOR.muted, true);
}

/** さくらちゃんの様子。 */
export type SakuraMood = 'idle' | 'cheer' | 'panic' | 'sad';

export interface SideState {
  /** つぎの組（上・下）。 */
  next: [Piece, Piece];
  /** 雪だるまがあと何組で降ってくるか（0 = この組のあと降る）。 */
  snowIn: number;
  /** 降ってくる雪だるまの数。 */
  snowCount: number;
  mood: SakuraMood;
  /** ふきだし（なければ出さない）。 */
  say?: string;
}

/** 右側の欄。 */
export function drawSide(ctx: CanvasRenderingContext2D, s: SideState, t: number): void {
  const cx = SIDE_X + SIDE_W / 2;
  // つぎ
  ctx.fillStyle = 'rgba(10,18,38,0.75)';
  rr(ctx, SIDE_X + 26, 56, SIDE_W - 52, 148, 14);
  ctx.fill();
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'つぎ', cx, 72, 14, COLOR.pink, true);
  drawPiece(ctx, s.next[0], cx - CELL / 2, 94);
  drawPiece(ctx, s.next[1], cx - CELL / 2, 94 + CELL);

  // 雪だるまの予告
  ctx.fillStyle = 'rgba(10,18,38,0.75)';
  rr(ctx, SIDE_X + 6, 218, SIDE_W - 12, 82, 14);
  ctx.fill();
  const soon = s.snowIn === 0;
  ctx.strokeStyle = soon && blink(t, 3) ? '#ff8a8a' : COLOR.panelBorder;
  ctx.stroke();
  text(ctx, soon ? 'ゆきだるま くるよ！' : `ゆきだるま あと ${s.snowIn}くみ`, cx, 236, 13, soon ? '#ffb0b0' : COLOR.ink, true);
  const n = s.snowCount;
  const gap = Math.min(30, (SIDE_W - 40) / Math.max(1, n - 1));
  for (let k = 0; k < n; k++) {
    drawSnowGuest(ctx, cx - ((n - 1) * gap) / 2 + k * gap, 290, 'none', { scale: 0.85, shadow: false });
  }

  // さくらちゃん
  drawSideSakura(ctx, cx, 520, s.mood, t);
  if (s.say !== undefined) bubble(ctx, cx, 404, s.say, s.mood === 'panic' ? '#ffe0e0' : '#ffffff');
}

function drawSideSakura(ctx: CanvasRenderingContext2D, x: number, y: number, mood: SakuraMood, t: number): void {
  const sc = 2.6;
  if (mood === 'cheer') {
    // ぴょんぴょん跳ねて、翼をぱたぱた
    const hop = Math.abs(Math.sin(t * 7)) * 10;
    drawSakura(ctx, x, y - hop, { scale: sc, eyes: 'happy', squash: hop < 2 ? 0.08 : 0 });
    return;
  }
  if (mood === 'panic') {
    const shake = Math.sin(t * 30) * 2;
    drawSakura(ctx, x + shake, y, { scale: sc, eyes: 'shock', gaze: -1 });
    sweat(ctx, x + 30, y - 30);
    return;
  }
  if (mood === 'sad') {
    drawSakura(ctx, x, y + 4, { scale: sc, dead: true, squash: 0.12 });
    return;
  }
  // フィールドの方をみて、ゆっくり左右にゆれる
  drawSakura(ctx, x, y - Math.abs(Math.sin(t * 2)) * 2, { scale: sc, gaze: -1, rotate: Math.sin(t * 1.5) * 0.05 });
}

function sweat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#8fd0ff';
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.quadraticCurveTo(x - 5, y, x, y + 2);
  ctx.quadraticCurveTo(x + 5, y, x, y - 9);
  ctx.fill();
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, s: string, fill: string): void {
  const w = Math.min(SIDE_W - 6, s.length * 15 + 26);
  ctx.fillStyle = fill;
  rr(ctx, x - w / 2, y - 18, w, 36, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 16);
  ctx.lineTo(x + 8, y + 16);
  ctx.lineTo(x, y + 28);
  ctx.closePath();
  ctx.fill();
  text(ctx, s, x, y, 15, '#3a4a6a', true);
}

/** 得点のポップ。 */
export function drawPop(ctx: CanvasRenderingContext2D, s: string, x: number, y: number): void {
  outlinedText(ctx, s, x, y, 18, '#ffe38a', '#6a3a20');
}

/** 「ぎゅっ！」の文字。 */
export function drawGyu(ctx: CanvasRenderingContext2D, x: number, y: number, p: number): void {
  ctx.save();
  ctx.translate(x, y);
  const s = 0.7 + Math.min(1, p * 3) * 0.5 - Math.max(0, p - 0.7) * 0.6;
  ctx.scale(s, s);
  ctx.rotate(-0.12);
  outlinedText(ctx, 'ぎゅっ！', 0, 0, 24, '#ffffff', '#d2577f');
  ctx.restore();
}

/** れんさの表示（フィールドの上のほう）。 */
export function drawChain(ctx: CanvasRenderingContext2D, chain: number, y: number): void {
  const x = FIELD_X + FIELD_W / 2;
  outlinedText(ctx, `${chain}れんさ！`, x, y, 30, '#ffe38a', '#b8483e');
}
