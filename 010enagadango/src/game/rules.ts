// 枝のしくみ（つり合い・注文・だんご・雪玉）。ゲーム本体とソルバーの両方で使う。画面のことは知らない。
import { BIRD_WEIGHT, type BirdKind } from './birds';

/** 鳥の注文。near = 〜のとなりがいい、avoid = 〜のとなりはこわい、edge = はしっこがいい。 */
export type Order = { type: 'near'; who: BirdKind } | { type: 'avoid'; who: BirdKind } | { type: 'edge' };

/** 飛んでくるもの。鳥は場所を選んでとまらせる。雪玉は予告した場所に自動で落ちて、積もった雪になる。 */
export type Arrival = { kind: 'bird'; bird: BirdKind; order?: Order } | { kind: 'snowball'; pos: number; weight: number };

export interface Puzzle {
  /** 片側のとまれる場所の数。 */
  perSide: number;
  /** かたむきの余裕。|かたむき| がこれを超えると枝が落ちる。 */
  limit: number;
  /** はじめから積もっている雪。 */
  snow: { pos: number; weight: number }[];
  /** 飛んでくる順番。 */
  queue: Arrival[];
  /** 問題の最初に出す一言。 */
  hint?: string;
}

/** 枝の上のひとつの場所。 */
export type Cell = null | { kind: 'bird'; bird: BirdKind; order?: Order } | { kind: 'snow'; weight: number; ball?: boolean };

/** 場所 -perSide..perSide を、添え字 0..2*perSide にした配列。真ん中（さくらちゃん用）はいつも null。 */
export type Board = Cell[];

export const idx = (perSide: number, pos: number): number => pos + perSide;

export function initialBoard(p: Puzzle): Board {
  const b: Board = new Array<Cell>(p.perSide * 2 + 1).fill(null);
  for (const s of p.snow) b[idx(p.perSide, s.pos)] = { kind: 'snow', weight: s.weight };
  return b;
}

export function cellWeight(c: Cell): number {
  if (c === null) return 0;
  return c.kind === 'snow' ? c.weight : BIRD_WEIGHT[c.bird];
}

/** かたむき = 右の（重さ × きょり）の合計 − 左の合計。正なら右に傾く。 */
export function tiltOf(b: Board, perSide: number): number {
  let t = 0;
  for (let pos = -perSide; pos <= perSide; pos++) t += cellWeight(b[idx(perSide, pos)]!) * pos;
  return t;
}

/** となりの場所（真ん中はさくらちゃんなので、左右をまたいだ -1 と 1 はとなりではない）。 */
export function neighborsOf(perSide: number, pos: number): number[] {
  const r: number[] = [];
  for (const q of [pos - 1, pos + 1]) {
    if (q === 0 || Math.abs(q) > perSide) continue;
    r.push(q);
  }
  return r;
}

/** pos にいる鳥の注文が、今の枝でかなっているか。注文のない鳥は true。 */
export function orderOk(b: Board, perSide: number, pos: number): boolean {
  const c = b[idx(perSide, pos)];
  if (!c || c.kind !== 'bird' || !c.order) return true;
  const o = c.order;
  if (o.type === 'edge') return Math.abs(pos) === perSide;
  const near = neighborsOf(perSide, pos).some((q) => {
    const n = b[idx(perSide, q)];
    return n !== null && n !== undefined && n.kind === 'bird' && n.bird === o.who;
  });
  return o.type === 'near' ? near : !near;
}

export function allOrdersOk(b: Board, perSide: number): boolean {
  for (let pos = -perSide; pos <= perSide; pos++) if (!orderOk(b, perSide, pos)) return false;
  return true;
}

/**
 * すき間なしの「だんご」か。左右それぞれ、いちばん外の鳥より内側に空いた場所がないこと。
 * 積もった雪はすき間を埋めるものとして数える（雪の外側の空きは気にしない）。
 */
export function isDango(b: Board, perSide: number): boolean {
  for (const s of [-1, 1]) {
    let outer = 0;
    for (let k = 1; k <= perSide; k++) {
      const c = b[idx(perSide, s * k)];
      if (c && c.kind === 'bird') outer = k;
    }
    for (let k = 1; k < outer; k++) if (b[idx(perSide, s * k)] === null) return false;
  }
  return true;
}

/** step 番目以降に来る雪玉の場所（予約されていて、鳥はとまれない）。 */
export function reservedFrom(p: Puzzle, step: number): Set<number> {
  const s = new Set<number>();
  for (let i = step; i < p.queue.length; i++) {
    const a = p.queue[i]!;
    if (a.kind === 'snowball') s.add(a.pos);
  }
  return s;
}

/** 今の鳥がとまれる場所（空いていて、真ん中ではなく、雪玉の予約もない）。 */
export function openSlots(p: Puzzle, b: Board, step: number): number[] {
  const res = reservedFrom(p, step);
  const r: number[] = [];
  for (let pos = -p.perSide; pos <= p.perSide; pos++) {
    if (pos === 0 || res.has(pos)) continue;
    if (b[idx(p.perSide, pos)] === null) r.push(pos);
  }
  return r;
}

export const overLimit = (b: Board, p: Puzzle): boolean => Math.abs(tiltOf(b, p.perSide)) > p.limit;

/** 鳥の数（問題の大きさの目安）。 */
export const birdCount = (p: Puzzle): number => p.queue.filter((a) => a.kind === 'bird').length;
