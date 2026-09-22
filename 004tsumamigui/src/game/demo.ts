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
  // ゆきまるくんが左から右へ飛んでいく（背景。右向きで羽ばたく）
  const yx = -60 + clamp01((t - 3) / 3) * (WIDTH + 120);
  const yy = 220 + Math.sin(t * 6) * 10;
  const flap = (Math.sin(t * 22) + 1) / 2;
  drawSakura(ctx, yx, yy, { view: 'right', bird: 'yukimaru', scale: 1.5, flap, shadow: false });

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

/** 給食のおぼん（カレー・パン・牛乳）。(x, y) が中心。 */
function drawTray(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, eaten = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#bfe3c8';
  ctx.strokeStyle = '#6a9a78';
  ctx.lineWidth = 1.2;
  rr(ctx, -30, -12, 60, 24, 5);
  ctx.fill();
  ctx.stroke();
  // カレー（食べた量だけ減る）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-12, 0, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9aa';
  ctx.stroke();
  if (eaten < 1) {
    ctx.fillStyle = '#c98a2e';
    ctx.beginPath();
    ctx.ellipse(-12, 0, 10 * (1 - eaten * 0.8), 5 * (1 - eaten * 0.8), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // パン
  if (eaten < 0.6) {
    ctx.fillStyle = '#e8b870';
    rr(ctx, 5, -8, 13, 9, 4);
    ctx.fill();
  }
  // 牛乳
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#7a9ac0';
  ctx.fillRect(20, -10, 7, 14);
  ctx.strokeRect(20, -10, 7, 14);
  ctx.fillStyle = '#7ab0e8';
  ctx.fillRect(20, -4, 7, 4);
  ctx.restore();
}

/** いちばん上（クリア）：食べすぎて、給食が入らない。 */
function drawEnd2(ctx: CanvasRenderingContext2D, t: number): void {
  // 昼の教室
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#fbf1dc');
  g.addColorStop(1, '#f0dcb8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#2f6b52';
  ctx.fillRect(60, 140, 360, 110);
  ctx.strokeStyle = '#8a6444';
  ctx.lineWidth = 8;
  ctx.strokeRect(60, 140, 360, 110);
  text(ctx, 'きょうの きゅうしょく', 240, 172, 18, 'rgba(250,250,240,0.92)', true);
  text(ctx, 'カレー・パン・ぎゅうにゅう', 240, 212, 20, 'rgba(250,250,240,0.92)', true);
  ctx.fillStyle = '#c8955e';
  ctx.fillRect(0, 420, WIDTH, HEIGHT - 420);

  // 先生もびっくり
  drawOwl(ctx, 412, 424, { scale: 1.5, turn: 1 });
  if (t > 3.2) {
    ctx.save();
    ctx.globalAlpha = ease((t - 3.2) / 0.3);
    outlinedText(ctx, 'あらあら', 400, 300, 16, '#ffffff', '#6a4424');
    ctx.restore();
  }

  // くっつけた机
  ctx.fillStyle = '#d9a86c';
  ctx.strokeStyle = '#6a4424';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 470);
  ctx.lineTo(440, 470);
  ctx.lineTo(460, 520);
  ctx.lineTo(20, 520);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b07c48';
  ctx.fillRect(20, 520, 440, 14);

  // クラスメイトはもりもり食べる
  const bob = (p: number): number => Math.abs(Math.sin(t * 6 + p)) * -5;
  const kids = [
    ['suzume', 70],
    ['mejiro', 150],
    ['hiyo', 330],
    ['yukimaru', 410]
  ] as const;
  for (const [i, [k, x]] of kids.entries()) {
    drawStudent(ctx, x, 448 + bob(i), k, { front: true, scale: 2, happy: true });
    drawTray(ctx, x, 494, 1.05, clamp01((t - 1 - i * 0.3) / 5));
  }

  // さくらちゃん：まんまるで、給食に手がつけられない
  const wobble = Math.sin(t * 3) * 0.02;
  drawSakura(ctx, 240, 430, { scale: 3.3, squash: 0.16 + wobble, puff: 0.9, eyes: t > 4 ? 'happy' : 'dot', shadow: false });
  drawTray(ctx, 240, 500, 1.3, 0);
  // あせ
  ctx.fillStyle = '#8fd0ff';
  const sx = 290;
  const sy = 360 + ((t * 30) % 20);
  ctx.beginPath();
  ctx.moveTo(sx, sy - 10);
  ctx.quadraticCurveTo(sx - 6, sy, sx, sy + 4);
  ctx.quadraticCurveTo(sx + 6, sy, sx, sy - 10);
  ctx.fill();
  if (t > 1.2) {
    ctx.save();
    ctx.globalAlpha = ease((t - 1.2) / 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6a3448';
    ctx.lineWidth = 2;
    rr(ctx, 120, 300, 176, 40, 14);
    ctx.fill();
    ctx.stroke();
    text(ctx, 'もう たべられない…', 208, 320, 16, '#6a3448', true);
    ctx.restore();
  }
  if (t > 4.4 && t < 6) outlinedText(ctx, 'けぷっ', 300, 400, 20, '#ffffff', '#6a3448');

  // きらきら（クリアのお祝い）
  for (let k = 0; k < 24; k++) {
    const px = (k * 71.3 + Math.sin(t + k) * 20) % WIDTH;
    const py = ((k * 43.7 + t * (50 + (k % 5) * 16)) % (HEIGHT + 20)) - 20;
    ctx.fillStyle = ['#f283a8', '#ffd84a', '#8cc4ff', '#9fe0a0'][k % 4]!;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(t * 3 + k);
    ctx.fillRect(-3, -2, 6, 4);
    ctx.restore();
  }
  title(ctx, 'きゅうしょくが はいらない！', 'たべすぎちゃった… ぜんぶ クリア！', t);
}
