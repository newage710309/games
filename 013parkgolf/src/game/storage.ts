// ハイスコア・コースごとの最高 ★ と最少打数・きねんスタンプの保存。
// 読み書きに失敗しても遊べるようにする（011 の storage.ts にならう）。

const PREFIX = 'sakura-parkgolf';
const HI_KEY = `${PREFIX}.highscore.v1`;
const BEST_KEY = `${PREFIX}.best.v1`;
const STAMP_KEY = `${PREFIX}.stamps.v2`;
const STAMP_KEY_V1 = `${PREFIX}.stamps.v1`;

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HI_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    // プライベートウィンドウなどで localStorage が使えない場合。
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HI_KEY, String(score));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}

/** コースごとの記録（まだ回っていなければ null）。 */
export interface CourseBest {
  stars: number;
  strokes: number;
}

export function loadBest(): (CourseBest | null)[] {
  const out: (CourseBest | null)[] = [null, null, null];
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw === null) return out;
    const a: unknown = JSON.parse(raw);
    if (!Array.isArray(a)) return out;
    for (let i = 0; i < 3; i++) {
      const v = a[i] as Partial<CourseBest> | null | undefined;
      if (v && typeof v.stars === 'number' && typeof v.strokes === 'number' && v.strokes > 0) {
        out[i] = { stars: Math.max(0, Math.min(3, Math.floor(v.stars))), strokes: Math.floor(v.strokes) };
      }
    }
  } catch {
    /* 読めなければ、記録なしにする。 */
  }
  return out;
}

export function saveBest(best: (CourseBest | null)[]): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}

/**
 * ホールごとの「きねんスタンプ」（0..8 の 9 ホール）。0 = まだ、1 = バーディ以上、2 = ホールインワン。
 * 前の版（ホールインワンだけを集めていた v1）の記録は、ホールインワンとして引きつぐ。
 */
export function loadStamps(): number[] {
  const out = new Array<number>(9).fill(0);
  try {
    const raw = localStorage.getItem(STAMP_KEY);
    if (raw !== null) {
      const a: unknown = JSON.parse(raw);
      if (Array.isArray(a)) for (let i = 0; i < 9; i++) out[i] = a[i] === 2 ? 2 : a[i] === 1 ? 1 : 0;
      return out;
    }
    const old = localStorage.getItem(STAMP_KEY_V1);
    if (old !== null) {
      const a: unknown = JSON.parse(old);
      if (Array.isArray(a)) for (const v of a) if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 9) out[v] = 2;
    }
  } catch {
    /* 読めなければ、まだスタンプなしにする。 */
  }
  return out;
}

export function saveStamps(levels: number[]): void {
  try {
    localStorage.setItem(STAMP_KEY, JSON.stringify(levels));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}
