// タイトル画面。
import { HEIGHT, WIDTH } from './constants';
import { drawHuddle } from './demo';
import { isTouchDevice } from './device';
import { drawSakura } from './sakura';
import { drawSnowGuest } from './snowman';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';

export function drawTitleScreen(ctx: CanvasRenderingContext2D, t: number, hiScore: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(0.62, '#4c5a92');
  g.addColorStop(0.62, '#eef5fb');
  g.addColorStop(1, '#dbe9f5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 66, 420, 124, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 100, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'おしくらまんじゅう', WIDTH / 2, 148, 38, '#f8c3d2', '#8a2f52');

  // みんなの輪の手前で、さくらちゃんがぎゅっとされている（さくらちゃんの前にはだれも重ならない）
  const push = (Math.sin(t * 5) + 1) / 2;
  drawHuddle(ctx, WIDTH / 2, 420, ['shimaenaga', 'risu', 'yamagara', 'kitsune', 'karasu', 'usagi', 'momonga', 'akagera'], t, 130, 2.1, () =>
    drawSakura(ctx, WIDTH / 2, 470, { scale: 3.4, eyes: 'happy', squash: push * 0.1 })
  );
  // 遠くから雪だるまがのぞいている
  drawSnowGuest(ctx, 60, 330, 'none', { scale: 1.6 });
  drawSnowGuest(ctx, 430, 320, 'none', { scale: 1.3 });
  drawSnowfall(ctx, t, HEIGHT * 0.62, 30);

  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 42, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 16, 12, COLOR.muted, true);
}
