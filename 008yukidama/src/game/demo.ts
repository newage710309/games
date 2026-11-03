// 面のあいだの休憩デモ（1・2 面のあと）と、エンディングのデモ。
import { HEIGHT, WIDTH } from './constants';
import { drawPine } from './props';
import { drawSakura } from './sakura';
import { drawRider, drawSnowball } from './snowball';
import { drawSnowGuest } from './snowman';
import { stuckOf } from './title';
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
  if (skippable && blink(t, 1)) text(ctx, 'タップで つぎへ', WIDTH / 2, HEIGHT - 22, 13, 'rgba(40,60,100,0.85)', true);
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

/** ふきだし。(x, y) がまん中、(tx, ty) が口の先。 */
function say(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, tx: number, ty: number, alpha = 1, size = 15): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${size}px sans-serif`;
  const w = Math.max(70, s.length * size * 0.98 + 26);
  const h = size + 20;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.strokeStyle = '#5b7390';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + h / 2 - 1);
  ctx.lineTo(tx, ty);
  ctx.lineTo(x + 9, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rr(ctx, x - w / 2, y - h / 2, w, h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, s, x, y + 1, size, '#3a4a6a', true);
  ctx.restore();
}

/** 雪だるまの大将。赤いマントと金の冠。 */
function drawGeneral(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, opts: { bow?: number; crown?: boolean; sweat?: boolean; flag?: boolean } = {}): void {
  const { bow = 0, crown = true, sweat = false, flag = false } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(40,70,110,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 15, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(bow * 0.36);
  ctx.scale(1.2, 1.08);
  drawSnowGuest(ctx, 0, 0, 'none', { scale: 1, shadow: false, sweat });
  // マフラー
  ctx.fillStyle = '#d9534f';
  ctx.beginPath();
  ctx.ellipse(0, -16.6, 7.6, 2.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(3, -16, 3.2, 8);
  if (crown) {
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = '#a8761a';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-6, -33.5);
    ctx.lineTo(-7.4, -40);
    ctx.lineTo(-3.4, -36.4);
    ctx.lineTo(0, -41.5);
    ctx.lineTo(3.4, -36.4);
    ctx.lineTo(7.4, -40);
    ctx.lineTo(6, -33.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (flag) {
    // 降参の白旗
    ctx.strokeStyle = '#7a5536';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, -10);
    ctx.lineTo(14, -44);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#8aa0ba';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.rect(14, -44, 13, 9);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** 1 面のあと：雪だるまたちが慌てて作戦会議。 */
function drawBreak1(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#2a3668', '#8a8fc4', 300);
  snowGround(ctx, 300);
  drawPine(ctx, 62, 300, 110, false);
  drawPine(ctx, 420, 306, 130, false);
  // 地図の机（切り株）
  ctx.fillStyle = '#7a5536';
  rr(ctx, 160, 416, 160, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#e9d6b4';
  ctx.strokeStyle = '#7a5536';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(240, 412, 90, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 地図に描いた坂と、大きな雪玉のらくがき
  ctx.strokeStyle = '#b8483e';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(190, 404);
  ctx.quadraticCurveTo(240, 396, 284, 418);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(190, 404, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // まわりで慌てる雪だるま
  for (const [i, [x, y, s]] of ([
    [120, 400, 2.3],
    [360, 400, 2.3],
    [170, 360, 1.9],
    [310, 360, 1.9],
    [90, 520, 2.8],
    [395, 520, 2.8]
  ] as const).entries()) {
    const panic = Math.sin(t * 13 + i * 1.8);
    const run = Math.sin(t * 5 + i) * 7;
    drawSnowGuest(ctx, x + run, y - Math.abs(panic) * 10, 'none', { scale: s, rotate: panic * 0.13, sweat: true });
  }
  const lines: [string, number, number, number, number][] = [
    ['おおきいのが くるぞ！', 150, 268, 170, 300],
    ['とりでが こわれた！', 340, 232, 312, 290],
    ['どうする！？', 90, 366, 100, 396],
    ['もっと 門を せまく！', 330, 590, 380, 530]
  ];
  for (const [i, [s, x, y, tx, ty]] of lines.entries()) {
    const a = ease((t - 0.6 - i * 1.1) / 0.3);
    if (a > 0) say(ctx, s, x, y, tx, ty, a);
  }
  // 木のかげから見ているさくらちゃん
  drawSakura(ctx, 240, 560 + Math.sin(t * 4) * 2, { scale: 2, eyes: 'happy', gaze: 0 });
  drawSnowfall(ctx, t, HEIGHT, 26);
  title(ctx, 'ゆきだるまたちの さくせんかいぎ', 'つぎは 2めん：ほそい谷', t);
}

/** 2 面のあと：大きな雪だるまの大将が登場。 */
function drawBreak2(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#141b3f', '#4c5a92', 360);
  snowGround(ctx, 360, '#e6eef8');
  drawPine(ctx, 54, 356, 160, false, '#2c5a56');
  drawPine(ctx, 430, 348, 180, false, '#2c5a56');
  // ずしん、ずしんと近づいてくる
  const come = ease((t - 0.5) / 2.4);
  const stomp = Math.abs(Math.sin(t * 3.6)) * (1 - come);
  const shake = come < 1 ? Math.sin(t * 40) * 2 * stomp : 0;
  const s = 2.6 + come * 3.2;
  ctx.save();
  ctx.translate(shake, 0);
  drawGeneral(ctx, WIDTH / 2, 370 + come * 170 - stomp * 10, s);
  ctx.restore();
  // 兵隊
  for (const [i, x] of [86, 396].entries()) {
    const bob = Math.sin(t * 8 + i * 2) * 0.08;
    drawSnowGuest(ctx, x, 570, 'none', { scale: 2.3, rotate: bob });
  }
  const a = ease((t - 3) / 0.4);
  if (a > 0) say(ctx, 'わしが たいしょうじゃ！', 240, 206, 240, 262, a, 17);
  const b = ease((t - 4.8) / 0.4);
  if (b > 0) say(ctx, 'とりでは ゆずらんぞ！', 240, 158, 240, 188, b, 17);
  drawSakura(ctx, 44, 590, { scale: 2.1, eyes: 'shock', gaze: 1 });
  drawSnowfall(ctx, t, HEIGHT, 44);
  title(ctx, 'たいしょうが あらわれた！', 'つぎは 3めん：ふぶきの山', t);
}

/**
 * エンディング。
 *   0〜5 秒：大将が白旗で「もうしません」と降参。
 *   5〜9 秒：みんなで特大の雪玉を押して、頭にのせる。
 *   9 秒〜：史上最大の雪だるまのできあがり。
 */
function drawEnding(ctx: CanvasRenderingContext2D, t: number): void {
  const morning = ease((t - 1) / 3);
  const g = ctx.createLinearGradient(0, 0, 0, 430);
  g.addColorStop(0, mix('#1c2550', '#7fbdec', morning));
  g.addColorStop(1, mix('#4c5a92', '#dff0fb', morning));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, 430);
  snowGround(ctx, 430);
  drawPine(ctx, 44, 420, 120, false);
  drawPine(ctx, 444, 418, 130, false);

  const groundY = 590;
  const gs = 4.8;
  const headY = groundY - 36 * gs * 1.08 - 4; // 大将の頭のてっぺん
  const BIG = 112;
  const lift = ease((t - 5) / 3.4);
  const ballStart = { x: 660, y: groundY - BIG };
  const ballEnd = { x: WIDTH / 2, y: headY - BIG * 0.82 };
  // 下から押して転がしてきて、最後に持ち上げる
  const rollIn = ease(lift / 0.55);
  const up = ease((lift - 0.55) / 0.45);
  const bx = ballStart.x + (ballEnd.x - ballStart.x) * rollIn;
  const by = ballStart.y + (ballEnd.y - ballStart.y) * up;
  const done = t > 8.6;

  const bow = t < 5 ? (Math.sin(t * 2.6) + 1) * 0.5 * ease((t - 1) / 0.6) * 0.7 : 0;
  drawGeneral(ctx, WIDTH / 2, groundY, gs, { bow, sweat: t < 5, flag: t < 5 });

  // 手下の雪だるま
  for (const [i, x] of [68, 138, 340, 412].entries()) {
    const happy = done ? Math.abs(Math.sin(t * 6 + i)) * 12 : 0;
    drawSnowGuest(ctx, x, 620 - happy, 'none', { scale: 1.9, sweat: t < 5, rotate: t < 5 ? 0.18 : Math.sin(t * 6 + i) * 0.1 });
  }

  // さくらちゃん：はじめは雪玉の上、のせたあとはてっぺんで大喜び
  if (t > 3.8) {
    drawSnowball(ctx, bx, by, BIG, { roll: -rollIn * 7, stuck: ENDING_STUCK, shadow: up < 0.05 });
    const hop = done ? Math.abs(Math.sin(t * 5)) * 12 : 0;
    ctx.save();
    ctx.translate(bx, by - hop);
    ctx.scale(1.8, 1.8);
    drawRider(ctx, 0, 0, BIG / 1.8, t, { eyes: 'happy' });
    ctx.restore();
  } else {
    drawSakura(ctx, 96, 500, { scale: 2.2, eyes: 'dot', gaze: 1 });
  }

  const a = ease((t - 1.2) / 0.4) * (1 - ease((t - 4.6) / 0.3));
  if (a > 0) say(ctx, 'もうしません…', 240, 210, 240, 268, a, 22);

  const b = ease((t - 9) / 0.6);
  if (b > 0) {
    ctx.save();
    ctx.globalAlpha = b;
    ctx.fillStyle = 'rgba(10,18,38,0.7)';
    rr(ctx, 24, 18, WIDTH - 48, 74, 14);
    ctx.fill();
    outlinedText(ctx, 'しじょう さいだいの', WIDTH / 2, 40, 19, '#ffffff', '#2a3668');
    outlinedText(ctx, 'ゆきだるまが できちゃった！', WIDTH / 2, 68, 24, '#ffe38a', '#b8483e');
    ctx.restore();
  }
  drawSnowfall(ctx, t, HEIGHT, 22);
}

const ENDING_STUCK = stuckOf(['tree', 'twig', 'soldier', 'tree', 'pebble', 'berry', 'twig', 'soldier', 'berry', 'tree', 'twig', 'pebble', 'twig'], 8);

function mix(a: string, b: string, p: number): string {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * clamp01(p)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
