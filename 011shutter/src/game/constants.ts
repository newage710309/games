// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（ポーズ・合計・のこりフィルム・お題）の高さ。 */
export const HUD_H = 44;
/** 左上のポーズボタン（「❚❚」）。 */
export const PAUSE_BTN = { x: 4, y: 4, w: 36, h: 36 } as const;

/** カメラの枠の大きさ（縦横比は 5:4）。 */
export const FRAME_W = 170;
export const FRAME_H = 136;

/** 右下のシャッターボタン（中心と半径）。 */
export const SHUTTER = { x: 412, y: 568, r: 44 } as const;

/** 撮った写真の小窓（右上）。 */
export const POPUP = { x: 318, y: HUD_H + 6, w: 156, h: 178 } as const;

// --- 奥行き ---------------------------------------------------------------
// 森の地面は、奥（z = 0）が地平線の近く、手前（z = 1）が画面の下。
// 奥へ行くと小さく、手前に来ると大きく写る。

/** 奥（z = 0）の地面の高さ。 */
export const GROUND_FAR = 300;
/** 手前（z = 1）の地面の高さ。 */
export const GROUND_NEAR = 610;
/** 奥と手前の、さくらちゃんの大きさ（scale 1 で高さ 約 30px）。 */
export const SCALE_FAR = 0.85;
export const SCALE_NEAR = 4.6;

export const groundY = (z: number): number => GROUND_FAR + (GROUND_NEAR - GROUND_FAR) * z;
/** 奥行き z での大きさ。手前ほど急に大きくなるように 2 乗をまぜる。 */
export const scaleAt = (z: number): number => SCALE_FAR + (SCALE_NEAR - SCALE_FAR) * (0.45 * z + 0.55 * z * z);
/** 奥行き z の地面が、場面のスクロールに対してどれだけの速さで流れるか（奥ほどゆっくり）。 */
export const parallax = (z: number): number => 0.45 + 0.75 * z;
