// タイトル画面。
import { drawBear } from './bear';
import { BEAR_X, BEAR_Y, HEIGHT, USU_X, USU_Y, WIDTH } from './constants';
import { isTouchDevice } from './device';
import { drawMochi, drawUsu } from './mochi';
import { drawSakura } from './sakura';
import { drawStageBackground } from './scene';
import { COLOR, blink, outlinedText, rr, text } from './ui';

export function drawTitleScreen(ctx: CanvasRenderingContext2D, t: number, hiScore: number): void {
  drawStageBackground(ctx, 1, t);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);

  // ゆっくり ぺったん
  const phase = (t * 0.75) % 1;
  const lift = phase < 0.82 ? Math.sin((phase / 0.82) * Math.PI * 0.5) : 1 - (phase - 0.82) / 0.18;
  drawBear(ctx, BEAR_X, BEAR_Y, { lift, layer: 'body', face: 'excited' });
  drawSakura(ctx, 88, 520, { scale: 3, eyes: 'happy', gaze: 1 });
  drawUsu(ctx, USU_X, USU_Y);
  const squash = lift < 0.2 ? (0.2 - lift) * 3.5 : 0;
  drawMochi(ctx, USU_X, USU_Y + 8, { done: 1, shine: 0.8, squash, t });
  drawBear(ctx, BEAR_X, BEAR_Y, { lift, layer: 'arms' });

  // 題字は杵より手前に出す（振り上げた杵で文字が隠れないように）
  rr(ctx, 30, 62, 420, 124, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 96, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'もちつき', WIDTH / 2, 148, 46, '#f8c3d2', '#8a2f52');

  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 38, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}
