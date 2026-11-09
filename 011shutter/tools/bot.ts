// 自動プレイ：腕前の違うボットを何回も走らせて、面ごとのクリア率・★・点数を表にする。
// npm run bot  （回数を変えるとき：npm run bot -- 50）
import { Bot, SKILLS, type BotSkill } from '../src/game/bot';
import { Game } from '../src/game/game';
import { RANKS, STAGES, rankFor } from '../src/game/stages';

const RUNS = Number(process.argv[2] ?? 30);
const DT = 1 / 60;

const silent = { play: () => {}, toggleMute: () => false, muted: true };

interface Run {
  reached: number[];
  cleared: boolean[];
  stars: number[];
  totals: number[];
  shots: number[];
  avgPhoto: number[];
  poses: number;
  score: number;
}

function play(skill: BotSkill, seed: number): Run {
  const game = new Game(silent, { headless: true, seed });
  const bot = new Bot(skill, seed * 31 + 7);
  game.startRun();
  const run: Run = { reached: [], cleared: [], stars: [], totals: [], shots: [], avgPhoto: [], poses: 0, score: 0 };
  let guard = 0;
  while (game.phase !== 'final' && guard++ < 60 * 60 * 10) {
    if (game.phase === 'playing') bot.step(game, DT);
    else game.confirm();
    game.update(DT);
  }
  for (const r of game.records) {
    run.reached.push(r.stage);
    run.cleared.push(r.cleared);
    run.stars.push(r.stars);
    run.totals.push(r.total);
    run.shots.push(r.photos.length);
    run.avgPhoto.push(r.photos.length ? r.total / r.photos.length : 0);
    run.poses += r.newPoses.length;
  }
  run.score = game.score;
  return run;
}

const pct = (n: number, d: number): string => (d === 0 ? '―' : `${Math.round((n / d) * 100)}%`);
const avg = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

function table(skills: BotSkill[]): void {
  console.log(`| ボット | 面 | とどいた | クリア | ★ 以上 | ★★ 以上 | ★★★ | 写真の合計（平均） | 1 枚の平均 | 撮った枚数 |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|`);
  for (const skill of skills) {
    const runs: Run[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(play(skill, 1000 + i * 17));
    for (let s = 0; s < STAGES.length; s++) {
      const at = runs.filter((r) => r.reached.length > s);
      const cl = at.filter((r) => r.cleared[s]);
      const st = (n: number): number => cl.filter((r) => r.stars[s]! >= n).length;
      console.log(
        `| ${skill.name} | ${s + 1} めん | ${at.length} | ${pct(cl.length, at.length)} | ${pct(st(1), at.length)} | ${pct(st(2), at.length)} | ${pct(st(3), at.length)} | ${Math.round(avg(at.map((r) => r.totals[s]!)))} | ${Math.round(avg(at.map((r) => r.avgPhoto[s]!)))} | ${avg(at.map((r) => r.shots[s]!)).toFixed(1)} |`
      );
    }
    const end = runs.filter((r) => r.cleared.length === 3 && r.cleared.every(Boolean)).length;
    const ranks = RANKS.map((_, i) => runs.filter((r) => rankFor(r.score) === i).length);
    console.log(`| ${skill.name} | エンディング | ${pct(end, RUNS)} | 平均点 ${Math.round(avg(runs.map((r) => r.score)))} | ポーズ ${avg(runs.map((r) => r.poses)).toFixed(1)} 種 | 称号（みならい→でんせつ）${ranks.join('・')} | | | | |`);
  }
}

console.log(`各ボット ${RUNS} 回ずつ`);
table(SKILLS);
console.log('');
console.log('「とりあえず連打」と「いい瞬間を待つ」の比べ（腕前は ふつう）');
const normal = SKILLS[1]!;
table([
  { ...normal, name: 'ふつう（待つ）' },
  { ...normal, name: 'ふつう（連打）', spam: true }
]);
