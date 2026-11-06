// タイトル画面。
import type { BirdKind } from './birds';
import { HEIGHT, WIDTH } from './constants';
import { isTouchDevice } from './device';
import { drawBranch, drawStageBackground, type SlotThing } from './scene';
import { COLOR, blink, outlinedText, rr, text } from './ui';

const TITLE_BIRDS: (BirdKind | null)[] = ['yamagara', 'enaga', 'enaga', null, 'enaga', 'enaga', 'gojukara'];

export function drawTitleScreen(ctx: CanvasRenderingContext2D, t: number, hiScore: number): void {
  drawStageBackground(ctx, 1, t);
  // ときどき ぎゅっと押し合う だんご
  const squeeze = 0.75 + 0.25 * Math.max(0, Math.sin(t * 1.6));
  const slots: (SlotThing | null)[] = TITLE_BIRDS.map((b) => (b ? { kind: 'bird', bird: b, mood: 'happy' } : null));
  drawBranch(ctx, { stage: 1, perSide: 3, angle: Math.sin(t * 1.1) * 0.015, slots, sakura: { state: 'on', happy: true }, dango: squeeze, t });

  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 72, 420, 124, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 106, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'エナガだんご', WIDTH / 2, 158, 44, '#f8c3d2', '#8a2f52');

  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 38, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}
