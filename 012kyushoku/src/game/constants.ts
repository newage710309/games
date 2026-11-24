// 画面の大きさ・配置。ゲームの座標は常に 480×640（縦長）で、表示倍率は main.ts で掛ける。
//
// 上から順に：情報欄 → 給食室（奥の食堂・列・さくらちゃん）→ カウンター（「どうぞ！」の横長ボタン → トレーと器）→ 鍋。

export const WIDTH = 480;
export const HEIGHT = 640;

/** 上の情報欄の高さ。 */
export const HUD_H = 44;
/** 左上のポーズボタン（「❚❚」）。 */
export const PAUSE_BTN = { x: 4, y: 4, w: 36, h: 36 } as const;

// --- 給食室 -----------------------------------------------------------------

/** 列に並ぶ子の足元の高さ（カウンターのすぐ奥）。 */
export const QUEUE_Y = 318;
/** 列の先頭（カウンターの前）の子の x。 */
export const FRONT_X = 236;
/** 列の 2 番目からの x（右へ並ぶ。これより後ろの子は画面の外で待つ）。 */
export const QUEUE_XS = [312, 368, 416, 458] as const;
/** さくらちゃんの立つ場所（カウンターの左はし、足元）。 */
export const SAKURA_POS = { x: 74, y: 316 } as const;
/** 食べ終わった子が座る、奥の長テーブル（足元の高さと、席の x）。 */
export const SEAT_Y = 214;
export const SEAT_XS = [150, 196, 242, 288, 334, 380, 426] as const;

// --- カウンター -------------------------------------------------------------

/** カウンターの天板（上のふち）と、前の板の下のふち。 */
export const COUNTER_TOP = 322;
export const COUNTER_BOTTOM = 514;
/** トレー（横いっぱい）。 */
export const TRAY = { x: 14, y: 376, w: 452, h: 124 } as const;
/** 「どうぞ！」ボタン（カウンターの奥のふち、器の上に横長。鍋からは遠ざける）。 */
export const SERVE_BTN = { x: 24, y: 330, w: 432, h: 38 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BowlSlot {
  /** 器の外形（ふちの左上と、幅・深さ）。 */
  bowl: Rect;
}

/** 器の並び（鍋の数 n と同じ数、左から順に）。 */
export function bowlLayout(n: number): BowlSlot[] {
  const inner = { x: TRAY.x + 10, w: TRAY.w - 20 };
  const w = n === 1 ? 160 : n === 2 ? 140 : n === 3 ? 118 : 92;
  // 「こうかん」ボタンをなくしたので、器はトレーの高さいっぱいに大きくする（目盛りを読みやすく）
  const h = n === 1 ? 100 : 92;
  const top = TRAY.y + (TRAY.h - h) / 2 - 2;
  const gap = (inner.w - w * n) / (n + 1);
  const out: BowlSlot[] = [];
  for (let i = 0; i < n; i++) {
    const x = inner.x + gap + i * (w + gap);
    out.push({ bowl: { x, y: top, w, h } });
  }
  return out;
}

/** 鍋の並び（カウンターの下に横並び。1 つのときは真ん中に大きく）。 */
export function potLayout(n: number): Rect[] {
  const y = COUNTER_BOTTOM + 8;
  const h = HEIGHT - 8 - y;
  if (n === 1) return [{ x: 130, y, w: 220, h }];
  const w = n === 2 ? 150 : n === 3 ? 132 : 106;
  const gap = (WIDTH - w * n) / (n + 1);
  return Array.from({ length: n }, (_, i) => ({ x: gap + i * (w + gap), y, w, h }));
}

/** 目盛りの高さ（器の深さに対する割合、仮の値。stages.ts と同じ値を使う）。 */
export const MARKS = { small: 0.3, normal: 0.55, large: 0.85 } as const;
