import { HEIGHT, WIDTH } from './constants';

export type Action = 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** タップ（指を動かさずに離した）。キャンバスの上なら論理座標、それ以外は null。 */
  onTap(x: number | null, y: number | null): void;
  /** キーの向き（-1, 0, 1）。 */
  onAxis(dir: number): void;
  /** 指のドラッグで動かした量（ゲーム画面の座標）。 */
  onDrag(dx: number): void;
  /** マウスの位置（ゲーム画面の x）。 */
  onMouse(x: number): void;
  /** スペース・Enter。 */
  onConfirm(): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/** これより動いたらタップとはみなさない。 */
const TAP_SLOP = 10;

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * - 指：画面のどこでも、左右にドラッグした分だけ動く。動かさずに離す = タップ（ボタン）。
 * - マウス：動かすだけで、その位置へ向かう。クリック = 決定。
 *   リンクとボタンの上だけは反応しない（「ゲーム一覧」へ戻れるように）。
 * - ← → / A D：左右（押しているあいだ）。スペース / Enter：決定。
 */
export function attachInput(canvas: HTMLCanvasElement, handlers: InputHandlers): void {
  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left - canvas.clientLeft) * WIDTH) / canvas.clientWidth,
      y: ((e.clientY - r.top - canvas.clientTop) * HEIGHT) / canvas.clientHeight
    };
  };

  /** 押している指ごとの、押し始めの位置と前の位置。 */
  interface Stroke {
    sx: number;
    sy: number;
    lastX: number;
    moved: boolean;
  }
  const strokes = new Map<number, Stroke>();

  document.addEventListener('pointerdown', (e) => {
    const target = e.target as Element | null;
    if (target?.closest('a, button') != null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    handlers.onAnyInput();
    strokes.set(e.pointerId, { sx: e.clientX, sy: e.clientY, lastX: e.clientX, moved: false });
  });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') handlers.onMouse(toLogical(e).x);
    const s = strokes.get(e.pointerId);
    if (s === undefined) return;
    if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > TAP_SLOP) s.moved = true;
    if (e.pointerType !== 'mouse') {
      handlers.onDrag(((e.clientX - s.lastX) * WIDTH) / canvas.clientWidth);
      s.lastX = e.clientX;
    }
  });
  const end = (e: PointerEvent): void => {
    const s = strokes.get(e.pointerId);
    strokes.delete(e.pointerId);
    if (s === undefined || s.moved) return;
    if (e.target === canvas) {
      const p = toLogical(e);
      handlers.onTap(p.x, p.y);
    } else {
      handlers.onTap(null, null);
    }
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', (e) => strokes.delete(e.pointerId));
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  let left = false;
  let right = false;
  const sendAxis = (): void => handlers.onAxis((right ? 1 : 0) - (left ? 1 : 0));

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = e.code;
    const press = (): void => {
      e.preventDefault();
      handlers.onAnyInput();
    };
    if (k === 'arrowleft' || code === 'KeyA' || k === 'a') {
      press();
      left = true;
      sendAxis();
      return;
    }
    if (k === 'arrowright' || code === 'KeyD' || k === 'd') {
      press();
      right = true;
      sendAxis();
      return;
    }
    if (e.repeat) {
      if (k === ' ' || k === 'enter') e.preventDefault();
      return;
    }
    if (code === 'Space' || k === ' ' || k === 'enter') {
      press();
      handlers.onConfirm();
      return;
    }
    let action: Action | undefined;
    if (code === 'KeyP' || k === 'p') action = 'pause';
    else if (code === 'KeyM' || k === 'm') action = 'mute';
    else if (k === 'escape') action = 'escape';
    if (action === undefined) return;
    press();
    handlers.onAction(action);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || e.code === 'KeyA' || k === 'a') left = false;
    else if (k === 'arrowright' || e.code === 'KeyD' || k === 'd') right = false;
    else return;
    sendAxis();
  });
  // ほかのウィンドウへ移ったら、キーを離したことにする（離した知らせが来ないため）
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    sendAxis();
  });
}
