import { HEIGHT, WIDTH } from './constants';

export type Action = 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** 押した瞬間。キャンバスの上なら論理座標、それ以外は null。age = 押してから今までの秒数。 */
  onPress(x: number | null, y: number | null, age: number): void;
  /** スペース・Enter。 */
  onConfirm(age: number): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/** イベントが届くまでに待たされた時間（秒）。重いフレームのぶんだけ判定がずれないように差し引く。 */
const ageOf = (e: Event): number => Math.max(0, Math.min(0.1, (performance.now() - e.timeStamp) / 1000));

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * リズムゲームなので、離したときではなく「押した瞬間」に反応する。
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
    if (e.target === canvas) {
      const p = toLogical(e);
      handlers.onPress(p.x, p.y, ageOf(e));
    } else {
      handlers.onPress(null, null, ageOf(e));
    }
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = e.code;
    if (e.repeat) {
      if (k === ' ' || k === 'enter') e.preventDefault();
      return;
    }
    const press = (): void => {
      e.preventDefault();
      handlers.onAnyInput();
    };
    if (code === 'Space' || k === ' ' || k === 'enter') {
      press();
      handlers.onConfirm(ageOf(e));
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
}
