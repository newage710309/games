// 雪玉（巻きこんだものが刺さったまま回る）と、その上で走るさくらちゃん、飛び散る雪のかけらを描く。
import { drawPine } from './props';
import { drawSakura } from './sakura';
import { drawSnowGuest } from './snowman';
import { hash } from './ui';

export type StuckKind = 'twig' | 'pebble' | 'berry' | 'soldier' | 'tree';

/** 雪玉に刺さっているもの。玉の中心から見た向き（単位ベクトル）で持つ。 */
export interface Stuck {
  kind: StuckKind;
  x: number;
  y: number;
  z: number;
  /** 見た目の変化用。 */
  seed: number;
}

/** 球の上にまんべんなく散らした点（雪のでこぼこ模様に使う）。 */
const FLECKS = Array.from({ length: 70 }, (_, i) => {
  const y = 1 - ((i + 0.5) / 70) * 2;
  const s = Math.sqrt(1 - y * y);
  const a = i * 2.39996;
  return { x: Math.cos(a) * s, y, z: Math.sin(a) * s, r: 0.035 + hash(i, 3) * 0.05, dark: hash(i, 7) < 0.55 };
});

/** roll だけ転がした（画面の下へ進むように回した）あとの位置。 */
function rolled(p: { x: number; y: number; z: number }, roll: number): { x: number; y: number; z: number } {
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return { x: p.x, y: p.y * c + p.z * s, z: -p.y * s + p.z * c };
}

/** 刺さっているものを、根もとを原点・先を上に向けて描く。 */
function drawStuckItem(ctx: CanvasRenderingContext2D, kind: StuckKind, seed: number): void {
  switch (kind) {
    case 'twig':
      ctx.strokeStyle = '#6a4a32';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(1, -16);
      ctx.moveTo(0.6, -8);
      ctx.lineTo(6, -13);
      ctx.moveTo(0.8, -12);
      ctx.lineTo(-4, -17);
      ctx.stroke();
      break;
    case 'pebble':
      ctx.fillStyle = '#8a97a8';
      ctx.strokeStyle = '#55627a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -3, 7, 6, seed, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'berry':
      ctx.fillStyle = '#e0404f';
      ctx.strokeStyle = '#8f1f30';
      ctx.lineWidth = 0.8;
      for (const [x, y] of [
        [-3, -3],
        [3, -3.6],
        [0, -7]
      ] as const) {
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'soldier':
      drawSnowGuest(ctx, 0, 2, 'none', { scale: 1.15, shadow: false, sweat: true });
      break;
    case 'tree':
      drawPine(ctx, 0, -2, 44, false);
      break;
  }
}

export interface BallOptions {
  /** 転がった角度。 */
  roll: number;
  stuck?: Stuck[];
  /** 欠けた直後の赤い点滅 0..1。 */
  flash?: number;
  shadow?: boolean;
}

/** (x, y) を中心に、半径 r の雪玉を描く。 */
export function drawSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, opts: BallOptions): void {
  const { roll, stuck = [], flash = 0, shadow = true } = opts;
  ctx.save();
  ctx.translate(x, y);
  if (shadow) {
    ctx.fillStyle = 'rgba(50,80,125,0.26)';
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.8, r * 1.02, r * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const items = stuck.map((s) => ({ s, p: rolled(s, roll) }));
  // 向こう側のものは、ふちから少しはみ出して見える分だけ先に描く
  for (const { s, p } of items) if (p.z < 0 && p.z > -0.45) placeItem(ctx, s, p, r);

  // 外周のでこぼこ（転がると一緒に回る）
  ctx.beginPath();
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = Math.floor(((a + roll * 0.5) / (Math.PI * 2)) * 18 + 1800) % 18;
    const bump = 1 + (hash(k, 11) - 0.5) * 0.035;
    const px = Math.cos(a) * r * bump;
    const py = Math.sin(a) * r * bump;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.08, 0, 0, r * 1.05);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.62, '#f3f8fd');
  g.addColorStop(1, '#bcd0e6');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#6783a6';
  ctx.lineWidth = Math.max(1.4, r * 0.035);
  ctx.stroke();

  // 雪のでこぼこ模様
  ctx.save();
  ctx.clip();
  for (const f of FLECKS) {
    const p = rolled(f, roll);
    if (p.z < 0.08) continue;
    const size = f.r * r;
    ctx.fillStyle = f.dark ? 'rgba(120,155,195,0.3)' : 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(p.x * r, p.y * r, size, size * Math.max(0.3, p.z), Math.atan2(p.y, p.x) + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const { s, p } of items) if (p.z >= 0) placeItem(ctx, s, p, r);

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#ffb4b4';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function placeItem(ctx: CanvasRenderingContext2D, s: Stuck, p: { x: number; y: number; z: number }, r: number): void {
  const len = Math.hypot(p.x, p.y);
  ctx.save();
  ctx.translate(p.x * r, p.y * r);
  ctx.rotate(Math.atan2(p.y, p.x) + Math.PI / 2);
  // まっすぐこちらを向いているものは短く、ふちのものは長く見える
  ctx.scale(1, 0.4 + 0.6 * len);
  drawStuckItem(ctx, s.kind, s.seed);
  ctx.restore();
}

export interface RiderOptions {
  /** 左右の動き（-1..1）。大きいと真横を向いて羽ばたく。 */
  steer?: number;
  eyes?: 'dot' | 'happy' | 'shock';
}

/** 雪玉のてっぺんで、ちょこちょこ走るさくらちゃん。 */
export function drawRider(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, opts: RiderOptions = {}): void {
  const { steer = 0, eyes = 'dot' } = opts;
  const step = Math.sin(t * 15);
  const bob = Math.abs(step) * 3;
  const scale = 1.1;
  const footY = y - r * 0.9;
  // 曲がる向きへ少し走り寄る
  const sx = x + steer * r * 0.14;
  if (Math.abs(steer) > 0.55) {
    drawSakura(ctx, sx, footY - 16 * scale - bob, {
      scale,
      view: steer < 0 ? 'left' : 'right',
      flap: (Math.sin(t * 22) + 1) / 2,
      shadow: false
    });
    return;
  }
  drawSakura(ctx, sx, footY - 16 * scale - bob, {
    scale,
    eyes,
    gaze: steer * 1.6,
    squash: (1 - Math.abs(step)) * 0.07,
    rotate: step * 0.09,
    shadow: false
  });
}

/** 飛び散る雪のかけら。p = 0..1 が飛び始めから消えるまで。 */
export function drawShards(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, seed = 1, n = 22): void {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (1 - p) * 2);
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed) * Math.PI * 2;
    const d = (0.7 + hash(i, seed + 1) * 1.3) * r * 1.5 * (1 - (1 - p) * (1 - p));
    const size = (0.08 + hash(i, seed + 2) * 0.16) * r * (1 - p * 0.45);
    const px = x + Math.cos(a) * (r * 0.8 + d);
    const py = y + Math.sin(a) * (r * 0.8 + d) + p * p * r * 0.9;
    ctx.fillStyle = i % 3 === 0 ? '#cfe0f0' : '#ffffff';
    ctx.strokeStyle = '#7f9abb';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(px, py, size, size * 0.8, a + p * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
