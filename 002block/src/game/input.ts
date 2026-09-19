import { HEIGHT, WIDTH } from './constants';

export type Action = 'start' | 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** マウス・指の位置（論理座標）。ラケットを合わせる。 */
  onPoint(x: number, y: number): void;
  /** クリック・タップ（論理座標）。 */
  onTap(x: number, y: number): void;
  /** ← → の状態。dir は -1 / 0 / 1、pressed は押した瞬間なら true。 */
  onKeyDir(dir: number, pressed: boolean): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/** これ以上動いたらタップではなくドラッグとみなす（CSS px）。 */
const TAP_SLOP = 10;
/** これより長く押していたらタップではない（ms）。 */
const TAP_TIME = 400;

/**
 * マウス・タッチ・ペンを Pointer Events でまとめて扱う。
 * - マウス：動かすとラケットが付いてくる。クリックで発射・決定。
 * - タッチ：指でなぞるとラケットが付いてくる。その場でタップすると発射・決定。
 * click イベントは使わないので、タッチ後のゴーストクリックも起きない。
 */
export function attachInput(canvas: HTMLCanvasElement, handlers: InputHandlers): () => void {
  /** 画面上の座標を、ゲームの論理座標（480×640）に変換する。枠線のぶんも差し引く。 */
  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left - canvas.clientLeft) * WIDTH) / canvas.clientWidth,
      y: ((e.clientY - r.top - canvas.clientTop) * HEIGHT) / canvas.clientHeight
    };
  };

  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let isDown = false;

  const onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    handlers.onAnyInput();
    isDown = true;
    downX = e.clientX;
    downY = e.clientY;
    downAt = performance.now();
    // 指がキャンバスの外に出ても追いかけられるようにする
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* 対応していない環境では無視 */
    }
    if (e.pointerType !== 'mouse') {
      const p = toLogical(e);
      handlers.onPoint(p.x, p.y);
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    // マウスはボタンを押していなくても追従、タッチは触れている間だけ
    if (e.pointerType !== 'mouse' && !isDown) return;
    const p = toLogical(e);
    handlers.onPoint(p.x, p.y);
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!isDown) return;
    isDown = false;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const held = performance.now() - downAt;
    if (moved <= TAP_SLOP && held <= TAP_TIME) {
      const p = toLogical(e);
      handlers.onTap(p.x, p.y);
    }
  };

  const onPointerCancel = (): void => {
    isDown = false;
  };

  const DIR_KEYS: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    KeyA: -1,
    KeyD: 1,
    Left: -1,
    Right: 1,
    a: -1,
    d: 1
  };
  const held = new Set<number>();
  const currentDir = (): number => (held.has(-1) && !held.has(1) ? -1 : held.has(1) && !held.has(-1) ? 1 : 0);
  const dirOf = (e: KeyboardEvent): number | undefined =>
    DIR_KEYS[e.code] ?? DIR_KEYS[e.key] ?? DIR_KEYS[e.key.toLowerCase()];

  const onKeyDown = (e: KeyboardEvent): void => {
    const dir = dirOf(e);
    if (dir !== undefined) {
      e.preventDefault();
      handlers.onAnyInput();
      if (e.repeat) return;
      held.add(dir);
      handlers.onKeyDir(currentDir(), true);
      return;
    }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    let action: Action | undefined;
    if (e.code === 'Space' || k === ' ' || k === 'enter') action = 'start';
    else if (e.code === 'KeyP' || k === 'p') action = 'pause';
    else if (e.code === 'KeyM' || k === 'm') action = 'mute';
    else if (k === 'escape') action = 'escape';
    if (action === undefined) return;
    e.preventDefault();
    handlers.onAnyInput();
    handlers.onAction(action);
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    const dir = dirOf(e);
    if (dir === undefined) return;
    held.delete(dir);
    handlers.onKeyDir(currentDir(), false);
  };

  // 別ウィンドウに移ったらキーを押しっぱなし扱いにしない
  const onBlur = (): void => {
    held.clear();
    handlers.onKeyDir(0, false);
  };

  const onContextMenu = (e: Event): void => e.preventDefault();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // タッチ端末用のポーズ・消音ボタン
  const auxButtons = Array.from(document.querySelectorAll<HTMLElement>('#controls [data-action]'));
  const onAux = (e: Event): void => {
    e.preventDefault();
    const action = (e.currentTarget as HTMLElement).dataset.action as Action | undefined;
    if (action === undefined) return;
    handlers.onAnyInput();
    handlers.onAction(action);
  };
  for (const btn of auxButtons) {
    btn.addEventListener('pointerdown', onAux);
    btn.addEventListener('contextmenu', onContextMenu);
  }

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    for (const btn of auxButtons) {
      btn.removeEventListener('pointerdown', onAux);
      btn.removeEventListener('contextmenu', onContextMenu);
    }
  };
}
