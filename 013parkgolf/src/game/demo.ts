// コースのあとのデモ（1 めんのあと：クマが張りきる、2 めんのあと：雪だるまが呼びに来る）と、エンディング。

import { drawBear } from './bear';
import { HEIGHT, WIDTH } from './constants';
import { drawAbove, drawGround, type Theme } from './field';
import { drawBall, drawClub, drawSakuraCurled, drawTee, drawZzz } from './golfer';
import { HOLES } from './holes';
import { drawConfetti, say } from './hud';
import { drawKitsune } from './kitsune';
import { drawSakura } from './sakura';
import { drawSnowman } from './snowman';
import { ENDING_CUTS } from './game';
import { drawSnowfall, outlinedText, rr, text } from './ui';

const ease = (p: number): number => {
  const q = Math.max(0, Math.min(1, p));
  return q * q * (3 - 2 * q);
};

/** コースの絵を背景にして、少し暗くする。 */
function backdrop(ctx: CanvasRenderingContext2D, holeIndex: number, theme: Theme, camY: number, t: number, dim: string): void {
  const hole = HOLES[holeIndex]!;
  ctx.save();
  ctx.translate(0, -camY);
  drawGround(ctx, { hole, theme, camY, t });
  drawAbove(ctx, { hole, theme, camY, t });
  ctx.restore();
  ctx.fillStyle = dim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/** 人物を立たせる地面（手前の芝の帯）。 */
function stage(ctx: CanvasRenderingContext2D, color: string, edge: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(WIDTH / 2, 600, 300, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawDemo(ctx: CanvasRenderingContext2D, no: number, t: number): void {
  if (no === 1) {
    // 1 めんのあと：クマが「つぎは 森の コースだ」と張りきる
    backdrop(ctx, 2, 'spring', 0, t, 'rgba(12,26,20,0.35)');
    stage(ctx, '#86c65a', '#5e9f4c');
    // 向こうに秋の森がちらっと見える
    const k = ease(t / 1.2);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ['#cc4a30', '#e2b23a', '#d9772b'][i % 3]!;
      ctx.beginPath();
      ctx.arc(30 + i * 84, 470 - k * 30, 34, Math.PI, 0);
      ctx.fill();
    }
    stage(ctx, '#86c65a', '#5e9f4c');
    const jump = t > 1 ? Math.abs(Math.sin(t * 5)) * 16 : 0;
    drawBear(ctx, 320, 640, { scale: 0.62, noKine: true, hat: 'cap', cheer: ease((t - 0.6) / 0.4), face: t > 1 ? 'proud' : 'normal', bob: -jump });
    drawSakura(ctx, 110, 590, { scale: 2.4, eyes: t > 1.4 ? 'happy' : 'dot', tail: 1, gaze: 0.6 });
    drawKitsune(ctx, 196, 630, { scale: 2.2, mood: 'happy', pose: t > 1.6 ? 'clap' : 'watch', t });
    if (t > 0.8) say(ctx, 'つぎは 森の コースだ！', 270, 200, 300, 262, 19);
    if (t > 2) say(ctx, 'もみじが きれいだって', 130, 410, 190, 470, 13, true);
    outlinedText(ctx, '1めん クリア！', WIDTH / 2, 70, 26, '#ffd84a', '#5a3a1e');
    return;
  }
  // 2 めんのあと：雪だるまが「冬は ゆきのコースで しょうぶだ」と呼びに来る
  backdrop(ctx, 5, 'autumn', 0, t, 'rgba(30,40,70,0.42)');
  drawSnowfall(ctx, t, HEIGHT, Math.floor(Math.min(1, t / 2) * 46));
  stage(ctx, '#a7b956', '#7a8c3e');
  const sx = 560 - ease(t / 1.4) * 220;
  drawSnowman(ctx, sx, 640, { scale: 4.4, hop: t * 1.4, lift: t > 1.4 ? 6 + Math.sin(t * 6) * 3 : 0, face: t < 1.4 ? -1 : 0 });
  const surprised = t > 0.9;
  drawSakura(ctx, 110, 590, { scale: 2.4, eyes: surprised ? 'shock' : 'dot', tail: 1, gaze: 0.8 });
  drawBear(ctx, 210, 650, { scale: 0.5, noKine: true, hat: 'cap', face: surprised ? 'shock' : 'normal', sweat: surprised });
  drawKitsune(ctx, 40, 640, { scale: 2, t });
  if (t > 1.5) say(ctx, 'ふゆは ゆきの コースで\nしょうぶだ！', 300, 250, 330, 420, 17);
  outlinedText(ctx, '2めん クリア！', WIDTH / 2, 70, 26, '#ffd84a', '#5a3a1e');
}

/** エンディング：記念写真の前に、丸くなって休んでいたさくらちゃんを、クマが白いボールとまちがえてティーに置く。 */
export function drawEnding(ctx: CanvasRenderingContext2D, t: number): void {
  const [, c1, c2, c3] = ENDING_CUTS as [number, number, number, number];
  backdrop(ctx, 8, 'winter', 1000, t, 'rgba(255,230,220,0.12)');
  drawSnowfall(ctx, t, HEIGHT, 30);
  stage(ctx, '#e4edf6', '#a9bdd3');
  const teeX = 220;
  const teeY = 600;
  if (t < c1) {
    // ① 9 ホール回って、ひと休み。丸くなってすやすや
    drawTee(ctx, teeX, teeY);
    drawBall(ctx, teeX + 70, teeY + 6, 0, 0, 12);
    drawSakuraCurled(ctx, 120, 560, 2.6, t);
    drawZzz(ctx, 150, 520, t, 1.6);
    const bx = 560 - ease(t / 2) * 180;
    // キツネは奥にいるので先に描き、歩いてくるクマを手前に重ねる
    drawKitsune(ctx, 420, 520, { scale: 1.8, t });
    drawBear(ctx, bx, 640, { scale: 0.5, noKine: true, hat: 'cap' });
    outlinedText(ctx, '9ホール おつかれさま！', WIDTH / 2, 90, 24, '#ffffff', '#3a5a8a');
    if (t > 1) say(ctx, 'きねん しゃしんを とろう', 300, 220, 220, 300, 15);
    if (t > 2.4) say(ctx, 'お、こんな ところに\nボールが', 330, 360, 360, 430, 14);
    return;
  }
  if (t < c2) {
    // ② ティーに置いて、1 打 うってみようと クラブを かまえる
    const u = t - c1;
    const lift = Math.max(0, 1 - u / 1.2);
    drawTee(ctx, teeX, teeY);
    drawSakuraCurled(ctx, teeX, teeY - 12 - lift * 60, 2.2, t);
    drawZzz(ctx, teeX + 24, teeY - 46, t, 1.4);
    const wind = u > 1.6 ? ease((u - 1.6) / 1.4) : 0;
    // クマが両手でクラブをにぎり、ヘッドをさくらちゃんのうしろに合わせてから、ゆっくり振り上げる
    const bx = teeX + 150;
    const by = 660;
    const bs = 0.5;
    const gx = teeX + 92;
    const gy = 566;
    const a0 = Math.atan2(teeY - 4 - gy, teeX + 30 - gx);
    const a = a0 + wind * 1.9;
    const L = Math.hypot(teeX + 30 - gx, teeY - 4 - gy);
    const bear = { scale: bs, noKine: true, hat: 'cap' as const, face: 'grin' as const };
    drawKitsune(ctx, 420, 520, { scale: 1.8, pose: u > 2 ? 'cover' : 'watch', t });
    drawBear(ctx, bx, by, { ...bear, layer: 'body' });
    drawClub(ctx, gx, gy, gx + Math.cos(a) * L, gy + Math.sin(a) * L, Math.PI, 2.2, 0, 16);
    drawBear(ctx, bx, by, { ...bear, layer: 'arms', arms: 'grip', grip: { x: (gx - bx) / bs, y: (gy - by) / bs, dir: a } });
    say(ctx, u < 1.6 ? 'よいしょっと' : 'さいごに 1打 うって おこう', 300, 430, 350, 500, 15);
    return;
  }
  if (t < c3) {
    // ③ 目をさまして、パタパタ抗議
    const u = t - c2;
    drawTee(ctx, teeX, teeY);
    const hop = Math.abs(Math.sin(u * 9)) * 26;
    drawSakura(ctx, teeX, teeY - 40 - hop, { scale: 2.6, view: 'front', eyes: 'squint', spread: 0.5 + 0.5 * Math.abs(Math.sin(u * 16)), blush: 0.8, tail: 1 });
    // 怒りのしるし
    ctx.strokeStyle = '#ff5a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const ax = teeX + 46;
    const ay = teeY - 110 - hop;
    for (const [dx, dy] of [
      [-6, -6],
      [6, -6],
      [-6, 6],
      [6, 6]
    ] as const) {
      ctx.moveTo(ax + dx * 0.4, ay + dy * 1.4);
      ctx.lineTo(ax + dx * 1.2, ay + dy * 0.4);
    }
    ctx.stroke();
    drawBear(ctx, teeX + 150, 660, { scale: 0.5, noKine: true, hat: 'cap', face: 'shock', sweat: true });
    drawClub(ctx, teeX + 170, 640, teeX + 200, 690, 0, 2.2);
    drawKitsune(ctx, 80, 640, { scale: 2, mood: 'happy', pose: 'clap', t });
    say(ctx, 'ボールじゃ ないよ！', 190, 400, teeX - 10, 470 - hop, 20);
    if (u > 1.4) say(ctx, 'ご、ごめん…', 400, 470, 380, 540, 14);
    return;
  }
  // ④ みんなで記念写真
  const u = t - c3;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  rr(ctx, 40, 150, 400, 420, 10);
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  ctx.save();
  rr(ctx, 56, 166, 368, 330, 6);
  ctx.clip();
  backdrop(ctx, 0, 'spring', 120, t, 'rgba(255,255,255,0)');
  ctx.translate(0, 0);
  drawBear(ctx, 330, 490, { scale: 0.62, noKine: true, hat: 'cap', cheer: 1, face: 'excited' });
  drawKitsune(ctx, 150, 480, { scale: 2.6, mood: 'happy', pose: 'hooray', t: 0.2 });
  drawSakura(ctx, 240, 440, { scale: 3, eyes: 'happy', spread: 0.9, blush: 0.5, tail: 1 });
  drawSnowman(ctx, 400, 470, { scale: 2, grin: true });
  ctx.restore();
  text(ctx, 'さくらちゃんの パークゴルフ', WIDTH / 2, 520, 16, '#4a3326', true);
  text(ctx, 'おしまい', WIDTH / 2, 546, 14, '#8a6a4a', true);
  if (u < 0.35) {
    ctx.fillStyle = `rgba(255,255,255,${1 - u / 0.35})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  drawConfetti(ctx, u, 40);
  outlinedText(ctx, 'はい、チーズ！', WIDTH / 2, 100, 26, '#ffffff', '#d94d78');
}
