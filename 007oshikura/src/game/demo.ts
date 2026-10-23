// 面のあいだの休憩デモ（1・2 面のあと）と、エンディングのデモ。
import { HEIGHT, WIDTH } from './constants';
import { drawAnimal, type AnimalKind } from './guests';
import { drawSakura, drawSakuraFlower } from './sakura';
import { drawSnowGuest } from './snowman';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';

export type DemoKind = 'break1' | 'break2' | 'ending';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const ease = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

export function drawDemo(ctx: CanvasRenderingContext2D, kind: DemoKind, t: number, skippable: boolean): void {
  if (kind === 'break1') drawBreak1(ctx, t);
  else if (kind === 'break2') drawBreak2(ctx, t);
  else drawEnding(ctx, t);
  if (skippable && blink(t, 1)) text(ctx, 'タップで つぎへ', WIDTH / 2, HEIGHT - 22, 13, 'rgba(255,255,255,0.75)', true);
}

function sky(ctx: CanvasRenderingContext2D, top: string, bottom: string, ground: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, ground);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, ground);
}

function snowGround(ctx: CanvasRenderingContext2D, y: number, color = '#f4f9fd'): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(WIDTH * 0.3, y - 14, WIDTH * 0.6, y);
  ctx.quadraticCurveTo(WIDTH * 0.8, y + 8, WIDTH, y - 4);
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function title(ctx: CanvasRenderingContext2D, main: string, sub: string, t: number): void {
  ctx.save();
  ctx.globalAlpha = ease(t / 0.6);
  ctx.fillStyle = 'rgba(10,18,38,0.55)';
  rr(ctx, 40, 36, WIDTH - 80, 78, 16);
  ctx.fill();
  text(ctx, main, WIDTH / 2, 64, 24, COLOR.ink, true);
  text(ctx, sub, WIDTH / 2, 96, 14, COLOR.pink, true);
  ctx.restore();
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#2f5a4a', snow = true): void {
  ctx.fillStyle = color;
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
  if (snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 3; k++) {
      const top = y - s * (1 - k * 0.28);
      ctx.beginPath();
      ctx.ellipse(x, top + s * 0.06, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#6a4a32';
  ctx.fillRect(x - s * 0.06, y - s * 0.02, s * 0.12, s * 0.14);
}

/**
 * 動物たちが輪になって、おしくらまんじゅう。輪の中心が (cx, cy)。
 * 押し合うたびに輪が縮んだり広がったりする。
 * front を渡すと、輪の手前をあけて奥半分に並べ、最後に front（さくらちゃん）をいちばん手前に描く。
 */
export function drawHuddle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kinds: AnimalKind[],
  t: number,
  rx: number,
  scale: number,
  front?: () => void
): void {
  const push = (Math.sin(t * 5) + 1) / 2;
  const items = kinds.map((k, i) => {
    // 手前（角度 π/2）のまわり ±0.3π をあけて、のこりの弧に等間隔で並べる
    const a =
      front === undefined
        ? (i / kinds.length) * Math.PI * 2 + t * 0.4
        : Math.PI * 0.8 + (i / Math.max(1, kinds.length - 1)) * Math.PI * 1.4 + Math.sin(t * 1.3 + i) * 0.03;
    return { k, a, y: cy + Math.sin(a) * rx * 0.32 };
  });
  // 奥（上）から順に描く
  items.sort((p, q) => p.y - q.y);
  for (const { k, a, y } of items) {
    const r = rx * (1 - push * 0.14);
    const x = cx + Math.cos(a) * r;
    const sy = y + Math.sin(a) * push * 2;
    const s = scale * (0.88 + (Math.sin(a) + 1) * 0.08);
    ctx.save();
    ctx.translate(x, sy);
    ctx.scale(1 + push * 0.08, 1 - push * 0.06);
    drawAnimal(ctx, 0, 0, k, { scale: s, mood: 'happy' });
    ctx.restore();
  }
  front?.();
}

/** 湯気（ぽかぽか）。 */
function warmth(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    const x = cx + (k - 1) * 34;
    const y = cy - p * 70;
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 8, y - 10, x + 8, y - 18, x, y - 28);
    ctx.stroke();
  }
  ctx.restore();
}

/** 1 面のあと：みんなで おしくらまんじゅう。ぽかぽかになる。 */
function drawBreak1(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#2a3668', '#8a8fc4', 330);
  snowGround(ctx, 330);
  pine(ctx, 60, 300, 90);
  pine(ctx, 420, 300, 100);
  warmth(ctx, WIDTH / 2, 380, t);
  drawHuddle(ctx, WIDTH / 2, 470, ['shimaenaga', 'risu', 'karasu', 'kitsune', 'shimaenaga', 'risu', 'karasu', 'kitsune'], t, 120, 2.2);
  // 横で応援するさくらちゃん
  const hop = Math.abs(Math.sin(t * 6)) * 8;
  drawSakura(ctx, 410, 590 - hop, { scale: 2.2, eyes: 'happy' });
  outlinedText(ctx, 'おしくら まんじゅう', WIDTH / 2, 300, 18, '#ffffff', '#2a3668');
  outlinedText(ctx, 'おされて なくな！', WIDTH / 2, 324, 18, '#ffffff', '#2a3668');
  drawSnowfall(ctx, t, HEIGHT, 30);
  title(ctx, 'みんな ぽかぽか！', 'つぎは 2めん：あたらしい なかまが くるよ', t);
}

/** 2 面のあと：雪の山のかげで、おおきい雪だるまが目をさます。 */
function drawBreak2(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#1c2550', '#4c5a92', 360);
  snowGround(ctx, 360, '#e6eef8');
  pine(ctx, 70, 340, 150);
  pine(ctx, 410, 330, 170);
  // 小さい雪だるまたちが、おおきい雪だるまを呼んでくる
  const wake = ease((t - 1.6) / 0.8);
  ctx.save();
  ctx.translate(WIDTH / 2, 520);
  ctx.scale(3.4 * 1.22, 3.4 * (1.05 + wake * 0.08));
  drawSnowGuest(ctx, 0, 0, 'none', { scale: 1 });
  // マフラー
  ctx.fillStyle = '#d9534f';
  ctx.beginPath();
  ctx.ellipse(0, -16.6, 7.4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const [i, x] of [110, 370].entries()) {
    const bob = Math.sin(t * 6 + i * 2) * 0.08;
    drawSnowGuest(ctx, x, 560, 'none', { scale: 2.2, rotate: bob });
  }
  if (t > 2.6) {
    rr(ctx, 120, 206, 240, 44, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    text(ctx, 'ぼくは とけにくいぞ…！', 240, 228, 17, '#3a4a6a', true);
  }
  // 木のかげから見ているさくらちゃん
  drawSakura(ctx, 30, 590, { scale: 2.2, eyes: 'shock', gaze: 1 });
  drawSnowfall(ctx, t, HEIGHT, 40);
  title(ctx, 'おおきい ゆきだるまが きた！', 'つぎは 3めん：2かい とかそう', t);
}

/** エンディング：みんなのおしくらまんじゅうで森があたたまって、春がくる。 */
function drawEnding(ctx: CanvasRenderingContext2D, t: number): void {
  const spring = ease((t - 1) / 2.5);
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, mix('#1c2550', '#8fc8f0', spring));
  g.addColorStop(0.6, mix('#4c5a92', '#dff0fb', spring));
  g.addColorStop(1, '#f4f9fd');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // 雪がとけて、地面が若草色に
  snowGround(ctx, 420, mix('#f4f9fd', '#cfe9b0', spring));
  // 桜の木
  for (const [x, y, s] of [
    [80, 400, 1],
    [400, 390, 1.1]
  ] as const) {
    ctx.fillStyle = '#7a5536';
    ctx.fillRect(x - 6 * s, y - 90 * s, 12 * s, 100 * s);
    ctx.fillStyle = mix('#dfe8f2', '#f8c3d2', spring);
    for (const [dx, dy, r] of [
      [0, -120, 50],
      [-40, -95, 38],
      [40, -95, 38]
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 舞う花びら
  if (spring > 0) {
    ctx.save();
    ctx.globalAlpha = spring;
    for (let k = 0; k < 16; k++) {
      const x = (k * 71 + Math.sin(t + k) * 20 + t * 14) % WIDTH;
      const y = (k * 53 + t * (20 + (k % 4) * 6)) % HEIGHT;
      drawSakuraFlower(ctx, x, y, 4 + (k % 3), t + k, false);
    }
    ctx.restore();
  }
  const ta = ease((t - 0.6) / 0.8);
  ctx.save();
  ctx.globalAlpha = ta;
  outlinedText(ctx, 'ぽかぽかで', WIDTH / 2, 180, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'はるが きた！', WIDTH / 2, 222 + (1 - ta) * 12, 36, '#ffe38a', '#b8483e');
  text(ctx, 'みんなで ぎゅっと あったまったね！', WIDTH / 2, 268, 15, '#2a3668', true);
  ctx.restore();
  // みんなでおしくらまんじゅう（9 種ぜんぶ）とさくらちゃん
  drawHuddle(
    ctx,
    WIDTH / 2,
    520,
    ['karasu', 'yamagara', 'gojukara', 'akagera', 'shimaenaga', 'risu', 'momonga', 'kitsune', 'usagi'],
    t,
    150,
    2,
    () => drawSakura(ctx, WIDTH / 2, 566 - Math.abs(Math.sin(t * 5)) * 8, { scale: 2.6, eyes: 'happy' })
  );
  // 雪だるまは小さくなって、水たまりで笑っている
  ctx.save();
  ctx.globalAlpha = 1 - spring * 0.5;
  ctx.translate(430, 610);
  ctx.scale(1.6, 1.6 * (1 - spring * 0.5));
  drawSnowGuest(ctx, 0, 0, 'none', { scale: 1 });
  ctx.restore();
}

function mix(a: string, b: string, p: number): string {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(p)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
