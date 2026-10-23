// 面ごとの数値。難しさの調整はここだけでできるようにしてある。
import type { AnimalKind } from './guests';

export interface Stage {
  /** 出てくる動物（どの面にもシマエナガを入れる）。 */
  kinds: AnimalKind[];
  /** この数だけ動物を消したら面クリア。 */
  goal: number;
  /** 落ちる速さ（段 / 秒）。[面のはじめ, 面のおわり]。消した数に合わせて少しずつ速くなる。 */
  fall: [number, number];
  /** 何組落とすごとに雪だるまが降るか。 */
  snowEvery: number;
  /** 1 回に降る雪だるまの数 [最小, 最大]。 */
  snowCount: [number, number];
  /** 降る雪だるまが「おおきい雪だるま」になる割合。 */
  bigChance: number;
}

export const STAGES: Stage[] = [
  {
    kinds: ['shimaenaga', 'risu', 'karasu', 'kitsune'],
    goal: 40,
    fall: [0.9, 1.3],
    snowEvery: 10,
    snowCount: [2, 3],
    bigChance: 0
  },
  {
    kinds: ['shimaenaga', 'yamagara', 'momonga', 'usagi', 'akagera'],
    goal: 60,
    fall: [1.5, 2.1],
    snowEvery: 7,
    snowCount: [3, 4],
    bigChance: 0
  },
  {
    kinds: ['shimaenaga', 'gojukara', 'kitsune', 'usagi', 'karasu'],
    goal: 80,
    fall: [2.2, 3.0],
    snowEvery: 6,
    snowCount: [4, 5],
    bigChance: 0.4
  }
];

/** 1 匹消すごとの点。 */
export const ANIMAL_SCORE = 10;
/** れんさの倍率（1 れんさめ, 2, 3, …）。表より先は最後の値。 */
export const CHAIN_MULT = [1, 2, 4, 8, 16, 32];
/** 2 種類以上を同時に消したときの、1 種類ふえるごとのボーナス。 */
export const MULTI_BONUS = 30;
/** 雪だるまを 1 回溶かすごとの点。 */
export const MELT_SCORE = 20;
/** 面クリアのボーナス。 */
export const STAGE_BONUS = 500;
/** 下スワイプ・↓ で落とす速さ（段 / 秒）。 */
export const SOFT_FALL = 14;
/** 着地してから固まるまでの秒数（このあいだは左右に動かせる）。 */
export const LOCK_TIME = 0.5;
/** はやく落としているときの、固まるまでの秒数。 */
export const LOCK_TIME_SOFT = 0.12;
