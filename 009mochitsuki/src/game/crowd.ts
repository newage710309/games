// 見物の動物たちを Canvas2D で描く。(x, y) = 足元の中心。scale 1 で高さ 約 44px。

const LINE = '#4a3326';
const INK = '#1e140e';

export type AnimalKind = 'usagi' | 'risu' | 'kitsune' | 'tanuki' | 'karasu';

export interface AnimalOptions {
  scale?: number;
  /** はねる高さ（ピクセル）。 */
  hop?: number;
  /** にっこり目。 */
  happy?: boolean;
  /** 左右反転。 */
  flip?: boolean;
  /** くちばしにおもちをくわえる（カラスのみ）。 */
  mochi?: boolean;
  shadow?: boolean;
}

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, happy: boolean, r = 1.7): void {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  if (happy) {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(x + s * gap - 2.6, y + 1);
      ctx.quadraticCurveTo(x + s * gap, y - 2.6, x + s * gap + 2.6, y + 1);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x - gap, y, r, 0, Math.PI * 2);
    ctx.arc(x + gap, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function usagi(ctx: CanvasRenderingContext2D, happy: boolean): void {
  const c = '#efe6da';
  round(ctx, -6, -46, 3.8, 11, c, -0.12);
  round(ctx, 6, -46, 3.8, 11, c, 0.12);
  ctx.save();
  ctx.strokeStyle = 'transparent';
  round(ctx, -6, -45, 1.8, 7.5, '#f4b9c5', -0.12);
  round(ctx, 6, -45, 1.8, 7.5, '#f4b9c5', 0.12);
  ctx.restore();
  round(ctx, 0, -12, 13, 12, c);
  round(ctx, 0, -28, 13, 12, c);
  eyes(ctx, 0, -30, 5.4, happy);
  ctx.fillStyle = '#e88fa0';
  ctx.beginPath();
  ctx.arc(0, -25.6, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function risu(ctx: CanvasRenderingContext2D, happy: boolean): void {
  const c = '#c97f42';
  // 大きなしっぽ
  ctx.fillStyle = '#b76c33';
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.bezierCurveTo(32, -8, 30, -44, 13, -42);
  ctx.bezierCurveTo(5, -40, 10, -30, 17, -30);
  ctx.bezierCurveTo(16, -22, 10, -14, 10, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  round(ctx, 0, -10, 11, 10, c);
  round(ctx, -7, -32, 3.2, 4.5, c);
  round(ctx, 7, -32, 3.2, 4.5, c);
  round(ctx, 0, -24, 11, 10, c);
  ctx.save();
  ctx.strokeStyle = 'transparent';
  round(ctx, 0, -20.5, 6, 5, '#f2dcc0');
  round(ctx, 0, -8.5, 6, 6.5, '#f2dcc0');
  ctx.restore();
  eyes(ctx, 0, -26, 4.8, happy);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -21.8, 1, 0, Math.PI * 2);
  ctx.fill();
}

function kitsune(ctx: CanvasRenderingContext2D, happy: boolean): void {
  const c = '#e28b3d';
  // しっぽ
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(9, -5);
  ctx.quadraticCurveTo(34, -6, 28, -30);
  ctx.quadraticCurveTo(22, -16, 8, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff6ea';
  ctx.beginPath();
  ctx.moveTo(28, -30);
  ctx.quadraticCurveTo(25.5, -21, 21, -19);
  ctx.quadraticCurveTo(29, -19, 29.6, -22);
  ctx.closePath();
  ctx.fill();
  round(ctx, 0, -11, 12, 11, c);
  // 耳と顔
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.lineTo(-13, -46);
  ctx.lineTo(-3, -36);
  ctx.lineTo(3, -36);
  ctx.lineTo(13, -46);
  ctx.lineTo(14, -30);
  ctx.quadraticCurveTo(12, -19, 0, -16);
  ctx.quadraticCurveTo(-12, -19, -14, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff6ea';
  ctx.beginPath();
  ctx.moveTo(-11.5, -27);
  ctx.quadraticCurveTo(-5, -26, 0, -21);
  ctx.quadraticCurveTo(5, -26, 11.5, -27);
  ctx.quadraticCurveTo(9, -20, 0, -17);
  ctx.quadraticCurveTo(-9, -20, -11.5, -27);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, 0, -29, 6, happy);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -19.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function tanuki(ctx: CanvasRenderingContext2D, happy: boolean): void {
  const c = '#9a8064';
  round(ctx, -10, -39, 4.2, 4.2, '#5e4a38');
  round(ctx, 10, -39, 4.2, 4.2, '#5e4a38');
  round(ctx, 0, -13, 15, 13, c);
  round(ctx, 0, -29, 14, 12, c);
  ctx.save();
  ctx.strokeStyle = 'transparent';
  round(ctx, 0, -11, 8, 8, '#d9c7a9');
  round(ctx, -6, -30, 5, 4.2, '#4d3c2e');
  round(ctx, 6, -30, 5, 4.2, '#4d3c2e');
  round(ctx, 0, -25, 5, 3.8, '#efe3cd');
  ctx.restore();
  ctx.save();
  if (happy) {
    ctx.strokeStyle = '#fff6ea';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(s * 6 - 2.4, -29.5);
      ctx.quadraticCurveTo(s * 6, -33, s * 6 + 2.4, -29.5);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6, -30.4, 1.7, 0, Math.PI * 2);
    ctx.arc(6, -30.4, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -26, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function karasu(ctx: CanvasRenderingContext2D, happy: boolean, mochi: boolean): void {
  const c = '#2d2c36';
  // 尾
  ctx.fillStyle = '#1e1d26';
  ctx.beginPath();
  ctx.moveTo(10, -14);
  ctx.lineTo(27, -6);
  ctx.lineTo(10, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 足
  ctx.strokeStyle = '#3a3226';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, -6);
  ctx.lineTo(-3, 0);
  ctx.moveTo(4, -6);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  round(ctx, 1, -14, 13, 10.5, c);
  round(ctx, -7, -26, 9.5, 9, c);
  // 翼
  ctx.fillStyle = '#3e3d4a';
  ctx.beginPath();
  ctx.moveTo(-3, -18);
  ctx.quadraticCurveTo(10, -22, 15, -8);
  ctx.quadraticCurveTo(3, -7, -3, -18);
  ctx.closePath();
  ctx.fill();
  // くちばし
  ctx.fillStyle = '#54505e';
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.quadraticCurveTo(-23, -28, -27, -24);
  ctx.lineTo(-14, -23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (mochi) {
    ctx.fillStyle = '#fbf6e8';
    ctx.strokeStyle = '#a39578';
    ctx.beginPath();
    ctx.ellipse(-26, -22, 7, 5.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 目
  if (happy) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12.4, -27);
    ctx.quadraticCurveTo(-10, -30.4, -7.6, -27);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-10, -28, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-10.6, -28, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawAnimal(ctx: CanvasRenderingContext2D, kind: AnimalKind, x: number, y: number, opts: AnimalOptions = {}): void {
  const { scale = 1, hop = 0, happy = false, flip = false, mochi = false, shadow = true } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -scale : scale, scale);
  if (shadow) {
    ctx.fillStyle = 'rgba(40,50,80,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(0, -hop);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  if (kind === 'usagi') usagi(ctx, happy);
  else if (kind === 'risu') risu(ctx, happy);
  else if (kind === 'kitsune') kitsune(ctx, happy);
  else if (kind === 'tanuki') tanuki(ctx, happy);
  else karasu(ctx, happy, mochi);
  ctx.restore();
}

/** 面ごとの見物の並び（画面の座標）。 */
interface Seat {
  kind: AnimalKind;
  x: number;
  y: number;
  scale: number;
  flip?: boolean;
}

const SEATS: Seat[][] = [
  // 1 うすめ：通りかかった 2 ひきだけ
  [
    { kind: 'usagi', x: 44, y: 382, scale: 1.05 },
    { kind: 'risu', x: 300, y: 378, scale: 0.95 }
  ],
  // 2 うすめ：ふえる（カラスは あとで つまみ食いする）
  [
    { kind: 'usagi', x: 40, y: 386, scale: 1.1 },
    { kind: 'tanuki', x: 86, y: 380, scale: 1.05 },
    { kind: 'risu', x: 132, y: 378, scale: 0.95 },
    { kind: 'kitsune', x: 180, y: 382, scale: 1.05, flip: true },
    { kind: 'usagi', x: 236, y: 378, scale: 0.92, flip: true },
    { kind: 'tanuki', x: 288, y: 382, scale: 1, flip: true },
    { kind: 'karasu', x: 128, y: 320, scale: 1.1 }
  ],
  // 3 うすめ：大みそか。みんなで見物
  [

    { kind: 'kitsune', x: 92, y: 380, scale: 1 },
    { kind: 'usagi', x: 142, y: 380, scale: 0.95, flip: true },
    { kind: 'tanuki', x: 188, y: 382, scale: 1, flip: true },
    { kind: 'risu', x: 300, y: 378, scale: 0.95, flip: true },
    { kind: 'karasu', x: 318, y: 300, scale: 1 }
  ]
];

/** 見物を描く。excite 0..1 でぴょんぴょんはねる。 */
export function drawCrowd(ctx: CanvasRenderingContext2D, stage: number, t: number, excite = 0): void {
  const list = SEATS[Math.max(0, Math.min(2, stage - 1))]!;
  for (const [k, s] of list.entries()) {
    const hop = excite > 0 ? Math.abs(Math.sin(t * 7 + k * 1.7)) * 9 * excite : 0;
    drawAnimal(ctx, s.kind, s.x, s.y, { scale: s.scale, hop, happy: excite > 0.3, flip: s.flip });
  }
}
