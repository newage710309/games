// 冬の森の駅（ホーム・電車）と、駅員のさくらちゃん、フクロウのおばあちゃんを描く。デザイン検討用。
import { drawAnimal, type AnimalKind } from './guests';
import { drawSakura } from './sakura';
import { COLOR, outlinedText, rr, text } from './ui';

export const WIDTH = 480;

/** 電車の数え方（1 ぽんめ・2 ほんめ・3 ぼんめ）。 */
export function trainName(index: number): string {
  return ['1ぽんめ', '2ほんめ', '3ぼんめ'][index] ?? `${index + 1}ほんめ`;
}
export const HEIGHT = 640;
export const HUD_H = 40;
export const FOOTER_H = 26;

/** ドア（3 つ）の中心 x。おばあちゃんのベンチは左端。 */
export const DOOR_X = [160, 280, 400] as const;
export const GRANNY_X = 56;
/** ドアの下端（ホームのふち）。 */
export const DOOR_BOTTOM = 262;
/** あふれた乗客の並ぶ位置（ドアに近い順）。4 人目の場所まで来たらミス。 */
export const SLOT_Y = [316, 356, 396, 436, 476] as const;
/** 列の並びの間隔。さくらちゃんは列の最後の人のうしろ（空なら先頭＝ドアの前）に立つ。 */
export const SLOT_GAP = 40;
/** あふれたお客さんの大きさ。 */
export const GUEST_SCALE = 1.65;
export const SAKURA_Y = 568;
/** 手前のホームの端。列の 5 人目（SLOT_Y[4]）がここに着いたら「あぶない！！」。 */
export const FRONT_EDGE_Y = 494;

/**
 * 電車とホームを少し斜めに見下ろす（本家の LCD と同じ斜めの画面）。右へ行くほど下がる。
 * 背景（電車・ホーム）は shear() の中で描き、キャラクターは proj() で位置だけ合わせる（形はゆがめない）。
 */
export const SLOPE = 0.16;

export function proj(x: number, y: number): { x: number; y: number } {
  return { x, y: y + SLOPE * (x - WIDTH / 2) };
}

function shear(ctx: CanvasRenderingContext2D): void {
  ctx.transform(1, SLOPE, 0, 1, 0, -SLOPE * (WIDTH / 2));
}

/** 列の j 番目（0 = ドアのすぐ前）の足元。 */
export function slotPos(door: number, j: number): { x: number; y: number } {
  return proj(DOOR_X[door]!, SLOT_Y[0] + j * SLOT_GAP);
}

const LINE = '#4a3326';

/** 空と森、ホーム。 */
export function drawStation(ctx: CanvasRenderingContext2D, t: number): void {
  const sky = ctx.createLinearGradient(0, HUD_H, 0, 300);
  sky.addColorStop(0, '#9cc4ea');
  sky.addColorStop(1, '#e2effa');
  ctx.fillStyle = sky;
  ctx.fillRect(0, HUD_H, WIDTH, 290);
  // 遠くの雪山と森
  ctx.fillStyle = '#c6d9ee';
  ctx.beginPath();
  ctx.moveTo(0, 130);
  ctx.lineTo(90, 70);
  ctx.lineTo(170, 120);
  ctx.lineTo(270, 60);
  ctx.lineTo(380, 118);
  ctx.lineTo(480, 80);
  ctx.lineTo(480, 330);
  ctx.lineTo(0, 330);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(72, 81);
  ctx.lineTo(90, 70);
  ctx.lineTo(106, 80);
  ctx.lineTo(96, 84);
  ctx.closePath();
  ctx.moveTo(252, 71);
  ctx.lineTo(270, 60);
  ctx.lineTo(288, 70);
  ctx.lineTo(276, 75);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  shear(ctx);
  // 線路（電車の下）
  ctx.fillStyle = '#7d8aa0';
  ctx.fillRect(-20, 262, WIDTH + 40, 10);
  // ホーム
  const floor = ctx.createLinearGradient(0, 272, 0, HEIGHT - FOOTER_H);
  floor.addColorStop(0, '#d9dde4');
  floor.addColorStop(1, '#eef0f4');
  ctx.fillStyle = floor;
  ctx.fillRect(-20, 272, WIDTH + 40, HEIGHT + 80 - 272);
  // 黄色い点字ブロック
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(-20, 286, WIDTH + 40, 10);
  ctx.fillStyle = 'rgba(160,120,20,0.35)';
  for (let x = -16; x < WIDTH + 20; x += 8) {
    ctx.beginPath();
    ctx.arc(x, 291, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 乗車位置の足あとマーク（ドアの前）
  for (const x of DOOR_X) {
    ctx.strokeStyle = 'rgba(79,134,198,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    rr(ctx, x - 36, 296, 72, 184, 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 手前のホームの端（黄色い線 → 白いふち → 向こうの線路）
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(-20, FRONT_EDGE_Y - 16, WIDTH + 40, 9);
  ctx.fillStyle = 'rgba(160,120,20,0.35)';
  for (let x = -16; x < WIDTH + 20; x += 8) {
    ctx.beginPath();
    ctx.arc(x, FRONT_EDGE_Y - 11.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-20, FRONT_EDGE_Y - 3, WIDTH + 40, 4);
  ctx.fillStyle = '#9aa3b2';
  ctx.fillRect(-20, FRONT_EDGE_Y + 1, WIDTH + 40, 10);
  ctx.fillStyle = '#5e6776';
  ctx.fillRect(-20, FRONT_EDGE_Y + 11, WIDTH + 40, HEIGHT);
  // 手前の線路（砂利・まくら木・レール）
  ctx.fillStyle = '#4b5361';
  for (let x = -20; x < WIDTH + 20; x += 26) ctx.fillRect(x, FRONT_EDGE_Y + 44, 14, 40);
  ctx.fillStyle = '#c9d0da';
  ctx.fillRect(-20, FRONT_EDGE_Y + 52, WIDTH + 40, 4);
  ctx.fillRect(-20, FRONT_EDGE_Y + 74, WIDTH + 40, 4);
  // 線路にも雪
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let k = 0; k < 18; k++) {
    ctx.beginPath();
    ctx.ellipse((k * 61) % (WIDTH + 40) - 20, FRONT_EDGE_Y + 30 + (k % 3) * 26, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 雪
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = 0; k < 30; k++) {
    const x = (k * 83.7 + Math.sin(t + k) * 10) % WIDTH;
    const y = HUD_H + ((k * 47.3 + t * (16 + (k % 4) * 6)) % 220);
    ctx.beginPath();
    ctx.arc(x, y, 1.3 + (k % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

const CROWD_KINDS: readonly AnimalKind[] = ['karasu', 'risu', 'usagi', 'kitsune', 'yamagara', 'momonga', 'shimaenaga', 'gojukara', 'akagera'];

/**
 * 車内のぎゅうぎゅう（ドア・窓の中）。ホームにあふれたお客さんと同じ大きさの正面向きのお客さんを、
 * 1 段に、肩が重なるくらいつめて並べる（足まで見える）。
 */
function crowd(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  ctx.save();
  rr(ctx, x, y, w, h, 4);
  ctx.clip();
  ctx.fillStyle = '#f3e7c8';
  ctx.fillRect(x, y, w, h);
  // つり革
  ctx.strokeStyle = 'rgba(90,80,70,0.5)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const sx = x + ((k + 0.5) * w) / 3;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.lineTo(sx, y + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, y + 8, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  const scale = GUEST_SCALE;
  const step = 12 * scale;
  // 足まで見えるように、床（下のふち）の少し上に立たせる
  const feet = y + h - 5;
  const n = Math.ceil(w / step) + 1;
  for (let k = 0; k < n; k++) {
    const pick = (seed * 7 + k * 3) % CROWD_KINDS.length;
    const jitter = ((seed * 13 + k * 5) % 5) - 2;
    const cx = x + k * step - step * 0.4;
    drawAnimal(ctx, cx, feet + jitter, CROWD_KINDS[pick]!, { scale, shadow: false, mood: (seed + k) % 3 === 0 ? 'happy' : 'normal' });
  }
  ctx.restore();
}

/** 電車（横から少し見下ろした 1 両）。open = ドアの開き具合 0..1、dx = 入ってくる・発車で動いた量。 */
export function drawTrain(ctx: CanvasRenderingContext2D, open: number, dx = 0): void {
  ctx.save();
  shear(ctx);
  ctx.translate(dx, 0);
  const top = 124;
  const bottom = DOOR_BOTTOM;
  const left = 96;
  const right = 496;
  // 屋根の上の面（見下ろしているので、車体の上に奥行きが見える）
  const depth = 22;
  ctx.fillStyle = '#cfd6e0';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(left + 4, top + 6);
  ctx.lineTo(left + 14, top - depth);
  ctx.lineTo(right - 8, top - depth);
  ctx.lineTo(right - 2, top + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 屋根につもった雪と、クーラーの箱
  ctx.fillStyle = '#ffffff';
  for (const [cx, w] of [
    [150, 70],
    [260, 90],
    [390, 110],
    [470, 36]
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(cx, top - depth * 0.45, w / 2, depth * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cx of [200, 340]) {
    ctx.fillStyle = '#e8ecf2';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    rr(ctx, cx - 22, top - depth + 4, 44, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, top - depth + 4, 22, 3, 0, Math.PI, 0);
    ctx.fill();
  }
  // 車体（クリーム色に桜色の帯）。下はホームのかげにかくれて、車輪は見えない
  ctx.fillStyle = '#fbf3e4';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, bottom + 2);
  ctx.lineTo(left, top + 12);
  ctx.quadraticCurveTo(left, top, left + 12, top);
  ctx.lineTo(right - 12, top);
  ctx.quadraticCurveTo(right, top, right, top + 12);
  ctx.lineTo(right, bottom + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f283a8';
  ctx.fillRect(left + 1, bottom - 36, right - left - 2, 11);
  ctx.fillStyle = '#4f86c6';
  ctx.fillRect(left + 1, top + 8, right - left - 2, 6);
  // 窓（ドアのあいだ）
  for (const [x, seed] of [
    [112, 1],
    [210, 2],
    [330, 3],
    [446, 4]
  ] as const) {
    crowd(ctx, x, top + 20, 34, 72, seed);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    rr(ctx, x, top + 20, 34, 72, 5);
    ctx.stroke();
  }
  // ドア（左右に開く）。中はぎゅうぎゅう
  for (const [i, x] of DOOR_X.entries()) {
    const w = 64;
    const y0 = top + 18;
    crowd(ctx, x - w / 2, y0, w, bottom - y0, i + 5);
    const half = (w / 2) * (1 - open);
    ctx.fillStyle = '#e8e2d4';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.1;
    ctx.fillRect(x - w / 2, y0, half, bottom - y0);
    ctx.strokeRect(x - w / 2, y0, half, bottom - y0);
    ctx.fillRect(x + w / 2 - half, y0, half, bottom - y0);
    ctx.strokeRect(x + w / 2 - half, y0, half, bottom - y0);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x - w / 2, y0, w, bottom - y0);
  }
  // 車体の下のかげ（ホームとのすき間）
  ctx.fillStyle = 'rgba(30,30,40,0.35)';
  ctx.fillRect(left, bottom, right - left, 6);
  ctx.restore();
}

/** 駅員の帽子。 */
function staffCap(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tilt: number): void {
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
  ctx.restore();
}

export type StaffPose = 'wait' | 'push' | 'stand' | 'shock' | 'happy' | 'help';

/** 駅員のさくらちゃん。push = 列に向かって押している（後ろ姿で前のめり）。 */
export function drawStaff(ctx: CanvasRenderingContext2D, x: number, y: number, pose: StaffPose, s = 2.3): void {
  if (pose === 'push' || pose === 'wait') {
    const lean = pose === 'push' ? -10 : 0;
    drawSakura(ctx, x, y + lean, { view: 'back', scale: s, squash: pose === 'push' ? -0.08 : 0 });
    staffCap(ctx, x, y + lean - 13 * s, s, 0);
    if (pose === 'push') {
      // 押している勢いの線
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const dx of [-22, 0, 22]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y - 50);
        ctx.lineTo(x + dx * 1.2, y - 66);
        ctx.stroke();
      }
      outlinedText(ctx, 'ぎゅっ！', x + 44, y - 58, 18, '#ffffff', '#b8483e');
    }
    return;
  }
  drawSakura(ctx, x, y, {
    scale: s,
    eyes: pose === 'shock' ? 'shock' : pose === 'happy' || pose === 'help' ? 'happy' : 'dot'
  });
  staffCap(ctx, x - 3.2 * s, y - 13 * s, s, -0.18);
}

export interface GrannyOptions {
  /** 向こうを向いている（助けられない）。 */
  away?: boolean;
  /** ふらふら 0..1（大きいほど倒れそう）。 */
  wobble?: number;
  time?: number;
  happy?: boolean;
  scale?: number;
}

/** フクロウのおばあちゃん（ショールとつえ）。(x, y) = 足元。 */
export function drawGranny(ctx: CanvasRenderingContext2D, x: number, y: number, o: GrannyOptions = {}): void {
  const { away = false, wobble = 0, time = 0, happy = false, scale = 2 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(40,40,60,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(Math.sin(time * 5) * 0.18 * wobble);
  // つえ
  ctx.strokeStyle = '#7a5536';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(11, -20);
  ctx.quadraticCurveTo(11, -24, 7.5, -23);
  ctx.stroke();
  // 体
  ctx.fillStyle = '#a58a70';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(12, -36, 14, -20, 13, -10);
  ctx.bezierCurveTo(12, -2, 7, 0, 0, 0);
  ctx.bezierCurveTo(-7, 0, -12, -2, -13, -10);
  ctx.bezierCurveTo(-14, -20, -12, -36, 0, -36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ショール
  ctx.fillStyle = '#c86a8a';
  ctx.beginPath();
  ctx.moveTo(-12.5, -18);
  ctx.quadraticCurveTo(0, -12, 12.5, -18);
  ctx.lineTo(10, -10);
  ctx.quadraticCurveTo(0, -5, -10, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-9, -14);
  ctx.quadraticCurveTo(0, -9.5, 9, -14);
  ctx.stroke();
  if (away) {
    // 後ろ姿：羽の模様だけ
    ctx.strokeStyle = 'rgba(80,55,35,0.5)';
    ctx.lineWidth = 0.9;
    for (const yy of [-30, -26]) {
      ctx.beginPath();
      ctx.arc(0, yy, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  } else {
    // 顔（白い顔盤・丸めがね）
    ctx.fillStyle = '#f3e6cc';
    ctx.beginPath();
    ctx.ellipse(0, -26, 9.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2a20';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(-4.2, -27, 3.2, 0, Math.PI * 2);
    ctx.moveTo(7.4, -27);
    ctx.arc(4.2, -27, 3.2, 0, Math.PI * 2);
    ctx.moveTo(-1, -27);
    ctx.lineTo(1, -27);
    ctx.stroke();
    ctx.fillStyle = '#2a1c14';
    if (happy) {
      ctx.strokeStyle = '#2a1c14';
      ctx.beginPath();
      ctx.arc(-4.2, -26.2, 1.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.moveTo(5.6, -26.8);
      ctx.arc(4.2, -26.2, 1.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-4.2, -27, 1.1, 0, Math.PI * 2);
      ctx.arc(4.2, -27, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e0a53c';
    ctx.beginPath();
    ctx.moveTo(-1.3, -24.5);
    ctx.lineTo(1.3, -24.5);
    ctx.lineTo(0, -21.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (wobble > 0.5 && !happy) {
    outlinedText(ctx, 'ふらふら…', x, y - 70 * (scale / 1.6), 12, '#ffffff', '#6a4a80');
  }
}

/** ベンチ。 */
export function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#8a6242';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  rr(ctx, x - 34, y - 26, 68, 8, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 30, y - 18, 4, 18);
  ctx.fillRect(x + 26, y - 18, 4, 18);
}

export interface HudState {
  score: number;
  hiScore: number;
  /** 何本目の電車か（1..3）。 */
  train: number;
  /** 発車まで（時間の進み具合 0..1）。 */
  depart: number;
  /** 発車までの残り秒数。 */
  timeLeft: number;
}

export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  ctx.fillStyle = COLOR.panel;
  rr(ctx, 4, 4, 34, 32, 6);
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(15, 12, 4, 16);
  ctx.fillRect(23, 12, 4, 16);
  text(ctx, trainName(h.train - 1), 66, 20, 16, COLOR.pink, true);
  text(ctx, '/3', 104, 22, 11, COLOR.muted, true);
  // 発車までのゲージ
  text(ctx, h.timeLeft > 0 ? `のこり ${Math.ceil(h.timeLeft)}びょう` : 'はっしゃ まぢか', 158, 20, 11, h.timeLeft > 0 && h.timeLeft <= 5 ? '#ff8a8a' : COLOR.muted, true);
  ctx.fillStyle = '#1a2540';
  rr(ctx, 198, 14, 110, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#8fd0ff';
  rr(ctx, 198, 14, 110 * h.depart, 12, 6);
  ctx.fill();
  text(ctx, `${h.score}`, 420, 20, 20, '#ffe38a', true, 'right');
  text(ctx, 'てん', 424, 22, 12, COLOR.muted, false, 'left');
  text(ctx, `HI ${h.hiScore}`, 474, 32, 9, COLOR.muted, false, 'right');
}

export function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, HEIGHT - FOOTER_H, WIDTH, FOOTER_H);
  text(ctx, 'れつを タップで いどう（おしこみは じどう） ・ ホームの はしまで きたら アウト', WIDTH / 2, HEIGHT - FOOTER_H / 2, 11, COLOR.muted, true);
}

/** タップした場所の波紋（移動先の目印）。 */
export function drawTapMark(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  ctx.strokeStyle = `rgba(242,131,168,${1 - k})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 14 + k * 22, (14 + k * 22) * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** おばあちゃん（ベンチ）の足元。 */
export function grannyPos(): { x: number; y: number } {
  return proj(GRANNY_X, 420);
}

/** おばあちゃんを助けるときの、さくらちゃんの居場所（ベンチの右横）。 */
export function staffAtGranny(): { x: number; y: number } {
  const p = grannyPos();
  return { x: p.x + 46, y: p.y + 10 };
}

/** 走ってくるゆきまるくんの足元。k = 0（右はし）→ 1（左はし）。 */
export function yukimaruPos(k: number): { x: number; y: number } {
  return proj(WIDTH + 40 - k * (WIDTH + 80), 456);
}
