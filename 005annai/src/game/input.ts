import { HEIGHT, WIDTH } from './constants';

/** 案内の向き。up = 雪だるまを入場お断り。 */
export type Dir = 'left' | 'right' | 'up';
export type Action = 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** タップ（押した瞬間）。キャンバスの上なら論理座標、それ以外は null。 */
  onTap(x: number | null, y: number | null): void;
  /** スワイプ・矢印キー。 */
  onSwipe(dir: Dir): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/** これだけ動かしたらスワイプとみなす（CSS ピクセル）。短いほうが速く案内できる。 */
const SWIPE_DIST = 22;

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * - 指・マウス：押した瞬間に onTap、動かして SWIPE_DIST を超えた瞬間に onSwipe（指を離すのを待たない）。
 *   1 回押すごとにスワイプは 1 回だけ。下向きは何もしない。
 *   リンクとボタンの上だけは反応しない（「ゲーム一覧」へ戻れるように）。
 * - 矢印キー（← → ↑）と A / D / W：スワイプと同じ。スペース / Enter はタップ。
 */
export function attachInput(canvas: HTMLCanvasElement, handlers: InputHandlers): void {
  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left - canvas.clientLeft) * WIDTH) / canvas.clientWidth,
      y: ((e.clientY - r.top - canvas.clientTop) * HEIGHT) / canvas.clientHeight
    };
  };

  /** 押している指ごとの、押し始めの位置。スワイプを出したら done。 */
  const strokes = new Map<number, { x: number; y: number; done: boolean }>();

  document.addEventListener('pointerdown', (e) => {
    const target = e.target as Element | null;
    if (target?.closest('a, button') != null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    handlers.onAnyInput();
    strokes.set(e.pointerId, { x: e.clientX, y: e.clientY, done: false });
    if (target === canvas) {
      const p = toLogical(e);
      handlers.onTap(p.x, p.y);
    } else {
      handlers.onTap(null, null);
    }
  });
  document.addEventListener('pointermove', (e) => {
    const s = strokes.get(e.pointerId);
    if (s === undefined || s.done) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) < SWIPE_DIST) return;
    s.done = true;
    if (Math.abs(dx) > Math.abs(dy)) handlers.onSwipe(dx < 0 ? 'left' : 'right');
    else if (dy < 0) handlers.onSwipe('up');
  });
  const end = (e: PointerEvent): void => {
    strokes.delete(e.pointerId);
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    let dir: Dir | undefined;
    if (k === 'arrowleft' || e.code === 'KeyA') dir = 'left';
    else if (k === 'arrowright' || e.code === 'KeyD') dir = 'right';
    else if (k === 'arrowup' || e.code === 'KeyW') dir = 'up';
    if (dir !== undefined) {
      e.preventDefault();
      if (e.repeat) return;
      handlers.onAnyInput();
      handlers.onSwipe(dir);
      return;
    }
    if (k === 'arrowdown') {
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' || k === ' ' || k === 'enter') {
      e.preventDefault();
      if (e.repeat) return;
      handlers.onAnyInput();
      handlers.onTap(null, null);
      return;
    }
    if (e.repeat) return;
    let action: Action | undefined;
    if (e.code === 'KeyP' || k === 'p') action = 'pause';
    else if (e.code === 'KeyM' || k === 'm') action = 'mute';
    else if (k === 'escape') action = 'escape';
    if (action === undefined) return;
    e.preventDefault();
    handlers.onAnyInput();
    handlers.onAction(action);
  });
}
