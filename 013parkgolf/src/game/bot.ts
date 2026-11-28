// 自動プレイのボット。打てる向きと強さをいくつも試し（転がりの計算をそのまま使う）、カップへの道のりがいちばん短くなる
// 打ち方を選ぶ。腕前は「向きのずれ」「強さのずれ」「坂の読みちがい（坂を何倍に感じるか）」で分ける（tools/bot.ts から使う）。

import { BALL_R } from './constants';
import { KAMAKURA_R, type Hole } from './course';
import type { Game } from './game';
import { playable, simulate, surfAt, type Ball } from './physics';

export interface BotSkill {
  name: string;
  /** 向きのずれ（度、標準偏差）。 */
  aimDeg: number;
  /** 強さのずれ（割合、標準偏差）。 */
  powerErr: number;
  /** 坂を何倍に感じるか（1 = 正しく読める、0 = 坂がないと思う）。 */
  slopeRead: number;
  /** 毎回思いきり打つ。 */
  bigOnly?: boolean;
  /** 打つまでに考える時間（秒、雪だるまの位置が変わる）。 */
  think: number;
}

export const SKILLS: BotSkill[] = [
  { name: 'はじめて', aimDeg: 5, powerErr: 0.12, slopeRead: 0.2, think: 1.5 },
  { name: 'ふつう', aimDeg: 2.5, powerErr: 0.07, slopeRead: 0.6, think: 1 },
  { name: 'じょうず', aimDeg: 1.2, powerErr: 0.04, slopeRead: 0.9, think: 0.6 }
];

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- カップまでの道のり（8px のます目、通れない所をよけた最短距離） -------------------------------

const G = 8;
const distCache = new WeakMap<Hole, Float64Array>();

function distField(hole: Hole): Float64Array {
  const hit = distCache.get(hole);
  if (hit) return hit;
  const w = Math.ceil(480 / G) + 1;
  const h = Math.ceil(hole.h / G) + 1;
  const n = w * h;
  const pass = new Uint8Array(n);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = i * G;
      const y = j * G;
      let ok = playable(surfAt(hole, x, y));
      for (const o of hole.obstacles) if (Math.hypot(x - o.x, y - o.y) < o.r + BALL_R) ok = false;
      for (const tn of hole.tunnels) {
        if (Math.hypot(x - tn.ix, y - tn.iy) < KAMAKURA_R) ok = false;
        if (Math.hypot(x - tn.ox, y - tn.oy) < KAMAKURA_R * 0.8) ok = false;
      }
      pass[j * w + i] = ok ? 1 : 0;
    }
  const dist = new Float64Array(n).fill(Infinity);
  const idx = (x: number, y: number): number => Math.round(y / G) * w + Math.round(x / G);
  // トンネル：出口に着く道のり ＝ 入口の道のり
  const links = new Map<number, number>();
  for (const tn of hole.tunnels) {
    const ox = tn.ox + Math.cos(tn.dir) * (KAMAKURA_R * 0.8 + 10);
    const oy = tn.oy + Math.sin(tn.dir) * (KAMAKURA_R * 0.8 + 10);
    const ix = tn.ix + Math.cos(tn.face) * (KAMAKURA_R + 10);
    const iy = tn.iy + Math.sin(tn.face) * (KAMAKURA_R + 10);
    links.set(idx(ox, oy), idx(ix, iy));
  }
  // ダイクストラ（ます目が少ないので、かんたんな二分ヒープ）
  const heap: [number, number][] = [];
  const push = (d: number, k: number): void => {
    heap.push([d, k]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p]![0] <= heap[c]![0]) break;
      [heap[p], heap[c]] = [heap[c]!, heap[p]!];
      c = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
        if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c]!, heap[m]!];
        c = m;
      }
    }
    return top;
  };
  const start = idx(hole.cup.x, hole.cup.y);
  dist[start] = 0;
  push(0, start);
  const nb = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2]
  ] as const;
  while (heap.length) {
    const [d, k] = pop();
    if (d > dist[k]!) continue;
    const i = k % w;
    const j = (k - i) / w;
    for (const [di, dj, c] of nb) {
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue;
      const kk = jj * w + ii;
      if (!pass[kk]) continue;
      const nd = d + c * G;
      if (nd < dist[kk]!) {
        dist[kk] = nd;
        push(nd, kk);
      }
    }
    const link = links.get(k);
    if (link !== undefined && d < dist[link]!) {
      dist[link] = d;
      push(d, link);
    }
  }
  distCache.set(hole, dist);
  return dist;
}

/** (x, y) からカップまでの道のり。 */
export function pathDist(hole: Hole, x: number, y: number): number {
  const d = distField(hole);
  const w = Math.ceil(480 / G) + 1;
  let best = Infinity;
  // 近くのます目のうち、いちばん近いもの（ます目の境目でとぎれないように）
  for (const [dx, dy] of [
    [0, 0],
    [G, 0],
    [-G, 0],
    [0, G],
    [0, -G]
  ] as const) {
    const i = Math.round((x + dx) / G);
    const j = Math.round((y + dy) / G);
    const v = d[j * w + i];
    if (v !== undefined && v + Math.hypot(dx, dy) < best) best = v + Math.hypot(dx, dy);
  }
  return best === Infinity ? 2000 : best;
}

/** 打ったあとの位置の悪さ（小さいほどよい）。 */
function cost(hole: Hole, b: Ball): number {
  if (b.done === 'cup') return -1000;
  let c = pathDist(hole, b.x, b.y);
  if (b.done === 'water' || b.done === 'ob') c += 520;
  const s = surfAt(hole, b.x, b.y);
  if (s === 'rough') c += 50;
  else if (s === 'snow') c += 70;
  return c;
}

export interface Plan {
  aim: number;
  power: number;
  cost: number;
}

/** いちばんよさそうな打ち方を探す。 */
export function planShot(hole: Hole, x: number, y: number, clock: number, skill: BotSkill): Plan {
  const read = skill.slopeRead;
  const powers: number[] = [];
  if (skill.bigOnly) powers.push(1);
  else for (let p = 0.12; p <= 1.0001; p += 0.08) powers.push(Math.min(1, p));
  const cands: Plan[] = [];
  const N = 64;
  for (let a = 0; a < N; a++) {
    const aim = (a / N) * Math.PI * 2 - Math.PI;
    for (const power of powers) {
      const b = simulate(hole, x, y, aim, power, clock, read);
      cands.push({ aim, power, cost: cost(hole, b) });
    }
  }
  cands.sort((p, q) => p.cost - q.cost);
  // よかったものの近くを、こまかく調べなおす
  let best = cands[0]!;
  const seen = new Set<string>();
  for (const c of cands.slice(0, 3)) {
    for (let da = -4; da <= 4; da += 1) {
      const pw = skill.bigOnly ? [0] : [-0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06];
      for (const dp of pw) {
        const aim = c.aim + (da * Math.PI) / 180;
        const power = Math.max(0.05, Math.min(1, c.power + dp));
        const key = `${aim.toFixed(3)}:${power.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const b = simulate(hole, x, y, aim, power, clock, read);
        // ずれたときにも大きく悪くならない打ち方を選ぶため、少しずらした打ち方の平均も見る
        const b2 = simulate(hole, x, y, aim + 0.02, power * 1.03, clock, read);
        const b3 = simulate(hole, x, y, aim - 0.02, power * 0.97, clock, read);
        const cc = cost(hole, b) * 0.5 + (cost(hole, b2) + cost(hole, b3)) * 0.25;
        if (cc < best.cost) best = { aim, power, cost: cc };
      }
    }
  }
  return best;
}

export class Bot {
  private rng: () => number;
  private wait = 0;

  constructor(
    readonly skill: BotSkill,
    seed: number
  ) {
    this.rng = makeRng(seed);
  }

  private gauss(): number {
    const u = Math.max(1e-9, this.rng());
    const v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** 打つ画面のときに毎フレーム呼ぶ。 */
  step(game: Game, dt: number): void {
    if (game.phase !== 'aim') {
      this.wait = 0;
      return;
    }
    this.wait += dt;
    if (this.wait < this.skill.think) return;
    const plan = planShot(game.hole, game.ball.x, game.ball.y, game.clock, this.skill);
    const aim = plan.aim + ((this.gauss() * this.skill.aimDeg) * Math.PI) / 180;
    const power = Math.max(0.05, Math.min(1, plan.power * (1 + this.gauss() * this.skill.powerErr)));
    game.shoot(aim, power);
    this.wait = 0;
  }
}
