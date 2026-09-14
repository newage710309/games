export type Direction = 'up' | 'down' | 'left' | 'right';
export type Action = 'start' | 'pause' | 'mute';

export interface InputHandlers {
  onMove(dir: Direction): void;
  onAction(action: Action): void;
  /** キー・タップなど、何らかのユーザー操作があったとき（音声解錠用）。 */
  onAnyInput(): void;
}

/**
 * KeyboardEvent.code と .key の両方を見る。
 * code だけだと IE 系の古い "Up" 表記や、一部の自動化ツールが送る
 * key のみのイベントを取りこぼす。
 */
const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right'
};

const lookupDir = (e: KeyboardEvent): Direction | undefined =>
  KEY_TO_DIR[e.code] ?? KEY_TO_DIR[e.key] ?? KEY_TO_DIR[e.key.toLowerCase()];

function lookupAction(e: KeyboardEvent): Action | undefined {
  const k = e.key.toLowerCase();
  if (e.code === 'Space' || k === ' ' || k === 'spacebar' || k === 'enter') return 'start';
  if (e.code === 'KeyP' || k === 'p') return 'pause';
  if (e.code === 'KeyM' || k === 'm') return 'mute';
  return undefined;
}

const SWIPE_THRESHOLD = 24;
/** touchend 後にブラウザが合成する click を無視する時間（ms）。 */
const GHOST_CLICK_MS = 600;

/** キーボード・タッチスワイプ・画面上の D-Pad をまとめて受け付ける。 */
export function attachInput(target: HTMLElement, handlers: InputHandlers): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const dir = lookupDir(e);
    if (dir !== undefined) {
      e.preventDefault();
      handlers.onAnyInput();
      handlers.onMove(dir);
      return;
    }

    const action = lookupAction(e);
    if (action === undefined) return;
    if (action === 'start') e.preventDefault(); // ページのスクロールを抑止
    handlers.onAnyInput();
    handlers.onAction(action);
  };

  let startX = 0;
  let startY = 0;
  let swiped = false;
  let lastTouchEnd = 0;

  const onTouchStart = (e: TouchEvent): void => {
    const t = e.changedTouches[0];
    if (t === undefined) return;
    startX = t.clientX;
    startY = t.clientY;
    swiped = false;
    handlers.onAnyInput();
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (swiped) return;
    const t = e.changedTouches[0];
    if (t === undefined) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    e.preventDefault();
    swiped = true;
    handlers.onMove(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    );
  };

  const onTouchEnd = (): void => {
    lastTouchEnd = performance.now();
    if (!swiped) handlers.onAction('start');
  };

  const onClick = (): void => {
    // タッチ操作の直後にブラウザが合成する click（ゴーストクリック）は捨てる。
    // 拾ってしまうと 1 タップで start が 2 回走り、始めたゲームがすぐ作り直される。
    if (performance.now() - lastTouchEnd < GHOST_CLICK_MS) return;
    handlers.onAnyInput();
    handlers.onAction('start');
  };

  // 長押しでコンテキストメニューや画像保存メニューが出ないようにする。
  const onContextMenu = (e: Event): void => e.preventDefault();

  window.addEventListener('keydown', onKeyDown);
  target.addEventListener('contextmenu', onContextMenu);
  target.addEventListener('touchstart', onTouchStart, { passive: true });
  target.addEventListener('touchmove', onTouchMove, { passive: false });
  target.addEventListener('touchend', onTouchEnd);
  target.addEventListener('click', onClick);

  const padButtons = Array.from(document.querySelectorAll<HTMLElement>('#pad [data-dir]'));
  const onPad = (e: Event): void => {
    e.preventDefault();
    const dir = (e.currentTarget as HTMLElement).dataset.dir as Direction | undefined;
    if (dir === undefined) return;
    handlers.onAnyInput();
    handlers.onMove(dir);
  };
  const auxButtons = Array.from(document.querySelectorAll<HTMLElement>('#pad [data-action]'));
  const onAux = (e: Event): void => {
    e.preventDefault();
    const action = (e.currentTarget as HTMLElement).dataset.action as Action | undefined;
    if (action === undefined) return;
    handlers.onAnyInput();
    handlers.onAction(action);
  };

  for (const btn of padButtons) {
    btn.addEventListener('pointerdown', onPad);
    btn.addEventListener('contextmenu', onContextMenu);
  }
  for (const btn of auxButtons) {
    btn.addEventListener('pointerdown', onAux);
    btn.addEventListener('contextmenu', onContextMenu);
  }

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('contextmenu', onContextMenu);
    target.removeEventListener('touchstart', onTouchStart);
    target.removeEventListener('touchmove', onTouchMove);
    target.removeEventListener('touchend', onTouchEnd);
    target.removeEventListener('click', onClick);
    for (const btn of padButtons) {
      btn.removeEventListener('pointerdown', onPad);
      btn.removeEventListener('contextmenu', onContextMenu);
    }
    for (const btn of auxButtons) {
      btn.removeEventListener('pointerdown', onAux);
      btn.removeEventListener('contextmenu', onContextMenu);
    }
  };
}
