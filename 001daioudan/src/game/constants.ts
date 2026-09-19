/** 盤面はすべて 40px のセル格子で構成する。 */
export const CELL = 40;
export const COLS = 13;
export const ROWS = 15;
export const WIDTH = CELL * COLS; // 520
export const HEIGHT = CELL * ROWS; // 600

/** 行レイアウト（上から下）。 */
export const ROW_HUD_TOP = 0;
export const ROW_HOME = 1; // お家（ゴール）
export const ROW_WATER_FIRST = 2;
export const ROW_WATER_LAST = 6;
export const ROW_MEDIAN = 7; // 中央の安全地帯
export const ROW_ROAD_FIRST = 8;
export const ROW_ROAD_LAST = 12;
export const ROW_START = 13; // スタートの安全地帯
export const ROW_HUD_BOTTOM = 14;

/** お家の列位置（5 箇所）。 */
export const HOME_COLS = [0, 3, 6, 9, 12];

export const START_LIVES = 3;
export const TIME_LIMIT = 30; // 1 ミスあたりの制限時間（秒）

/**
 * 全レーン共通の速度倍率。level.ts の速度定義にこれを掛けたものが
 * レベル 1 の速さになる。ゲーム全体の難易度はここだけで調整できる。
 */
export const BASE_SPEED = 0.5;
/** レベルが 1 上がるごとに増える割合。 */
export const LEVEL_SPEED_STEP = 0.15;
export const HOP_DURATION = 0.09; // 1 ホップにかかる秒数
export const DEATH_DURATION = 1.1;
export const CLEAR_DURATION = 2.0;

/** 得点。 */
export const SCORE_FORWARD = 10;
export const SCORE_HOME = 50;
export const SCORE_TIME_PER_SEC = 10;
export const SCORE_FLY = 200;
export const SCORE_LEVEL_CLEAR = 1000;

export const HITBOX_INSET = 6;

export const rowY = (row: number): number => row * CELL;
export const colX = (col: number): number => col * CELL;

/** 負の値でも正しく折り返す剰余。 */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
