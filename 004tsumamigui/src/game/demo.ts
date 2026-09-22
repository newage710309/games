// 休み時間のデモ（1・2 時間目のあと）と、エンディングのデモ（点数で 3 通り）。
import { HEIGHT, WIDTH } from './constants';
import { drawOwl, drawStudent } from './characters';
import { drawSakura } from './sakura';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';

export type DemoKind = 'break1' | 'break2' | 'end0' | 'end1' | 'end2';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const ease = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

export function drawDemo(ctx: CanvasRenderingContext2D, kind: DemoKind, t: number, skippable: boolean): void {
  switch (kind) {
    case 'break1':
      drawBreak1(ctx, t);
      break;
    case 'break2':
      drawBreak2(ctx, t);
      break;
    case 'end0':
      drawEnd0(ctx, t);
      break;
    case 'end1':
      drawEnd1(ctx, t);
      break;
    case 'end2':
      drawEnd2(ctx, t);
      break;
  }
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
  const a = ease(t / 0.6);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,18,38,0.55)';
  rr(ctx, 60, 36, WIDTH - 120, 78, 16);
  ctx.fill();
  text(ctx, main, WIDTH / 2, 64, 26, COLOR.ink, true);
  text(ctx, sub, WIDTH / 2, 96, 14, COLOR.pink, true);
  ctx.restore();
}

function snowman(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, nose: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8aa6c0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -24, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#26303c';
  ctx.beginPath();
  ctx.arc(-3.6, -26, 1.4, 0, Math.PI * 2);
  ctx.arc(3.6, -26, 1.4, 0, Math.PI * 2);
  ctx.fill();
  if (nose) {
    // どんぐりの鼻
    ctx.fillStyle = '#b5773a';
    ctx.beginPath();
    ctx.ellipse(0, -21.5, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5230';
    ctx.beginPath();
    ctx.ellipse(0, -24, 2.9, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 1 時間目のあと：雪の校庭で雪だるまを作り、さくらちゃんがどんぐりの鼻をつける。 */
function drawBreak1(ctx: CanvasRenderingContext2D, t: number): void {
  const ground = 420;
  sky(ctx, '#9fd3f2', '#e8f5fc', ground);
  // 校舎
  ctx.fillStyle = '#f0e2c8';
  ctx.fillRect(20, 180, 440, 230);
  ctx.fillStyle = '#c98f5a';
  ctx.fillRect(10, 168, 460, 18);
  ctx.fillStyle = '#bfe2f6';
  for (let k = 0; k < 5; k++) ctx.fillRect(44 + k * 84, 214, 56, 50);
  snowGround(ctx, ground);
  drawSnowfall(ctx, t, ground, 30);

  snowman(ctx, 240, 470, 2.4, t > 4.2);
  // クラスメイト（正面）
  drawStudent(ctx, 110, 500, 'suzume', { front: true, scale: 2, happy: t > 4.4 });
  drawStudent(ctx, 380, 505, 'mejiro', { front: true, scale: 2, happy: t > 4.4 });
  drawStudent(ctx, 430, 440, 'yukimaru', { front: true, scale: 1.6, happy: t > 4.4 });

  // さくらちゃん：左から歩いてきて、ぴょんと跳んで鼻をつける
  const walk = ease((t - 0.8) / 2.4);
  let x = 30 + walk * 150;
  let y = 540;
  let view: 'right' | 'front' = 'right';
  if (t > 3.4) {
    const j = clamp01((t - 3.4) / 0.8);
    x = 180 + j * 40;
    y = 540 - Math.sin(j * Math.PI) * 110 - j * 30;
  }
  if (t > 4.2) {
    x = 220 + ease((t - 4.2) / 0.8) * -40;
    y = 510 + ease((t - 4.2) / 0.8) * 30;
    view = 'front';
  }
  drawSakura(ctx, x, y, { view, scale: 2.4, eyes: t > 4.4 ? 'happy' : 'dot' });

  title(ctx, 'やすみじかん', 'つぎは 2じかんめ さんすう', t);
}

/** 2 時間目のあと：窓の外の木で木の実をおかわり。ゆきまるくんが飛んでいく。 */
function drawBreak2(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#b9def5', '#eef7fc', HEIGHT);
  drawSnowfall(ctx, t, HEIGHT, 24);
  // 木の幹と枝
  ctx.fillStyle = '#7a5536';
  ctx.fillRect(360, 150, 40, HEIGHT - 150);
  ctx.strokeStyle = '#7a5536';
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(370, 380);
  ctx.quadraticCurveTo(220, 370, 40, 392);
  ctx.stroke();
  // 枝の雪
  ctx.fillStyle = '#ffffff';
  rr(ctx, 40, 374, 330, 8, 4);
  ctx.fill();
  // 木の実の房
  for (let k = 0; k < 6; k++) {
    const nx = 90 + k * 46;
    const picked = t > 2 + k * 0.5 && k < 4;
    if (picked) continue;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(nx, 404, 6, 0, Math.PI * 2);
    ctx.arc(nx + 8, 408, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // さくらちゃん：枝の上を歩いて、実をついばむ
  const x = 70 + clamp01((t - 1) / 3) * 150;
  const peck = t > 1.8 && t < 4.4 && Math.sin(t * 12) > 0;
  drawSakura(ctx, x, 348 + (peck ? 4 : 0), {
    view: t > 4.6 ? 'front' : 'right',
    scale: 2.3,
    eyes: t > 4.6 ? 'happy' : 'dot',
    puff: t > 4.6 ? 0.5 : 0
  });
  // ゆきまるくんが横切る（背景）
  const yx = -60 + clamp01((t - 3) / 3) * (WIDTH + 120);
  const yy = 220 + Math.sin(t * 6) * 10;
  drawStudent(ctx, yx, yy, 'yukimaru', { front: true, scale: 1.4 });

  title(ctx, 'きゅうしょくまえ', 'つぎは 3じかんめ テスト！', t);
}

/** いちばん下：もうすこし食べたかったな…（夕方の帰り道で、おなかがぐぅ） */
function drawEnd0(ctx: CanvasRenderingContext2D, t: number): void {
  const ground = 470;
  sky(ctx, '#f3a86b', '#fbd9b3', ground);
  // 夕日
  ctx.fillStyle = 'rgba(255,230,160,0.9)';
  ctx.beginPath();
  ctx.arc(360, 360, 60, 0, Math.PI * 2);
  ctx.fill();
  snowGround(ctx, ground, '#f6e7df');
  const x = 60 + clamp01(t / 5) * 220;
  drawSakura(ctx, x, 520, { view: 'right', scale: 2.6 });
  if (t > 2.4) {
    const a = ease((t - 2.4) / 0.4);
    ctx.save();
    ctx.globalAlpha = a;
    outlinedText(ctx, 'ぐぅ～', x + 40, 450, 26, '#ffffff', '#8a4a2a');
    ctx.restore();
  }
  title(ctx, 'もうすこし たべたかったな…', `もっと たべられるかな？`, t);
}

/** 真ん中：おなかいっぱい（夜の枝の上で、まんまるになって眠る） */
function drawEnd1(ctx: CanvasRenderingContext2D, t: number): void {
  sky(ctx, '#1d2b55', '#3a4f86', HEIGHT);
  // 星
  ctx.fillStyle = '#fff6c8';
  for (let k = 0; k < 30; k++) {
    const sx = (k * 97.3) % WIDTH;
    const sy = (k * 53.1) % 300;
    const tw = 0.5 + Math.sin(t * 2 + k) * 0.5;
    ctx.globalAlpha = 0.4 + tw * 0.6;
    ctx.fillRect(sx, sy + 130, 2, 2);
  }
  ctx.globalAlpha = 1;
  // 月
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(380, 180, 34, 0, Math.PI * 2);
  ctx.fill();
  // 枝
  ctx.strokeStyle = '#5a3d27';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 480);
  ctx.quadraticCurveTo(240, 460, 500, 500);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  rr(ctx, 0, 460, 480, 8, 4);
  ctx.fill();
  const breathe = Math.sin(t * 2) * 0.03;
  drawSakura(ctx, 230, 410, { scale: 3.4, squash: 0.12 + breathe, eyes: 'happy', puff: 0.35, shadow: false });
  // Zzz
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    text(ctx, 'z', 300 + p * 40 + k * 4, 330 - p * 70, 16 + p * 14, '#e8f2ff', true);
    ctx.restore();
  }
  title(ctx, 'おなか いっぱい！', 'もっと たべられるかな？', t);
}

/** いちばん上（クリア）：放課後にみんなでおやつ。 */
function drawEnd2(ctx: CanvasRenderingContext2D, t: number): void {
  // 夕方の教室
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#f6d7a8');
  g.addColorStop(1, '#e9b77c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#2f6b52';
  ctx.fillRect(60, 140, 360, 110);
  ctx.strokeStyle = '#8a6444';
  ctx.lineWidth = 8;
  ctx.strokeRect(60, 140, 360, 110);
  ctx.font = `bold 26px sans-serif`;
  text(ctx, 'たくさん たべたね！', 240, 195, 24, 'rgba(250,250,240,0.92)', true);
  ctx.fillStyle = '#c8955e';
  ctx.fillRect(0, 420, WIDTH, HEIGHT - 420);

  // 先生もにっこり
  drawOwl(ctx, 400, 420, { scale: 1.6, turn: 1 });

  // 真ん中の木の実の山
  ctx.fillStyle = '#7fb069';
  ctx.beginPath();
  ctx.ellipse(240, 500, 90, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 26; k++) {
    const nx = 170 + ((k * 37) % 140);
    const ny = 494 - Math.floor(k / 6) * 7 + (k % 2) * 3;
    ctx.fillStyle = k % 3 === 0 ? '#b5773a' : '#3e3a36';
    ctx.beginPath();
    ctx.ellipse(nx, ny, 5, 6, k, 0, Math.PI * 2);
    ctx.fill();
  }
  const hop = (p: number): number => Math.abs(Math.sin(t * 5 + p)) * -8;
  drawStudent(ctx, 90, 470 + hop(0), 'suzume', { front: true, scale: 2, happy: true });
  drawStudent(ctx, 150, 560 + hop(1), 'mejiro', { front: true, scale: 2, happy: true });
  drawStudent(ctx, 390, 560 + hop(2), 'hiyo', { front: true, scale: 2, happy: true });
  drawStudent(ctx, 320, 575 + hop(3), 'yukimaru', { front: true, scale: 2, happy: true });
  drawSakura(ctx, 240, 575 + hop(4), { scale: 2.8, eyes: 'happy', puff: 0.5 + Math.sin(t * 8) * 0.2 });

  // 紙ふぶき
  for (let k = 0; k < 40; k++) {
    const px = (k * 71.3 + Math.sin(t + k) * 20) % WIDTH;
    const py = ((k * 43.7 + t * (60 + (k % 5) * 20)) % (HEIGHT + 20)) - 20;
    ctx.fillStyle = ['#f283a8', '#ffd84a', '#8cc4ff', '#9fe0a0'][k % 4]!;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(t * 3 + k);
    ctx.fillRect(-3, -2, 6, 4);
    ctx.restore();
  }
  title(ctx, 'みんなで おやつ！', 'ぜんぶ クリア！', t);
}
