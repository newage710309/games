// 画面の大きさ・配置と、ゲームの数値。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（面・残り・点数）の高さ。 */
export const HUD_H = 40;
/** 下の案内欄の高さ。 */
export const FOOTER_H = 26;

/** お客さんが歩いてくる道。奥（上）から受付の線（下）へ。 */
export const PATH_TOP_Y = 118;
/** 受付の線。お客さんの足元がここまで来たら時間切れ。 */
export const LINE_Y = 478;
/** 奥と手前での、お客さんの大きさ。 */
export const FAR_SCALE = 1.1;
export const NEAR_SCALE = 2.45;

/** さくらちゃんがうろうろする高さと範囲。 */
export const SAKURA_Y = 566;
export const SAKURA_MIN_X = 96;
export const SAKURA_MAX_X = 384;
