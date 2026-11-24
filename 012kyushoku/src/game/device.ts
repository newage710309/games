import { WIDTH, HEIGHT } from './constants';
export const MAX_RENDER_SCALE = 3;

// CSS の表示寸法と DPR に合わせ、拡大時のぼやけを防ぐ。
export function resizeBackingStore(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(MAX_RENDER_SCALE, Math.max(1, rect.width / WIDTH * (window.devicePixelRatio || 1)));
  const width = Math.round(WIDTH * scale);
  const height = Math.round(HEIGHT * scale);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
}

const coarsePointer =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)')
    : null;

/** タッチ端末（スマホ・タブレット）かどうか。効果音の音量をここで切り替える。 */
export const isTouchDevice = (): boolean => coarsePointer?.matches ?? false;
