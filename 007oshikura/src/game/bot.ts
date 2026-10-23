// 自動プレイのボット（開発時に難しさを測るためだけに使う。ゲーム本体からは読みこまない）。
// 置き場所をぜんぶ試して、消える数・れんさ・くっつき具合・高さで点をつけ、いちばんよい所へ動かす。
import { isAnimal, type Grid, type Piece } from './board';
import { COLS, ROWS, SPAWN_COL } from './constants';
import { scoreOf, type Game, type Rand } from './game';
import { CHILD_OFFSET, cloneGrid, dropAndResolve } from './logic';

export interface Skill {
  /** 新しい組が出てから動かし始めるまでの秒数。 */
  think: number;
  /** 1 秒に何回、移動・回転できるか。 */
  rate: number;
  /** まちがえた所に置く割合（上位 5 か所から適当に選ぶ）。 */
  mistake: number;
  /** つぎの組まで考えるか。 */
  lookahead: boolean;
  /** 置き場所の上に来たら、はやく落とすか。 */
  soft: boolean;
}

export const SKILLS: Record<string, Skill> = {
  じょうず: { think: 0.25, rate: 8, mistake: 0, lookahead: true, soft: true },
  ふつう: { think: 0.6, rate: 5, mistake: 0.1, lookahead: false, soft: true },
  はじめて: { think: 1, rate: 3, mistake: 0.25, lookahead: false, soft: false }
};

interface Plan {
  col: number;
  rot: number;
  value: number;
}

/** 出てくる場所から (col, rot) まで横に動かせるか（とちゅうの列の上 2 段が空いていること）。 */
function reachable(grid: Grid, col: number, rot: number): boolean {
  const [, dc] = CHILD_OFFSET[rot];
  const lo = Math.min(SPAWN_COL, col, col + dc);
  const hi = Math.max(SPAWN_COL, col, col + dc);
  for (let c = lo; c <= hi; c++) if (grid[0][c] !== null || grid[1][c] !== null) return false;
  return true;
}

/** 置いたあとの盤面の良さ。 */
function boardValue(grid: Grid): number {
  let v = 0;
  // 高さ：高い列ほど、出てくる場所に近い列ほど減点
  for (let c = 0; c < COLS; c++) {
    let h = 0;
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] !== null) {
        h = ROWS - r;
        break;
      }
    }
    const near = Math.abs(c - SPAWN_COL) <= 1 ? 2 : 1;
    v -= h * h * 0.6 * near;
    if (h >= ROWS - 2) v -= 400 * near;
  }
  if (grid[0][SPAWN_COL] !== null) v -= 100000;
  // くっつき：2〜3 匹のかたまりを育てる
  const seen = grid.map((row) => row.map(() => false));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = grid[r][c];
      if (!isAnimal(p) || seen[r][c]) continue;
      let n = 0;
      const stack: [number, number][] = [[r, c]];
      seen[r][c] = true;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        n++;
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ] as const) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || seen[nr][nc] || grid[nr][nc] !== p) continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      v += n === 2 ? 6 : n === 3 ? 16 : 0;
    }
  }
  return v;
}

function placements(grid: Grid, axis: Piece, child: Piece, depth: number, next?: [Piece, Piece]): Plan[] {
  const plans: Plan[] = [];
  for (let rot = 0; rot < 4; rot++) {
    // 同じ 2 匹なら、上下・左右を入れかえても同じ
    if (axis === child && rot >= 2) continue;
    for (let col = 0; col < COLS; col++) {
      if (!reachable(grid, col, rot)) continue;
      const g = cloneGrid(grid);
      const res = dropAndResolve(g, axis, child, col, rot, scoreOf);
      if (res === null) continue;
      let value = res.cleared * 25 + res.chains * res.chains * 40 + res.melted * 15 + boardValue(g);
      if (depth > 0 && next !== undefined && g[0][SPAWN_COL] === null) {
        const best = placements(g, next[1], next[0], 0);
        if (best.length > 0) value += Math.max(...best.map((p) => p.value)) * 0.7;
      }
      plans.push({ col, rot, value });
    }
  }
  return plans;
}

/** ゲームを外から動かすボット。毎フレーム step(dt) を呼ぶ。 */
export class Bot {
  private target: Plan | null = null;
  private wait = 0;
  private cool = 0;
  private piece: object | null = null;

  constructor(
    private readonly game: Game,
    private readonly skill: Skill,
    private readonly rand: Rand
  ) {}

  step(dt: number): void {
    const g = this.game;
    if (g.phase !== 'playing' || g.step !== 'fall' || g.active === null) {
      g.setSoft(false);
      return;
    }
    const a = g.active;
    if (a !== this.piece) {
      this.piece = a;
      this.target = null;
      this.wait = this.skill.think;
      g.setSoft(false);
    }
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    if (this.target === null) this.target = this.choose();
    const t = this.target;
    this.cool -= dt;
    if (this.cool > 0) return;
    if (a.rot !== t.rot) {
      g.rotate(t.rot === (a.rot + 3) % 4 ? -1 : 1);
      this.cool = 1 / this.skill.rate;
      return;
    }
    if (a.col !== t.col) {
      g.move(t.col < a.col ? -1 : 1);
      this.cool = 1 / this.skill.rate;
      return;
    }
    if (this.skill.soft) g.setSoft(true);
  }

  private choose(): Plan {
    const g = this.game;
    const a = g.active!;
    const plans = placements(g.grid, a.axis, a.child, this.skill.lookahead ? 1 : 0, g.next);
    if (plans.length === 0) return { col: a.col, rot: a.rot, value: 0 };
    plans.sort((p, q) => q.value - p.value);
    if (this.rand() < this.skill.mistake) return plans[Math.floor(this.rand() * Math.min(5, plans.length))]!;
    return plans[0]!;
  }
}

export interface SimResult {
  /** 何面までクリアしたか（0〜3）。 */
  cleared: number;
  score: number;
  maxChain: number;
}

/** 1 回ぶん遊ぶ。dt ごとにゲームとボットを進める。 */
export function playOnce(game: Game, skill: Skill, rand: Rand, dt = 1 / 30): SimResult {
  const bot = new Bot(game, skill, rand);
  game.start();
  let stage = 0;
  for (let i = 0; i < 200000; i++) {
    bot.step(dt);
    game.update(dt);
    if (game.phase === 'stageClear') stage = Math.max(stage, game.stageIndex + 1);
    if (game.phase === 'gameover' || game.phase === 'result') break;
    if (game.phase === 'demo' || game.phase === 'ending') game.tap(null, null);
  }
  return { cleared: stage, score: game.score, maxChain: game.maxChain };
}
