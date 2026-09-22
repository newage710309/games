import './style.css';
import { HEIGHT, WIDTH } from './game/constants';
import { Audio } from './game/audio';
import { Game, seededRandom } from './game/game';
import { attachInput } from './game/input';
import { render } from './game/render';

const canvasEl = document.querySelector<HTMLCanvasElement>('#game');
if (canvasEl === null) throw new Error('#game canvas が見つかりません');
const canvas: HTMLCanvasElement = canvasEl;

const context = canvas.getContext('2d', { alpha: false });
if (context === null) throw new Error('2D コンテキストを取得できません');
const ctx: CanvasRenderingContext2D = context;

/**
 * 描画倍率の上限。大画面 × 高 DPI で実ピクセルが増えすぎると重くなるので、
 * 論理サイズ（480×640）の 3.5 倍で頭打ちにする。
 */
const MAX_RENDER_SCALE = 3.5;

/**
 * 実ピクセル数を「画面上の表示サイズ × DPI」に合わせる。拡大表示してもぼやけない。
 * ゲームの座標は常に 480×640 のまま、setTransform で倍率だけを掛ける。
 */
function resizeBackingStore(): void {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || WIDTH;
  const scale = Math.min((cssWidth * dpr) / WIDTH, MAX_RENDER_SCALE);
  const w = Math.round(WIDTH * scale);
  const h = Math.round(HEIGHT * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

resizeBackingStore();
new ResizeObserver(resizeBackingStore).observe(canvas);
window.addEventListener('resize', resizeBackingStore);

const audio = new Audio();
const game = new Game(audio);

attachInput(canvas, {
  onDown: (id, x, y) => game.down(id, x, y),
  onUp: (id) => game.up(id),
  onUpAll: () => game.upAll(),
  onAction: (action) => {
    if (action === 'pause') game.togglePause();
    else if (action === 'escape') game.escape();
    else if (action === 'mute') game.toggleMute();
  },
  onAnyInput: () => audio.unlock()
});

// タブが非表示になったら自動でポーズ（復帰時に一気に進まないように）。
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (game.phase === 'playing' || game.phase === 'ready')) game.togglePause();
});

if (import.meta.env.DEV) {
  // 開発時のみ、コンソールから状態を覗いたり、乱数を固定して動きを再現したりできるようにする。
  Object.assign(window, { __game: game, __seededRandom: seededRandom, __render: render });
}

let last = performance.now();

function frame(now: number): void {
  // タブ復帰などで時間が飛んでも、1 フレーム 50ms を上限にする
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  render(ctx, game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
