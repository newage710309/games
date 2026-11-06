import { HEIGHT, WIDTH } from './constants';

export type Action = 'pause' | 'mute' | 'escape' | 'left' | 'right' | 'undo';

export interface InputHandlers {
  /** 押したとき。キャンバスの上なら論理座標、それ以外は null。touch = 指（またはペン）で押した。 */
  onPress(x: number | null, y: number | null, touch: boolean): void;
  /** マウスを動かしたとき（場所の予告を出す）。 */
  onHover(x: number, y: number): void;
  /** スペース・Enter。 */
  onConfirm(): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * リンクとボタンの上だけは反応しない（「ゲーム一覧」へ戻れるように）。
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
    const touch = e.pointerType !== 'mouse';
    if (e.target === canvas) {
      const p = toLogical(e);
      handlers.onPress(p.x, p.y, touch);
    } else {
      handlers.onPress(null, null, touch);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = toLogical(e);
    handlers.onHover(p.x, p.y);
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = e.code;
    const arrow = k === 'arrowleft' || k === 'arrowright';
    if (e.repeat && !arrow) {
      if (k === ' ' || k === 'enter') e.preventDefault();
      return;
    }
    const press = (): void => {
      e.preventDefault();
      handlers.onAnyInput();
    };
    if (code === 'Space' || k === ' ' || k === 'enter') {
      press();
      handlers.onConfirm();
      return;
    }
    let action: Action | undefined;
    if (code === 'KeyP' || k === 'p') action = 'pause';
    else if (code === 'KeyM' || k === 'm') action = 'mute';
    else if (code === 'KeyZ' || k === 'z') action = 'undo';
    else if (k === 'escape') action = 'escape';
    else if (k === 'arrowleft') action = 'left';
    else if (k === 'arrowright') action = 'right';
    if (action === undefined) return;
    press();
    handlers.onAction(action);
  });
}
