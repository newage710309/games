// 画面の大きさ・配置と、ゲームの数値。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄（何時間目・残り時間・点数）の高さ。 */
export const HUD_H = 40;
/** 下の案内欄の高さ。 */
export const FOOTER_H = 24;

/** 教室（先生と黒板）の区画。 */
export const ROOM_Y = HUD_H;
export const ROOM_H = 296;

/** さくらちゃんの席（アップ）の区画。 */
export const SEAT_Y = ROOM_Y + ROOM_H;
export const SEAT_H = HEIGHT - FOOTER_H - SEAT_Y;

// --- つまみ食い ------------------------------------------------------------

/** 1 秒に食べる木の実の数（ふつう）。 */
export const EAT_RATE = 6;
/** ほおばりモード中は何倍の速さで食べるか。 */
export const CRAM_MULTIPLIER = 2;
/** 押しっぱなしで食べ続けて、ほっぺがぱんぱん（ほおばりモード）になるまでの秒数。 */
export const CRAM_TIME = 2.2;
/** 木の実 1 粒の点数。 */
export const NUT_SCORE = 10;
/** 手を放してからほっぺが元に戻るまでの秒数（見た目だけ。判定は押しているかどうかだけで決める）。 */
export const PUFF_RELEASE_TIME = 0.25;

// --- 先生 ------------------------------------------------------------------

/**
 * 予兆（せき払い・首がぴくっ・チョークを置く・見回りの「！」）から、実際にこちらを見るまでの最低秒数。
 * 人の反応（約 0.4 秒）に、スマホのタッチの遅れのぶんを足してある。どの面でもこれより短くしない。
 */
export const MIN_CUE_TIME = 0.55;
/** 首を回しきるまでの秒数。 */
export const TURN_TIME = 0.16;
/** 首を戻す秒数。 */
export const UNTURN_TIME = 0.22;
/** 首がここまで回ったら「見ている」（このとき押していたら見つかる）。 */
export const WATCH_TURN = 0.6;
/** フェイントで首を回す量（WATCH_TURN より小さいので見つからない）。 */
export const FEINT_TURN = 0.42;
/** チョークを取る動きの秒数。 */
export const TAKE_CHALK_TIME = 0.6;
/** 板書で 1 秒に書く文字数。 */
export const WRITE_RATE = 2.4;

// --- 流れ ------------------------------------------------------------------

/** 授業の始めの「よーい」の秒数。 */
export const READY_TIME = 2.2;
/** チャイムが鳴ってから次へ進むまでの秒数。 */
export const BELL_TIME = 2.6;
/** 見つかってしかられる演出の秒数。 */
export const CAUGHT_TIME = 2.6;
