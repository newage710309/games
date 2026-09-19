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

/** 高 DPI 画面でもぼやけないように実ピクセル数を合わせる。 */
function resizeBackingStore(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(WIDTH * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

resizeBackingStore();
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
