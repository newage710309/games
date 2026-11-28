// 自動プレイ：腕前の違うボットを何回も走らせて、コースごとのクリア率・★・打数を表にする。
// npm run bot  （回数を変えるとき：npm run bot -- 50）
import { Bot, SKILLS, type BotSkill } from '../src/game/bot';
import { Game } from '../src/game/game';
import { COURSES, coursePar, courseTarget } from '../src/game/stages';

const RUNS = Number(process.argv[2] ?? 30);
const ONLY = process.argv[3];
const DT = 1 / 60;

const silent = { play: () => {}, toggleMute: () => false, muted: true };

interface Run {
  totals: number[];
  cleared: boolean[];
  stars: number[];
  holes: number[];
  aces: number;
  score: number;
}

function play(skill: BotSkill, seed: number): Run {
  const game = new Game(silent, { headless: true });
  const bot = new Bot(skill, seed);
  game.startRun();
  let guard = 0;
  while (game.phase !== 'final' && game.phase !== 'title' && guard++ < 60 * 60 * 60) {
    if (game.phase === 'aim') bot.step(game, DT);
    else if (game.phase === 'card') game.confirm();
    else if (game.phase !== 'rolling' && game.phase !== 'result') game.confirm();
    game.update(DT);
  }
  const run: Run = { totals: [], cleared: [], stars: [], holes: [], aces: 0, score: game.score };
  for (const r of game.records) {
    run.totals.push(r.total);
    run.cleared.push(r.cleared);
    run.stars.push(r.stars);
    run.holes.push(...r.strokes);
    run.aces += r.aces.filter(Boolean).length;
  }
  return run;
}

const pct = (n: number, d: number): string => (d === 0 ? '―' : `${Math.round((n / d) * 100)}%`);
const avg = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

function table(skills: BotSkill[]): void {
  console.log('| ボット | コース | とどいた | クリア | ★ 以上 | ★★ 以上 | ★★★ | 打数の平均（パー / もくひょう） |');
  console.log('|---|---|---|---|---|---|---|---|');
  const holeRows: string[] = [];
  for (const skill of skills) {
    const t0 = Date.now();
    const runs: Run[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(play(skill, 1000 + i * 17));
    for (let c = 0; c < 3; c++) {
      const at = runs.filter((r) => r.totals.length > c);
      const st = (n: number): number => at.filter((r) => r.stars[c]! >= n && r.cleared[c]).length;
      const cl = at.filter((r) => r.cleared[c]).length;
      const course = COURSES[c]!;
      console.log(
        `| ${skill.name} | ${c + 1} めん | ${at.length} | ${pct(cl, at.length)} | ${pct(st(1), at.length)} | ${pct(st(2), at.length)} | ${pct(st(3), at.length)} | ${avg(at.map((r) => r.totals[c]!)).toFixed(1)}（${coursePar(course)} / ${courseTarget(course)}） |`
      );
    }
    const end = runs.filter((r) => r.cleared.length === 3 && r.cleared.every(Boolean)).length;
    console.log(`| ${skill.name} | エンディング | ${pct(end, RUNS)} | 平均点 ${Math.round(avg(runs.map((r) => r.score)))} | ホールインワン ${(avg(runs.map((r) => r.aces))).toFixed(2)} 回 | | | |`);
    // ホールごと
    const per: string[] = [];
    for (let h = 0; h < 9; h++) {
      const v = runs.filter((r) => r.holes.length > h).map((r) => r.holes[h]!);
      const par = COURSES[Math.floor(h / 3)]!.holes[h % 3]!.par;
      per.push(v.length ? `${avg(v).toFixed(1)}(${par})` : '―');
    }
    holeRows.push(`| ${skill.name} | ${per.join(' | ')} |`);
    console.error(`  ${skill.name}: ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
  }
  console.log('');
  console.log('ホールごとの打数の平均（かっこ内はパー。そのホールまで とどいた回だけ）');
  console.log('| ボット | 1-1 | 1-2 | 1-3 | 2-1 | 2-2 | 2-3 | 3-1 | 3-2 | 3-3 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of holeRows) console.log(r);
}

console.log(`各ボット ${RUNS} 回ずつ`);
const list = ONLY ? SKILLS.filter((s) => s.name === ONLY) : SKILLS;
table(list);
if (!ONLY) {
  console.log('');
  console.log('「毎回思いきり打つ」と「坂を読んで寄せる」の比べ（腕前は ふつう）');
  const normal = SKILLS[1]!;
  table([
    { ...normal, name: 'ふつう（坂を読んで寄せる）' },
    { ...normal, name: 'ふつう（毎回思いきり）', bigOnly: true }
  ]);
}
