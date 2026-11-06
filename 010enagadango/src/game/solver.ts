// 問題を解くプログラム。すべての置き方を試して、解の数や、でたらめに置いたときの成功率を数える。
// 問題づくりと、README の確認結果（tools/solve.ts）、開発時のコンソール（__solve）で使う。
import { allOrdersOk, initialBoard, isDango, openSlots, overLimit, tiltOf, idx, type Board, type Puzzle } from './rules';

export interface SolveResult {
  /** 最後までとまれて、つり合い、注文もぜんぶかなう置き方の数。 */
  solutions: number;
  /** そのうち、すき間なしのだんごになる数（★★★ が取れる置き方）。 */
  dango: number;
  /** 枝を落とさずに最後まで（または、とまれる場所がなくなるまで）進んだ置き方の数。 */
  leaves: number;
  /** 途中で枝が落ちる置き方の数。 */
  falls: number;
  /** とまれる場所から毎回でたらめに選んだとき、クリアできる確率。 */
  randomClear: number;
  /** 解の一例（鳥ごとの場所）。 */
  example: number[] | null;
  /** だんごになる解の一例。 */
  dangoExample: number[] | null;
}

/** 雪玉を落とす（step から続くぶんを全部）。落ちた結果、枝が落ちたら false。 */
function landSnowballs(p: Puzzle, b: Board, step: number): { step: number; ok: boolean } {
  let s = step;
  while (s < p.queue.length) {
    const a = p.queue[s]!;
    if (a.kind !== 'snowball') break;
    b[idx(p.perSide, a.pos)] = { kind: 'snow', weight: a.weight, ball: true };
    s++;
    if (overLimit(b, p)) return { step: s, ok: false };
  }
  return { step: s, ok: true };
}

export function solve(p: Puzzle): SolveResult {
  const r: SolveResult = { solutions: 0, dango: 0, leaves: 0, falls: 0, randomClear: 0, example: null, dangoExample: null };
  const path: number[] = [];

  /** 戻り値：ここから、でたらめに置いてクリアできる確率。 */
  const go = (b: Board, step: number): number => {
    const landed = landSnowballs(p, b, step);
    if (!landed.ok) {
      r.falls++;
      return 0;
    }
    step = landed.step;
    if (step >= p.queue.length) {
      r.leaves++;
      if (tiltOf(b, p.perSide) === 0 && allOrdersOk(b, p.perSide)) {
        r.solutions++;
        if (r.example === null) r.example = [...path];
        if (isDango(b, p.perSide)) {
          r.dango++;
          if (r.dangoExample === null) r.dangoExample = [...path];
        }
        return 1;
      }
      return 0;
    }
    const a = p.queue[step]!;
    if (a.kind !== 'bird') throw new Error('unreachable');
    const open = openSlots(p, b, step);
    if (open.length === 0) {
      r.leaves++;
      return 0;
    }
    let sum = 0;
    for (const pos of open) {
      const nb = b.slice();
      nb[idx(p.perSide, pos)] = { kind: 'bird', bird: a.bird, order: a.order };
      if (overLimit(nb, p)) {
        r.falls++;
        continue;
      }
      path.push(pos);
      sum += go(nb, step + 1);
      path.pop();
    }
    return sum / open.length;
  };

  r.randomClear = go(initialBoard(p), 0);
  return r;
}
