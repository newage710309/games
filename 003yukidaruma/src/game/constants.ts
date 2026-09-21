// --- 画面 ----------------------------------------------------------------
// ゲームの座標は常に 480×640 の論理座標。表示サイズには main.ts で合わせる。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の帯（スコア・ハイスコア・ポーズボタン）の高さ。 */
export const HUD_H = 40;
/** 下の帯（ステージ名・のこり数）の高さ。 */
export const FOOTER_H = 24;

// --- 盤面 ----------------------------------------------------------------
// キャラを大きく見せたいので、原作（13×15）より小さい 9×11 マスにしている。

export const COLS = 9;
export const ROWS = 11;
/** 1 マスの大きさ（px）。 */
export const CELL = 48;
/** 外周の壁の太さ（px）。 */
export const WALL = 24;
/** 盤面（マス目）の左上。 */
export const BOARD_X = WALL;
export const BOARD_Y = HUD_H + WALL;
export const BOARD_W = COLS * CELL;
export const BOARD_H = ROWS * CELL;

// --- 速さ（マス／秒） ----------------------------------------------------

export const PLAYER_SPEED = 4.5;
export const BLOCK_SPEED = 14;
/** 時間がたつと雪だるまが速くなる。この秒数ごとに ENEMY_SPEEDUP 倍ずつ足す。 */
export const SPEEDUP_EVERY = 30;
export const ENEMY_SPEEDUP = 0.15;
/** 速くなるのはここまで（元の速さに対する倍率の上乗せ分）。 */
export const ENEMY_SPEEDUP_MAX = 0.45;

// --- 時間（秒） ----------------------------------------------------------

/** 面の始めに、卵の入った氷を点滅させて場所を教える時間。 */
export const READY_TIME = 3;
/** 面の始めに「STAGE n」の帯を出しておく時間（そのあと消して、盤面と卵の点滅を見せる）。 */
export const STAGE_BANNER_TIME = 1.3;
/** ミスのあと、再開するまでの時間。 */
export const RESPAWN_READY_TIME = 1.4;
/** 再開直後にぶつかっても平気な時間。 */
export const INVINCIBLE_TIME = 2;
/** 卵から雪だるまが出てくるまでの時間（この間はぶつかっても平気）。 */
export const HATCH_TIME = 1.2;
/** 雪だるまが減ったあと、次の卵がかえるまでの時間。 */
export const RESPAWN_DELAY = 2;
/** 壁をゆらしたときに、壁ぎわの雪だるまが気絶している時間。 */
export const STUN_TIME = 4;
/** 壁をゆらせる間隔（押しっぱなしのとき）。 */
export const WALL_SHAKE_COOLDOWN = 0.4;
/** 壁のゆれの見た目の長さ。 */
export const WALL_SHAKE_TIME = 0.35;
/** 氷に向かってこの時間押し続けると、すべる（割れる）。すぐに動かないよう少しだけためる。 */
export const PUSH_HOLD = 0.22;
/** 氷が割れるアニメーションの長さ。 */
export const BREAK_ANIM_TIME = 0.45;
/** 氷を押した直後、次の操作を受け付けるまでの時間。 */
export const PUSH_COOLDOWN = 0.18;
/** 雪だるまが氷を壊すのにかかる時間。 */
export const ENEMY_BREAK_TIME = 0.8;
/** ミスの演出の長さ。 */
export const DEATH_TIME = 1.6;
/** 面クリアの画面で、「つぎへ」を受け付けるまでの時間。 */
export const CLEAR_WAIT = 1.2;
/** 幕間デモを飛ばせるようになるまでの時間。 */
export const DEMO_SKIP_WAIT = 0.8;

// --- 当たり判定（マス単位） ---------------------------------------------

/** プレイヤーと雪だるまの中心がこれより近いとぶつかる。 */
export const TOUCH_DIST = 0.62;

// --- 得点 ----------------------------------------------------------------

/** 1 つの氷で一度につぶした数ごとの点数（原作と同じく、まとめてつぶすほど大きい）。 */
export const SCORE_CRUSH = [400, 1600, 3200, 6400] as const;
/** 気絶した雪だるまにさわってやっつけた。 */
export const SCORE_KICK = 100;
/** 卵の入った氷を割った。 */
export const SCORE_EGG = 500;
/** ふつうの氷を割った。 */
export const SCORE_BREAK = 30;
/** 早くクリアしたときのボーナス。[この秒数より早ければ, 点数] を上から順に見る。 */
export const TIME_BONUS: readonly (readonly [number, number])[] = [
  [60, 5000],
  [90, 2000],
  [120, 1000],
  [180, 500]
];

export const START_LIVES = 3;

// --- 方向 ----------------------------------------------------------------

export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export const DELTA: Record<Dir, { readonly dx: number; readonly dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** マスの中心の画面座標。 */
export const cellCenterX = (col: number): number => BOARD_X + col * CELL + CELL / 2;
export const cellCenterY = (row: number): number => BOARD_Y + row * CELL + CELL / 2;
