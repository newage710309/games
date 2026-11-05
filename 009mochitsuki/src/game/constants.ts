// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（面・のこり・点数）の高さ。 */
export const HUD_H = 40;
/** くっつき・ぴったりの欄の高さ。情報欄のすぐ下に重ねる。 */
export const INFO_H = 34;

/** 地面（奥との境目）の高さ。 */
export const HORIZON_Y = 372;
/** 臼の口の中心。 */
export const USU_X = 235;
export const USU_Y = 472;
/** クマの足元。 */
export const BEAR_X = 392;
export const BEAR_Y = 582;
/** さくらちゃんの中心（踏み台の上）。 */
export const SAKURA_X = 84;
export const SAKURA_Y = 484;
export const SAKURA_SCALE = 3;
/** タイミングの輪：ぴったりの大きさと、出はじめの大きさ。 */
export const RING_R = 96;
export const RING_START_R = 236;
