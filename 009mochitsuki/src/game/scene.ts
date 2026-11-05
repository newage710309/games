// 面の背景・もちつきの場面・情報欄を描く。デザイン確認とゲーム本体の両方で使う。
import { drawBear, kinePose, type BearFace } from './bear';
import {
  BEAR_X,
  BEAR_Y,
  HEIGHT,
  HORIZON_Y,
  HUD_H,
  INFO_H,
  RING_R,
  SAKURA_SCALE,
  SAKURA_X,
  SAKURA_Y,
  USU_X,
  USU_Y,
  WIDTH
} from './constants';
import { drawCrowd } from './crowd';
import {
  drawBits,
  drawDizzy,
  drawMochi,
  drawPeekEyes,
  drawRing,
  drawStuckSakura,
  drawThrownSnowball,
  drawUsu,
  sparkle,
  USU_H,
  type RingKind
} from './mochi';
import { drawSnowGuest } from './snowman';
import { COLOR, drawSnowfall, hash, outlinedText, rr, text } from './ui';

// --- 背景 -----------------------------------------------------------------

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
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HORIZON_Y + 4);
}

function hills(ctx: CanvasRenderingContext2D, y: number, amp: number, color: string, seed: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 4);
  for (let x = 0; x <= WIDTH; x += 12) {
    const h = Math.sin(x * 0.012 + seed) * amp + Math.sin(x * 0.031 + seed * 2.3) * amp * 0.35;
    ctx.lineTo(x, y + h);
  }
  ctx.lineTo(WIDTH, HORIZON_Y + 4);
  ctx.closePath();
  ctx.fill();
}

function ground(ctx: CanvasRenderingContext2D, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, HORIZON_Y, 0, HEIGHT);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 2);
  ctx.quadraticCurveTo(WIDTH * 0.35, HORIZON_Y - 8, WIDTH * 0.7, HORIZON_Y + 2);
  ctx.quadraticCurveTo(WIDTH * 0.88, HORIZON_Y + 6, WIDTH, HORIZON_Y);
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

/** 足もとのござ（臼を置く場所を、地面からはっきり分ける）。 */
function drawMat(ctx: CanvasRenderingContext2D, stage: number): void {
  const colors = ['#d8c48a', '#c9a678', '#7f88a8'];
  const dark = ['rgba(120,90,40,0.35)', 'rgba(110,70,40,0.35)', 'rgba(30,35,70,0.4)'];
  const c = colors[stage - 1]!;
  ctx.save();
  ctx.translate(WIDTH / 2, 578);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(-182, -42);
  ctx.lineTo(182, -42);
  ctx.lineTo(236, 42);
  ctx.lineTo(-236, 42);
  ctx.closePath();
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = dark[stage - 1]!;
  ctx.lineWidth = 1;
  for (let k = -14; k <= 14; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 13, -42);
    ctx.lineTo(k * 17, 42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const glow = 0.5 + 0.1 * Math.sin(t * 3 + x);
  const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
  g.addColorStop(0, `rgba(255,180,90,${glow})`);
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb35e';
  ctx.strokeStyle = '#7a3b1e';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a3b1e';
  ctx.fillRect(x - 4.5, y - 11, 9, 2.4);
  ctx.fillRect(x - 4.5, y + 8.6, 9, 2.4);
}

/** 遠くのお寺（3 うすめ）。 */
function drawTemple(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#1b2448';
  ctx.beginPath();
  ctx.moveTo(x - 66, y - 34);
  ctx.quadraticCurveTo(x - 34, y - 44, x - 18, y - 66);
  ctx.lineTo(x + 18, y - 66);
  ctx.quadraticCurveTo(x + 34, y - 44, x + 66, y - 34);
  ctx.lineTo(x + 44, y - 32);
  ctx.lineTo(x + 44, y);
  ctx.lineTo(x - 44, y);
  ctx.lineTo(x - 44, y - 32);
  ctx.closePath();
  ctx.fill();
  // 屋根の雪
  ctx.strokeStyle = 'rgba(220,232,255,0.8)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x - 64, y - 36);
  ctx.quadraticCurveTo(x - 34, y - 46, x - 18, y - 67);
  ctx.lineTo(x + 18, y - 67);
  ctx.quadraticCurveTo(x + 34, y - 46, x + 64, y - 36);
  ctx.stroke();
  // 明かりのもれる窓
  ctx.fillStyle = 'rgba(255,200,120,0.75)';
  ctx.fillRect(x - 26, y - 24, 16, 16);
  ctx.fillRect(x + 10, y - 24, 16, 16);
}

/** 面の背景。stage は 1..3。t はアニメーション時間。 */
export function drawStageBackground(ctx: CanvasRenderingContext2D, stage: number, t: number): void {
  if (stage === 1) {
    // 昼の森の広場
    sky(ctx, [
      [0, '#79bdec'],
      [0.75, '#c9e8f7'],
      [1, '#eef8fb']
    ]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, s] of [
      [78, 118, 1],
      [336, 96, 1.2],
      [214, 168, 0.72]
    ] as const) {
      const dx = (x + t * 4 * s) % (WIDTH + 120);
      ctx.beginPath();
      ctx.ellipse(dx - 40, y, 34 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(dx - 58, y + 3, 22 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(dx - 22, y + 3, 24 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    hills(ctx, 300, 14, '#c7deea', 0.6);
    for (let k = 0; k < 11; k++) drawPine(ctx, 8 + k * 46 + hash(k, 1) * 20, 366 - hash(k, 2) * 10, 70 + hash(k, 3) * 44, '#4c8c70', 0.8);
    for (const [x, s] of [
      [14, 142],
      [468, 130],
      [356, 96]
    ] as const) {
      drawPine(ctx, x, HORIZON_Y + 12, s, '#2f6250');
    }
    ground(ctx, '#f5f9fc', '#dcebf5');
  } else if (stage === 2) {
    // 夕方
    sky(ctx, [
      [0, '#55568f'],
      [0.42, '#d97a78'],
      [0.8, '#f8b26b'],
      [1, '#fde0a0']
    ]);
    // しずむ夕日
    const g = ctx.createRadialGradient(366, 300, 8, 366, 300, 120);
    g.addColorStop(0, 'rgba(255,240,180,0.95)');
    g.addColorStop(0.28, 'rgba(255,200,120,0.55)');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(366, 300, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9ad';
    ctx.beginPath();
    ctx.arc(366, 300, 28, 0, Math.PI * 2);
    ctx.fill();
    hills(ctx, 310, 15, '#8c5e7f', 1.8);
    for (let k = 0; k < 11; k++) drawPine(ctx, 6 + k * 46 + hash(k, 5) * 20, 368 - hash(k, 6) * 9, 64 + hash(k, 7) * 40, '#5a3f66', 0.42);
    // カラスがとまる枯れ木
    ctx.strokeStyle = '#3c2a3a';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(102, HORIZON_Y + 4);
    ctx.quadraticCurveTo(98, 350, 108, 322);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(95, 321);
    ctx.lineTo(160, 321);
    ctx.moveTo(104, 340);
    ctx.lineTo(72, 300);
    ctx.stroke();
    ground(ctx, '#f8dcc4', '#d9b7b4');
  } else {
    // 大みそかの夜
    sky(ctx, [
      [0, '#0b1230'],
      [0.7, '#1e2a5c'],
      [1, '#34457e']
    ]);
    for (let k = 0; k < 60; k++) {
      const sx = hash(k, 21) * WIDTH;
      const sy = 42 + hash(k, 22) * 240;
      const a = 0.4 + 0.5 * Math.abs(Math.sin(t * (0.8 + hash(k, 23)) + k));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(sx, sy, 1.6 + hash(k, 24), 1.6 + hash(k, 24));
    }
    // 月
    ctx.fillStyle = '#fff4c8';
    ctx.beginPath();
    ctx.arc(84, 132, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#121a40';
    ctx.beginPath();
    ctx.arc(96, 124, 25, 0, Math.PI * 2);
    ctx.fill();
    hills(ctx, 306, 16, '#26336a', 3.1);
    drawTemple(ctx, 226, 360);
    for (let k = 0; k < 11; k++) {
      if (k === 4 || k === 5) continue;
      drawPine(ctx, 6 + k * 46 + hash(k, 9) * 18, 370 - hash(k, 10) * 8, 66 + hash(k, 11) * 42, '#1d3556', 0.62);
    }
    ground(ctx, '#b4c3e8', '#7f8fc4');
    // ちょうちんのひも
    ctx.strokeStyle = 'rgba(30,30,60,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 212);
    ctx.quadraticCurveTo(120, 262, 240, 214);
    ctx.quadraticCurveTo(360, 262, 480, 212);
    ctx.stroke();
    for (const [x, y] of [
      [56, 240],
      [130, 245],
      [204, 226],
      [288, 231],
      [362, 245],
      [430, 233]
    ] as const) {
      drawLantern(ctx, x, y + 8, t);
    }
  }
  drawMat(ctx, stage);
}

// --- もちつきの場面 ---------------------------------------------------------

export type SakuraPose = 'idle' | 'flip' | 'dizzy' | 'shock' | 'happy' | 'worry';

export interface PlayLook {
  stage: number;
  t: number;
  bear: { lift: number; face?: BearFace; bob?: number; sweat?: boolean };
  /** つぶれ・ごはんつぶ・つや（drawMochi と同じ）。 */
  mochi: { done: number; shine?: number; squash?: number; tilt?: number; hidden?: boolean };
  sakura: {
    pose: SakuraPose;
    stuck: number;
    flip?: number;
    /** 3 回目のミスのあと：さくらちゃんは消える。 */
    gone?: boolean;
    /** 臼のおもちに目を出す。 */
    peek?: boolean;
    shake?: number;
  };
  /** 輪（無ければ描かない）。now は縮む輪の半径。 */
  ring?: { now: number | null; kind?: RingKind; flash?: number };
  /** 2 つめの輪（はやつきの 2 打目）。 */
  ring2?: { now: number; kind?: RingKind };
  /** 飛んでくる雪玉。 */
  snowball?: { x: number; y: number; spin: number; ring?: number };
  /** はじいた雪玉のかけら（進み 0..1）。 */
  snowBits?: { x: number; y: number; p: number };
  /** 雪だるま（投げる）。throwing 0..1 で腕のふり。 */
  snowmen?: { x: number; y: number; scale: number; hop: number; sweat?: boolean }[];
  /** つかれた瞬間の、おもちのしぶき（進み 0..1）。 */
  hit?: number;
  crowd?: number;
  /** 画面のふるえ（ピクセル）。 */
  shake?: number;
}

export function drawPlayScene(ctx: CanvasRenderingContext2D, s: PlayLook): void {
  ctx.save();
  if (s.shake) ctx.translate(Math.sin(s.t * 71) * s.shake, Math.cos(s.t * 53) * s.shake * 0.6);
  drawStageBackground(ctx, s.stage, s.t);
  drawCrowd(ctx, s.stage, s.t, s.crowd ?? 0);
  if (s.snowmen) for (const m of s.snowmen) drawSnowGuest(ctx, m.x, m.y, 'none', { scale: m.scale, hop: m.hop, sweat: m.sweat });

  // 奥から：クマの体 → 踏み台とさくらちゃん → 臼 → おもち → 杵と腕
  drawBear(ctx, BEAR_X, BEAR_Y, { ...s.bear, layer: 'body' });
  drawSakuraPart(ctx, s);
  drawUsu(ctx, USU_X, USU_Y);
  if (!s.mochi.hidden) drawMochi(ctx, USU_X, USU_Y + 8, { done: s.mochi.done, shine: s.mochi.shine, squash: s.mochi.squash, tilt: s.mochi.tilt, t: s.t });
  if (s.sakura.peek) drawPeekEyes(ctx, USU_X, USU_Y);
  if (s.hit !== undefined) drawBits(ctx, USU_X, USU_Y - 6, s.hit, '#fbf6e8', 11, 92);
  drawBear(ctx, BEAR_X, BEAR_Y, { ...s.bear, layer: 'arms' });
  if (s.ring) drawRing(ctx, { x: USU_X, y: USU_Y, r: RING_R, now: s.ring.now, kind: s.ring.kind, flash: s.ring.flash });
  if (s.ring2) drawRing(ctx, { x: USU_X, y: USU_Y, r: RING_R, now: s.ring2.now, kind: s.ring2.kind });
  if (s.snowball) {
    const b = s.snowball;
    if (b.ring !== undefined) drawRing(ctx, { x: b.x, y: b.y, r: 21, now: 21 + (1 - b.ring) * 34, kind: 'normal' });
    drawThrownSnowball(ctx, b.x, b.y, 15, b.spin);
  }
  if (s.snowBits) drawBits(ctx, s.snowBits.x, s.snowBits.y, s.snowBits.p, '#ffffff', 9, 74);
  if (s.stage === 3) drawSnowfall(ctx, s.t, HEIGHT, 30);
  ctx.restore();
}

function drawSakuraPart(ctx: CanvasRenderingContext2D, s: PlayLook): void {
  const { pose, stuck, flip = 0, gone = false, shake = 0 } = s.sakura;
  // 踏み台
  const top = SAKURA_Y + 16 * SAKURA_SCALE - 3;
  ctx.fillStyle = 'rgba(40,50,80,0.2)';
  ctx.beginPath();
  ctx.ellipse(SAKURA_X, USU_Y + USU_H + 2, 62, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b98f5c';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(SAKURA_X - 56, top, 112, 14, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8f693c';
  ctx.beginPath();
  ctx.rect(SAKURA_X - 46, top + 14, 14, USU_Y + USU_H - top - 14);
  ctx.rect(SAKURA_X + 32, top + 14, 14, USU_Y + USU_H - top - 14);
  ctx.fill();
  ctx.stroke();

  if (gone) return;

  // 返す動き：臼のほうへ身を乗り出して、もどる
  const k = Math.sin(flip * Math.PI);
  const dx = k * 30 + (shake ? Math.sin(s.t * 60) * shake : 0);
  const base = {
    scale: SAKURA_SCALE,
    stage: stuck,
    shadow: false
  };
  const x = SAKURA_X + dx;
  const y = SAKURA_Y - k * 7;
  if (pose === 'flip') drawStuckSakura(ctx, x, y, { ...base, view: 'right', flap: 0.3 + k * 1.9, rotate: k * 0.2 });
  else if (pose === 'dizzy') {
    drawStuckSakura(ctx, x, y, { ...base, dead: true, rotate: Math.sin(s.t * 8) * 0.1 });
    if (stuck < 3) drawDizzy(ctx, x, y - 48, s.t);
  } else if (pose === 'shock') drawStuckSakura(ctx, x, y, { ...base, eyes: 'shock', gaze: 1 });
  else if (pose === 'happy') drawStuckSakura(ctx, x, y, { ...base, eyes: 'happy', gaze: 0.6, squash: Math.abs(Math.sin(s.t * 6)) * 0.05 });
  else if (pose === 'worry') drawStuckSakura(ctx, x, y, { ...base, eyes: 'shock', blush: 0, gaze: 1 });
  else drawStuckSakura(ctx, x, y, { ...base, gaze: 1 });
}

/** 杵の頭の位置（画面の座標）。しぶきなどの基準に使う。 */
export function kineHeadAt(lift: number): { x: number; y: number } {
  const p = kinePose(lift);
  return { x: BEAR_X + p.hx, y: BEAR_Y + p.hy };
}

// --- 情報欄 -----------------------------------------------------------------

export interface HudState {
  stage: number;
  /** のこりの回数。 */
  left: number;
  score: number;
  hiScore: number;
  /** くっついた回数 0..3。 */
  stuck: number;
  /** ぴったりの連続 0..8。 */
  chain: number;
  /** れんぞく（ミスなし）。 */
  combo: number;
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
  text(ctx, `${h.stage}うすめ`, 76, HUD_H / 2, 15, COLOR.ink, true);
  text(ctx, 'のこり', 160, 12, 10, COLOR.muted, true);
  text(ctx, `${h.left}かい`, 160, 27, 15, '#8fd0ff', true);
  text(ctx, 'てんすう', 270, 12, 10, COLOR.muted, true);
  text(ctx, h.score.toLocaleString('en-US'), 270, 27, 15, COLOR.ink, true);
  text(ctx, 'ハイスコア', 400, 12, 10, COLOR.muted, true);
  text(ctx, h.hiScore.toLocaleString('en-US'), 400, 27, 15, COLOR.muted, true);

  const y = HUD_H;
  ctx.fillStyle = 'rgba(10,18,38,0.72)';
  ctx.fillRect(0, y, WIDTH, INFO_H);
  const cy = y + INFO_H / 2;
  // くっつき：3 つでゲームオーバー
  text(ctx, 'くっつき', 40, cy, 12, COLOR.ink, true);
  for (let k = 0; k < 3; k++) {
    const on = k < h.stuck;
    const x = 88 + k * 25;
    ctx.fillStyle = on ? '#fbf6e8' : 'rgba(255,255,255,0.12)';
    ctx.strokeStyle = on ? '#ff8d7e' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, cy, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // れんぞく
  if (h.combo >= 2) outlinedText(ctx, `${h.combo}れんぞく`, 215, cy, 14, '#ffe38a', '#5a3a1e');
  // ぴったりの連続：8 こたまると、おもちが 1 つはがれる
  text(ctx, 'ぴったり', 298, cy, 12, COLOR.ink, true);
  for (let k = 0; k < 8; k++) {
    const on = k < h.chain;
    ctx.fillStyle = on ? '#ffd84a' : 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    rr(ctx, 332 + k * 17.5, cy - 7, 14, 14, 4);
    ctx.fill();
  }
}

/** ぴったりでおもちが光る演出を、画面のどこにでも出せるようにしたもの。 */
export function drawSparkleBurst(ctx: CanvasRenderingContext2D, x: number, y: number, p: number): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.4;
    const q = 30 + p * 66;
    sparkle(ctx, x + Math.cos(a) * q, y + Math.sin(a) * q * 0.7, 8 + (k % 3) * 3);
  }
  ctx.restore();
}

/** 判定の文字。 */
export function drawJudge(ctx: CanvasRenderingContext2D, s: string, p: number, color: string, outline: string, size = 34): void {
  ctx.save();
  ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1;
  const y = USU_Y - RING_R - 40 - p * 20;
  const k = p < 0.12 ? 0.75 + (p / 0.12) * 0.25 : 1;
  outlinedText(ctx, s, USU_X - 30, y, size * k, color, outline);
  ctx.restore();
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
  // 口の根もとの線を消す
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.fillRect(x - 8, y + h / 2 - 3, 16, 4);
  text(ctx, s, x, y, size, '#4a3326', true);
  ctx.restore();
}
