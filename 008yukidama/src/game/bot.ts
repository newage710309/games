// 自動プレイのボット（開発時に難しさを測るためだけに使う。ゲーム本体からは読みこまない）。
// 行き先の候補をいくつか試し、見えているものを通ったときの大きさの増減（cm）で点をつけて、いちばんよい所へ動かす。
import type { Prop, Rand } from './course';
import { CHIP, fallSpeed, ICE_GRIP, radiusOf, steerAccel, steerMax, SUN_MELT, type Stage } from './stages';
import type { Game } from './game';
import { ridgeHalf } from './course';
import { hash } from './ui';

/** 分かれ道の選び方。auto = そのつど損得で、wide = 広い道だけ、lane = 近道だけ（大きければ日なたでとかす）、fit = とかさずに通れるときだけ近道、mix = 最後の分かれ道だけ広い道で、ほかは通れれば近道。 */
export type Route = 'auto' | 'wide' | 'lane' | 'fit' | 'mix';

export interface Skill {
  /** 考えなおす間隔（秒）。 */
  plan: number;
  /** どこまで先を見るか（ゲーム世界の座標）。 */
  view: number;
  /** ものに気づく割合。 */
  notice: number;
  /** 行き先のぶれ（座標）。 */
  wobble: number;
  /** 雪だまりをほしがる強さ。 */
  greed: number;
  /** ぶつかるのをいやがる強さ。 */
  care: number;
  route: Route;
}

export const SKILLS: Record<string, Skill> = {
  じょうず: { plan: 0.12, view: 640, notice: 1, wobble: 0, greed: 1, care: 2.6, route: 'auto' },
  ふつう: { plan: 0.28, view: 440, notice: 0.85, wobble: 14, greed: 0.8, care: 1.6, route: 'auto' },
  はじめて: { plan: 0.5, view: 300, notice: 0.65, wobble: 30, greed: 0.5, care: 1, route: 'auto' },
  広い道だけ: { plan: 0.12, view: 640, notice: 1, wobble: 0, greed: 1, care: 2.6, route: 'wide' },
  通れれば近道: { plan: 0.12, view: 640, notice: 1, wobble: 0, greed: 1, care: 2.6, route: 'fit' },
  使い分け: { plan: 0.12, view: 640, notice: 1, wobble: 0, greed: 1, care: 2.6, route: 'mix' },
  名人: { plan: 0.06, view: 900, notice: 1, wobble: 0, greed: 1, care: 6, route: 'auto' },
  近道だけ: { plan: 0.12, view: 640, notice: 1, wobble: 0, greed: 1, care: 2.6, route: 'lane' }
};

const CANDS = 13;

/** ゲームを外から動かすボット。毎フレーム step(dt) を呼ぶ。 */
export class Bot {
  private wait = 0;
  private goal = 240;

  constructor(
    private readonly game: Game,
    private readonly skill: Skill,
    private readonly rand: Rand
  ) {}

  step(dt: number): void {
    const g = this.game;
    if (g.phase !== 'playing') return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = this.skill.plan;
    this.goal = this.choose();
    g.setTarget(this.goal + (this.rand() - 0.5) * 2 * this.skill.wobble);
  }

  private seen(p: Prop): boolean {
    return this.skill.notice >= 1 || hash(p.seed, p.y) < this.skill.notice;
  }

  private choose(): number {
    const g = this.game;
    const [l, h] = g.course.road(g.y + 160);
    const r = g.r;
    let best = g.x;
    let bestV = -Infinity;
    for (let i = 0; i < CANDS; i++) {
      const cand = l + r + ((h - l - 2 * r) * i) / (CANDS - 1);
      let v = this.value(cand);
      v -= Math.abs(cand - g.x) * 0.002; // ふらふらしないように
      if (Math.abs(cand - this.goal) < 30) v += 0.4;
      if (v > bestV) {
        bestV = v;
        best = cand;
      }
    }
    return best;
  }

  /** cand へ向かったときの、大きさの増減の見こみ。 */
  private value(cand: number): number {
    const g = this.game;
    const stage: Stage = g.stage;
    const c = g.course;
    const cm = g.cm;
    const r = radiusOf(cm);
    const v = fallSpeed(stage, cm);
    const maxV = steerMax(cm);
    const y0 = g.y;
    const y1 = y0 + this.skill.view;
    // 今の勢いと曲がりやすさ（氷の上は曲がりにくい）を考えた、y での左右の位置
    const onIce = c.patches.some((p) => p.kind === 'ice' && Math.abs(y0 - p.y) < p.h / 2 && Math.abs(g.x - p.x) < p.w / 2);
    const accel = steerAccel(cm) * (onIce ? ICE_GRIP : 1);
    // ゲームと同じ曲がり方で、cand へ向かう道すじを前もって計算しておく
    const STEP_T = 0.05;
    const path: number[] = [];
    let px = g.x;
    let pv = g.vx;
    const end = this.skill.view / v + STEP_T;
    for (let t = 0; t <= end; t += STEP_T) {
      path.push(px);
      const want = Math.max(-maxV, Math.min(maxV, (cand - px) * 7));
      pv += Math.max(-accel * STEP_T, Math.min(accel * STEP_T, want - pv));
      px += pv * STEP_T;
    }
    const pathX = (y: number): number => {
      const i = Math.max(0, Math.min(path.length - 1, Math.round((y - y0) / v / STEP_T)));
      return path[i]!;
    };
    let val = 0;
    const bump = cm * CHIP * this.skill.care + (g.chips === 0 ? 3 : 0);
    const aim = stage.goal * 2.05;
    const want = cm < aim ? 1 : 0.25;

    for (const p of c.props) {
      if (p.y <= y0 - 10) continue;
      if (p.y > y1) break;
      if (p.eaten || p.bumped || !this.seen(p)) continue;
      const dx = pathX(p.y) - p.x;
      const reach = r * 0.95 + p.r + (p.amp > 0 ? p.amp * 0.5 : 0);
      if (Math.abs(dx) >= reach) continue;
      val += p.eatAt !== null && cm >= p.eatAt ? (p.kind === 'berry' ? 0.5 : 0.25) : -bump;
    }
    for (const p of c.patches) {
      if (p.y + p.h / 2 < y0 || p.y - p.h / 2 > y1) continue;
      const dx = Math.abs(pathX(p.y) - p.x);
      if (p.kind === 'drift') {
        if (p.left <= 0) continue;
        const over = p.w / 2 + r * 0.6 - dx;
        if (over > 0) val += p.amount * p.left * Math.min(1, over / Math.min(p.w, 2 * r)) * this.skill.greed * want;
      } else if (dx < p.w / 2) {
        const time = p.h / v;
        const loss = p.kind === 'sun' ? cm * SUN_MELT * time : stage.snowRate * time + 1;
        val -= p.kind === 'sun' && this.wantsToMelt(p.y) ? -loss : loss;
      }
    }
    for (const rd of c.ridges) {
      if (rd.y2 < y0 || rd.y1 > y1) continue;
      const py = Math.max(y0, Math.min(rd.y2, rd.y1 + 110));
      if (Math.abs(pathX(py) - rd.x) < ridgeHalf(rd, py) + r) val -= 8;
    }
    for (const gate of c.gates) {
      if (gate.y < y0 - 40 || gate.y > y1 + 300) continue;
      const x = pathX(gate.y);
      const inLane = x > gate.left && x < gate.right;
      const route = this.skill.route;
      if (route === 'wide' && inLane) val -= 200;
      if (route === 'lane' && !inLane) val -= 200;
      if (route === 'fit' && inLane && cm <= gate.cm) val += 60;
      if (route === 'mix') {
        if (gate !== c.gates[c.gates.length - 1]) {
          if (inLane && cm <= gate.cm) val += 60;
        } else if (inLane) val -= 200;
      }
      if (inLane && cm > gate.cm && route !== 'lane') val -= bump * 1.5;
    }
    // 近道の中は道なりに（ボットの route が lane のときは出ない）
    for (const lane of c.lanes) {
      if (y0 > lane.y1 && y0 < lane.y2 && cand > lane.left && cand < lane.right && g.x > lane.left && g.x < lane.right) val += 0.2;
    }
    return val;
  }

  /** 「近道だけ」のとき、次の門より大きければ日なたへ行きたい。 */
  private wantsToMelt(sunY: number): boolean {
    if (this.skill.route !== 'lane') return false;
    const gate = this.game.course.gates.find((g) => g.y > sunY);
    return gate !== undefined && this.game.cm > gate.cm * 0.98;
  }
}

export interface SimResult {
  /** 何面までクリアしたか（0〜3）。 */
  cleared: number;
  score: number;
  /** 面ごとの星。 */
  stars: number[];
  /** 面ごとの、とりでに着いたときの大きさ（着かなかったら 0）。 */
  arrived: number[];
  /** 面ごとの、欠けた回数。 */
  chips: number[];
  /** 面ごとの秒数。 */
  times: number[];
  /** おしまいの理由。 */
  end: string;
}

/** 1 回ぶん遊ぶ。only を渡すと、その面だけ（面のはじめから）を遊ぶ。 */
export function playOnce(game: Game, skill: Skill, rand: Rand, dt = 1 / 30): SimResult {
  const bot = new Bot(game, skill, rand);
  game.start();
  const res: SimResult = { cleared: 0, score: 0, stars: [], arrived: [], chips: [], times: [], end: 'clear' };
  let lastStage = -1;
  for (let i = 0; i < 400000; i++) {
    bot.step(dt);
    game.update(dt);
    if (game.phase === 'impact' && lastStage !== game.stageIndex) {
      lastStage = game.stageIndex;
      res.arrived.push(game.arrivedCm);
      res.chips.push(game.chips);
      res.times.push(game.stageTime);
    }
    if (game.phase === 'stageClear') {
      res.cleared = game.stageIndex + 1;
      if (res.stars.length <= game.stageIndex) res.stars.push(game.stars);
      game.tap(null, null);
      if (game.phaseTime > 1.3) game.tap(null, null);
    }
    if (game.phase === 'gameover') {
      res.end = game.missReason;
      break;
    }
    if (game.phase === 'result') break;
    if (game.phase === 'demo' || game.phase === 'ending') game.tap(null, null);
  }
  res.score = game.score;
  return res;
}
