import './style.css';
import { Game } from './game/game';
import { AudioManager } from './game/audio';
import { render } from './game/render';
import { attachInput } from './game/input';
import { resizeBackingStore } from './game/device';
import { WIDTH, HEIGHT } from './game/constants';
import { Bot, SKILLS, type SkillName } from './game/bot';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const game = new Game(new AudioManager());
let bot: Bot | undefined;
let last = performance.now();
attachInput(canvas, game);
const resize = (): void => resizeBackingStore(canvas);
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize', resize);
resize();
document.querySelector<HTMLAnchorElement>('.to-menu')?.addEventListener('click', event => {
  if (!confirm('ゲーム一覧にもどりますか？')) event.preventDefault();
});
function draw(): void {
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  render(ctx, game);
}
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  bot?.update(dt);
  game.update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.DEV) {
  Object.assign(window, {
    __game: game, __render: draw, __Bot: Bot, __SKILLS: SKILLS,
    __autoplay: (skill: SkillName = 'ふつう', seed = 1) => { game.startRun(seed); bot = new Bot(game, skill); return bot; },
    __stopAutoplay: () => { bot = undefined; game.hold = -1; }
  });
}
