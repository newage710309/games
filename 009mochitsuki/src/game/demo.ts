// 面のあいだのデモ（1・2 うすめのあと）と、エンディングのデモ。
import { drawBear } from './bear';
import { HEIGHT, USU_X, USU_Y, WIDTH } from './constants';
import { drawAnimal } from './crowd';
import { drawMochi, drawUsu, sparkle } from './mochi';
import { drawSakura } from './sakura';
import { drawPine, drawStageBackground, say } from './scene';
import { COLOR, blink, rr, text } from './ui';

export type DemoKind = 'break1' | 'break2' | 'ending';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const ease = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function drawDemo(ctx: CanvasRenderingContext2D, kind: DemoKind, t: number, skippable: boolean): void {
  if (kind === 'break1') drawBreak1(ctx, t);
  else if (kind === 'break2') drawBreak2(ctx, t);
  else drawEnding(ctx, t);
  if (skippable && blink(t, 1)) text(ctx, 'タップで つぎへ', WIDTH / 2, HEIGHT - 22, 13, 'rgba(40,40,70,0.9)', true);
}

function title(ctx: CanvasRenderingContext2D, main: string, sub: string, t: number): void {
  ctx.save();
  ctx.globalAlpha = ease(t / 0.6);
  ctx.fillStyle = 'rgba(10,18,38,0.72)';
  rr(ctx, 40, 30, WIDTH - 80, 78, 16);
  ctx.fill();
  text(ctx, main, WIDTH / 2, 58, 24, COLOR.ink, true);
  text(ctx, sub, WIDTH / 2, 90, 14, COLOR.pink, true);
  ctx.restore();
}

/** 青ざめた印（おでこの縦線と、冷や汗）。 */
function drawPale(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(70,90,190,0.8)';
  ctx.lineWidth = 1.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const dx of [-5, -1.6, 1.8]) {
    ctx.moveTo(x + dx * s, y - 10 * s);
    ctx.lineTo(x + dx * s, y - 5.6 * s);
  }
  ctx.stroke();
  const drop = (t * 1.3) % 1;
  ctx.globalAlpha = 1 - drop;
  ctx.fillStyle = '#8fd0ff';
  const dy = y - 7 * s + drop * 10 * s;
  ctx.beginPath();
  ctx.moveTo(x - 13 * s, dy - 3 * s);
  ctx.quadraticCurveTo(x - 16 * s, dy + 1 * s, x - 13 * s, dy + 2 * s);
  ctx.quadraticCurveTo(x - 10 * s, dy + 1 * s, x - 13 * s, dy - 3 * s);
  ctx.fill();
  ctx.restore();
}

/** 1 うすめのあと：クマが「まだまだ！」と張りきり、さくらちゃんが青ざめる。 */
function drawBreak1(ctx: CanvasRenderingContext2D, t: number): void {
  drawStageBackground(ctx, 1, t);
  title(ctx, '1うす つきあがり', 'まだ つくの…？', t);
  const lift = 0.86 + Math.sin(t * 6) * 0.12;
  drawBear(ctx, 340, 582, { lift, face: 'proud', layer: 'body' });
  drawBear(ctx, 340, 582, { lift, layer: 'arms' });
  const pale = t > 1.6;
  drawSakura(ctx, 96, 520, { scale: 3.4, gaze: 1, eyes: pale ? 'shock' : 'happy', squash: pale ? Math.sin(t * 22) * 0.012 : 0 });
  if (pale) drawPale(ctx, 96, 520, 3.4, t);
  if (t > 0.7) say(ctx, 'まだまだ！', 210, 250, 300, 322, 22);
  if (pale) say(ctx, 'ひぇ…', 96, 420, 96, 458, 18);
}

/** 2 うすめのあと：見物のカラスがおもちをつまみ食いして、もう 1 うすつくことになる。 */
function drawBreak2(ctx: CanvasRenderingContext2D, t: number): void {
  drawStageBackground(ctx, 2, t);
  title(ctx, '2うす つきあがり', 'できた！ …あれ？', t);
  drawBear(ctx, 392, 582, { lift: 0.9, face: t > 3 ? 'shock' : 'excited', sweat: t > 3, layer: 'body' });
  drawUsu(ctx, USU_X, USU_Y);
  // カラスが下りてきて、くわえて飛んでいく
  const swoop = clamp01((t - 1.2) / 0.9);
  const leave = clamp01((t - 2.5) / 1.1);
  const taken = t > 2.2;
  if (!taken) drawMochi(ctx, USU_X, USU_Y + 8, { done: 1, shine: 0.8, t });
  else drawMochi(ctx, USU_X, USU_Y + 8, { done: 1, shine: 0.3, squash: 0.85, scale: 0.5, t });
  drawBear(ctx, 392, 582, { lift: 0.9, layer: 'arms' });
  if (t > 1.2) {
    const x = leave > 0 ? lerp(USU_X + 14, -60, ease(leave)) : lerp(120, USU_X + 14, ease(swoop));
    const y = leave > 0 ? lerp(USU_Y - 44, 130, ease(leave)) : lerp(320, USU_Y - 44, ease(swoop));
    drawAnimal(ctx, 'karasu', x, y, { scale: 2.2, mochi: taken, happy: taken, shadow: false, hop: Math.sin(t * 20) * 2 });
  }
  const shocked = t > 2.6;
  drawSakura(ctx, 84, 520, { scale: 3, gaze: 1, eyes: shocked ? 'shock' : 'happy' });
  if (shocked) {
    drawPale(ctx, 84, 520, 3, t);
    say(ctx, 'あーっ！', 112, 430, 92, 472, 18);
  }
  if (t > 4) {
    ctx.save();
    ctx.globalAlpha = ease((t - 4) / 0.4);
    say(ctx, 'もう 1うす！', 270, 270, 348, 336, 22);
    ctx.restore();
  }
}

/** 大きな鏡もち。(x, y) = 台の下のまん中。 */
function drawKagami(ctx: CanvasRenderingContext2D, x: number, y: number, tiers: number, t: number): number {
  // 台（三方）
  ctx.fillStyle = '#d9b67a';
  ctx.strokeStyle = '#6a4a24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 82, y);
  ctx.lineTo(x + 82, y);
  ctx.lineTo(x + 94, y - 40);
  ctx.lineTo(x - 94, y - 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6a4a24';
  ctx.beginPath();
  ctx.arc(x, y - 18, 11, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8c88e';
  ctx.beginPath();
  ctx.roundRect(x - 110, y - 54, 220, 16, 3);
  ctx.fill();
  ctx.stroke();
  // 白い紙
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c33d38';
  ctx.beginPath();
  ctx.roundRect(x - 100, y - 60, 200, 8, 2);
  ctx.fill();
  ctx.stroke();
  let top = y - 56;
  if (tiers >= 1) {
    drawMochi(ctx, x, top - 6, { done: 1, shine: 1, scale: 1.45, t });
    top -= 58;
  }
  if (tiers >= 2) {
    drawMochi(ctx, x, top - 4, { done: 1, shine: 1, scale: 1.05, t });
    top -= 44;
  }
  return top;
}

/** 初日の出の空。 */
function drawSunrise(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, 420);
  g.addColorStop(0, '#2b3f7e');
  g.addColorStop(0.5, '#e98a7a');
  g.addColorStop(0.85, '#fcc773');
  g.addColorStop(1, '#fff0b8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const rise = ease(t / 6);
  const sy = lerp(420, 300, rise);
  const glow = ctx.createRadialGradient(240, sy, 10, 240, sy, 240);
  glow.addColorStop(0, 'rgba(255,240,180,0.95)');
  glow.addColorStop(0.25, 'rgba(255,200,120,0.5)');
  glow.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(240, sy, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffdf78';
  ctx.beginPath();
  ctx.arc(240, sy, 44, 0, Math.PI * 2);
  ctx.fill();
  // 山と木
  ctx.fillStyle = '#6a5a8c';
  ctx.beginPath();
  ctx.moveTo(0, 410);
  ctx.quadraticCurveTo(120, 340, 240, 400);
  ctx.quadraticCurveTo(360, 350, 480, 404);
  ctx.lineTo(480, 440);
  ctx.lineTo(0, 440);
  ctx.closePath();
  ctx.fill();
  for (const [x, s] of [
    [24, 120],
    [70, 84],
    [418, 92],
    [460, 126]
  ] as const) {
    drawPine(ctx, x, 432, s, '#4d4478', 0.75);
  }
  ctx.fillStyle = '#fbeee4';
  ctx.fillRect(0, 428, WIDTH, HEIGHT - 428);
}

/** エンディング：初日の出の中で鏡もち。みかんが足りず、さくらちゃんがてっぺんにのる。 */
function drawEnding(ctx: CanvasRenderingContext2D, t: number): void {
  drawSunrise(ctx, t);
  title(ctx, 'あけまして おめでとう！', '3うすで 大きな かがみもち', t);
  const baseY = 590;
  const cx = 240;
  const tiers = t < 1 ? 1 : 2;
  const top = drawKagami(ctx, cx, baseY, tiers, t);

  // クマとみんな
  drawBear(ctx, 410, 600, { scale: 0.72, noKine: true, face: t > 6.2 ? 'excited' : t > 2.6 ? 'shock' : 'proud', cheer: t > 6.2 ? 0.8 + Math.sin(t * 8) * 0.2 : 0 });
  const excite = t > 6.2;
  drawAnimal(ctx, 'usagi', 34, 548, { scale: 1.3, happy: excite, hop: excite ? Math.abs(Math.sin(t * 7)) * 10 : 0 });
  drawAnimal(ctx, 'tanuki', 70, 590, { scale: 1.3, happy: excite, hop: excite ? Math.abs(Math.sin(t * 7 + 1)) * 10 : 0 });
  drawAnimal(ctx, 'risu', 30, 620, { scale: 1.2, happy: excite, hop: excite ? Math.abs(Math.sin(t * 7 + 2)) * 10 : 0 });

  // みかんの箱を見ると、からっぽ
  if (t > 2.2 && t < 4.4) say(ctx, 'みかんが ない！', 340, 370, 402, 424, 16);

  // さくらちゃん：横から見ていて → ぴょんと てっぺんへ
  const jumpStart = 4.4;
  const k = clamp01((t - jumpStart) / 0.8);
  const fromX = 122;
  const fromY = 548;
  const toX = cx;
  const toY = top - 34;
  const x = lerp(fromX, toX, ease(k));
  const y = lerp(fromY, toY, ease(k)) - Math.sin(k * Math.PI) * 70;
  const onTop = k >= 1;
  if (!onTop && t < jumpStart) say(ctx, 'そうだ！', 136, 470, 128, 510, 15);
  drawSakura(ctx, x, y, {
    scale: 2,
    view: onTop || t < jumpStart ? 'front' : 'right',
    flap: onTop ? 0 : 0.6,
    gaze: onTop ? 0 : 1,
    eyes: onTop ? 'happy' : 'dot',
    shadow: false,
    squash: onTop ? Math.max(0, 0.16 - (t - jumpStart - 0.8) * 0.4) : 0
  });
  if (onTop) {
    for (let i = 0; i < 4; i++) {
      const a = t * 1.5 + (i * Math.PI) / 2;
      sparkle(ctx, x + Math.cos(a) * 44, y + Math.sin(a) * 24, 7 + (i % 2) * 2);
    }
  }
  if (t > 6.2) say(ctx, 'ちょこん', 150, 240, x - 22, y - 16, 18);
  if (t > 7.2) {
    ctx.save();
    ctx.globalAlpha = ease((t - 7.2) / 0.5);
    ctx.fillStyle = 'rgba(10,18,38,0.72)';
    rr(ctx, 60, 118, WIDTH - 120, 40, 12);
    ctx.fill();
    text(ctx, 'みかんの かわりに なりました', WIDTH / 2, 138, 16, '#fff4c2', true);
    ctx.restore();
  }
}
