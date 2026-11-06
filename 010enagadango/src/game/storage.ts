const KEY = 'sakura-enagadango.highscore.v1';

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    // プライベートウィンドウなどで localStorage が使えない場合。
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}

const STARS_KEY = 'sakura-enagadango.stars.v1';

/** 各問の最高の ★（0 = まだ解いていない）。通し番号の順。 */
export function loadStars(n: number): number[] {
  const r = new Array<number>(n).fill(0);
  try {
    const raw = localStorage.getItem(STARS_KEY);
    if (raw === null) return r;
    const a: unknown = JSON.parse(raw);
    if (!Array.isArray(a)) return r;
    for (let i = 0; i < n; i++) {
      const v = Number(a[i]);
      if (Number.isInteger(v) && v >= 0 && v <= 3) r[i] = v;
    }
  } catch {
    /* 読めなければ、まだ何も解いていないことにする。 */
  }
  return r;
}

export function saveStars(stars: number[]): void {
  try {
    localStorage.setItem(STARS_KEY, JSON.stringify(stars));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}
