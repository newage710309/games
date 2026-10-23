// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（面・のこり・点数）の高さ。 */
export const HUD_H = 40;
/** 下の操作説明の欄の高さ。 */
export const FOOTER_H = 28;

/** フィールドのます目。よこ 6 れつ × たて 12 だん。 */
export const COLS = 6;
export const ROWS = 12;
/** 1 マスの大きさ。 */
export const CELL = 46;
/** フィールドの左上（いちばん上の段の左はし）。 */
export const FIELD_X = 16;
export const FIELD_Y = 54;
export const FIELD_W = COLS * CELL;
export const FIELD_H = ROWS * CELL;

/** 組が出てくる列（左から 3 れつめ）。ここのいちばん上がふさがったらおしまい。 */
export const SPAWN_COL = 2;

/** 右側の欄（つぎ・のこり・さくらちゃん）の左はしと幅。 */
export const SIDE_X = FIELD_X + FIELD_W + 12;
export const SIDE_W = WIDTH - SIDE_X - 10;
