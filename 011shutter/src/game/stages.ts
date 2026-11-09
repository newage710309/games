// 面ごとの設定と、ゲームの数値（仮の値。ボットと試遊で調整する）をここにまとめる。

import type { PoseId } from './poses';

/** 1 面の長さ（秒）。 */
export const STAGE_TIME = 50;
/** 1 面のフィルムの枚数。 */
export const FILM = 10;
/** シャッターのあと、フィルムを巻く「ジー」の時間（秒）。この間は撮れない。 */
export const WIND_TIME = 1.0;
/** 場面が流れる速さ（px/秒。手前の地面の速さ）。 */
export const SCROLL_SPEED = 30;
/** フィルムを使いきったあと、面を終えるまでの待ち時間（秒）。 */
export const FILM_OUT_WAIT = 1.6;

/** お題に合った写真が、この点数以上なら面クリア。 */
export const PASS_SCORE = 60;
/** 「ベストショット！」の点数。 */
export const BEST_SCORE = 80;

/**
 * 面の得点 ＝ 写真の点数の合計 ＋ ボーナス。
 * 仕様の表は「写真の点数 × 10、お題 500、ポーズ 300、クリア 500」だったが、
 * 写真の合計と得点が別の数字に見えて分かりにくいので、× 10 をやめてボーナスも 1/10 にした（比率は同じ）。
 */
export const SCORE = {
  /** 写真の点数 × これ。 */
  photo: 1,
  /** お題に合った（60 点以上の）写真がある。 */
  theme: 50,
  /** 新しいポーズをずかんに登録（1 種類につき）。 */
  newPose: 30,
  /** 面クリア。 */
  clear: 50
} as const;

/** ★ の基準（その面の写真の点数の合計、ボーナス込み）。 */
export const STAR_LINES = [700, 850, 1000] as const;

export const starsFor = (total: number): number => STAR_LINES.filter((v) => total >= v).length;

// --- 写真の採点 --------------------------------------------------------------

export const PHOTO = {
  /** 配点。 */
  inFrame: 30,
  size: 20,
  composition: 20,
  clear: 15,
  sharp: 15,
  /** こちらを向いている。 */
  facingBonus: 10,
  /** めずらしいポーズ。 */
  poseBonus: 20,
  /** ちょうどいい大きさ（体の高さ ÷ 枠の高さ）。 */
  sizeIdealMin: 0.45,
  sizeIdealMax: 0.68,
  /** これより大きいと 0 点（近すぎ）。 */
  sizeTooBig: 1.0,
  /** 構図：中心からのずれ（枠の半分 = 1）がこれ以下なら満点、zeroAt で 0 点。 */
  compFree: 0.1,
  compZeroAt: 0.8,
  /** ブレ：画面上の速さ（px/秒）。free 以下は満点、zeroAt 以上は 0 点。 */
  blurFree: 32,
  blurZeroAt: 150,
  /** 写っているとみなす割合（これ未満の子は写っていないことにする）。 */
  minInFrame: 0.25
} as const;

// --- 面 ----------------------------------------------------------------------

export type ThemeKind = 'facing' | 'wings' | 'dango';

export interface Stage {
  name: string;
  theme: ThemeKind;
  /** お題（画面の上と、面の始めのカード）。 */
  themeText: string;
  /** 面の始めのカードで 2 行に分ける。 */
  themeLines: [string, string];
  /** 新聞の見出し（ポーズが写っていないとき）。 */
  headline: string;
  /** この面で出るめずらしいポーズ。 */
  poses: PoseId[];
  /** つぎのポーズまでの間隔（秒、最小と最大）。 */
  poseGap: [number, number];
  /** さくらちゃんの動きの速さ（倍率）。 */
  speed: number;
  /** 立ち止まっている時間（倍率）。小さいほど、せわしなく動く。 */
  calm: number;
  /** 立ち止まったとき、こちらを向く割合。 */
  facing: number;
  /** めずらしいポーズを続ける秒数（この間に撮る）。 */
  poseTime: number;
  /** 立ち止まっていても、ぴょこぴょこ跳ねる高さ（寒い夕方の 3 めん）。0 なら跳ねない。 */
  fidget: number;
  /** つぎにすることを決めるとき、木やしげみの陰に入る割合。 */
  hide: number;
}

export const STAGES: Stage[] = [
  {
    name: '雪の森の朝',
    theme: 'facing',
    themeText: 'こっちを むいた さくらちゃん',
    themeLines: ['こっちを むいた', 'さくらちゃん'],
    headline: 'さくらちゃん こっち むいた！',
    poses: ['yawn', 'sneeze', 'doze', 'catch', 'puff', 'nut'],
    poseGap: [5.5, 8.5],
    speed: 0.9,
    calm: 1.3,
    facing: 0.62,
    poseTime: 1.8,
    fidget: 0,
    hide: 0.62
  },
  {
    name: '鳥たちの集まる木',
    theme: 'wings',
    themeText: '羽を ひろげた しゅんかん',
    themeLines: ['羽を ひろげた', 'しゅんかん'],
    headline: 'さくらちゃん はばたく！',
    poses: ['stretch', 'sing', 'wink', 'surprise', 'nut', 'sneeze'],
    poseGap: [5.5, 8.5],
    speed: 1.1,
    calm: 0.8,
    facing: 0.5,
    poseTime: 1.5,
    fidget: 0,
    hide: 0.45
  },
  {
    name: '夕暮れの雪原',
    theme: 'dango',
    themeText: 'なかまと だんごに なっているところ',
    themeLines: ['なかまと だんごに', 'なっているところ'],
    headline: 'なかよし エナガだんご！',
    poses: ['dive', 'roll', 'puff', 'yawn', 'catch', 'wink'],
    poseGap: [8, 12],
    speed: 1.4,
    calm: 0.4,
    facing: 0.3,
    poseTime: 1.1,
    fidget: 2.2,
    hide: 0.45
  }
];

// --- 面ごとのできごと ------------------------------------------------------------

/** そっくりさんが同時に出る数（1 めん・2 めん・3 めん）。 */
export const FAKE_COUNT = [0, 5, 4] as const;
/** 3 めん：なかまが集まって だんごになる時刻（秒）と、続く秒数。 */
export const DANGO_TIMES = [8, 23, 38] as const;
export const DANGO_TIME = 4.6;
/** 3 めん：雪だるまが手前を横切る時刻。 */
export const CROSS_TIMES = [5, 13, 21.5, 29.5, 37, 44.5] as const;
/** 3 めん：雪だるまが雪玉を投げる時刻（雪玉が画面に当たる時刻）。 */
export const THROW_TIMES = [11, 18, 26.5, 34, 41.5, 48] as const;
/** 雪玉の構えから当たるまで（秒）。 */
export const THROW_WINDUP = 1.4;
export const THROW_FLIGHT = 0.7;
/** 当たって真っ白になった画面がもどるまで（秒）。 */
export const FLASH_TIME = 1.3;

// --- 称号 ----------------------------------------------------------------------

/**
 * 最終の点数で決まる称号（5 段階）。いちばん上は、じょうずなボットでも 1 割くらいしか取れない点数にしてある。
 * 目安（ボット 60 回ずつの中央値）：はじめて 2,500、ふつう 2,980、じょうず 3,350。
 */
export const RANKS = [
  { min: 0, name: 'みならい カメラマン', comment: 'まずは さくらちゃんを わくに 入れよう' },
  { min: 1900, name: 'しんまい カメラマン', comment: 'おだいの しゃしんが とれるように なった！' },
  { min: 2700, name: 'いちにんまえ カメラマン', comment: 'しんぶんに なくては ならない うでまえ' },
  { min: 3150, name: 'ベテラン カメラマン', comment: 'めずらしい ポーズも おまかせ！' },
  { min: 3500, name: 'でんせつの カメラマン', comment: 'もりじゅうが きみの しゃしんを まっている！' }
] as const;

/** 点数の称号の段（0..4）。 */
export const rankFor = (score: number): number => {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (score >= RANKS[i]!.min) r = i;
  return r;
};
