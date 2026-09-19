/** 盤面の論理サイズ。表示サイズに関係なく、ゲームの座標は常にこの大きさ。 */
export const WIDTH = 480;
export const HEIGHT = 640;

/** 上部の HUD（スコアなど）の高さ。ボールはここより上には行かない。 */
export const HUD_H = 40;

/**
 * ブロックを並べる領域。ここにイラストが隠れていて、ブロックを崩すと見えてくる。
 * 8 列 × 10 段 = 80 個（1 面が長くなりすぎないよう、12 段 96 個から減らした）。
 */
export const BRICK_COLS = 8;
export const BRICK_ROWS = 10;
export const BRICK_W = 56;
export const BRICK_H = 28;

/**
 * 天井（HUD の下端）と、いちばん上の段とのすき間。
 * ボールがブロックの上に抜けると、天井とブロックの間で跳ね返りながら連続で崩せる。
 */
export const TOP_GAP = 48;

export const PICTURE = {
  x: (WIDTH - BRICK_COLS * BRICK_W) / 2, // 16
  y: HUD_H + TOP_GAP, // 88
  w: BRICK_COLS * BRICK_W, // 448
  h: BRICK_ROWS * BRICK_H // 280
} as const;

/** ラケット。 */
export const PADDLE_Y = 592; // 上端
export const PADDLE_H = 12;
export const PADDLE_KEY_SPEED = 560; // キーボード操作時の移動速度（px/秒）

/** ボール。速さは全難易度・全ステージで同じ（難易度はラケットの長さで付ける）。 */
export const BALL_R = 6;
export const BALL_SPEED = 330; // px/秒

/** ラケットの端で打ったときの最大の角度（真上からの角度）。 */
export const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;
/** 水平に近い角度で延々と往復しないよう、水平からこれ以上は寝かせない。 */
export const MIN_ANGLE_FROM_HORIZONTAL = (20 * Math.PI) / 180;

export const START_LIVES = 3;
export const SCORE_BRICK = 10;
/** ステージクリア時、残りライフ 1 つにつき加算。 */
export const SCORE_LIFE_BONUS = 100;

/** 面クリア後、「つぎへ」を受け付けるまでの待ち時間（絵を眺めてもらうため）。 */
export const CLEAR_WAIT = 1.0;

export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface Difficulty {
  readonly id: DifficultyId;
  readonly label: string;
  /** ステージ 1 でのラケットの長さ（px）。 */
  readonly paddleW: number;
  /** 点数の倍率。ラケットが短い（難しい）ほど高い。ブロックの点にも残りボールのボーナスにも掛かる。 */
  readonly scoreMul: number;
}

/**
 * 難易度はラケットの長さだけで決まる。ボールの速さは変えない。
 * ここの数値を変えれば難しさと点数の差を調整できる。
 */
export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'easy', label: 'かんたん', paddleW: 120, scoreMul: 1 },
  { id: 'normal', label: 'ふつう', paddleW: 88, scoreMul: 2 },
  { id: 'hard', label: 'むずかしい', paddleW: 64, scoreMul: 3 }
];

/** ステージが進むごとにラケットを短くする倍率（ステージ 1, 2, 3）。 */
export const STAGE_PADDLE_SCALE: readonly number[] = [1, 0.9, 0.8];

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
