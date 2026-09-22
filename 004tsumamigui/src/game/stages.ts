import { MIN_CUE_TIME } from './constants';

/** [最小, 最大] の秒数。この範囲からでたらめに決める。 */
export type Range = readonly [number, number];

/**
 * 授業（面）の定義。先生の動きのクセはここの数値だけで変える。
 */
export interface Stage {
  readonly subject: string;
  /** 授業の長さ（秒）。 */
  readonly time: number;
  /** 黒板に書く文字（1 行ずつ）。書ききったら消して最初から。 */
  readonly board: readonly string[];
  /** 黒板を見ながら説明している（後ろを向いている）時間。 */
  readonly explain: Range;
  /** 振り向いてこちらを見ている時間。 */
  readonly look: Range;
  /** 予兆から振り向くまでの時間（MIN_CUE_TIME 以上）。 */
  readonly cue: number;
  /** 説明のあとに板書タイムになる確率。 */
  readonly boardChance: number;
  /** 板書タイムの長さ。 */
  readonly write: Range;
  /** 予兆のあとに、振り向かずにフェイント（振り向きかけて戻る）になる確率。 */
  readonly feintChance: number;
  /** 板書中に、書きながらちらっと振り返るフェイントをする確率（板書 1 回につき）。 */
  readonly writeFeintChance: number;
  /** 見回りの先生がいるか（3 時間目）。 */
  readonly patrol: boolean;
  /** 休み時間のデモ（この授業のあとに流れる）の題名。最後の授業は空。 */
  readonly breakTitle: string;
}

export const STAGES: readonly Stage[] = [
  {
    subject: 'こくご',
    time: 45,
    board: ['ふゆの ことば', 'ゆき・こおり・しも', 'つらら・ふぶき', 'ゆきだるま・かまくら'],
    explain: [1.6, 3.4],
    look: [1.2, 2.0],
    cue: 0.9,
    boardChance: 0.4,
    write: [4, 6],
    feintChance: 0,
    writeFeintChance: 0,
    patrol: false,
    breakTitle: 'やすみじかん'
  },
  {
    subject: 'さんすう',
    time: 50,
    board: ['どんぐり 3こ + 4こ', '= 7こ', 'たね 12こ ÷ 3わ', '= 4こずつ'],
    explain: [1.0, 3.0],
    look: [1.0, 2.2],
    cue: 0.7,
    boardChance: 0.32,
    write: [3, 6],
    feintChance: 0.28,
    writeFeintChance: 0,
    patrol: false,
    breakTitle: 'きゅうしょくまえ'
  },
  {
    subject: 'テスト',
    time: 60,
    board: ['テスト', 'しずかに とくこと', 'なまえを かくこと', 'みなおしを すること'],
    explain: [0.9, 2.6],
    look: [1.0, 2.0],
    cue: 0.6,
    boardChance: 0.3,
    write: [3, 5],
    feintChance: 0.3,
    writeFeintChance: 0.5,
    patrol: true,
    breakTitle: ''
  }
];

// 予兆が短すぎないかを読み込み時に確かめる（反応できない振り向きを作らないため）。
for (const [i, s] of STAGES.entries()) {
  if (s.cue < MIN_CUE_TIME) throw new Error(`${i + 1} 時間目の予兆（${s.cue} 秒）が MIN_CUE_TIME より短い`);
}

/** 見回りの先生の動き（3 時間目）。 */
export const PATROL = {
  /** 歩く速さ（px/秒）。 */
  speed: 46,
  /** 歩く範囲（x）。 */
  minX: 60,
  maxX: 420,
  /** 歩き続ける時間。 */
  walk: [2.6, 5.0] as Range,
  /** 立ち止まって「！」を出してから、こちらを見るまで。 */
  cue: 0.7,
  /** こちらを見ている時間。 */
  look: [1.0, 1.6] as Range
} as const;

if (PATROL.cue < MIN_CUE_TIME) throw new Error('見回りの先生の予兆が MIN_CUE_TIME より短い');

/**
 * エンディングを分ける点数。[真ん中のデモになる点数, いちばん上のデモ（クリア）になる点数]。
 * クリアは「うまく遊べたときのごほうび」にして、ほおばりを使わないと真ん中にも届かないようにしている。
 * 自動プレイのシミュレーション（各 60 回。いちばん下 / 真ん中 / クリア の回数）：
 *   予兆で 0.3 秒後に放し、0.25 秒後に押しなおす上手な人   → 中央値 6,740（0 / 21 / 39）
 *   0.6 秒後に押しなおす人                                  → 中央値 6,000（0 / 45 / 15）
 *   1.2 秒後に押しなおす慎重な人                            → 中央値 4,650（24 / 36 / 0）
 *   ほおばりまで押し続けない人（1.2 秒ごとに放す）          → 中央値 3,180（60 / 0 / 0）
 */
export const ENDING_SCORES = [4500, 6500] as const;
