import { HEIGHT, WIDTH } from './constants';

export type Action = 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** タップ・クリック（押した瞬間）。キャンバスの上なら論理座標、それ以外は null。 */
  onTap(x: number | null, y: number | null): void;
  /** ← → キー（となりの列へ）。 */
  onStep(dir: -1 | 1): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * - 指・マウス：押した瞬間に onTap。リンクとボタンの上だけは反応しない（「ゲーム一覧」へ戻れるように）。
 * - ← → / A D：となりの列へ。スペース / Enter はタップ（スタート・決定）。
 */
export function attachInput(canvas: HTMLCanvasElement, handlers: InputHandlers): void {
  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left - canvas.clientLeft) * WIDTH) / canvas.clientWidth,
      y: ((e.clientY - r.top - canvas.clientTop) * HEIGHT) / canvas.clientHeight
    };
  };

  document.addEventListener('pointerdown', (e) => {
    const target = e.target as Element | null;
    if (target?.closest('a, button') != null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    handlers.onAnyInput();
    if (target === canvas) {
      const p = toLogical(e);
      handlers.onTap(p.x, p.y);
    } else {
      handlers.onTap(null, null);
    }
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || e.code === 'KeyA' || k === 'arrowright' || e.code === 'KeyD') {
      e.preventDefault();
      if (e.repeat) return;
      handlers.onAnyInput();
      handlers.onStep(k === 'arrowleft' || e.code === 'KeyA' ? -1 : 1);
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
