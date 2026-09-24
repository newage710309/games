// お客さんの列と、案内されて去っていくお客さんを描く。
import { LINE_Y, WIDTH } from './constants';
import type { Guest, Leaver, QueueGuest } from './game';
import { drawAnimal, type Mood } from './guests';
import { pathScale } from './scene';
import { drawDroppedMask, drawSnowGuest } from './snowman';

/** 1 人ぶんの間隔（大きさ 1 のとき）。前の人の頭の上から、うしろの人の頭が少しだけ見える。 */
const STEP_GAP = 13;
/** これより奥（上）のお客さんは描かない（入口の門の向こう）。 */
const HIDE_Y = 150;
const FADE_Y = 172;

// 歩数 → 足元の y の表。手前ほど大きく見えるので、間隔も手前ほど広い。
const RES = 0.05;
const MAX = 30;
const TABLE: number[] = (() => {
  const t = [LINE_Y];
  let y = LINE_Y;
  for (let i = 1; i <= MAX / RES; i++) {
    y -= STEP_GAP * pathScale(y) * RES;
    t.push(y);
  }
  return t;
})();

/** 受付の線から k 人ぶん手前の、足元の y。 */
export function stepY(k: number): number {
  const f = Math.max(0, Math.min(MAX, k)) / RES;
  const i = Math.floor(f);
  const a = TABLE[i]!;
  const b = TABLE[Math.min(TABLE.length - 1, i + 1)]!;
  return a + (b - a) * (f - i);
}

/** 列の中での横ずれ（id で左右交互）。先頭に近づくほど真ん中へ。 */
function queueX(id: number, k: number): number {
  const y = stepY(k);
  const toCenter = Math.max(0, Math.min(1, k - 0.6));
  return WIDTH / 2 + (id % 2 ? -1 : 1) * 3 * pathScale(y) * toCenter;
}

export interface DrawGuestOptions {
  scale: number;
  hop?: number;
  mood?: Mood;
  alpha?: number;
  rotate?: number;
  sweat?: boolean;
  unmasked?: boolean;
  shadow?: boolean;
}

export function drawGuest(ctx: CanvasRenderingContext2D, g: Guest, x: number, y: number, o: DrawGuestOptions): void {
  if (g.type === 'animal') {
    drawAnimal(ctx, x, y, g.kind, {
      scale: o.scale,
      hop: o.hop ?? 0,
      mood: o.mood ?? 'normal',
      alpha: o.alpha ?? 1,
      shadow: o.shadow ?? true
    });
  } else {
    drawSnowGuest(ctx, x, y, g.disguise, {
      scale: o.scale,
      hop: o.hop ?? 0,
      alpha: o.alpha ?? 1,
      rotate: o.rotate ?? 0,
      sweat: o.sweat ?? false,
      unmasked: o.unmasked ?? false,
      shadow: o.shadow ?? true
    });
  }
}

/**
 * 列を奥から順に描く（手前の人が、うしろの人の体をかくす）。
 * walked は列が歩いた量（跳ねる動きの位相）、moving が false なら止まっている。
 * waiting は先頭が待ちくたびれた顔（時間切れ）。
 */
export function drawQueue(
  ctx: CanvasRenderingContext2D,
  queue: readonly QueueGuest[],
  front: number,
  walked: number,
  moving: boolean,
  waiting = false
): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i]!;
    const k = front + i;
    const y = stepY(k);
    if (y < HIDE_Y) continue;
    const alpha = Math.min(1, (y - HIDE_Y) / (FADE_Y - HIDE_Y));
    const hop = moving ? (walked * 1.6 + q.id * 0.37) % 1 : 0;
    drawGuest(ctx, q.guest, queueX(q.id, k), y, {
      scale: pathScale(y),
      hop,
      alpha,
      mood: waiting && i === 0 ? 'puzzled' : 'normal'
    });
  }
}

const ease = (v: number): number => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** 去っていくお客さんを描く。まちがえた向きのときは、途中で止まって「？」やお面がはがれる。 */
export function drawLeaver(ctx: CanvasRenderingContext2D, l: Leaver): void {
  const x0 = queueX(l.id, l.steps);
  const y0 = stepY(l.steps);
  const s0 = pathScale(y0);
  const g = l.guest;

  if (l.dir === 'up') {
    if (g.type === 'snow') {
      // ぽーんと空へはじかれて、入口の向こうへ落ちていく
      const t = l.t;
      const x = x0 + t * 90;
      const y = y0 - t * 560 + t * t * 260;
      const scale = s0 * Math.max(0.35, 1 - t * 0.7);
      if (y < 20) return;
      drawGuest(ctx, g, x, y, { scale, rotate: t * 7, sweat: true, shadow: false, alpha: Math.max(0, 1 - Math.max(0, t - 0.9) * 3) });
      return;
    }
    // 動物を追い返そうとした：少し下がって「？」
    const back = ease(l.t / 0.4);
    drawGuest(ctx, g, x0, y0 - back * 18, { scale: s0, mood: 'puzzled' });
    return;
  }

  const side = l.dir === 'left' ? -1 : 1;
  if (l.correct) {
    // 会場の門へ跳ねながら向かう
    const t = l.t;
    const x = x0 + side * t * 280;
    const y = y0 - ease(t / 0.8) * 70;
    drawGuest(ctx, g, x, y, { scale: pathScale(y), hop: (t * 3) % 1, mood: 'happy' });
    return;
  }
  // まちがえた会場へ向かいかけて止まる
  const go = ease(l.t / 0.6);
  const x = x0 + side * go * 120;
  const y = y0 - go * 30;
  const unmasked = g.type === 'snow' && l.t > 0.7;
  drawGuest(ctx, g, x, y, {
    scale: pathScale(y),
    hop: l.t < 0.6 ? (l.t * 3) % 1 : 0,
    mood: 'puzzled',
    unmasked,
    sweat: unmasked
  });
  // はがれたお面が落ちる
  if (g.type === 'snow' && l.t > 0.7) {
    const ft = Math.min(1, (l.t - 0.7) / 0.5);
    const s = pathScale(y);
    drawDroppedMask(ctx, x + side * 26 * s * ft, y - 30 * s + 28 * s * ft, g.disguise, s, side * ft * 1.4);
  }
}
