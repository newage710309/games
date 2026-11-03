// タイトル画面。
import { HEIGHT, WIDTH } from './constants';
import { isTouchDevice } from './device';
import { drawRider, drawSnowball, type Stuck, type StuckKind } from './snowball';
import { COLOR, blink, drawSnowfall, hash, outlinedText, rr, text } from './ui';

/** 雪玉に刺さっているものを、決まった乱数で散らす（デモ・デザイン確認でも使う）。 */
export function stuckOf(kinds: StuckKind[], seed = 1): Stuck[] {
  return kinds.map((kind, i) => {
    const y = hash(i, seed) * 2 - 1;
    const s = Math.sqrt(1 - y * y);
    const a = hash(i, seed + 1) * Math.PI * 2;
    return { kind, x: Math.cos(a) * s, y, z: Math.sin(a) * s, seed: i };
  });
}

const TITLE_STUCK = stuckOf(['twig', 'twig', 'tree', 'soldier', 'pebble', 'berry', 'tree', 'twig', 'soldier', 'berry', 'twig', 'pebble'], 5);

export function drawTitleScreen(ctx: CanvasRenderingContext2D, t: number, hiScore: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(0.55, '#7f93c8');
  g.addColorStop(0.55, '#f4f9fd');
  g.addColorStop(1, '#d6e6f4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 66, 420, 124, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 100, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, '雪玉ころがし', WIDTH / 2, 150, 42, '#f8c3d2', '#8a2f52');
  // 大きな雪玉に乗ったさくらちゃん
  drawSnowball(ctx, 240, 418, 112, { roll: t * 1.6, stuck: TITLE_STUCK });
  ctx.save();
  ctx.translate(240, 418);
  ctx.scale(2, 2);
  drawRider(ctx, 0, 0, 56, t, { eyes: 'happy' });
  ctx.restore();
  drawSnowfall(ctx, t, HEIGHT - 64, 30);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 42, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 16, 12, COLOR.muted, true);
}
