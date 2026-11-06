// 面のあいだのデモ（1・2 めんのあと）と、エンディングのデモ。
import { drawBeast, type BeastKind } from './beasts';
import { drawBird, type BirdKind } from './birds';
import { BIRD_SCALE, HEIGHT, PIVOT_X, PIVOT_Y, WIDTH } from './constants';
import { drawBranch, drawPine, drawSnowball, drawStageBackground, say, type SlotThing } from './scene';
import { drawSnowGuest } from './snowman';
import { COLOR, blink, hash, rr, text } from './ui';

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
  if (skippable && blink(t, 1)) {
    ctx.fillStyle = 'rgba(10,18,38,0.6)';
    ctx.fillRect(0, HEIGHT - 40, WIDTH, 40);
    text(ctx, 'タップで つぎへ', WIDTH / 2, HEIGHT - 20, 13, COLOR.ink, true);
  }
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

const DANGO6: (BirdKind | null)[] = ['enaga', 'yamagara', 'enaga', null, 'enaga', 'gojukara', 'enaga'];
const slotsOf = (birds: (BirdKind | null)[], mood: 'happy' | 'normal' | 'shock' = 'happy'): (SlotThing | null)[] =>
  birds.map((b) => (b ? { kind: 'bird', bird: b, mood } : null));

/** 1 めんのあと：完成しただんごを、森の動物たちが見物に来る。 */
function drawBreak1(ctx: CanvasRenderingContext2D, t: number): void {
  drawStageBackground(ctx, 1, t);
  drawBranch(ctx, {
    stage: 1,
    perSide: 3,
    angle: Math.sin(t * 1.3) * 0.012,
    slots: slotsOf(DANGO6),
    sakura: { state: 'on', happy: true },
    dango: 0.85 + 0.15 * Math.sin(t * 3),
    marks: false,
    t
  });
  const beasts: [BeastKind, number, number, boolean][] = [
    ['usagi', 70, 0.4, false],
    ['risu', 150, 1.2, false],
    ['kitsune', 340, 0.8, true],
    ['momonga', 420, 1.8, true]
  ];
  for (const [kind, x, delay, fromRight] of beasts) {
    const p = ease((t - delay) / 1.4);
    const sx = fromRight ? WIDTH + 40 : -40;
    const walking = p < 1;
    drawBeast(ctx, lerp(sx, x, p), 590, kind, { scale: 2, mood: p >= 1 ? 'happy' : 'normal', hop: walking ? t * 3 : 0, flip: fromRight });
  }
  if (t > 3) say(ctx, 'かわいい〜', 110, 470, 80, 520, 15);
  if (t > 3.8) say(ctx, 'まんまる！', 380, 470, 360, 520, 15);
  title(ctx, '1めん クリア！', '森の 動物たちが 見物に 来た', t);
}

/** 2 めんのあと：雪だるまが「ゆらしてやる！」と雪玉を用意する。 */
function drawBreak2(ctx: CanvasRenderingContext2D, t: number): void {
  drawStageBackground(ctx, 2, t);
  drawBranch(ctx, {
    stage: 2,
    perSide: 3,
    angle: 0,
    slots: slotsOf(DANGO6, t > 3.2 ? 'shock' : 'happy'),
    sakura: { state: 'on', happy: t < 3.2 },
    dango: t > 3.2 ? 1 : 0.6,
    marks: false,
    t
  });
  // 雪だるまが右から すべってきて、雪玉を つくる
  const x = lerp(WIDTH + 60, 380, ease((t - 0.5) / 1.2));
  // つみあがる雪玉
  const n = Math.min(6, Math.max(0, Math.floor((t - 1.8) / 0.35)));
  const pile: [number, number][] = [
    [300, 600],
    [324, 600],
    [348, 600],
    [312, 580],
    [336, 580],
    [324, 560]
  ];
  for (let k = 0; k < n; k++) drawSnowball(ctx, pile[k]![0], pile[k]![1], 11, k);
  drawSnowGuest(ctx, x, 618, 'none', { scale: 3.2, hop: t * 0.5 });
  if (t > 3.2) say(ctx, 'ゆらしてやる！', 330, 430, 370, 500, 17);
  title(ctx, '2めん クリア！', '雪だるまが なにか たくらんでいる…', t);
}

/** エンディング：夜。雪だるまもだんごに入りたい → 森じゅうの鳥が反対側に集まって、特大のだんご。 */
function drawEnding(ctx: CanvasRenderingContext2D, t: number): void {
  // 夜空
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#0b1230');
  g.addColorStop(0.6, '#24346a');
  g.addColorStop(1, '#3a4a84');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let k = 0; k < 70; k++) {
    const a = 0.35 + 0.5 * Math.abs(Math.sin(t * (0.7 + hash(k, 3)) + k));
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(hash(k, 1) * WIDTH, 40 + hash(k, 2) * 300, 1.6, 1.6);
  }
  ctx.fillStyle = '#fff4c8';
  ctx.beginPath();
  ctx.arc(390, 120, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d1536';
  ctx.beginPath();
  ctx.arc(402, 112, 27, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 11; k++) drawPine(ctx, 6 + k * 46 + hash(k, 9) * 18, 400 - hash(k, 10) * 10, 80 + hash(k, 11) * 40, '#1d3556', 0.55);
  ctx.fillStyle = '#b4c3e8';
  ctx.fillRect(0, 396, WIDTH, HEIGHT - 396);

  // 1) だんご（0〜2 秒）→ 2) 雪だるまが右はしに のって かたむく（2〜3.5 秒）→ 3) 鳥たちが左に集まって つり合う（3.5〜6.5 秒）
  const sitIn = ease((t - 2.2) / 0.8);
  const crowd = ease((t - 3.6) / 2.6);
  const angle = sitIn * 0.22 * (1 - crowd) + Math.sin(t * 2) * 0.01;
  const scared = sitIn > 0.5 && crowd < 0.6;
  drawBranch(ctx, {
    stage: 3,
    perSide: 3,
    angle,
    slots: slotsOf(['enaga', 'enaga', 'enaga', null, 'enaga', 'enaga', null], scared ? 'shock' : 'happy'),
    sakura: { state: 'on', happy: !scared },
    dango: 1,
    marks: false,
    t
  });

  // 枝の上で、回転した座標に描く
  ctx.save();
  ctx.translate(PIVOT_X, PIVOT_Y);
  ctx.rotate(angle);
  // 雪だるま：右から地面をすべってきて（0〜1.2 秒）、枝の右はしへ ぴょんと のる
  if (sitIn > 0) {
    const sx = lerp(190, 196, sitIn);
    const sy = lerp(150, 0, sitIn) - Math.sin(sitIn * Math.PI) * 70;
    drawSnowGuest(ctx, sx, sy, 'none', { scale: 2.2, sweat: scared, shadow: false });
  }
  // 左に集まる鳥たち（だんごの上に、もう一段・二段と積み重なる）
  const flock: [BirdKind, number, number][] = [
    ['enaga', -150, 0],
    ['yamagara', -186, 0],
    ['enaga', -50, -44],
    ['gojukara', -86, -44],
    ['enaga', -122, -44],
    ['akagera', -158, -44],
    ['enaga', -70, -88],
    ['karasu', -106, -88],
    ['enaga', -142, -88],
    ['enaga', -88, -132],
    ['enaga', -124, -132]
  ];
  for (const [k, [bird, x, y]] of flock.entries()) {
    const p = ease((crowd * flock.length - k) / 1.6);
    if (p <= 0) continue;
    const fx = lerp(-320 + k * 10, x, p);
    const fy = lerp(-260 - k * 12, y, p);
    drawBird(ctx, fx, fy, bird, { scale: BIRD_SCALE * 0.95, flap: p < 1 ? 0.5 + 0.5 * Math.sin(t * 20 + k) : 0, mood: 'happy', puff: p >= 1 ? 0.12 : 0 });
  }
  ctx.restore();

  if (sitIn <= 0) {
    const gx = lerp(WIDTH + 50, 430, ease(t / 1.2));
    drawSnowGuest(ctx, gx, 556, 'none', { scale: 2.2, hop: t * 0.6 });
  }
  if (t > 1 && t < 2.4) say(ctx, 'いれて〜', 380, 440, 420, 480, 16);
  if (scared && t < 3.8) say(ctx, 'かたむく〜！', 150, 250, 210, 330, 16);
  if (t > 6.6) say(ctx, 'つり合った！', 120, 200, 140, 250, 16);
  title(ctx, t < 6.6 ? 'よるの 森で…' : 'とくだい エナガだんご！', t < 6.6 ? '雪だるまも だんごに 入りたい' : '森じゅうの 鳥で つり合った', t);
}
