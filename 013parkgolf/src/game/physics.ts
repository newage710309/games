// ボールの転がり。乱数は使わず、いつも 1/120 秒きざみで同じ計算をするので、同じ打ち方なら毎回同じ結果になる
// （動くものは雪だるまだけで、雪だるまの位置もホールの時計だけで決まる）。

import { BALL_R, CUP_R } from './constants';
import {
  KAMAKURA_R,
  SNOWMAN_R,
  TUNNEL_IN_R,
  slopeAt,
  snowmanPos,
  surfaceAt,
  type Hole,
  type Surface
} from './course';

/** 1 歩の時間（秒）。 */
export const STEP = 1 / 120;
/** 思いきり打ったときの速さ（px/秒）。 */
export const V_MAX = 345;
/** これより遅くカップに来れば入る（px/秒）。速いとカップのふちで曲がって、少し遅くなる。 */
export const CAPTURE_SPEED = 80;

/** 地面ごとの転がりにくさ（減速、px/秒²）。 */
export const FRICTION: Record<Surface, number> = {
  fairway: 92,
  bridge: 92,
  rough: 250,
  leaves: 620,
  snow: 560,
  ice: 20,
  water: 0,
  ob: 0
};
/** 速さに比例する減速（1/秒）。速い球が伸びすぎないように。 */
const DRAG = 0.18;
/** はね返りの強さ。 */
const BOUNCE = 0.62;

// --- 地面の下調べ（2px のます目ごとに、地面の種類と坂を覚えておく） --------------------------

const CELL = 2;
const SURF_CODE: Surface[] = ['fairway', 'rough', 'water', 'ob', 'leaves', 'snow', 'ice', 'bridge'];

interface Grid {
  w: number;
  h: number;
  surf: Int8Array;
  /** 坂の組み合わせの番号（-1 = まだ調べていない）。 */
  slope: Int16Array;
  slopes: { ax: number; ay: number }[];
  slopeKey: Map<string, number>;
}

const grids = new WeakMap<Hole, Grid>();

function gridOf(hole: Hole): Grid {
  let g = grids.get(hole);
  if (!g) {
    const w = Math.ceil(480 / CELL) + 1;
    const h = Math.ceil(hole.h / CELL) + 1;
    g = { w, h, surf: new Int8Array(w * h).fill(-1), slope: new Int16Array(w * h).fill(-1), slopes: [], slopeKey: new Map() };
    grids.set(hole, g);
  }
  return g;
}

/** (x, y) の地面（ます目のまん中で調べた結果を覚えておく）。 */
export function surfAt(hole: Hole, x: number, y: number): Surface {
  if (x < 0 || x > 480 || y < 0 || y > hole.h) return 'ob';
  const g = gridOf(hole);
  const i = Math.floor(x / CELL);
  const j = Math.floor(y / CELL);
  const k = j * g.w + i;
  let c = g.surf[k]!;
  if (c < 0) {
    c = SURF_CODE.indexOf(surfaceAt(hole, (i + 0.5) * CELL, (j + 0.5) * CELL));
    g.surf[k] = c;
  }
  return SURF_CODE[c]!;
}

function slopeOf(hole: Hole, x: number, y: number): { ax: number; ay: number } {
  if (hole.slopes.length === 0 || x < 0 || x > 480 || y < 0 || y > hole.h) return { ax: 0, ay: 0 };
  const g = gridOf(hole);
  const i = Math.floor(x / CELL);
  const j = Math.floor(y / CELL);
  const k = j * g.w + i;
  let c = g.slope[k]!;
  if (c < 0) {
    const s = slopeAt(hole, (i + 0.5) * CELL, (j + 0.5) * CELL);
    const key = `${s.ax.toFixed(3)},${s.ay.toFixed(3)}`;
    let n = g.slopeKey.get(key);
    if (n === undefined) {
      n = g.slopes.length;
      g.slopes.push(s);
      g.slopeKey.set(key, n);
    }
    g.slope[k] = n;
    c = n;
  }
  return g.slopes[c]!;
}

/** ボールが止まっていられる地面か（水・コースの外でない）。 */
export const playable = (s: Surface): boolean => s !== 'water' && s !== 'ob';

// --- 転がり --------------------------------------------------------------------------

export type BallEvent = 'tree' | 'rock' | 'snowman' | 'root' | 'tunnel' | 'lip' | 'water' | 'ob' | 'cup' | 'kamakura';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 転がった量（ボールのしるしを回すのに使う）。 */
  roll: number;
  /** 水・OB に入る手前の、最後に止まっていられた位置。 */
  safeX: number;
  safeY: number;
  /** トンネルを出たばかり（すぐまた入らないように）。 */
  tunnelCool: number;
  /** 転がりはじめてからの時間。 */
  t: number;
  done: null | 'stop' | 'cup' | 'water' | 'ob';
}

export function newBall(x: number, y: number): Ball {
  return { x, y, vx: 0, vy: 0, roll: 0, safeX: x, safeY: y, tunnelCool: 0, t: 0, done: null };
}

/** 打つ（aim の向きへ、強さ power 0..1）。 */
export function launch(b: Ball, aim: number, power: number): void {
  const v = V_MAX * Math.max(0, Math.min(1, power));
  b.vx = Math.cos(aim) * v;
  b.vy = Math.sin(aim) * v;
  b.t = 0;
  b.done = null;
  b.safeX = b.x;
  b.safeY = b.y;
}

/** 線分 (ax,ay)-(bx,by) と (cx,cy)-(dx,dy) が交わるか。 */
function crosses(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** 円 (cx, cy, r) に当たっていたら、外へ押し出してはね返す。当たったら true。 */
function bounceCircle(b: Ball, cx: number, cy: number, r: number, mvx = 0, mvy = 0): boolean {
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  const R = r + BALL_R;
  if (d >= R || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  b.x = cx + nx * R;
  b.y = cy + ny * R;
  // 相手が動いているときは、相手から見た速さではね返す
  const rvx = b.vx - mvx;
  const rvy = b.vy - mvy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    b.vx = rvx - (1 + BOUNCE) * vn * nx + mvx;
    b.vy = rvy - (1 + BOUNCE) * vn * ny + mvy;
  }
  return true;
}

const rimOK = (hole: Hole, x: number, y: number): boolean => {
  // ボールのまわりも止まっていられる地面なら、安全な位置として覚える
  const r = BALL_R + 3;
  return (
    playable(surfAt(hole, x, y)) &&
    playable(surfAt(hole, x + r, y)) &&
    playable(surfAt(hole, x - r, y)) &&
    playable(surfAt(hole, x, y + r)) &&
    playable(surfAt(hole, x, y - r))
  );
};

/**
 * 1 歩すすめる。clock はホールの時計（雪だるまの位置を決める）。
 * 起きたこと（木に当たった・池に落ちた など）を events に入れる。
 */
export function stepBall(hole: Hole, b: Ball, clock: number, events?: BallEvent[]): void {
  if (b.done) return;
  const dt = STEP;
  b.t += dt;
  if (b.tunnelCool > 0) b.tunnelCool -= dt;
  const surf = surfAt(hole, b.x, b.y);
  const sl = slopeOf(hole, b.x, b.y);
  // 坂
  b.vx += sl.ax * dt;
  b.vy += sl.ay * dt;
  // 減速
  const sp = Math.hypot(b.vx, b.vy);
  const fr = surf === 'fairway' ? FRICTION.fairway * (hole.fairwayDrag ?? 1) : FRICTION[surf];
  if (sp > 0) {
    const dec = (fr + DRAG * sp) * dt;
    const k = Math.max(0, sp - dec) / sp;
    b.vx *= k;
    b.vy *= k;
  }
  const px = b.x;
  const py = b.y;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.roll += (Math.hypot(b.vx, b.vy) * dt) / BALL_R;

  // 木の根：横切ると向きが少し変わり、少し遅くなる
  for (const r of hole.roots) {
    if (crosses(px, py, b.x, b.y, r.x1, r.y1, r.x2, r.y2)) {
      const c = Math.cos(r.turn);
      const s = Math.sin(r.turn);
      const vx = b.vx * c - b.vy * s;
      const vy = b.vx * s + b.vy * c;
      b.vx = vx * 0.84;
      b.vy = vy * 0.84;
      events?.push('root');
    }
  }
  // 木・岩・切り株
  for (const o of hole.obstacles) {
    if (bounceCircle(b, o.x, o.y, o.r)) events?.push(o.k === 'tree' ? 'tree' : 'rock');
  }
  // 雪だるま（動いている）
  for (const sm of hole.snowmen) {
    const p = snowmanPos(sm, clock);
    const q = snowmanPos(sm, clock + dt);
    if (bounceCircle(b, p.x, p.y, SNOWMAN_R, (q.x - p.x) / dt, (q.y - p.y) / dt)) events?.push('snowman');
  }
  // かまくら：入口の穴に入ればトンネル、それ以外の所ははね返る
  for (const tn of hole.tunnels) {
    const hx = tn.ix + Math.cos(tn.face) * KAMAKURA_R * 0.78;
    const hy = tn.iy + Math.sin(tn.face) * KAMAKURA_R * 0.78;
    if (b.tunnelCool <= 0 && Math.hypot(b.x - hx, b.y - hy) < TUNNEL_IN_R) {
      const v = Math.max(Math.hypot(b.vx, b.vy) * 0.9, 110);
      const ox = tn.ox + Math.cos(tn.dir) * (KAMAKURA_R * 0.8 + BALL_R + 2);
      const oy = tn.oy + Math.sin(tn.dir) * (KAMAKURA_R * 0.8 + BALL_R + 2);
      b.x = ox;
      b.y = oy;
      b.vx = Math.cos(tn.dir) * v;
      b.vy = Math.sin(tn.dir) * v;
      b.tunnelCool = 0.5;
      events?.push('tunnel');
      continue;
    }
    if (bounceCircle(b, tn.ix, tn.iy, KAMAKURA_R - 2)) events?.push('kamakura');
    if (bounceCircle(b, tn.ox, tn.oy, KAMAKURA_R * 0.8 - 2)) events?.push('kamakura');
  }

  // カップ
  const cdx = hole.cup.x - b.x;
  const cdy = hole.cup.y - b.y;
  const cd = Math.hypot(cdx, cdy);
  const speed = Math.hypot(b.vx, b.vy);
  if (cd < CUP_R - 2) {
    if (speed < CAPTURE_SPEED) {
      b.x = hole.cup.x;
      b.y = hole.cup.y;
      b.vx = 0;
      b.vy = 0;
      b.done = 'cup';
      events?.push('cup');
      return;
    }
  }
  if (cd < CUP_R && speed >= CAPTURE_SPEED && cd > 0) {
    // 速すぎ：カップのふちで、カップのほうへ少し曲がって遅くなる
    b.vx = b.vx * 0.99 + (cdx / cd) * 2.2;
    b.vy = b.vy * 0.99 + (cdy / cd) * 2.2;
    if (!events?.includes('lip')) events?.push('lip');
  }

  // 水・コースの外
  const now = surfAt(hole, b.x, b.y);
  if (now === 'water' || now === 'ob') {
    b.done = now;
    events?.push(now);
    b.x = b.safeX;
    b.y = b.safeY;
    b.vx = 0;
    b.vy = 0;
    return;
  }
  if (rimOK(hole, b.x, b.y)) {
    b.safeX = b.x;
    b.safeY = b.y;
  }

  // 止まる：遅くなって、坂の引っぱりが地面の転がりにくさに負けたら
  const sp2 = Math.hypot(b.vx, b.vy);
  const sg = Math.hypot(sl.ax, sl.ay);
  const frNow = now === 'fairway' ? FRICTION.fairway * (hole.fairwayDrag ?? 1) : FRICTION[now];
  if ((sp2 < 4 && sg < frNow * 0.4) || b.t > 30) {
    b.vx = 0;
    b.vy = 0;
    b.done = 'stop';
  }
}

/** 止まるまで一気に転がす（ボットの読みと確認用）。 */
export function simulate(
  hole: Hole,
  x: number,
  y: number,
  aim: number,
  power: number,
  clock: number,
  slopeScale = 1
): Ball {
  const b = newBall(x, y);
  launch(b, aim, power);
  let c = clock;
  if (slopeScale === 1) {
    while (!b.done) {
      stepBall(hole, b, c);
      c += STEP;
    }
    return b;
  }
  // 坂の読みちがい：坂を slopeScale 倍に感じているつもりで転がす
  const fake: Hole = { ...hole, slopes: hole.slopes.map((s) => ({ ...s, g: s.g * slopeScale })) };
  const key = fakeKey(hole, slopeScale);
  const cached = fakeHoles.get(key);
  const h2 = cached ?? fake;
  if (!cached) fakeHoles.set(key, fake);
  while (!b.done) {
    stepBall(h2, b, c);
    c += STEP;
  }
  return b;
}

const fakeHoles = new Map<string, Hole>();
const holeIds = new WeakMap<Hole, number>();
let nextId = 1;
function fakeKey(hole: Hole, s: number): string {
  let id = holeIds.get(hole);
  if (id === undefined) {
    id = nextId++;
    holeIds.set(hole, id);
  }
  return `${id}:${s.toFixed(2)}`;
}
