// ふもとの雪だるまのとりで。damage に応じてブロックが飛び散って崩れる。
import { drawSnowGuest } from './snowman';
import { hash, rr, text } from './ui';

export interface FortLook {
  /** とりでの中心 x と、いちばん上の線（雪玉が当たるところ）の y。 */
  x: number;
  y: number;
  /** 壊れた量 0..1。 */
  damage: number;
  /** 体当たりしてからの秒数（ブロックが飛んでいる時間）。 */
  flyT: number;
  t: number;
  /** 看板に出す目標の大きさ。 */
  goal: number;
}

const COLS = 14;
const ROWS = 5;
const BW = 34;
const BH = 22;
export const FORT_W = COLS * BW;
export const FORT_H = ROWS * BH + 26;

function brick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tone: number, rot = 0): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, tone > 0.5 ? '#fbfdff' : '#eef5fb');
  g.addColorStop(1, tone > 0.5 ? '#c3d7ea' : '#b4cce2');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#7591b3';
  ctx.lineWidth = 1.1;
  rr(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function flag(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, color: string): void {
  ctx.strokeStyle = '#6a4a32';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 34);
  ctx.stroke();
  const w = Math.sin(t * 6 + x) * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.quadraticCurveTo(x + 11, y - 34 + w, x + 22, y - 28);
  ctx.quadraticCurveTo(x + 11, y - 24 + w, x, y - 20);
  ctx.closePath();
  ctx.fill();
}

/** 飛んでいるブロックの動き。 */
function flown(i: number, f: number): { dx: number; dy: number; rot: number; alpha: number } {
  const a = hash(i, 21) * Math.PI;
  const v = 170 + hash(i, 22) * 300;
  return {
    dx: Math.cos(a) * v * f * 0.9,
    dy: Math.sin(a) * v * f * 0.45 - 230 * f + 340 * f * f,
    rot: (hash(i, 23) - 0.5) * 12 * f,
    alpha: Math.max(0, 1 - f / 1.7)
  };
}

export function drawFort(ctx: CanvasRenderingContext2D, fort: FortLook): void {
  const { x, y, damage, flyT, t, goal } = fort;
  const left = x - FORT_W / 2;
  const top = y + 26;
  // 影
  ctx.fillStyle = 'rgba(40,60,100,0.28)';
  ctx.fillRect(left - 8, top + ROWS * BH - 6, FORT_W + 16, 24);

  const flying: (() => void)[] = [];
  const piece = (i: number, bx: number, by: number, w: number, h: number, th: number): void => {
    if (damage <= th) {
      brick(ctx, bx, by, w, h, hash(i, 24));
      return;
    }
    if (flyT <= 0) return;
    const m = flown(i, flyT);
    if (m.alpha <= 0) return;
    flying.push(() => {
      ctx.save();
      ctx.globalAlpha = m.alpha;
      brick(ctx, bx + m.dx, by + m.dy, w, h, hash(i, 24), m.rot);
      ctx.restore();
    });
  };
  // まん中・上の段から先に崩れる
  const threshold = (bx: number, r: number, i: number): number =>
    (Math.abs(bx + BW / 2 - x) / (FORT_W / 2)) * 0.56 + (r / ROWS) * 0.26 + hash(i, 20) * 0.2;

  for (let r = 0; r < ROWS; r++) {
    const off = r % 2 === 0 ? BW / 2 : 0;
    const n = r % 2 === 0 ? COLS - 1 : COLS;
    for (let c = 0; c < n; c++) {
      const bx = left + off + c * BW;
      const i = r * 100 + c;
      piece(i, bx, top + r * BH, BW - 1, BH - 1, threshold(bx, r, i));
    }
  }
  // 胸かべ（ぎざぎざ）
  for (let c = 0; c < COLS; c += 2) {
    const i = 900 + c;
    const bx = left + c * BW + BW / 4 + 8;
    piece(i, bx, top - BH, BW - 4, BH + 1, (Math.abs(bx + BW / 2 - x) / (FORT_W / 2)) * 0.6 + hash(i, 20) * 0.1);
  }
  // 旗（はしの 2 本とまん中）
  for (const [fx, color, th] of [
    [left + 22, '#d9534f', 0.72],
    [left + FORT_W - 22, '#d9534f', 0.72],
    [x, '#3a6aa3', 0.12]
  ] as const) {
    if (damage <= th) flag(ctx, fx, top - BH, t, color);
  }
  // 見張りの雪だるま（壊れると飛んでいく）
  for (const [k, gx] of [-140, -60, 60, 140].entries()) {
    const px = x + gx;
    const py = top - BH + 4;
    if (damage > 0.14 + (Math.abs(gx) / 150) * 0.5) {
      if (flyT <= 0) continue;
      const m = flown(700 + k, flyT);
      if (m.alpha > 0) {
        flying.push(() => drawSnowGuest(ctx, px + m.dx * 0.7, py + m.dy, 'none', { scale: 1.25, rotate: m.rot, sweat: true, shadow: false, alpha: m.alpha }));
      }
    } else {
      // 雪玉がせまると、あせってゆれる
      drawSnowGuest(ctx, px, py - Math.abs(Math.sin(t * 7 + k)) * 3, 'none', { scale: 1.25, sweat: damage > 0, hop: t + k, shadow: false });
    }
  }
  // 目標の看板
  if (damage < 0.3) {
    ctx.fillStyle = '#fff6dc';
    ctx.strokeStyle = '#7a5536';
    ctx.lineWidth = 2.4;
    rr(ctx, x - 62, top + 26, 124, 44, 8);
    ctx.fill();
    ctx.stroke();
    text(ctx, 'もくひょう', x, top + 38, 11, '#7a5536', true);
    text(ctx, `${goal}cm`, x, top + 56, 19, '#b8483e', true);
  }
  for (const d of flying) d();
}
