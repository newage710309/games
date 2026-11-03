// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（面・のこり・点数）の高さ。 */
export const HUD_H = 40;
/** 大きさの欄（大きさ・ものさし）の高さ。情報欄のすぐ下に重ねる。 */
export const GAUGE_H = 44;
/** 雪玉の中心を置く、画面の上からの位置（進む先が見えるように上寄り）。 */
export const BALL_SCREEN_Y = 200;
