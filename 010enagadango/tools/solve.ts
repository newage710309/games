// 全 14 問をソルバーで解いて、README に載せる表を出す。`npm run solve` で実行する。
import { birdCount } from '../src/game/rules';
import { solve } from '../src/game/solver';
import { STAGES } from '../src/game/stages';

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

console.log('| 問題 | 鳥 | しかけ | 余裕 | 解の数 | ★★★ の解 | でたらめに置いてクリア | 落ちずに置き終えても失敗 | ★★★ の解の一例 |');
console.log('|---|---|---|---|---|---|---|---|---|');
let bad = 0;
for (const [s, st] of STAGES.entries()) {
  for (const [i, p] of st.puzzles.entries()) {
    const r = solve(p);
    const tricks: string[] = [];
    if (p.queue.some((a) => a.kind === 'bird' && a.order)) tricks.push('注文');
    if (p.snow.length > 0) tricks.push(`雪 ${p.snow.length}`);
    const balls = p.queue.filter((a) => a.kind === 'snowball').length;
    if (balls > 0) tricks.push(`雪玉 ${balls}`);
    const stuck = r.leaves === 0 ? 0 : (r.leaves - r.solutions) / r.leaves;
    console.log(
      `| ${s + 1}-${i + 1} | ${birdCount(p)} | ${tricks.join('・') || '―'} | ${p.limit} | ${r.solutions} | ${r.dango} | ${pct(r.randomClear)} | ${pct(stuck)} | ${r.dangoExample?.join(', ') ?? '―'} |`
    );
    if (r.solutions === 0 || r.dango === 0) bad++;
  }
}
if (bad > 0) {
  console.error(`解けない、または ★★★ が取れない問題が ${bad} 問あります`);
  process.exit(1);
}
