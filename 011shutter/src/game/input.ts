// 入力：マウス・タッチ（マルチタッチ）・キーボード。
// スマホでは、片方の親指でドラッグしながら、もう片方の親指でシャッターを押せるように、指ごとに追いかける。

import { HEIGHT, WIDTH } from './constants';

export type Key = 'left' | 'right' | 'up' | 'down';
export type Action = 'pause' | 'mute' | 'escape' | 'confirm';

export interface InputHandlers {
  /** 指・マウスを押したとき。キャンバスの外なら x, y は null。 */
  onDown(id: number, x: number | null, y: number | null, touch: boolean): void;
  /** 動かしたとき（マウスは押していなくても来る）。 */
  onMove(id: number, x: number, y: number, touch: boolean): void;
  onUp(id: number): void;
  /** 矢印キーを押した・はなした。 */
  onKey(key: Key, down: boolean): void;
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
      // 指がキャンバスの外へ出ても、はなすまで追いかける
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* 取れなくても動く */
      }
      const p = toLogical(e);
      handlers.onDown(e.pointerId, p.x, p.y, touch);
    } else {
      handlers.onDown(e.pointerId, null, null, touch);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    handlers.onMove(e.pointerId, p.x, p.y, e.pointerType !== 'mouse');
  });
  const up = (e: PointerEvent): void => handlers.onUp(e.pointerId);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  document.addEventListener('pointerup', up);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const arrow = (k: string): Key | null =>
    k === 'arrowleft' ? 'left' : k === 'arrowright' ? 'right' : k === 'arrowup' ? 'up' : k === 'arrowdown' ? 'down' : null;

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = e.code;
    const a = arrow(k);
    if (a !== null) {
      e.preventDefault();
      if (!e.repeat) {
        handlers.onAnyInput();
        handlers.onKey(a, true);
      }
      return;
    }
    if (e.repeat) {
      if (k === ' ' || k === 'enter') e.preventDefault();
      return;
    }
    let action: Action | undefined;
    if (code === 'Space' || k === ' ' || k === 'enter') action = 'confirm';
    else if (code === 'KeyP' || k === 'p') action = 'pause';
    else if (code === 'KeyM' || k === 'm') action = 'mute';
    else if (k === 'escape') action = 'escape';
    if (action === undefined) return;
    e.preventDefault();
    handlers.onAnyInput();
    handlers.onAction(action);
  });
  window.addEventListener('keyup', (e) => {
    const a = arrow(e.key.toLowerCase());
    if (a !== null) handlers.onKey(a, false);
  });
  // ほかのウィンドウへ移ったら、押しっぱなしの矢印キーをはなしたことにする
  window.addEventListener('blur', () => {
    for (const k of ['left', 'right', 'up', 'down'] as const) handlers.onKey(k, false);
  });
}
