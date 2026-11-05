// 自動プレイのボット（開発時に難しさを測るためだけに使う。ゲーム本体からは読みこまない）。
// 腕前は「タップのずれの大きさ」と「フェイントにつられる割合」で分ける。
import { Game, seededRandom, type GameAudio, type Rand } from './game';
import type { Note } from './stages';

export interface Skill {
  /** タップのずれの標準偏差（秒）。 */
  sigma: number;
  /** ずれのくせ（正で遅れがち）。 */
  bias: number;
  /** フェイントにつられる割合。 */
  bait: number;
  /** ふりむき（輪が見えにくい）で、ずれが何倍になるか。 */
  blind: number;
  /** はやつき・雪玉で、ずれが何倍になるか。 */
  rush: number;
}

export const SKILLS: Record<string, Skill> = {
  じょうず: { sigma: 0.03, bias: 0, bait: 0.02, blind: 1.25, rush: 1.15 },
  ふつう: { sigma: 0.045, bias: 0.005, bait: 0.08, blind: 1.3, rush: 1.2 },
  はじめて: { sigma: 0.06, bias: 0.01, bait: 0.2, blind: 1.35, rush: 1.25 }
};

function gauss(rand: Rand): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/** 譜面を読んで、ゆらぎのある時刻にタップする。 */
export class Bot {
  private plan: number[] = [];
  private planned = new Set<Note>();

  constructor(
    private readonly game: Game,
    private readonly skill: Skill,
    private readonly rand: Rand
  ) {}

  private sigmaOf(n: Note): number {
    const s = this.skill;
    if (n.kind === 'away') return s.sigma * s.blind;
    if (n.kind === 'fast' || n.kind === 'snow') return s.sigma * s.rush;
    return s.sigma;
  }

  /** 今フレームのぶんのタップを出す。 */
  step(): void {
    const g = this.game;
    if (g.phase !== 'playing' || g.chart === null) return;
    const now = g.now();
    for (const n of g.chart.notes) {
      if (n.t > now + 0.5) break;
      if (n.lesson || this.planned.has(n)) continue;
      this.planned.add(n);
      if (n.kind === 'feint') {
        if (this.rand() < this.skill.bait) this.plan.push(n.t + gauss(this.rand) * this.skill.sigma);
      } else {
        this.plan.push(n.t + this.skill.bias + gauss(this.rand) * this.sigmaOf(n));
      }
    }
    this.plan.sort((a, z) => a - z);
    while (this.plan.length > 0 && this.plan[0]! <= now) {
      const t = this.plan.shift()!;
      g.press(null, null, now - t);
    }
  }
}

export interface SimResult {
  cleared: number;
  score: number;
  stars: number[];
  /** 面ごとのぴったりの割合。 */
  ratios: number[];
  /** 面ごとのミス数（埋まった面もふくむ）。 */
  misses: number[];
  /** 面ごとの長さ。 */
  times: number[];
  end: 'clear' | 'buried';
}

/** 時間を一気に進める偽物の音と時計。 */
class SimAudio implements GameAudio {
  t = 1000;
  muted = false;
  now(): number {
    return this.t;
  }
  play(): void {}
  playAt(): void {}
  toggleMute(): boolean {
    return false;
  }
}

/** 1 回ぶん遊ぶ。 */
export function playOnce(skill: Skill, seed: number, lateSlack = 0, dt = 1 / 240): SimResult {
  const audio = new SimAudio();
  const game = new Game(audio, seededRandom(seed), lateSlack);
  const bot = new Bot(game, skill, seededRandom(seed + 7777));
  game.start();
  const res: SimResult = { cleared: 0, score: 0, stars: [], ratios: [], misses: [], times: [], end: 'clear' };
  let stageT0 = audio.t;
  let logged = -1;
  for (let i = 0; i < 2000000; i++) {
    audio.t += dt;
    bot.step();
    game.update(dt);
    if (game.phase === 'stageClear' && logged !== game.stageIndex) {
      logged = game.stageIndex;
      res.cleared = game.stageIndex + 1;
      res.stars.push(game.stars);
      res.ratios.push(game.ratio);
      res.misses.push(game.misses);
      res.times.push(audio.t - stageT0);
    }
    if (game.phase === 'stageClear' && game.phaseTime > 1.3) game.press(null, null);
    if (game.phase === 'demo' && game.phaseTime > 1.1) {
      game.press(null, null);
      stageT0 = audio.t;
    }
    if (game.phase === 'ending' && game.phaseTime > 1.6) game.press(null, null);
    if (game.phase === 'buried') {
      res.end = 'buried';
      res.misses.push(game.misses);
      break;
    }
    if (game.phase === 'result') break;
  }
  res.score = game.score;
  return res;
}
