// 3 つのコースと、得点・★・目標打数の数値。

import type { Hole } from './course';
import { HOLES } from './holes';

export interface Course {
  /** 1..3 */
  no: number;
  name: string;
  /** 面の見た目。spring = 春の川辺、autumn = 秋の森、winter = 冬の雪。 */
  theme: 'spring' | 'autumn' | 'winter';
  holes: readonly Hole[];
}

export const COURSES: readonly Course[] = [
  { no: 1, name: 'はるの かわべコース', theme: 'spring', holes: HOLES.slice(0, 3) },
  { no: 2, name: 'あきの もりコース', theme: 'autumn', holes: HOLES.slice(3, 6) },
  { no: 3, name: 'ふゆの スノーパークゴルフ', theme: 'winter', holes: HOLES.slice(6, 9) }
];

export const HOLES_PER_COURSE = 3;

/** 1 ホールで打てるのは パー ＋ この数 まで。届かなければ拾い上げて、この打数として数える。 */
export const MAX_OVER_PAR = 3;
/** コースの目標打数は、パーの合計 ＋ この数。 */
export const TARGET_OVER_PAR = 5;

export const coursePar = (c: Course): number => c.holes.reduce((s, h) => s + h.par, 0);
export const courseTarget = (c: Course): number => coursePar(c) + TARGET_OVER_PAR;
export const holeMax = (h: Hole): number => h.par + MAX_OVER_PAR;

/** ホールの点数。 */
export const SCORE = {
  holeInOne: 1000,
  birdie: 300,
  par: 200,
  bogey: 50,
  courseClear: 500
} as const;

export function holePoints(strokes: number, par: number): number {
  if (strokes === 1) return SCORE.holeInOne;
  if (strokes <= par - 1) return SCORE.birdie;
  if (strokes === par) return SCORE.par;
  if (strokes === par + 1) return SCORE.bogey;
  return 0;
}

/** パーとの差の呼び名。 */
export function holeWord(strokes: number, par: number): string {
  if (strokes === 1) return 'ホールインワン！';
  const d = strokes - par;
  if (d <= -3) return 'アルバトロス！';
  if (d === -2) return 'イーグル！';
  if (d === -1) return 'バーディ！';
  if (d === 0) return 'パー';
  if (d === 1) return 'ボギー';
  if (d === 2) return 'ダブルボギー';
  return `${d}オーバー`;
}

/** ★ の数（コースの合計打数で決まる）。0 は ★ なし。 */
export function courseStars(total: number, par: number): number {
  if (total <= par - 2) return 3;
  if (total <= par) return 2;
  if (total <= par + 2) return 1;
  return 0;
}
