// 面クリアごとの幕間デモ。t はデモが始まってからの秒数。
import { DEMO_SKIP_WAIT, HEIGHT, WIDTH } from './constants';
import { isTouchDevice as isTouch } from './device';
import { STAGES } from './levels';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';
import { drawIce, drawSakura, drawSakuraFlower, drawSnowman } from './sprites';

const GROUND = 430;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
/** 0..1 の区間 [a, b] での進み具合。 */
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const ease = (k: number): number => k * k * (3 - 2 * k);

/** '#rrggbb' どうしを混ぜる。 */
function mix(c1: string, c2: string, k: number): string {
  const p = (c: string, i: number): number => Number.parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number): number => Math.round(p(c1, i) + (p(c2, i) - p(c1, i)) * k);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

export function drawDemo(ctx: CanvasRenderingContext2D, index: number, t: number, duration: number): void {
  if (index === 0) demoRolling(ctx, t);
  else if (index === 1) demoChase(ctx, t);
  else demoSpring(ctx, t);

  // 題名とスキップの案内
  const title = STAGES[index]?.demoTitle ?? '';
  ctx.fillStyle = 'rgba(8,14,32,0.55)';
  ctx.fillRect(0, 0, WIDTH, 44);
  text(ctx, `～ ${title} ～`, WIDTH / 2, 23, 17, COLOR.pink, true);
  if (t >= DEMO_SKIP_WAIT && blink(t, 1)) {
    text(ctx, isTouch() ? 'タップで とばす' : 'クリック / SPACE で とばす', WIDTH - 12, HEIGHT - 16, 12, '#5d7aa3', false, 'right');
  }

  // はじめと終わりは暗くして、場面の切りかわりをやわらげる
  const fade = Math.max(1 - t / 0.35, 1 - (duration - t) / 0.35, 0);
  if (fade > 0) {
    ctx.fillStyle = `rgba(6,10,24,${fade})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function winterScene(ctx: CanvasRenderingContext2D, t: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#16284f');
  sky.addColorStop(1, '#3b5f96');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, GROUND);
  // 遠くの雪山
  ctx.fillStyle = '#c9dcef';
  ctx.beginPath();
  ctx.moveTo(0, GROUND - 40);
  ctx.lineTo(90, GROUND - 120);
  ctx.lineTo(170, GROUND - 60);
  ctx.lineTo(270, GROUND - 150);
  ctx.lineTo(380, GROUND - 70);
  ctx.lineTo(480, GROUND - 110);
  ctx.lineTo(480, GROUND);
  ctx.lineTo(0, GROUND);
  ctx.fill();
  const snow = ctx.createLinearGradient(0, GROUND - 20, 0, HEIGHT);
  snow.addColorStop(0, '#f2f8fd');
  snow.addColorStop(1, '#cddff0');
  ctx.fillStyle = snow;
  ctx.fillRect(0, GROUND - 16, WIDTH, HEIGHT - GROUND + 16);
  drawSnowfall(ctx, t, GROUND);
}

function caption(ctx: CanvasRenderingContext2D, s: string): void {
  ctx.fillStyle = 'rgba(14,26,52,0.78)';
  rr(ctx, 40, 520, WIDTH - 80, 56, 14);
  ctx.fill();
  text(ctx, s, WIDTH / 2, 548, 17, '#ffffff', true);
}

// --- 1 面のあと：ころころ ゆきだるま（7 秒） ------------------------------

function demoRolling(ctx: CanvasRenderingContext2D, t: number): void {
  winterScene(ctx, t);
  const y = GROUND + 20;

  // さくらちゃんは左から跳ねながら来て、x = 300 で止まる
  const sx = Math.min(300, 80 + t * 75);
  const walking = sx < 300;
  let sy = walking ? y - Math.abs(Math.sin(t * 6)) * 14 : y;
  // 雪だるまが横を転がっていったら、びっくりして跳ぶ
  const jump = span(t, 3.55, 4.05);
  if (jump > 0 && jump < 1) sy = y - Math.sin(jump * Math.PI) * 40;

  // 雪だるま：3 秒で石につまずいて、雪玉になって転がっていく
  const tripAt = 3.0;
  const tripX = 200; // さくらちゃんの 100px 後ろ
  // つまずく小石
  ctx.fillStyle = '#8a97a8';
  ctx.beginPath();
  ctx.ellipse(tripX + 22, y + 14, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (t < tripAt) {
    drawSnowman(ctx, sx - 100 - (1 - span(t, 0, 0.8)) * 60, y - 2, { scale: 1.9, facing: 1, time: t, walk: t * 2.4, angry: true });
  } else {
    const k = t - tripAt;
    const x = tripX + Math.max(0, k - 0.25) * 240;
    const rot = k < 0.25 ? (k / 0.25) * (Math.PI / 2) : Math.PI / 2 + (k - 0.25) * 9;
    drawSnowman(ctx, x, y - 4, { scale: 1.9, facing: 1, time: t, rotate: rot, stun: true });
    if (k < 0.8) outlinedText(ctx, 'あっ！', tripX + 10, y - 90, 22, '#ffffff', '#23406e');
  }

  drawSakura(ctx, sx, sy, { scale: 2.1, view: walking ? 'right' : 'front', up: jump > 0 && jump < 1 });
  if (jump > 0 && jump < 1) outlinedText(ctx, '！', sx + 30, sy - 50, 28, '#ffe38a', '#23406e');
  if (t > 5) notes(ctx, sx, y - 60, t);

  caption(ctx, t < 3 ? 'ゆきだるまが おいかけてきた！' : t < 5 ? 'あっ、ころんだ！' : 'ころころ〜 いっちゃった ♪');
}

// --- 2 面のあと：おいかけっこ（8 秒） --------------------------------------

function demoChase(ctx: CanvasRenderingContext2D, t: number): void {
  winterScene(ctx, t);
  const y = GROUND + 20;

  if (t < 4.3) {
    // さくらちゃんが右から左へ逃げて、雪だるまが追いかける
    const sx = 520 - t * 170;
    drawSakura(ctx, sx, y - Math.abs(Math.sin(t * 9)) * 10, { scale: 2.1, view: 'left' });
    outlinedText(ctx, 'あせあせ', sx, y - 62, 14, '#ffffff', '#23406e');
    for (let k = 0; k < 3; k++) {
      drawSnowman(ctx, sx + 80 + k * 64, y - 2, { scale: 1.7, facing: -1, time: t, walk: t * 3 + k * 0.3, angry: true });
    }
  } else {
    // 今度は氷を押して、雪だるまを追いかえす
    const k = t - 4.3;
    const iceX = -70 + k * 150;
    for (let i = 0; i < 3; i++) {
      drawSnowman(ctx, iceX + 110 + i * 62 + k * 14, y - 2 - Math.abs(Math.sin(t * 10 + i)) * 6, {
        scale: 1.7,
        facing: -1, // こわくて振り返りながら逃げる
        time: t,
        walk: t * 4 + i * 0.3,
        sweat: true
      });
    }
    drawIce(ctx, iceX - 36, y - 64, 76);
    const push = Math.sin(t * 8) * 0.06 + 0.08;
    drawSakura(ctx, iceX - 70, y, { scale: 2.1, view: 'right', squash: push });
  }

  caption(ctx, t < 4.3 ? 'こんどは ゆきだるまが おいかけてくる…' : 'こおりを おして はんげき！');
}

// --- 3 面のあと（エンディング）：はるが きた（10 秒） ----------------------

function demoSpring(ctx: CanvasRenderingContext2D, t: number): void {
  const warm = ease(span(t, 0.5, 4.5));
  const green = ease(span(t, 3, 7));

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, mix('#16284f', '#7cc4f0', warm));
  sky.addColorStop(1, mix('#3b5f96', '#fde2ec', warm));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, GROUND);

  // おひさま
  const sunY = 470 - ease(span(t, 0.3, 4)) * 330;
  ctx.fillStyle = 'rgba(255,220,120,0.35)';
  ctx.beginPath();
  ctx.arc(390, sunY, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd35a';
  ctx.beginPath();
  ctx.arc(390, sunY, 30, 0, Math.PI * 2);
  ctx.fill();

  // 遠くの山（雪から緑へ）
  ctx.fillStyle = mix('#c9dcef', '#a9d59a', green);
  ctx.beginPath();
  ctx.moveTo(0, GROUND - 40);
  ctx.lineTo(90, GROUND - 120);
  ctx.lineTo(170, GROUND - 60);
  ctx.lineTo(270, GROUND - 150);
  ctx.lineTo(380, GROUND - 70);
  ctx.lineTo(480, GROUND - 110);
  ctx.lineTo(480, GROUND);
  ctx.lineTo(0, GROUND);
  ctx.fill();

  const ground = ctx.createLinearGradient(0, GROUND - 20, 0, HEIGHT);
  ground.addColorStop(0, mix('#f2f8fd', '#bfe3a6', green));
  ground.addColorStop(1, mix('#cddff0', '#8fca78', green));
  ctx.fillStyle = ground;
  ctx.fillRect(0, GROUND - 16, WIDTH, HEIGHT - GROUND + 16);

  drawSakuraTree(ctx, 96, GROUND - 4, span(t, 4, 7.5), t);

  // 雪はだんだんやむ
  if (t < 4) {
    ctx.save();
    ctx.globalAlpha = 1 - span(t, 1.5, 4);
    drawSnowfall(ctx, t, GROUND);
    ctx.restore();
  }

  const y = GROUND + 30;
  // 雪だるまたちは、にっこりしながらとけていく
  const melt = ease(span(t, 3, 7));
  for (let i = 0; i < 3; i++) {
    drawSnowman(ctx, 270 + i * 70, y - 2, {
      scale: 1.6,
      facing: -1,
      time: t,
      smile: true,
      melt,
      walk: melt < 1 ? t * 0.5 + i : 0
    });
  }

  // さくらちゃんは、よろこんで跳ねる
  const hop = t > 6.5 ? Math.abs(Math.sin(t * 5)) * 16 : 0;
  drawSakura(ctx, 190, y - hop, { scale: 2.1, gaze: 1, up: t > 6.5 });
  if (t > 6.5) notes(ctx, 190, y - 64 - hop, t);

  // 花びらが舞う
  if (t > 5) {
    const k = span(t, 5, 6);
    for (let i = 0; i < 18; i++) {
      const px = ((i * 71 + t * 30 + Math.sin(t + i) * 20) % (WIDTH + 40)) - 20;
      const py = ((i * 53 + t * (26 + (i % 4) * 8)) % 480) + 20;
      ctx.globalAlpha = k;
      drawSakuraFlower(ctx, px, py, 4 + (i % 3), t + i, false);
    }
    ctx.globalAlpha = 1;
  }

  caption(
    ctx,
    t < 3 ? 'ゆきだるまを ぜんぶ たいじしたら…' : t < 6.5 ? 'おひさまが でて、ゆきが とけていく' : 'はるが きたよ！ また ふゆに あそぼうね'
  );
}

/** 桜の木。bloom（0..1）で花が順に咲いていく。 */
function drawSakuraTree(ctx: CanvasRenderingContext2D, x: number, y: number, bloom: number, t: number): void {
  ctx.strokeStyle = '#6b4a3a';
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 4, y - 120);
  ctx.stroke();
  ctx.lineWidth = 7;
  const branches: [number, number, number, number][] = [
    [x + 3, y - 90, x - 50, y - 150],
    [x + 4, y - 110, x + 60, y - 175],
    [x + 4, y - 120, x - 10, y - 200],
    [x + 2, y - 70, x + 50, y - 110]
  ];
  ctx.beginPath();
  for (const [a, b, c, d] of branches) {
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
  }
  ctx.stroke();

  // 花のかたまり（咲く前は雪がのっている）
  const clusters = [
    [x - 50, y - 155, 30],
    [x + 60, y - 178, 30],
    [x - 10, y - 205, 32],
    [x + 50, y - 115, 24],
    [x + 18, y - 160, 30],
    [x - 34, y - 188, 22]
  ] as const;
  clusters.forEach(([cx, cy, r], i) => {
    const k = ease(span(bloom, i / clusters.length, (i + 1.6) / clusters.length));
    if (k <= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6, r * 0.5, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = `rgba(248,195,210,${0.85 * k})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
    ctx.fill();
    for (let f = 0; f < 5; f++) {
      const a = f * 1.26 + i;
      drawSakuraFlower(ctx, cx + Math.cos(a) * r * 0.55 * k, cy + Math.sin(a) * r * 0.5 * k, 6 * k, t * 0.2 + f, false);
    }
  });
}

/** 音符（うれしいとき）。 */
function notes(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  for (let k = 0; k < 2; k++) {
    const a = t * 2 + k * 1.7;
    outlinedText(ctx, k === 0 ? '♪' : '♫', x + 26 + k * 20, y - Math.abs(Math.sin(a)) * 10 - k * 8, 22, '#ffe38a', '#23406e');
  }
}
