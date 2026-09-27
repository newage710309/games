// お客さんの後ろ姿（電車のドアに向かって並んでいるところ）。(cx, cy) = 足元の中心。scale 1 で高さ 約 34px。
// 形と色は guests.ts の正面の絵に合わせている。

import type { AnimalKind, GuestOptions } from './guests';
import { drawSakura } from './sakura';

const LINE = '#4a3326';

function stroke(ctx: CanvasRenderingContext2D, w = 1.1, color = LINE): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** 下ぶくれの体（鳥用）。guests.ts と同じ形。 */
function blobPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w * 0.62, -h, w, -h * 0.58, w, -h * 0.3);
  ctx.bezierCurveTo(w, -h * 0.04, w * 0.6, 0, 0, 0);
  ctx.bezierCurveTo(-w * 0.6, 0, -w, -h * 0.04, -w, -h * 0.3);
  ctx.bezierCurveTo(-w, -h * 0.58, -w * 0.62, -h, 0, -h);
  ctx.closePath();
}

function clipped(ctx: CanvasRenderingContext2D, path: () => void, paint: () => void): void {
  ctx.save();
  path();
  ctx.clip();
  paint();
  ctx.restore();
}

function birdFeet(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 4, -2);
    ctx.lineTo(s * 4, 1);
  }
  ctx.stroke();
}

/** 尾羽（下へ出る）。 */
function tailFeathers(ctx: CanvasRenderingContext2D, color: string, len = 7): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-3.2, -3);
  ctx.lineTo(-2.4, len - 2);
  ctx.lineTo(2.4, len - 2);
  ctx.lineTo(3.2, -3);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 0.8);
}

/** 背中にたたんだ翼。 */
function foldedWings(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, patch?: string): void {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(w - 0.6, -h * 0.62);
    ctx.quadraticCurveTo(w + 1.2, -h * 0.2, 2.2, -h * 0.06);
    ctx.quadraticCurveTo(w * 0.35, -h * 0.4, w - 0.6, -h * 0.62);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    stroke(ctx, 0.9);
    if (patch) {
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.ellipse(w * 0.62, -h * 0.5, 2.6, 1.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function backKarasu(ctx: CanvasRenderingContext2D): void {
  const w = 13;
  const h = 34;
  tailFeathers(ctx, '#1b1a21', 8);
  birdFeet(ctx, '#3a3a44');
  const g = ctx.createLinearGradient(-10, -34, 10, 0);
  g.addColorStop(0, '#4a4958');
  g.addColorStop(1, '#23222b');
  ctx.fillStyle = g;
  blobPath(ctx, w, h);
  ctx.fill();
  stroke(ctx, 1.1, '#15141a');
  foldedWings(ctx, w, h, '#1b1a21');
  ctx.strokeStyle = 'rgba(140,150,220,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -27, 6, Math.PI * 1.15, Math.PI * 1.6);
  ctx.stroke();
}

function backYamagara(ctx: CanvasRenderingContext2D): void {
  const w = 12.5;
  const h = 31;
  tailFeathers(ctx, '#5d6674');
  birdFeet(ctx, '#6a5a52');
  const path = (): void => blobPath(ctx, w, h);
  ctx.fillStyle = '#6d7684';
  path();
  ctx.fill();
  clipped(ctx, path, () => {
    // 黒い頭、首すじの白、脇の栗色
    ctx.fillStyle = '#23201f';
    ctx.beginPath();
    ctx.ellipse(0, -30, 15, 8.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath();
    ctx.ellipse(0, -24.4, 3.4, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9743a';
    ctx.beginPath();
    ctx.ellipse(-12, -6, 4.6, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(12, -6, 4.6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  path();
  stroke(ctx);
  foldedWings(ctx, w, h, '#5d6674');
}

function backGojukara(ctx: CanvasRenderingContext2D): void {
  const w = 12.5;
  const h = 31;
  tailFeathers(ctx, '#6a809a');
  birdFeet(ctx, '#7a6a60');
  const path = (): void => blobPath(ctx, w, h);
  ctx.fillStyle = '#7d93ad';
  path();
  ctx.fill();
  clipped(ctx, path, () => {
    // 目のすじのはしと、脇のだいだい
    ctx.strokeStyle = '#1e1d22';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-14, -21.5);
    ctx.lineTo(-10, -23);
    ctx.moveTo(14, -21.5);
    ctx.lineTo(10, -23);
    ctx.stroke();
    ctx.fillStyle = '#e0a47a';
    ctx.beginPath();
    ctx.ellipse(-12, -5, 4.4, 6.5, 0, 0, Math.PI * 2);
    ctx.ellipse(12, -5, 4.4, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  path();
  stroke(ctx);
  foldedWings(ctx, w, h, '#6a809a');
}

function backAkagera(ctx: CanvasRenderingContext2D): void {
  const w = 12.5;
  const h = 33;
  // 赤い下尾筒と黒い尾羽
  ctx.fillStyle = '#d63a3e';
  ctx.beginPath();
  ctx.ellipse(0, -1.5, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  tailFeathers(ctx, '#1f1e24', 8);
  birdFeet(ctx, '#5a5a62');
  const path = (): void => blobPath(ctx, w, h);
  ctx.fillStyle = '#1f1e24';
  path();
  ctx.fill();
  clipped(ctx, path, () => {
    // 白い首すじと、後頭部の赤
    ctx.fillStyle = '#fbfaf6';
    ctx.beginPath();
    ctx.ellipse(-9, -22, 4, 3, 0.4, 0, Math.PI * 2);
    ctx.ellipse(9, -22, 4, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d63a3e';
    ctx.beginPath();
    ctx.ellipse(0, -27, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  path();
  stroke(ctx);
  // 肩の白い V 字
  foldedWings(ctx, w, h, '#1f1e24', '#ffffff');
}

function backRisu(ctx: CanvasRenderingContext2D): void {
  const fur = '#6e5d55';
  const furDark = '#54463f';
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -9, 9.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  for (const s of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(s * 3.5, -30);
    ctx.quadraticCurveTo(s * 5, -40, s * 8.5, -41);
    ctx.quadraticCurveTo(s * 10, -34, s * 9.5, -28);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 0.9);
    ctx.strokeStyle = furDark;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(s * 8.2, -40.5);
    ctx.lineTo(s * 7.5, -44);
    ctx.moveTo(s * 8.6, -40.5);
    ctx.lineTo(s * 10, -43.4);
    ctx.stroke();
  }
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -25, 9.5, 8.6, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  // 背中にそって立てた、ふさふさの尻尾（後ろからだと体の手前に見える）
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.bezierCurveTo(-8, -10, -6, -22, 2, -30);
  ctx.bezierCurveTo(6, -36, 14, -34, 12, -26);
  ctx.bezierCurveTo(9, -22, 6, -16, 7, -8);
  ctx.bezierCurveTo(7, -2, 2, 1, -2, -2);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1, -6);
  ctx.quadraticCurveTo(-1, -18, 5, -28);
  ctx.stroke();
}

function backMomonga(ctx: CanvasRenderingContext2D): void {
  const fur = '#b9b2a6';
  // 体と、広げた飛膜
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(-15, -18, -15.5, -9);
  ctx.quadraticCurveTo(-12, -6, -13, -1.5);
  ctx.quadraticCurveTo(0, 1.5, 13, -1.5);
  ctx.quadraticCurveTo(12, -6, 15.5, -9);
  ctx.quadraticCurveTo(15, -18, 6, -20);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  // 平たい尻尾（まん中から下へ）
  ctx.fillStyle = '#a39b8f';
  ctx.beginPath();
  ctx.ellipse(0, -2, 3.8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, 0.9);
  for (const s of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(s * 7.8, -33, 3.2, 0, Math.PI * 2);
    ctx.fill();
    stroke(ctx, 0.9);
  }
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -25, 10.5, 9.2, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
}

function backKitsune(ctx: CanvasRenderingContext2D): void {
  const fur = '#e08a3c';
  // 体（おすわり）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(-11, -8, -9, 0);
  ctx.lineTo(9, 0);
  ctx.quadraticCurveTo(11, -8, 6, -20);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  // 耳（裏が黒）
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#2e2422';
    ctx.beginPath();
    ctx.moveTo(s * 3, -33);
    ctx.lineTo(s * 9.5, -42);
    ctx.lineTo(s * 11, -29);
    ctx.closePath();
    ctx.fill();
  }
  // 頭（後頭部）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -29, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  // 足もとに巻いた尻尾（白い先）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-3, -1);
  ctx.bezierCurveTo(-4, -8, 6, -12, 14, -6);
  ctx.bezierCurveTo(18, -3, 16, 2, 10, 1.5);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.ellipse(14, -2, 3.4, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function backUsagi(ctx: CanvasRenderingContext2D): void {
  const fur = '#fbfcff';
  const shade = '#dfe6ef';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 4.5, -30);
    ctx.rotate(s * 0.14);
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, -9, 3.4, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    stroke(ctx, 0.9);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -9, 3.4, 10, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#2a2428';
    ctx.fillRect(-5, -21, 10, 5);
    ctx.restore();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(-3, -14, 2, 0, -10, 14);
  g.addColorStop(0, fur);
  g.addColorStop(1, shade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -10, 11.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -25, 9.5, 8.2, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  // まるい尻尾
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -4, 3.6, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, 0.8);
}

const DRAW_BACK: Record<Exclude<AnimalKind, 'shimaenaga'>, (ctx: CanvasRenderingContext2D) => void> = {
  karasu: backKarasu,
  yamagara: backYamagara,
  gojukara: backGojukara,
  akagera: backAkagera,
  risu: backRisu,
  momonga: backMomonga,
  kitsune: backKitsune,
  usagi: backUsagi
};

/** お客さんの後ろ姿を (cx, cy) = 足元 に描く。 */
export function drawAnimalBack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: AnimalKind,
  opts: GuestOptions = {}
): void {
  const { scale = 1, hop = 0, shadow = true, alpha = 1 } = opts;
  const lift = Math.abs(Math.sin(hop * Math.PI)) * 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (shadow) {
    ctx.fillStyle = 'rgba(40,70,110,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.5 * scale, (12 - lift) * scale, 2.6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === 'shimaenaga') {
    // シマエナガはさくらちゃんと同じ形の後ろ姿（白い体・花飾りなし）
    drawSakura(ctx, cx, cy - (16 + lift) * scale * 1.15, { view: 'back', scale: scale * 1.15, bird: 'yukimaru', shadow: false });
    ctx.restore();
    return;
  }
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.translate(0, -lift);
  DRAW_BACK[kind](ctx);
  ctx.restore();
}
