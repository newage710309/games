import type { AnimalKind } from './guests';

/**
 * 電車（面）の定義。あふれる速さ・発車までの人数・出てくるものはここの数値だけで変える。
 * 3 本とも発車させたらクリア。
 */
export interface Train {
  /** 発車までの秒数。時間になるとお客さんがあふれるのが止まり、ホームのお客さんをぜんぶ押しこんだら発車。 */
  readonly time: number;
  /** お客さんがドアからあふれ出る間隔（秒）。[発車直後, 発車まぎわ] で縮んでいく。 */
  readonly spawn: readonly [number, number];
  /** 2 つの列に同時にあふれる割合。 */
  readonly double: number;
  /** 大荷物のお客さんの割合。 */
  readonly luggageChance: number;
  /** おばあちゃんが出たとき、へんそうした雪だるまである割合。 */
  readonly fakeGrannyChance: number;
  /** ねぼうのゆきまるくんが駆けこんでくるか（発車まぎわに 1 回）。 */
  readonly yukimaru: boolean;
}

export const TRAINS: readonly Train[] = [
  { time: 25, spawn: [1.08, 0.88], double: 0.3, luggageChance: 0, fakeGrannyChance: 0, yukimaru: false },
  { time: 30, spawn: [0.98, 0.78], double: 0.4, luggageChance: 0.12, fakeGrannyChance: 0.35, yukimaru: true },
  { time: 35, spawn: [0.89, 0.71], double: 0.5, luggageChance: 0.18, fakeGrannyChance: 0.45, yukimaru: true }
];

export const PASSENGERS: readonly AnimalKind[] = [
  'karasu',
  'yamagara',
  'gojukara',
  'akagera',
  'shimaenaga',
  'risu',
  'momonga',
  'kitsune',
  'usagi'
];

/** 列に 5 人並んだら（5 人目がホームの端に着いたら）「あぶない！！」。 */
export const MAX_IN_LINE = 5;
/** さくらちゃんが 1 人押しこむのにかかる秒数。 */
export const PUSH_TIME = 0.3;
/** 列から列へ歩く速さ（px / 秒）。 */
export const WALK_SPEED = 420;

export const PUSH_SCORE = 10;
/** 大荷物のお客さん（2 回押す）。 */
export const LUGGAGE_SCORE = 20;
export const GRANNY_SCORE = 100;
export const YUKIMARU_SCORE = 200;
export const DEPART_BONUS = 500;

/** おばあちゃんが出てくる間隔と、いる時間。 */
export const GRANNY_INTERVAL: readonly [number, number] = [7, 12];
export const GRANNY_STAY = 6;
/** おばあちゃんが向きを変える間隔。 */
export const GRANNY_TURN: readonly [number, number] = [0.8, 1.6];
/** ゆきまるくんが出てくるのは、発車まで残りこの秒数になったとき。 */
export const YUKIMARU_AT = 8;
/** ゆきまるくんがホームを走りぬける秒数。 */
export const YUKIMARU_RUN = 3.2;
/** 5 人目がホームの端に着いてから、アウトになるまでの秒数（このうちに押しこめばセーフ）。 */
export const DANGER_TIME = 0.9;
