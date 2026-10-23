import { HEIGHT, WIDTH } from './constants';

export type Action = 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** タップ（指を動かさずに離した）。キャンバスの上なら論理座標、それ以外は null。 */
  onTap(x: number | null, y: number | null): void;
  /** 左右に 1 マス。 */
  onMove(dir: -1 | 1): void;
  /** 回す。1 = 右回り、-1 = 左回り。 */
  onRotate(dir: -1 | 1): void;
  /** はやく落とす（下スワイプ・↓ のあいだだけ true）。 */
  onSoft(on: boolean): void;
  /** スペース・Enter。 */
  onConfirm(): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/** 横にこれだけ動かすごとに 1 マス動く（CSS ピクセル）。指を動かし続けると続けて動く。 */
const MOVE_STEP = 28;
/** 下にこれだけ動かすと、はやく落とし始める。 */
const SOFT_STEP = 16;
/** 下へ動かすのが止まってから、ふつうの速さに戻るまでの秒数。 */
const SOFT_HOLD = 0.16;
/** 上にこれだけ動かすと回す（もう一度これだけ動かすと、もう一度回す）。 */
const UP_STEP = 34;
/** これより動いたらタップとはみなさない。 */
const TAP_SLOP = 10;

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * - 指・マウス：画面のどこでも。指を離すのを待たずに、一定距離動かした瞬間に反応する。
 *   左右 = 1 マスずつ移動、下 = 動かしているあいだはやく落とす、上 = 回す、
 *   動かさずに離す = タップ（回す・ボタン）。リンクとボタンの上だけは反応しない（「ゲーム一覧」へ戻れるように）。
 * - ← → / A D：移動（押しっぱなしで続けて動く）。↑ / W / X：右回り、Z：左回り。↓ / S：はやく落とす。
 *   スペース / Enter：プレイ中は右回り、それ以外は決定。
 */
export function attachInput(canvas: HTMLCanvasElement, handlers: InputHandlers): void {
  const toLogical = (e: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left - canvas.clientLeft) * WIDTH) / canvas.clientWidth,
      y: ((e.clientY - r.top - canvas.clientTop) * HEIGHT) / canvas.clientHeight
    };
  };

  /** 押している指ごとの、押し始めの位置・基準点（反応するたびに動かす）。 */
  interface Stroke {
    sx: number;
    sy: number;
    ax: number;
    ay: number;
    moved: boolean;
  }
  const strokes = new Map<number, Stroke>();
  let softTimer = 0;
  const softOff = (): void => {
    window.clearTimeout(softTimer);
    softTimer = 0;
    handlers.onSoft(false);
  };

  document.addEventListener('pointerdown', (e) => {
    const target = e.target as Element | null;
    if (target?.closest('a, button') != null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    handlers.onAnyInput();
    strokes.set(e.pointerId, { sx: e.clientX, sy: e.clientY, ax: e.clientX, ay: e.clientY, moved: false });
  });
  document.addEventListener('pointermove', (e) => {
    const s = strokes.get(e.pointerId);
    if (s === undefined) return;
    if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > TAP_SLOP) s.moved = true;
    const dx = e.clientX - s.ax;
    if (Math.abs(dx) >= MOVE_STEP) {
      const n = Math.floor(Math.abs(dx) / MOVE_STEP);
      const dir = dx < 0 ? -1 : 1;
      for (let k = 0; k < n; k++) handlers.onMove(dir);
      s.ax += dir * n * MOVE_STEP;
      // 横に動かしているときは、縦の基準も合わせる（ななめの指で落とさない）
      s.ay = e.clientY;
      return;
    }
    const dy = e.clientY - s.ay;
    if (dy >= SOFT_STEP) {
      s.ay = e.clientY;
      s.ax = e.clientX;
      handlers.onSoft(true);
      window.clearTimeout(softTimer);
      softTimer = window.setTimeout(softOff, SOFT_HOLD * 1000);
    } else if (dy <= -UP_STEP) {
      s.ay = e.clientY;
      s.ax = e.clientX;
      handlers.onRotate(1);
    }
  });
  const end = (e: PointerEvent): void => {
    const s = strokes.get(e.pointerId);
    strokes.delete(e.pointerId);
    if (s === undefined) return;
    if (softTimer !== 0) softOff();
    if (s.moved) return;
    if (e.target === canvas) {
      const p = toLogical(e);
      handlers.onTap(p.x, p.y);
    } else {
      handlers.onTap(null, null);
    }
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', (e) => {
    strokes.delete(e.pointerId);
    if (softTimer !== 0) softOff();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const code = e.code;
    const press = (): void => {
      e.preventDefault();
      handlers.onAnyInput();
    };
    if (k === 'arrowleft' || code === 'KeyA' || k === 'a') {
      press();
      handlers.onMove(-1);
      return;
    }
    if (k === 'arrowright' || code === 'KeyD' || k === 'd') {
      press();
      handlers.onMove(1);
      return;
    }
    if (k === 'arrowdown' || code === 'KeyS' || k === 's') {
      press();
      handlers.onSoft(true);
      return;
    }
    if (e.repeat) {
      if (k === 'arrowup' || k === ' ' || k === 'enter') e.preventDefault();
      return;
    }
    if (k === 'arrowup' || code === 'KeyW' || code === 'KeyX' || k === 'w' || k === 'x') {
      press();
      handlers.onRotate(1);
      return;
    }
    if (code === 'KeyZ' || k === 'z') {
      press();
      handlers.onRotate(-1);
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
    if (k === 'arrowdown' || e.code === 'KeyS' || k === 's') handlers.onSoft(false);
  });
  // ほかのウィンドウへ移ったら、はやく落とすのをやめる（キーを離した知らせが来ないため）
  window.addEventListener('blur', () => handlers.onSoft(false));
}
