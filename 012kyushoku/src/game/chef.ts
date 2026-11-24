// 給食当番のさくらちゃん。sakura.ts の絵に、給食帽・白いエプロン・おたま・自分の器を重ねる。
// (x, y) = 足元の中心。

import { drawBowl, type FoodKind } from './food';
import { heart } from './kids';
import { drawSakura, type SakuraEyes } from './sakura';
import { FONT } from './ui';

/**
 * serve = おたまを持って当番中、cheer = 面クリアでおたまをふる、
 * eat = 自分の給食をもぐもぐ、full = おなかいっぱい、little = 少なくてしょんぼり、empty = 空のお皿でしょんぼり、
 * shock = ミスにびっくり（目を見開き、羽を広げて跳び上がる。t = 0 からの 0.4 秒で跳ねる）。
 */
export type ChefPose = 'serve' | 'cheer' | 'eat' | 'full' | 'little' | 'empty' | 'shock';

export interface ChefOptions {
  pose?: ChefPose;
  /** 目線。列を見る場面では右を向く。 */
  gaze?: number;
  scale?: number;
  t?: number;
  /** 自分の器の中身（eat / full / little で使う）。 */
  food?: FoodKind;
}

export function drawChef(ctx: CanvasRenderingContext2D, x: number, y: number, o: ChefOptions = {}): void {
  const { pose = 'serve', scale = 2.4, t = 0, food = 'soup' } = o;
  const s = scale;
  const cy = y - 16 * s;
  const eating = pose === 'eat' || pose === 'full' || pose === 'little' || pose === 'empty';
  const eyes: SakuraEyes =
    pose === 'full' || pose === 'cheer' ? 'happy' : pose === 'little' || pose === 'empty' ? 'sad' : pose === 'eat' ? 'closed'
    : pose === 'shock' ? 'shock' : 'dot';
  const bob = pose === 'cheer' ? -Math.abs(Math.sin(t * 6)) * 4 : pose === 'eat' ? -Math.abs(Math.sin(t * 7)) * 1.2
    : pose === 'shock' && t < 0.4 ? -Math.sin((t / 0.4) * Math.PI) * 5 * s : 0;
  const chew = pose === 'eat' && Math.floor(t * 4) % 2 === 0;
  const squash = pose === 'little' || pose === 'empty' ? 0.06 : 0;

  // おたま（体のうしろ側にあるときは先に描く）
  if (pose === 'serve' || pose === 'cheer' || pose === 'shock') {
    ladle(ctx, x, cy + bob, s, pose === 'cheer' ? Math.sin(t * 6) * 0.5 - 0.3 : pose === 'shock' ? 0.9 : 0.1);
  }

  drawSakura(ctx, x, cy + bob, {
    scale: s,
    eyes,
    squash,
    puff: chew ? 0.5 : pose === 'full' ? 0.25 : 0,
    blush: pose === 'full' ? 0.6 : 0,
    beakOpen: (pose === 'eat' && !chew) || pose === 'shock',
    spread: pose === 'shock' ? 0.55 : 0,
    gaze: o.gaze ?? (pose === 'serve' ? 0.4 : 0)
  });

  // 給食帽とエプロン
  ctx.save();
  ctx.translate(x, cy + bob);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(0, 16);
  ctx.scale(1 + squash, 1 - squash);
  ctx.translate(0, -17.5);
  // エプロン（おなかの白い前かけ）
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8a9aae';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-6.5, 5.2);
  ctx.lineTo(6.5, 5.2);
  ctx.quadraticCurveTo(8.4, 11, 7.4, 15.2);
  ctx.quadraticCurveTo(0, 16.6, -7.4, 15.2);
  ctx.quadraticCurveTo(-8.4, 11, -6.5, 5.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ポケットの桜
  ctx.fillStyle = '#f283a8';
  ctx.beginPath();
  ctx.arc(3.4, 10.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  // 帽子（向かって左に寄せて、右の花飾りが見えるように）
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8a9aae';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(-3.2, -14.6, 8.6, 4.6, -0.12, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(5, -9.4, -3, -9.6);
  ctx.quadraticCurveTo(-11, -9.8, -11.6, -13.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(138,154,174,0.7)';
  ctx.beginPath();
  ctx.moveTo(-10.6, -11.4);
  ctx.quadraticCurveTo(-3, -10.4, 4.6, -11.6);
  ctx.stroke();
  ctx.restore();

  if (pose === 'shock') {
    // 頭の上の「！」と、ひや汗
    ctx.save();
    ctx.font = `bold ${Math.round(11 * s)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    const ex = x + 13 * s;
    const ey = cy + bob - 20 * s;
    ctx.strokeText('！', ex, ey);
    ctx.fillStyle = '#e8473f';
    ctx.fillText('！', ex, ey);
    ctx.fillStyle = '#8fd0ff';
    ctx.strokeStyle = '#4c86b8';
    ctx.lineWidth = 1;
    for (const [dx, dy] of [[-15, -9], [-18, -1]] as const) {
      const px = x + dx * s;
      const py = cy + bob + dy * s;
      ctx.beginPath();
      ctx.moveTo(px, py - 2.6 * s);
      ctx.quadraticCurveTo(px - 1.6 * s, py, px, py + 0.9 * s);
      ctx.quadraticCurveTo(px + 1.6 * s, py, px, py - 2.6 * s);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  if (eating) {
    // 自分の器（体の前）
    const bw = 22 * s;
    const bh = 10 * s;
    const fill = pose === 'full' ? 0.75 : pose === 'little' ? 0.18 : pose === 'empty' ? 0 : 0.5;
    drawBowl(ctx, { x: x - bw / 2, y: y - bh + 2, w: bw, h: bh }, { food: pose === 'empty' ? null : food, fill, marks: 0, t });
    if (pose === 'eat') {
      ctx.save();
      ctx.font = `bold ${Math.round(5.4 * s)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText('もぐもぐ', x + 20 * s, cy - 12 * s);
      ctx.fillStyle = '#8c5c31';
      ctx.fillText('もぐもぐ', x + 20 * s, cy - 12 * s);
      ctx.restore();
    }
    if (pose === 'full') {
      for (const [ox, oy, k] of [
        [-17, -12, 0],
        [18, -14, 1],
        [14, -2, 2]
      ] as const) {
        ctx.save();
        ctx.globalAlpha *= 0.65 + 0.35 * Math.sin(t * 5 + k * 2);
        heart(ctx, x + ox * s, cy + oy * s, 3 * s);
        ctx.restore();
      }
    }
    if (pose === 'little' || pose === 'empty') {
      ctx.strokeStyle = 'rgba(80,110,170,0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const xx = x - 8 * s + k * 5.3 * s;
        ctx.moveTo(xx, cy - 20 * s);
        ctx.lineTo(xx, cy - (14 - (k % 2)) * s);
      }
      ctx.stroke();
    }
  }
}

/** おたま。angle = 柄のかたむき（0 で右ななめ上に立てる）。 */
function ladle(ctx: CanvasRenderingContext2D, x: number, cy: number, s: number, angle: number): void {
  ctx.save();
  ctx.translate(x + 11.5 * s, cy + 5 * s);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b7684';
  ctx.lineWidth = 3.2 * (s / 2.4);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(5 * s, -17 * s);
  ctx.stroke();
  ctx.strokeStyle = '#b9c4cf';
  ctx.lineWidth = 1.6 * (s / 2.4);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(5 * s, -17 * s);
  ctx.stroke();
  // 先の丸いところ（すくう皿）。丸い側を上にして、柄は平らな側のまん中につく
  ctx.translate(5.6 * s, -17.6 * s);
  ctx.fillStyle = '#d5dde5';
  ctx.strokeStyle = '#6b7684';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
