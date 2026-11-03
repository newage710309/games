// 面ごとの数値。難しさの調整はここだけでできるようにしてある。

export type Theme = 'forest' | 'valley' | 'blizzard';

/** 分かれ道などのコースの区間。 */
export type SectionKind = 'open' | 'branch' | 'ice';

export interface Stage {
  name: string;
  theme: Theme;
  /** 目標の大きさ（cm）。 */
  goal: number;
  /** コースの長さ（ゲーム世界の座標）。 */
  length: number;
  /** 下る速さ（座標 / 秒）。[はじめの大きさ, 400cm]。 */
  speed: [number, number];
  /** 道のはば。 */
  roadW: number;
  /** 新雪で育つ速さ（cm / 秒）。 */
  snowRate: number;
  /** 雪だまり 1 つぶんで増える大きさ（cm）[最小, 最大]。 */
  driftCm: [number, number];
  /** 広いところで雪だまりを置く間隔（座標）。 */
  driftGap: number;
  /** ものを置く列の間隔（座標）[最小, 最大]。 */
  rowGap: [number, number];
  /** 列に置くものの重み。 */
  weights: { twig: number; pebble: number; soldier: number; tree: number; rock: number };
  /** 岩と岩の、たての最小間隔（座標）。 */
  rockGap: number;
  /** コースの区間の並び。区間ごとの長さは残りから自動で割りふる。 */
  sections: SectionKind[];
  /** 分かれ道の門の大きさ（cm）。現れる順。 */
  gates: number[];
  /** 分かれ道の広い道：岩の間隔（座標）。 */
  wideRockGap: number;
  /** 分かれ道の広い道：雪だまりの間隔（座標）。 */
  wideDriftGap: number;
  /** 分かれ道の広い道の雪だまりは、ふつうの何倍ふえるか。 */
  wideDriftMul: number;
  /** ふぶきの強さ 0..1。 */
  blizzard: number;
}

export const STAGES: Stage[] = [
  {
    name: 'ふもとの林',
    theme: 'forest',
    goal: 100,
    length: 12800,
    speed: [290, 400],
    roadW: 420,
    snowRate: 0.9,
    driftCm: [8,12],
    driftGap: 700,
    rowGap: [170, 270],
    weights: { twig: 5, pebble: 4, soldier: 0, tree: 1.2, rock: 1 },
    rockGap: 560,
    sections: ['open'],
    gates: [],
    wideRockGap: 0,
    wideDriftGap: 0,
    wideDriftMul: 1,
    blizzard: 0
  },
  {
    name: 'ほそい谷',
    theme: 'valley',
    goal: 200,
    length: 18000,
    speed: [310, 430],
    roadW: 340,
    snowRate: 1.2,
    driftCm: [11,16],
    driftGap: 680,
    rowGap: [210,310],
    weights: { twig: 5, pebble: 4, soldier: 2, tree: 1, rock: 0.8 },
    rockGap: 480,
    sections: ['open', 'branch', 'open', 'branch', 'open', 'branch', 'open'],
    gates: [90,140,190],
    wideRockGap: 400,
    wideDriftGap: 290,
    wideDriftMul: 1.4,
    blizzard: 0
  },
  {
    name: 'ふぶきの山',
    theme: 'blizzard',
    goal: 300,
    length: 23500,
    speed: [330, 460],
    roadW: 420,
    snowRate: 1.8,
    driftCm: [17,25],
    driftGap: 560,
    rowGap: [230,330],
    weights: { twig: 4, pebble: 4, soldier: 2.5, tree: 1.5, rock: 0.7 },
    rockGap: 720,
    sections: ['open', 'ice', 'branch', 'open', 'ice', 'branch', 'ice', 'branch', 'open'],
    gates: [110,180,250],
    wideRockGap: 400,
    wideDriftGap: 270,
    wideDriftMul: 1.7,
    blizzard: 0.85
  }
];

/** はじめの大きさ（cm）。 */
export const START_CM = 30;
/** これより小さくなるとゲームオーバー（cm）。 */
export const MIN_CM = 10;
/** ぶつかると欠ける割合。 */
export const CHIP = 0.2;
/** ぶつかったあと、次にぶつかるまでの無敵の秒数。 */
export const INVULN_TIME = 1;
/** 日なたでとける速さ（今の大きさの割合 / 秒）。 */
export const SUN_MELT = 0.13;
/** 氷の上の、曲がりやすさの倍率。 */
export const ICE_GRIP = 0.2;
/** 氷の上の、速さの倍率。 */
export const ICE_SPEED = 1.12;
/** 近道の、速さの倍率。 */
export const LANE_SPEED = 1.25;
/** 巻きこめる大きさ（cm）。 */
export const EAT_AT = { twig: 20, pebble: 20, soldier: 60, tree: 100 } as const;
/** 巻きこみの点。 */
export const EAT_SCORE = { twig: 10, pebble: 10, soldier: 30, tree: 50 } as const;
/** 木の実の点。 */
export const BERRY_SCORE = 20;
/** とりでに着いたときの大きさ 1cm あたりの点。 */
export const SIZE_SCORE = 10;
/** 面クリアのボーナス。 */
export const STAGE_BONUS = 500;
/** 一度も欠けずにクリアしたときのボーナス。 */
export const NO_MISS_BONUS = 1000;
/** 「とりでまで ○m」の 1m あたりの座標。 */
export const PX_PER_M = 20;

/** 大きさ（cm）から、雪玉の半径（ゲーム世界の座標）を出す。 */
export const radiusOf = (cm: number): number => 24 * Math.pow(cm / 30, 0.48);

/** 大きさの度合い 0（30cm）..1（400cm）。速さ・曲がりにくさ・カメラに使う。 */
export const sizeP = (cm: number): number => Math.max(0, Math.min(1, Math.log(cm / 30) / Math.log(400 / 30)));

/** 大きさ（cm）から、カメラの倍率を出す。大きくなるほど少しずつ引く。 */
export const zoomOf = (cm: number): number => 1.15 + (0.68 - 1.15) * sizeP(cm);

/** 左右の加速度（座標 / 秒²）。大きいほど曲がりにくい。 */
export const steerAccel = (cm: number): number => 1500 + (560 - 1500) * sizeP(cm);

/** 左右の最高速度（座標 / 秒）。 */
export const steerMax = (cm: number): number => 340 + (280 - 340) * sizeP(cm);

/** 下る速さ。大きいほど速い。 */
export const fallSpeed = (stage: Stage, cm: number): number => stage.speed[0] + (stage.speed[1] - stage.speed[0]) * sizeP(cm);

/** 取った星の数（目標ちょうど 1、1.5 倍 2、2 倍 3、届かなければ 0）。 */
export function starsOf(cm: number, goal: number): number {
  if (cm >= goal * 2) return 3;
  if (cm >= goal * 1.5) return 2;
  return cm >= goal ? 1 : 0;
}

/** とりでの壊れた量。 */
export function fortDamage(cm: number, goal: number): number {
  const ratio = cm / goal;
  return ratio < 1 ? ratio * 0.2 : 0.42 + (ratio - 1) * 0.63;
}
