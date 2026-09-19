import './style.css';
import { HEIGHT, WIDTH } from './game/constants';
import { validateLanes } from './game/level';
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
 * 描画倍率の上限。大画面 × 高 DPI だと実ピクセルが数千万になり毎フレームの描画が重くなるので、
 * 論理サイズ（520×600）の 3.5 倍（約 1820×2100）で頭打ちにする。これ以上は引き伸ばしで表示する。
 */
const MAX_RENDER_SCALE = 3.5;

/**
 * 実ピクセル数を「画面上の表示サイズ × DPI」に合わせる。
 * 盤面はウィンドウに合わせて拡大表示するので、論理サイズのまま描くと引き伸ばされてぼやける。
 * ゲームの座標は常に 520×600 のまま、setTransform で倍率だけを掛ける。
 */
function resizeBackingStore(): void {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || WIDTH;
  const scale = Math.min((cssWidth * dpr) / WIDTH, MAX_RENDER_SCALE);
  const w = Math.round(WIDTH * scale);
  const h = Math.round(HEIGHT * scale);
  // 大きさが変わらないときは作り直さない（width の再設定で中身が消えるため）。
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

resizeBackingStore();
// 表示サイズの変化はウィンドウ以外（アドレスバーの出入り、D-Pad の表示切り替えなど）でも起きる。
new ResizeObserver(resizeBackingStore).observe(canvas);
// ブラウザのズームで DPI だけが変わった場合に備えて、ウィンドウのリサイズでも更新する。
window.addEventListener('resize', resizeBackingStore);

const audio = new Audio();
const game = new Game(audio);

const muteButton = document.querySelector<HTMLElement>('#pad [data-action="mute"]');

attachInput(canvas, {
  onMove: (dir) => game.move(dir),
  onAction: (action) => {
    if (action === 'start') {
      game.action();
    } else if (action === 'pause') {
      game.togglePause();
    } else if (action === 'mute') {
      const muted = audio.toggleMute();
      if (muteButton !== null) muteButton.textContent = muted ? '🔇' : '🔊';
    }
  },
  onAnyInput: () => audio.unlock()
});

// タブが非表示になったら自動でポーズ（復帰時の大ジャンプ防止も兼ねる）。
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') game.togglePause();
});

if (import.meta.env.DEV) {
  const errors = validateLanes();
  if (errors.length > 0) console.warn('レーン定義の折り返し幅が不足しています:', errors);
  // 開発時のみ、コンソールから状態を覗けるようにしておく。
  (window as unknown as { __game: Game }).__game = game;
}

let last = performance.now();

function frame(now: number): void {
  // タブ復帰などで一気に時間が飛んでも、1 フレーム 50ms を上限にして
  // 当たり判定のすり抜けを防ぐ。
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  game.update(dt);
  render(ctx, game);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
