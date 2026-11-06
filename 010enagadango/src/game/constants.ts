// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（面・問題・点数）の高さ。 */
export const HUD_H = 40;
/** 「つぎに来る鳥」の列。 */
export const QUEUE_Y = 46;
export const QUEUE_H = 70;

/** 枝の支点（枝の上面の真ん中）。 */
export const PIVOT_X = 240;
export const PIVOT_Y = 404;
/** 枝の太さ。 */
export const BRANCH_T = 13;
/** 枝の上の鳥の大きさ。 */
export const BIRD_SCALE = 1.45;
/** 真ん中のさくらちゃんの大きさ。 */
export const SAKURA_SCALE = 1.55;
/** かたむきが余裕ちょうどのときの、枝の角度（ラジアン）。 */
export const MAX_ANGLE = 0.15;

/** 下の操作欄。 */
export const PANEL_Y = 486;
/** かたむきメーター。 */
export const METER_X = 64;
export const METER_W = 352;
export const METER_Y = 540;
export const METER_H = 18;
/** 「ひとつもどす」ボタン。 */
export const UNDO_BTN = { x: 150, y: 584, w: 180, h: 42 } as const;

/** 片側のとまれる場所の数から、場所の間隔を決める。 */
export const slotSpacing = (perSide: number): number => (perSide <= 3 ? 64 : 52);
