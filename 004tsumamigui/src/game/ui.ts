// 画面の描画で共通に使う色・文字・図形。
import { WIDTH } from './constants';

export const FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, system-ui, sans-serif';

export const COLOR = {
  bg: '#0b1428',
  hud: '#0a1226',
  ink: '#e8f2ff',
  muted: '#8fa5ce',
  pink: '#f8c3d2',
  accent: '#f283a8',
  panel: '#1a2540',
  panelBorder: '#2a3c68',
  wall: '#2b5078',
  wallLight: '#4f7fae',
  wallShake: '#8fd0ff',
  floor: '#eef5fb',
  floorDot: '#dbe9f5',
  popup: '#ff6f98'
} as const;

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** 1 秒に hz 回の点滅（true の間だけ描く）。 */
export const blink = (t: number, hz = 1.6): boolean => Math.floor(t * hz * 2) % 2 === 0;

export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  bold = false,
  align: CanvasTextAlign = 'center'
): void {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

/** 縁取りつきの文字（明るい盤面の上でも読めるように）。 */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  outline = '#1a2b4a'
): void {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(3, size * 0.22);
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** ゆっくり降る雪（乱数を使わず、毎フレーム同じ式で位置を決める）。 */
export function drawSnowfall(ctx: CanvasRenderingContext2D, t: number, bottom: number, n = 46): void {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = 0; k < n; k++) {
    const speed = 18 + (k % 5) * 7;
    const x = ((((k * 83.7 + Math.sin(t * 0.8 + k) * 14) % WIDTH) + WIDTH) % WIDTH);
    const y = ((((k * 47.3 + t * speed) % bottom) + bottom) % bottom);
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (k % 3) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
