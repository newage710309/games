import type { DifficultyId } from './constants';

// ラケットの長さで難しさがまるで違うので、ハイスコアは難易度ごとに分けて持つ。
const key = (d: DifficultyId): string => `shimaenaga-block.highscore.${d}.v1`;

export function loadHighScore(d: DifficultyId): number {
  try {
    const raw = localStorage.getItem(key(d));
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    // プライベートウィンドウなどで localStorage が使えない場合。
    return 0;
  }
}

export function saveHighScore(d: DifficultyId, score: number): void {
  try {
    localStorage.setItem(key(d), String(score));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}
