// ます目の決まりごと（くっつき判定・落下・雪だるまの溶け）。描画やタイマーは持たない。
// ゲーム本体と自動プレイのボットの両方から使う。
import { isAnimal, type Grid, type Piece } from './board';
import { COLS, ROWS } from './constants';
import type { AnimalKind } from './guests';

/** これだけくっつくと消える。 */
export const GROUP_MIN = 4;

export type Cell = [number, number];

export interface Group {
  kind: AnimalKind;
  cells: Cell[];
}

export const emptyGrid = (): Grid => Array.from({ length: ROWS }, () => Array<Piece | null>(COLS).fill(null));
export const cloneGrid = (g: Grid): Grid => g.map((row) => row.slice());

const DIRS: Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

/** 同じ動物が上下左右に GROUP_MIN 匹以上つながっているかたまりを、ぜんぶ探す。 */
export function findGroups(grid: Grid): Group[] {
  const seen = grid.map((row) => row.map(() => false));
  const groups: Group[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = grid[r][c];
      if (seen[r][c] || !isAnimal(p)) continue;
      const cells: Cell[] = [];
      const stack: Cell[] = [[r, c]];
      seen[r][c] = true;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        cells.push([cr, cc]);
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || seen[nr][nc] || grid[nr][nc] !== p) continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      if (cells.length >= GROUP_MIN) groups.push({ kind: p, cells });
    }
  }
  return groups;
}

/** 消えるかたまりのとなりにいる雪だるま（重なりなし）。 */
export function meltTargets(grid: Grid, groups: Group[]): Cell[] {
  const out = new Map<string, Cell>();
  for (const g of groups) {
    for (const [r, c] of g.cells) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const p = grid[nr][nc];
        if (p === 'snow' || p === 'bigsnow') out.set(`${nr},${nc}`, [nr, nc]);
      }
    }
  }
  return [...out.values()];
}

/** かたまりを消して、となりの雪だるまを溶かす（おおきい雪だるまはふつうの雪だるまになる）。 */
export function removeGroups(grid: Grid, groups: Group[], melts: Cell[]): void {
  for (const g of groups) for (const [r, c] of g.cells) grid[r][c] = null;
  for (const [r, c] of melts) grid[r][c] = grid[r][c] === 'bigsnow' ? 'snow' : null;
}

export interface Fall {
  col: number;
  piece: Piece;
  from: number;
  to: number;
}

/** 浮いているものを下まで落とす。動いたものの一覧を返す（grid は書きかわる）。 */
export function applyGravity(grid: Grid): Fall[] {
  const falls: Fall[] = [];
  for (let c = 0; c < COLS; c++) {
    let to = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const p = grid[r][c];
      if (p === null) continue;
      if (r !== to) {
        grid[to][c] = p;
        grid[r][c] = null;
        falls.push({ col: c, piece: p, from: r, to });
      }
      to--;
    }
  }
  return falls;
}

/** その列でいちばん下の空いている段（いっぱいなら -1）。 */
export function landingRow(grid: Grid, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (grid[r][col] === null) return r;
  return -1;
}

/** 2 匹の組の、軸に対するもう 1 匹の位置。rot 0 = 上、1 = 右、2 = 下、3 = 左。 */
export const CHILD_OFFSET: readonly Cell[] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1]
];

export interface Resolve {
  /** 消した動物の数。 */
  cleared: number;
  /** れんさの数（消えなければ 0）。 */
  chains: number;
  /** 溶かした回数。 */
  melted: number;
  score: number;
}

/**
 * 組を (col, rot) で落としたあと、れんさが終わるまで進める（ボット用。grid は書きかわる）。
 * 置けなければ null。
 */
export function dropAndResolve(
  grid: Grid,
  axis: Piece,
  child: Piece,
  col: number,
  rot: number,
  scoreOf: (cleared: number, kinds: number, chain: number) => number
): Resolve | null {
  const [, dc] = CHILD_OFFSET[rot];
  const cc = col + dc;
  if (col < 0 || col >= COLS || cc < 0 || cc >= COLS) return null;
  if (dc === 0) {
    const r = landingRow(grid, col);
    if (r < 0) return null;
    const lower = rot === 2 ? child : axis;
    const upper = rot === 2 ? axis : child;
    grid[r][col] = lower;
    if (r - 1 >= 0) grid[r - 1][col] = upper;
  } else {
    const ra = landingRow(grid, col);
    const rc = landingRow(grid, cc);
    if (ra < 0 || rc < 0) return null;
    grid[ra][col] = axis;
    grid[rc][cc] = child;
  }
  return resolveAll(grid, scoreOf);
}

/** 消えるものがなくなるまで、消す → 落とす をくり返す。 */
export function resolveAll(grid: Grid, scoreOf: (cleared: number, kinds: number, chain: number) => number): Resolve {
  const res: Resolve = { cleared: 0, chains: 0, melted: 0, score: 0 };
  for (;;) {
    const groups = findGroups(grid);
    if (groups.length === 0) return res;
    res.chains++;
    const n = groups.reduce((s, g) => s + g.cells.length, 0);
    const kinds = new Set(groups.map((g) => g.kind)).size;
    res.cleared += n;
    res.score += scoreOf(n, kinds, res.chains);
    const melts = meltTargets(grid, groups);
    res.melted += melts.length;
    removeGroups(grid, groups, melts);
    applyGravity(grid);
  }
}
