import { AudioManager } from './audio';
import { STAGES, SPEED, LIMIT, AMOUNTS, THRESHOLDS, STAR_AVERAGES, CLEAR_BONUS, FULL_BONUS, TIME_BONUS, LOW_KEEP, FIRST_WAIT, WALK_TIME, BAD_TIME, EAT_TIME, createCustomers } from './stages';
import { judge, type Customer, type Failure } from './serving';
import type { Rating } from './kids';
import type { FoodKind } from './food';
import { load, save } from './storage';

export type Screen = 'title' | 'intro' | 'play' | 'bad' | 'eat' | 'result' | 'demo' | 'over' | 'ending';
export interface ServedKid {
  customer: Customer;
  rating: Rating;
  points: number;
  /** 残り時間ボーナス。 */
  bonus: number;
  age: number;
  seat: number;
  departing: boolean;
}

export class Game {
  screen: Screen = 'title';
  paused = false;
  stage = 1;
  score = 0;
  index = 0;
  customers: Customer[] = [];
  bowls: number[] = [];
  pots: number[] = [];
  initial: number[] = [];
  hold = -1;
  last = 0;
  time = 0;
  waitMax = 0;
  clock = 0;
  walkTime = 0;
  sceneTime = 0;
  results: ServedKid[] = [];
  points: number[] = [];
  ratings: Rating[] = [];
  ratingPoints: number[] = [];
  servingTimes: number[] = [];
  waitRatios: number[] = [];
  /** この面の残り時間ボーナスの合計。 */
  timeBonus = 0;
  failure?: Failure;
  /** failure が empty のとき、なくなった品。 */
  emptyFood?: FoodKind;
  stars = 0;
  full = false;
  seed: number;
  randomState: number;
  records = load();
  private audioClock = 0;
  private lowClock = 0;

  constructor(public audio = new AudioManager(), options: { headless?: boolean; seed?: number } = {}) {
    this.seed = options.seed ?? 1;
    this.randomState = this.seed;
  }

  random(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  startRun(seed = this.seed): void {
    this.seed = seed;
    this.randomState = seed;
    this.stage = 1;
    this.score = 0;
    this.setup();
  }

  setup(): void {
    const config = STAGES[this.stage - 1];
    this.customers = createCustomers(this.stage, () => this.random());
    this.pots = config.foods.map((food, i) =>
      this.customers.reduce((sum, customer) => sum + (customer.wants[food] ?? 0), 0) + (i === 0 ? AMOUNTS[1] : 0) + config.slack
    );
    this.initial = [...this.pots];
    this.bowls = config.foods.map(() => 0);
    this.index = 0;
    this.points = [];
    this.ratings = [];
    this.ratingPoints = [];
    this.servingTimes = [];
    this.waitRatios = [];
    this.timeBonus = 0;
    this.results = [];
    this.hold = -1;
    this.screen = 'intro';
    this.paused = false;
    this.prepareCustomer();
  }

  get current(): Customer | undefined { return this.customers[this.index]; }
  get foods() { return STAGES[this.stage - 1].foods; }
  get average(): number { return this.points.length ? this.points.reduce((a, b) => a + b, 0) / this.points.length : 0; }
  /**
   * カウンターに着いた子の品のうち、鍋の残りでは「まあまあ」にも届かないもの（なくなった品）。
   * 多めによそいすぎると、あとの子の分がなくなってゲームオーバーになる。
   */
  shortFood(): FoodKind | undefined {
    const c = this.current;
    if (!c) return undefined;
    return this.foods.find((food, i) => {
      const want = c.wants[food];
      return want !== undefined && this.pots[i] < want - THRESHOLDS[2];
    });
  }

  get low(): boolean[] {
    const config = STAGES[this.stage - 1];
    // これから来る子の分（本体の鍋はさくらちゃんの分も）に、ゆとりの半分を足した量より少なくなったら揺らす。
    return this.foods.map((food, i) => {
      const need = this.customers.slice(this.index).reduce((sum, c) => sum + (c.wants[food] ?? 0), 0) + (i === 0 ? AMOUNTS[1] : 0);
      return this.pots[i] > 0.001 && this.pots[i] < need + config.slack * LOW_KEEP;
    });
  }

  private prepareCustomer(): void {
    this.waitMax = this.current?.hint || (this.stage === 1 && this.index < 3) ? FIRST_WAIT : STAGES[this.stage - 1].wait;
    this.time = this.waitMax;
    this.walkTime = WALK_TIME;
  }

  advance(): void {
    if (this.paused) return;
    switch (this.screen) {
      case 'title': this.startRun(); break;
      case 'intro': this.screen = 'play'; break;
      case 'result': this.screen = this.stage === 3 ? 'ending' : 'demo'; this.sceneTime = 0; this.audio.play('demo'); break;
      case 'demo': this.stage++; this.setup(); break;
      case 'over': case 'ending': this.screen = 'title'; break;
    }
  }

  press(index: number): void {
    if (this.screen !== 'play' || this.paused || this.walkTime > 0 || this.hold !== -1 || index < 0 || index >= this.pots.length) return;
    this.hold = index;
    this.last = index;
    this.audioClock = 0;
  }

  release(index: number): void { if (this.hold === index) this.hold = -1; }

  private disappoint(reason: Failure, emptyFood?: FoodKind): void {
    this.failure = reason;
    this.emptyFood = emptyFood;
    this.hold = -1;
    this.screen = 'bad';
    this.sceneTime = 0;
    this.audio.play('bad');
  }

  serve(): void {
    if (this.screen !== 'play' || this.paused || this.walkTime > 0 || !this.current) return;
    this.hold = -1;
    const customer = this.current;
    const result = judge(customer, this.foods, this.bowls, this.pots);
    if (result.failure) { this.disappoint(result.failure, result.emptyFood); return; }
    this.audio.play('serve');
    this.audio.play(result.rating);
    this.points.push(result.points);
    this.ratings.push(result.rating);
    this.ratingPoints.push(result.points);
    this.servingTimes.push(this.waitMax - this.time);
    this.waitRatios.push(Math.max(0, this.time / this.waitMax));
    // 早く渡すほど、残り時間ボーナス（待ちゲージの残りの割合 × 最大 30 点）
    const bonus = Math.round(TIME_BONUS * Math.max(0, this.time / this.waitMax));
    this.timeBonus += bonus;
    this.score += result.points + bonus;
    const occupied = this.results.filter(r => !r.departing);
    let seat = Array.from({ length: 7 }, (_, i) => i).find(i => !occupied.some(r => r.seat === i));
    if (seat === undefined) {
      const oldest = occupied[0];
      oldest.departing = true;
      oldest.age = 0;
      seat = oldest.seat;
    }
    this.results.push({ customer, rating: result.rating, points: result.points, bonus, age: 0, seat, departing: false });
    this.index++;
    this.bowls = this.foods.map(() => 0);
    if (this.index >= this.customers.length) {
      this.screen = 'eat';
      this.sceneTime = 0;
      this.full = this.pots[0] >= AMOUNTS[1];
    } else {
      this.prepareCustomer();
      // おかわりの子が席を立ち、列の２番目へ向かう。
      const next = this.customers[this.index + 1];
      if (next?.refill) {
        const source = this.results.find(r => !r.departing && r.customer === next.refillSource);
        if (source) { source.departing = true; source.age = 0; }
      }
    }
  }

  update(dt: number): void {
    if (this.paused) return;
    dt = Math.min(dt, 0.1);
    this.clock += dt;
    this.sceneTime += dt;
    this.results.forEach(r => { r.age += dt; });
    this.results = this.results.filter(r => !r.departing || r.age < 1);
    if (this.screen === 'bad' && this.sceneTime >= BAD_TIME) { this.screen = 'over'; return; }
    if (this.screen === 'eat' && this.sceneTime >= EAT_TIME) {
      this.score += CLEAR_BONUS + (this.full ? FULL_BONUS : 0);
      this.stars = this.average >= STAR_AVERAGES[2] && this.full ? 3 : this.average >= STAR_AVERAGES[1] ? 2 : this.average >= STAR_AVERAGES[0] ? 1 : 0;
      this.records.high = Math.max(this.records.high, this.score);
      this.records.stars[this.stage - 1] = Math.max(this.records.stars[this.stage - 1] || 0, this.stars);
      save(this.records);
      this.audio.play('clear');
      this.screen = 'result';
      return;
    }
    if (this.screen !== 'play') return;
    if (this.walkTime > 0) {
      this.walkTime = Math.max(0, this.walkTime - dt);
      if (this.walkTime === 0) {
        // カウンターに着いた子の分が、もう鍋に残っていなければ「○○が なくなった！」でがっかり
        const short = this.shortFood();
        if (short) { this.disappoint('empty', short); return; }
        if (this.current?.hungry) this.audio.play('hungry');
      }
      return;
    }
    this.time -= dt;
    if (this.time <= 0) { this.disappoint('time'); return; }
    this.lowClock -= dt;
    if (this.lowClock <= 0 && this.low.some(Boolean)) { this.audio.play('low'); this.lowClock = 2.4; }
    if (this.hold < 0) return;
    const i = this.hold;
    // 鍋が空になったら、それ以上はよそえない
    const amount = Math.min(SPEED[this.foods[i]] * dt, LIMIT - this.bowls[i], Math.max(0, this.pots[i]));
    this.bowls[i] += amount;
    this.pots[i] = Math.max(0, this.pots[i] - amount);
    if (amount <= 0) { this.hold = -1; return; }
    this.audioClock -= dt;
    if (this.audioClock <= 0) { this.audio.pour(this.foods[i]); this.audioClock = this.foods[i] === 'honey' ? 0.36 : 0.15; }
  }
}
