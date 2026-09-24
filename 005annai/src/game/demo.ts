// 面のあいだの休憩デモ（1・2 面のあと）と、エンディングのデモ。
import { HEIGHT, WIDTH } from './constants';
import { drawAnimal, type AnimalKind } from './guests';
import { drawGuide } from './scene';
import { drawSnowGuest, type Disguise } from './snowman';
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
  rr(ctx, 50, 36, WIDTH - 100, 78, 16);
  ctx.fill();
  text(ctx, main, WIDTH / 2, 64, 24, COLOR.ink, true);
  text(ctx, sub, WIDTH / 2, 96, 14, COLOR.pink, true);
  ctx.restore();
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#2f5a4a';
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
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = 0; k < 3; k++) {
    const top = y - s * (1 - k * 0.28);
    ctx.beginPath();
    ctx.ellipse(x, top + s * 0.06, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6a4a32';
  ctx.fillRect(x - s * 0.06, y - s * 0.02, s * 0.12, s * 0.14);
}

/** 1 面のあと：お客さんが会場に入っていく。 */
function drawBreak1(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#2a3668', '#8a8fc4', 330);
  snowGround(ctx, 330);
  pine(ctx, 60, 300, 90);
  pine(ctx, 420, 300, 100);
  // 会場の門（左：空、右：森）
  for (const [x, label, color] of [
    [110, 'そらの かいじょう', '#dff0ff'],
    [370, 'もりの かいじょう', '#e6f4d8']
  ] as const) {
    ctx.fillStyle = '#8a6242';
    ctx.fillRect(x - 50, 230, 8, 130);
    ctx.fillRect(x + 42, 230, 8, 130);
    ctx.fillStyle = color;
    rr(ctx, x - 58, 214, 116, 30, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a3326';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    text(ctx, label, x, 229, 13, '#3a4a6a', true);
  }
  // お客さんがそれぞれの門へ
  const birds: AnimalKind[] = ['karasu', 'shimaenaga', 'karasu', 'shimaenaga'];
  const beasts: AnimalKind[] = ['risu', 'risu', 'risu', 'risu'];
  for (const [i, k] of birds.entries()) {
    const p = ((t * 0.28 + i * 0.25) % 1);
    drawAnimal(ctx, 240 - p * 150, 470 - p * 110, k, { scale: 2 - p * 0.8, hop: (t * 2.4 + i * 0.3) % 1, mood: 'happy', alpha: clamp01((1 - p) * 5) });
  }
  for (const [i, k] of beasts.entries()) {
    const p = ((t * 0.28 + i * 0.25 + 0.12) % 1);
    drawAnimal(ctx, 240 + p * 150, 470 - p * 110, k, { scale: 2 - p * 0.8, hop: (t * 2.4 + i * 0.3) % 1, mood: 'happy', alpha: clamp01((1 - p) * 5) });
  }
  // 手をふるさくらちゃん
  drawGuide(ctx, WIDTH / 2, 560, Math.floor(t * 2.5) % 2 ? 'left' : 'right', t, 2.8);
  drawSnowfall(ctx, t, HEIGHT);
  title(ctx, 'おきゃくさん いっぱい！', 'つぎは 2めん：へんそうに ちゅうい！', t);
}

/** 2 面のあと：木のかげで、雪だるまたちが変装の作戦会議。 */
function drawBreak2(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#1c2550', '#4c5a92', 360);
  snowGround(ctx, 360, '#e6eef8');
  pine(ctx, 90, 340, 150);
  pine(ctx, 400, 330, 170);
  // ひそひそ
  const plan: [number, Disguise][] = [
    [150, 'sumi'],
    [240, 'kigurumi'],
    [330, 'shimaenaga']
  ];
  for (const [i, [x, d]] of plan.entries()) {
    const done = t > 2 + i * 1.1;
    const bob = Math.sin(t * 5 + i) * 0.04;
    drawSnowGuest(ctx, x, 500, done ? d : 'none', { scale: 2.6, rotate: bob });
    if (!done && t > 1.2 + i * 1.1) {
      // 着がえ中の「ごそごそ」
      outlinedText(ctx, 'ごそごそ', x, 380, 14, '#ffffff', '#2a3668');
    }
  }
  if (t > 5.4) {
    rr(ctx, 110, 206, 260, 44, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    text(ctx, 'これで バレないぞ…！', 240, 228, 17, '#3a4a6a', true);
  }
  // 木のかげから見ているさくらちゃん
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 70, HEIGHT);
  ctx.clip();
  drawGuide(ctx, 40, 560, 'shock', t, 2.6);
  ctx.restore();
  drawSnowfall(ctx, t, HEIGHT, 30);
  title(ctx, 'ゆきだるまの さくせんかいぎ', 'つぎは 3めん：50にん さばこう！', t);
}

/** エンディング：ゆきまつりは だいせいこう！ */
function drawEnding(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#0f1840');
  g.addColorStop(0.6, '#34407a');
  g.addColorStop(1, '#e8f1fa');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // 花火（順番に打ち上がる）
  const fireworks: [number, number, string, number][] = [
    [110, 120, '#f283a8', 0.3],
    [360, 95, '#ffd76a', 1.1],
    [250, 170, '#8fd0ff', 1.9],
    [150, 70, '#a8e0a0', 2.9],
    [390, 185, '#f283a8', 3.6]
  ];
  for (const [fx, fy, c, start] of fireworks) {
    const p = ((t - start) % 3.2 + 3.2) % 3.2;
    if (t < start || p > 1.6) continue;
    const r = 12 + ease(p / 0.7) * 34;
    ctx.save();
    ctx.globalAlpha = clamp01(1.6 - p);
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fx + Math.cos(a) * r * 0.35, fy + Math.sin(a) * r * 0.35);
      ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r + p * 6);
      ctx.stroke();
    }
    ctx.restore();
  }
  const ta = ease((t - 0.6) / 0.8);
  ctx.save();
  ctx.globalAlpha = ta;
  outlinedText(ctx, 'ゆきまつりは', WIDTH / 2, 250, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'だいせいこう！', WIDTH / 2, 290 + (1 - ta) * 12, 34, '#ffe38a', '#b8483e');
  text(ctx, 'みんなを ぶじに あんないできたね！', WIDTH / 2, 342, 15, '#ffffff', true);
  ctx.restore();
  // 雪の広場
  ctx.fillStyle = '#f4f8fd';
  ctx.beginPath();
  ctx.ellipse(WIDTH / 2, 520, 320, 150, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(0, 520, WIDTH, HEIGHT - 520);
  // 大きな雪像（雪だるまたちも雪像になって参加）
  drawSnowGuest(ctx, 80, 440, 'none', { scale: 2.3, shadow: false });
  drawSnowGuest(ctx, 400, 440, 'kigurumi', { scale: 2.3, shadow: false });
  // お客さんがならんでにっこり（順番に入ってくる）
  const row: AnimalKind[] = ['karasu', 'risu', 'yamagara', 'kitsune', 'shimaenaga', 'usagi', 'akagera', 'momonga', 'gojukara'];
  for (const [i, k] of row.entries()) {
    const enter = ease((t - 1.2 - i * 0.18) / 0.5);
    if (enter <= 0) continue;
    const x = 40 + i * 50;
    const y = 520 + (i % 2) * 22 + (1 - enter) * 40;
    drawAnimal(ctx, x, y, k, { scale: 1.3, mood: 'happy', hop: (t * 1.4 + i * 0.2) % 1, alpha: enter });
  }
  drawGuide(ctx, WIDTH / 2, 596, t > 3.5 ? 'happy' : 'idle', t, 2.4);
  drawSnowfall(ctx, t, HEIGHT, 30);
}
