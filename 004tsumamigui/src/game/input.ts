import { HEIGHT, WIDTH } from './constants';

export type Action = 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /**
   * 押した（指・マウス・スペースキー）。id は押している指などの区別。
   * キャンバスの上なら論理座標、それ以外（キャンバスの外の余白・キーボード）は null。
   */
  onDown(id: string, x: number | null, y: number | null): void;
  /** 放した。 */
  onUp(id: string): void;
  /** すべて放した扱いにする（別のウィンドウに移ったときなど）。 */
  onUpAll(): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * - 指・マウス：画面のどこを押しても「押している」。キャンバスの上なら座標も渡す（ボタン用）。
 *   リンクとボタンの上だけは反応しない（「ゲーム一覧」へ戻れるように）。
 * - スペース / Enter：押している間「押している」。
 * click イベントは使わないので、タッチ後のゴーストクリックも起きない。
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
    const id = `p${e.pointerId}`;
    if (target === canvas) {
      const p = toLogical(e);
      handlers.onDown(id, p.x, p.y);
    } else {
      handlers.onDown(id, null, null);
    }
  });
  const up = (e: PointerEvent): void => handlers.onUp(`p${e.pointerId}`);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.code === 'Space' || k === ' ' || k === 'enter') {
      e.preventDefault();
      if (e.repeat) return;
      handlers.onAnyInput();
      handlers.onDown('key', null, null);
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
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (e.code === 'Space' || k === ' ' || k === 'enter') handlers.onUp('key');
  });

  // 別ウィンドウに移ったら、押しっぱなし扱いにしない
  window.addEventListener('blur', () => handlers.onUpAll());
}
