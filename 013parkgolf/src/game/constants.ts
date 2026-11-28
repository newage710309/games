// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。
// コースは真上から見た絵で、横幅は画面と同じ 480、縦はホールごとに長さが変わる（カメラが上下に動く）。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（ポーズ・ホール・打数・コースをみる）の高さ。 */
export const HUD_H = 48;
/** 左上のポーズボタン（「❚❚」）。 */
export const PAUSE_BTN = { x: 4, y: 6, w: 36, h: 36 } as const;
/** 右上の「コースをみる」ボタン。ポーズボタンと重ならないように右はしに置く。 */
export const VIEW_BTN = { x: 380, y: 8, w: 94, h: 32 } as const;

/** ボールの半径。 */
export const BALL_R = 6;
/** カップの半径。 */
export const CUP_R = 11;

/** コースの上での人物の大きさ（さくらちゃん・クマ・キツネ）。 */
export const GOLFER_SCALE = 1.5;
export const BEAR_SCALE = 0.24;
export const FOX_SCALE = 1.5;
