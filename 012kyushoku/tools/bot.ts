import { Game } from '../src/game/game';
import { Bot, SKILLS, type SkillName } from '../src/game/bot';
import type { Failure } from '../src/game/serving';

const runs = Math.max(1, Number(process.argv[2]) || 30);
const reasons: Failure[] = ['amount', 'wrong', 'time', 'hot', 'empty'];
interface StageStats {
  reached: number;
  clear: number;
  stars: number[];
  points: number;
  full: number;
  failures: Record<Failure, number>;
  emptyPots: number;
  served: number;
  totalSeconds: number;
  totalWait: number;
  minWait: number;
}
function newStats(): StageStats {
  return { reached: 0, clear: 0, stars: [0, 0, 0, 0], points: 0, full: 0,
    failures: { amount: 0, wrong: 0, time: 0, hot: 0, empty: 0 }, emptyPots: 0,
    served: 0, totalSeconds: 0, totalWait: 0, minWait: 1 };
}
const percentage = (value: number, total: number): string => total ? (100 * value / total).toFixed(1) + '%' : '—';
for (const skill of Object.keys(SKILLS) as SkillName[]) {
  const stats = [newStats(), newStats(), newStats()];
  for (let seed = 1; seed <= runs; seed++) {
    const game = new Game(undefined, { headless: true, seed });
    const bot = new Bot(game, skill);
    game.startRun(seed);
    let previousStage = 0;
    let recordedStage = 0;
    let recordedServings = 0;
    const exhausted = [new Set<number>(), new Set<number>(), new Set<number>()];
    for (let tick = 0; tick < 300000; tick++) {
      const stage = game.stage - 1;
      if (game.stage !== previousStage) { stats[stage].reached++; previousStage = game.stage; recordedServings = 0; }
      game.pots.forEach((amount, i) => { if (game.initial[i] > 0.000001 && amount <= 0.000001) exhausted[stage].add(i); });
      if (game.screen === 'result' && recordedStage !== game.stage) {
        const row = stats[stage];
        row.clear++;
        row.stars[game.stars]++;
        row.points += game.average;
        if (game.full) row.full++;
        row.emptyPots += exhausted[stage].size;
        recordedStage = game.stage;
      }
      if (game.screen === 'over') {
        stats[stage].failures[game.failure ?? 'amount']++;
        stats[stage].emptyPots += exhausted[stage].size;
        break;
      }
      if (game.screen === 'ending') break;
      bot.update(0.05);
      while (recordedServings < game.servingTimes.length) {
        const row = stats[stage];
        row.served++;
        row.totalSeconds += game.servingTimes[recordedServings];
        const ratio = game.waitRatios[recordedServings];
        row.totalWait += ratio;
        row.minWait = Math.min(row.minWait, ratio);
        recordedServings++;
      }
      game.update(0.05);
      if (tick === 299999) throw new Error('ボットが制限時間内に終了しませんでした: ' + skill + ' seed=' + seed);
    }
  }
  console.log('\n' + skill + '（' + runs + '回）');
  console.log('面  到達率    クリア率  ★0/1/2/3       平均点  満腹率    ずれ 間違い 時間 熱い 鍋なし 鍋空回数 平均秒 残り平均 残り最小');
  stats.forEach((row, i) => {
    const cols = [String(i + 1).padEnd(3), percentage(row.reached, runs).padEnd(10), percentage(row.clear, runs).padEnd(10),
      row.stars.join('/').padEnd(16), (row.clear ? (row.points / row.clear).toFixed(1) : '—').padEnd(8), percentage(row.full, row.clear).padEnd(10),
      ...reasons.map(reason => String(row.failures[reason]).padEnd(6)), String(row.emptyPots).padEnd(9),
      (row.served ? (row.totalSeconds / row.served).toFixed(2) : '—').padEnd(7),
      percentage(row.totalWait, row.served).padEnd(10), row.served ? (row.minWait * 100).toFixed(1) + '%' : '—'];
    console.log(cols.join(''));
  });
}
