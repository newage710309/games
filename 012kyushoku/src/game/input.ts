import { Game } from './game';
import { potLayout, SERVE_BTN, PAUSE_BTN, type Rect } from './constants';

export const PAUSE_CONTINUE: Rect = { x: 115, y: 245, w: 250, h: 48 };
export const PAUSE_SOUND: Rect = { x: 115, y: 310, w: 250, h: 48 };
export const PAUSE_TITLE: Rect = { x: 115, y: 375, w: 250, h: 48 };
const hit = (x: number, y: number, r: Rect): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function attachInput(canvas: HTMLCanvasElement, game: Game): void {
  const pointers = new Map<number, number>();
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    game.audio.unlock();
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 480 / rect.width;
    const y = (event.clientY - rect.top) * 640 / rect.height;
    if (game.paused) {
      if (hit(x, y, PAUSE_SOUND)) game.audio.toggle();
      else if (hit(x, y, PAUSE_CONTINUE) || hit(x, y, PAUSE_BTN)) game.paused = false;
      else if (hit(x, y, PAUSE_TITLE)) { game.paused = false; game.screen = 'title'; }
      return;
    }
    if (game.screen !== 'play') { game.advance(); return; }
    if (hit(x, y, PAUSE_BTN)) { game.paused = true; game.hold = -1; return; }
    if (hit(x, y, SERVE_BTN)) { game.serve(); return; }
    const pot = potLayout(game.foods.length).findIndex(rectangle => hit(x, y, rectangle));
    if (pot >= 0 && game.hold === -1) { game.press(pot); if (game.hold === pot) pointers.set(event.pointerId, pot); }
  });
  const release = (event: PointerEvent): void => {
    const pot = pointers.get(event.pointerId);
    if (pot !== undefined) { game.release(pot); pointers.delete(event.pointerId); }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  window.addEventListener('keydown', event => {
    game.audio.unlock();
    if (['Space', 'Enter', 'Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'KeyM') { game.audio.toggle(); return; }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (game.screen === 'play' || game.paused) { game.paused = !game.paused; game.hold = -1; }
      return;
    }
    if (game.paused) return;
    if (game.screen !== 'play') { if (event.code === 'Space' || event.code === 'Enter') game.advance(); return; }
    if (event.code === 'Space') game.serve();
    else if (/^Digit[1-4]$/.test(event.code)) game.press(Number(event.code.slice(-1)) - 1);
  });
  window.addEventListener('keyup', event => {
    if (/^Digit[1-4]$/.test(event.code)) game.release(Number(event.code.slice(-1)) - 1);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === 'play') { game.paused = true; game.hold = -1; }
  });
}
