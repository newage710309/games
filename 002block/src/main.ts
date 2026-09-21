import './style.css';
import { HEIGHT, WIDTH } from './game/constants';
import { Audio } from './game/audio';
import { Game } from './game/game';
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
  onPoint: (x, y) => game.pointTo(x, y),
  onTap: (x, y) => game.tap(x, y),
  onKeyDir: (dir, pressed) => game.setKeyDir(dir, pressed),
  onAction: (action) => {
    if (action === 'start') game.action();
    else if (action === 'pause') game.togglePause();
    else if (action === 'escape') game.escape();
    // 消音はキーボードの M か、ポーズ画面の「おと」ボタン（タッチ端末）で切り替える
    else if (action === 'mute') game.toggleMute();
  },
  // 盤面の下の余白をタップしたら発射（タイトルなどで誤って決定しないよう、発射待ちのときだけ）
  onBelowTap: () => {
    if (game.phase === 'serve') game.action();
  },
  onAnyInput: () => audio.unlock()
});

// タブが非表示になったら自動でポーズ（復帰時にボールが一気に進まないように）。
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (game.phase === 'playing' || game.phase === 'serve')) game.togglePause();
});

if (import.meta.env.DEV) {
  // 開発時のみ、コンソールから状態を覗けるようにしておく。
  (window as unknown as { __game: Game }).__game = game;
}

// プレイ中はマウスカーソルを隠す（ラケットに重なって邪魔になるため）。
let lastCursor = '';
function updateCursor(): void {
  const cursor = game.phase === 'playing' || game.phase === 'serve' ? 'none' : 'pointer';
  if (cursor !== lastCursor) {
    canvas.style.cursor = cursor;
    lastCursor = cursor;
  }
}

let last = performance.now();

function frame(now: number): void {
  // タブ復帰などで時間が飛んでも、1 フレーム 50ms を上限にする
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  render(ctx, game);
  updateCursor();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
