import type { AnimalKind } from './guests';
import type { Disguise } from './snowman';

/**
 * 面の定義。列の速さ・来るお客さん・変装の種類はここの数値だけで変える。
 *
 * 列の位置は「歩数」で数える。先頭の足元が受付の線から何人ぶん手前にいるか（0 で線に着く＝時間切れ）。
 * うしろのお客さんは 1 人ぶんずつうしろに並ぶ。
 */
export interface Stage {
  /** 1・2 面は時間（秒）で終わる。 */
  readonly time?: number;
  /** 3 面は人数で終わる（この人数をさばききったらエンディング）。 */
  readonly count?: number;
  /** 列の進む速さ（人ぶん / 秒）。面の始め → 終わりで上がっていく。 */
  readonly speed: readonly [number, number];
  /** 来る動物（重み）。 */
  readonly animals: Partial<Record<AnimalKind, number>>;
  /** 雪だるまが来る割合。 */
  readonly snowChance: number;
  /** 雪だるまの変装（重み）。none = 変装なし。 */
  readonly disguises: Partial<Record<Disguise, number>>;
  /** 面のあとに流れる休憩デモの題名（最後の面は空）。 */
  readonly breakTitle: string;
}

export const STAGES: readonly Stage[] = [
  {
    time: 40,
    speed: [0.5, 0.75],
    animals: { karasu: 1, risu: 1, shimaenaga: 0.7 },
    snowChance: 0.22,
    disguises: { none: 1 },
    breakTitle: 'おきゃくさん いっぱい！'
  },
  {
    time: 45,
    speed: [0.7, 0.95],
    animals: { karasu: 0.8, risu: 0.8, shimaenaga: 0.6, yamagara: 1, kitsune: 1, usagi: 1 },
    snowChance: 0.26,
    disguises: { none: 0.6, karasu: 1, risu: 1, kitsune: 1, usagi: 1 },
    breakTitle: 'ゆきだるまの さくせんかいぎ'
  },
  {
    count: 50,
    speed: [0.9, 1.2],
    animals: {
      karasu: 0.7,
      risu: 0.7,
      shimaenaga: 0.8,
      yamagara: 0.7,
      kitsune: 0.7,
      usagi: 0.7,
      gojukara: 1,
      akagera: 1,
      momonga: 1.1
    },
    snowChance: 0.3,
    disguises: { none: 0.3, karasu: 0.6, risu: 0.6, kitsune: 0.6, usagi: 0.6, sumi: 1, doro: 1, kigurumi: 1, shimaenaga: 1 },
    breakTitle: ''
  }
];

/** 面の始めの、先頭の位置（受付の線から何人ぶん手前か）。 */
export const START_STEPS = 1.8;
/**
 * 先頭がこれより遠くなったら、列がすたすた詰めてくる（すばやく案内しすぎて、先頭が奥へ行きすぎないように）。
 */
export const MAX_STEPS = 2.2;
/** 詰めてくるときの速さ（人ぶん / 秒）。 */
export const CATCH_UP_SPEED = 5;
/** 1 人の基本点。 */
export const GUEST_SCORE = 10;
/** すばやさボーナスの最大。先頭が線から BONUS_STEPS 人ぶん以上手前なら満点。 */
export const BONUS_MAX = 10;
export const BONUS_STEPS = 1.6;
