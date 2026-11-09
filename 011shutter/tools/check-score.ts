// 得点の内訳と合計が仕様どおりかを、ボットのプレイで確かめる。
// npm run check-score
import { Bot, SKILLS } from '../src/game/bot';
import { Game } from '../src/game/game';
import { passes } from '../src/game/photo';
import { PHOTO, SCORE, starsFor } from '../src/game/stages';

const silent = { play: () => {}, toggleMute: () => false, muted: true };
const RUNS = Number(process.argv[2] ?? 30);
let errors = 0;
let checked = 0;
const fail = (msg: string): void => {
  errors++;
  if (errors <= 20) console.log('NG', msg);
};

for (const skill of [...SKILLS, { ...SKILLS[1]!, name: 'れんだ', spam: true }]) {
  for (let i = 0; i < RUNS; i++) {
    const game = new Game(silent, { headless: true, seed: 3000 + i * 13 });
    const bot = new Bot(skill, i);
    game.startRun();
    const seen = new Set<string>();
    let guard = 0;
    while (game.phase !== 'final' && guard++ < 60 * 60 * 10) {
      if (game.phase === 'playing') {
        bot.step(game, 1 / 60);
        // 画面の上の「ごうけい」は、この面の写真の点数の合計
        const sum = game.photos.reduce((s, p) => s + p.r.score, 0);
        if (game.stageTotal !== sum) fail(`HUD ${game.stageTotal} != ${sum}`);
      } else game.confirm();
      game.update(1 / 60);
    }
    let runScore = 0;
    for (const rec of game.records) {
      const tag = `${skill.name} #${i} ${rec.stage}めん`;
      for (const p of rec.photos) {
        checked++;
        const r = p.r;
        if (r.subject !== 'sakura') {
          if (r.score !== 0) fail(`${tag} 違う子・だれもいない写真が ${r.score} 点`);
          continue;
        }
        const base = r.parts.inFrame + r.parts.size + r.parts.composition + r.parts.clear + r.parts.sharp;
        const want = Math.round(base + (r.facing ? PHOTO.facingBonus : 0) + (r.pose ? PHOTO.poseBonus : 0));
        if (r.score !== want) fail(`${tag} 写真 ${r.score} != 内訳 ${want}`);
        if (base > 100 + 1e-9 || r.score < 0 || r.score > 130) fail(`${tag} 範囲外 ${r.score}`);
      }
      const total = rec.photos.reduce((s, p) => s + p.r.score, 0);
      if (rec.total !== total) fail(`${tag} 写真の合計 ${rec.total} != ${total}`);
      const cleared = rec.photos.some((p) => passes(p.r));
      if (rec.cleared !== cleared) fail(`${tag} クリア判定`);
      const pt = rec.points;
      if (pt.photos !== total * SCORE.photo) fail(`${tag} 写真点 ${pt.photos}`);
      if (pt.theme !== (cleared ? SCORE.theme : 0)) fail(`${tag} お題点 ${pt.theme}`);
      if (pt.clear !== (cleared ? SCORE.clear : 0)) fail(`${tag} クリア点 ${pt.clear}`);
      // 新しいポーズ：その面の写真に写っていて、まだずかんになかったもの（同じものは 1 回だけ）
      const poses = new Set(rec.photos.map((p) => p.r.pose).filter((v): v is NonNullable<typeof v> => v !== null && !seen.has(v)));
      for (const v of poses) seen.add(v);
      if (rec.newPoses.length !== poses.size) fail(`${tag} 新ポーズ ${rec.newPoses.length} != ${poses.size}`);
      if (pt.poses !== poses.size * SCORE.newPose) fail(`${tag} ポーズ点 ${pt.poses}`);
      if (rec.stars !== (cleared ? starsFor(total) : 0)) fail(`${tag} ★ ${rec.stars}`);
      // 写真が並んでいる順（点数の高い順）
      for (let k = 1; k < rec.photos.length; k++) if (rec.photos[k - 1]!.r.score < rec.photos[k]!.r.score) fail(`${tag} 並び順`);
      if (rec.best !== (rec.photos[0] ?? null)) fail(`${tag} 新聞の写真`);
      runScore += pt.photos + pt.theme + pt.poses + pt.clear;
    }
    if (game.score !== runScore) fail(`${skill.name} #${i} 合計 ${game.score} != ${runScore}`);
    // クリアできなかった面のあとは進まない
    const firstFail = game.records.findIndex((r) => !r.cleared);
    if (firstFail >= 0 && game.records.length !== firstFail + 1) fail(`${skill.name} #${i} ゲームオーバー後も続いた`);
  }
}
console.log(`写真 ${checked} 枚・${RUNS * 4} 回を確認：${errors === 0 ? 'すべて一致' : `${errors} 件のずれ`}`);
process.exit(errors === 0 ? 0 : 1);
