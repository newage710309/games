// 旧名「かえるちゃん」時代のキー名のまま。変えると、これまでのハイスコアが消えてしまう
// （localStorage はドメイン単位なので、URL が /games/001daioudan/ に変わっても引き継がれる）。
const KEY = 'kaeruchan.highscore.v1';

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
