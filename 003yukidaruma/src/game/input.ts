import { HEIGHT, WIDTH, type Dir } from './constants';

export type Action = 'start' | 'pause' | 'mute' | 'escape';

export interface InputHandlers {
  /** クリック・タップ（論理座標）。 */
  onTap(x: number, y: number): void;
  /** 今押している向き（離したら null）。キーボードと十字キーで別々に知らせる。 */
  onKeyDir(dir: Dir | null): void;
  onPadDir(dir: Dir | null): void;
  onAction(action: Action): void;
  /** 何らかのユーザー操作があったとき（音声の解錠用）。 */
  onAnyInput(): void;
}

/** これ以上動いたらタップではない（CSS px）。 */
const TAP_SLOP = 12;
/** これより長く押していたらタップではない（ms）。 */
const TAP_TIME = 500;

/** 十字キーの中心からこの割合（半径比）より内側は「どこも押していない」。 */
const PAD_DEAD_ZONE = 0.16;
/**
 * 斜めあたりで向きがちらつかないよう、今の向きの成分がもう一方の成分の
 * この割合以上あるうちは向きを変えない。
 */
const PAD_HYSTERESIS = 0.8;

/**
 * 入力を Pointer Events とキーボードでまとめて扱う。
 * - キャンバス：タップ／クリックでボタンを押す・決定する（プレイ中はポーズボタンだけ）。
 * - 十字キー（タッチ端末）：押したまま指をすべらせると向きが変わる。押しなおさなくてよい。
 * - キーボード：矢印キー / WASD で移動（最後に押したキーが優先）。
 * click イベントは使わないので、タッチ後のゴーストクリックも起きない。
 */
export function attachInput(canvas: HTMLCanvasElement, pad: HTMLElement | null, handlers: InputHandlers): void {
  // --- キャンバスのタップ ----------------------------------------------

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
  let canvasPointer: number | null = null;

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handlers.onAnyInput();
    canvasPointer = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
    downAt = performance.now();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (canvasPointer !== e.pointerId) return;
    canvasPointer = null;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved <= TAP_SLOP && performance.now() - downAt <= TAP_TIME) {
      const p = toLogical(e);
      handlers.onTap(p.x, p.y);
    }
  });
  canvas.addEventListener('pointercancel', () => {
    canvasPointer = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- 十字キー ----------------------------------------------------------

  if (pad !== null) attachPad(pad, handlers);

  // --- キーボード --------------------------------------------------------

  const DIR_KEYS: Record<string, Dir> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyW: 'up',
    KeyS: 'down',
    KeyA: 'left',
    KeyD: 'right'
  };
  /** 押している向き。後から押したものほど後ろ。 */
  const held: Dir[] = [];
  const emit = (): void => handlers.onKeyDir(held.length > 0 ? held[held.length - 1]! : null);

  window.addEventListener('keydown', (e) => {
    const dir = DIR_KEYS[e.code];
    if (dir !== undefined) {
      e.preventDefault();
      handlers.onAnyInput();
      if (e.repeat) return;
      const i = held.indexOf(dir);
      if (i >= 0) held.splice(i, 1);
      held.push(dir);
      emit();
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
  });

  window.addEventListener('keyup', (e) => {
    const dir = DIR_KEYS[e.code];
    if (dir === undefined) return;
    const i = held.indexOf(dir);
    if (i >= 0) held.splice(i, 1);
    emit();
  });

  // 別ウィンドウに移ったら、押しっぱなし扱いにしない
  window.addEventListener('blur', () => {
    held.length = 0;
    emit();
    handlers.onPadDir(null);
  });
}

/**
 * 十字キー。指を置いた位置が中心からどちらにずれているかで向きを決める。
 * setPointerCapture しているので、指が十字キーの外に出ても追いかける。
 * 別の指で触りなおしたら、新しい指のほうを使う。
 */
function attachPad(pad: HTMLElement, handlers: InputHandlers): void {
  let active: number | null = null;
  let current: Dir | null = null;

  const set = (dir: Dir | null): void => {
    if (dir === current) return;
    current = dir;
    pad.dataset.dir = dir ?? '';
    handlers.onPadDir(dir);
  };

  const dirAt = (e: PointerEvent): Dir | null => {
    const r = pad.getBoundingClientRect();
    const radius = Math.min(r.width, r.height) / 2;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < radius * PAD_DEAD_ZONE) return null;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    // 今の向きと同じ側にまだ十分寄っていれば、そのまま（斜めでのちらつき防止）
    if (current === 'left' && dx < 0 && ax >= ay * PAD_HYSTERESIS) return 'left';
    if (current === 'right' && dx > 0 && ax >= ay * PAD_HYSTERESIS) return 'right';
    if (current === 'up' && dy < 0 && ay >= ax * PAD_HYSTERESIS) return 'up';
    if (current === 'down' && dy > 0 && ay >= ax * PAD_HYSTERESIS) return 'down';
    if (ax > ay) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  };

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handlers.onAnyInput();
    active = e.pointerId;
    try {
      pad.setPointerCapture(e.pointerId);
    } catch {
      /* 対応していない環境では無視 */
    }
    set(dirAt(e));
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== active) return;
    set(dirAt(e));
  });
  const release = (e: PointerEvent): void => {
    if (e.pointerId !== active) return;
    active = null;
    set(null);
  };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  pad.addEventListener('lostpointercapture', release);
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
}
