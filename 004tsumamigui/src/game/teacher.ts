// 先生の動き（フクロウ先生と、3 時間目の見回りの先生）。
// どちらも「予兆 → こちらを見る」の順を必ず守る。予兆なしにいきなり見ることはない。
import {
  FEINT_TURN,
  TAKE_CHALK_TIME,
  TURN_TIME,
  UNTURN_TIME,
  WATCH_TURN,
  WRITE_RATE
} from './constants';
import type { WingPose } from './characters';
import { PATROL, type Range, type Stage } from './stages';

export type Rand = () => number;

const between = (rand: Rand, [a, b]: Range): number => a + (b - a) * rand();

/** 先生が出す音（Game が効果音に変える）。 */
export type TeacherEvent = 'cough' | 'turn' | 'take' | 'chalk' | 'put' | 'feint' | 'warn';

/**
 * フクロウ先生の状態。
 *   explain  黒板を見ながら説明（後ろ向き）
 *   cue      せき払い＋首がぴくっ（予兆）。このあと turn か feint
 *   turn     首を回している（途中から「見ている」）
 *   look     こちらを見ている
 *   unturn   首を戻している
 *   feint    振り向きかけて戻る（見ていない）
 *   take     チョークを取る
 *   write    板書（書きながらのフェイントもある）
 *   put      チョークを置く（予兆）。このあと必ず turn
 */
export type OwlState = 'explain' | 'cue' | 'turn' | 'look' | 'unturn' | 'feint' | 'take' | 'write' | 'put';

export class Owl {
  state: OwlState = 'explain';
  /** 今の状態になってからの秒数。 */
  t = 0;
  /** 今の状態の長さ。 */
  dur = 0;
  /** 首の向き 0..1（1 でこちらを向く）。 */
  turn = 0;
  chalkInHand = false;
  /** 黒板に書いた文字数（全体の通し番号）。 */
  written = 0;
  /** 頭の上の吹き出し。 */
  say = '';
  sayTime = 0;
  /** cue のあとにフェイントにするか。 */
  private feintNext = false;
  /** 板書中のフェイント：始まる時刻（-1 ならしない）。 */
  private writeFeintAt = -1;
  private chalkTick = 0;

  constructor(
    private readonly stage: Stage,
    private readonly rand: Rand,
    private readonly emit: (e: TeacherEvent) => void
  ) {}

  /**
   * 授業の始め：黒板のほうを向いた「説明」から始める。
   * （よーいの間にこちらを向いている絵は render 側で描き、はじめの合図までに黒板へ向き直らせる。
   *   授業が始まった瞬間に「見ている」状態だと、予兆なしで見つかってしまうため。）
   */
  begin(): void {
    this.turn = 0;
    this.set('explain', between(this.rand, this.stage.explain));
  }

  /** こちらを見ているか（このとき押していたら見つかる）。 */
  get watching(): boolean {
    return (this.state === 'turn' || this.state === 'look' || this.state === 'unturn') && this.turn >= WATCH_TURN;
  }

  get wing(): WingPose {
    if (this.state === 'take' || this.state === 'put') return 'reach';
    if (this.state === 'write') return 'write';
    return 'rest';
  }

  /** 黒板の文字の総数。 */
  get boardTotal(): number {
    return this.stage.board.reduce((n, l) => n + l.length, 0);
  }

  private set(state: OwlState, dur: number): void {
    this.state = state;
    this.t = 0;
    this.dur = dur;
  }

  private speak(s: string): void {
    this.say = s;
    this.sayTime = 0.9;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.sayTime > 0) {
      this.sayTime -= dt;
      if (this.sayTime <= 0) this.say = '';
    }
    const s = this.stage;
    switch (this.state) {
      case 'explain':
        this.turn = 0;
        if (this.t >= this.dur) this.afterExplain();
        break;
      case 'cue':
        // 首がぴくっと動く（小さく小刻みに）
        this.turn = 0.05 + Math.abs(Math.sin(this.t * 30)) * 0.05;
        if (this.t >= this.dur) {
          if (this.feintNext) {
            this.set('feint', 0.7);
            this.emit('feint');
          } else {
            this.set('turn', TURN_TIME);
            this.emit('turn');
          }
        }
        break;
      case 'turn':
        this.turn = Math.min(1, this.t / TURN_TIME);
        if (this.t >= this.dur) this.set('look', between(this.rand, s.look));
        break;
      case 'look':
        this.turn = 1;
        if (this.t >= this.dur) this.set('unturn', UNTURN_TIME);
        break;
      case 'unturn':
        this.turn = Math.max(0, 1 - this.t / UNTURN_TIME);
        if (this.t >= this.dur) {
          this.turn = 0;
          this.set('explain', between(this.rand, s.explain));
        }
        break;
      case 'feint':
        this.turn = feintCurve(this.t, this.dur);
        if (this.t >= this.dur) {
          this.turn = 0;
          this.set('explain', between(this.rand, s.explain));
        }
        break;
      case 'take':
        this.turn = 0;
        // 手をのばしきったところでチョークを持つ
        if (!this.chalkInHand && this.t >= this.dur * 0.5) this.chalkInHand = true;
        if (this.t >= this.dur) {
          const dur = between(this.rand, s.write);
          this.set('write', dur);
          this.writeFeintAt = this.rand() < s.writeFeintChance ? 0.8 + this.rand() * Math.max(0, dur - 2) : -1;
          this.chalkTick = 0;
        }
        break;
      case 'write': {
        this.written += WRITE_RATE * dt;
        // 書ききったら消して最初から（見た目だけ）
        if (this.written >= this.boardTotal + 6) this.written = 0;
        this.chalkTick -= dt;
        if (this.chalkTick <= 0) {
          this.chalkTick = 0.16;
          this.emit('chalk');
        }
        // 書きながらちらっと振り返る（見ていないので安全）
        const ft = this.t - this.writeFeintAt;
        this.turn = this.writeFeintAt >= 0 && ft >= 0 && ft <= 0.7 ? feintCurve(ft, 0.7) : 0;
        if (this.writeFeintAt >= 0 && ft >= 0 && ft < dt) this.emit('feint');
        if (this.t >= this.dur) {
          this.turn = 0;
          // チョークを置く：これが振り向きの予兆
          this.set('put', s.cue);
          this.chalkInHand = false;
          this.speak('コトッ');
          this.emit('put');
        }
        break;
      }
      case 'put':
        this.turn = 0;
        if (this.t >= this.dur) {
          this.set('turn', TURN_TIME);
          this.emit('turn');
        }
        break;
    }
  }

  private afterExplain(): void {
    const s = this.stage;
    if (this.rand() < s.boardChance) {
      // 板書タイム：チョークを取る → 書く → 置く → 振り向く
      this.set('take', TAKE_CHALK_TIME);
      this.emit('take');
      return;
    }
    this.feintNext = this.rand() < s.feintChance;
    this.set('cue', s.cue);
    this.speak('ゴホン');
    this.emit('cough');
  }
}

/** フェイントの首の動き：すばやく途中まで回して、少し止めて、戻す。 */
function feintCurve(t: number, dur: number): number {
  const up = 0.15;
  const down = 0.22;
  if (t < up) return (t / up) * FEINT_TURN;
  if (t < dur - down) return FEINT_TURN;
  return Math.max(0, ((dur - t) / down) * FEINT_TURN);
}

/**
 * 見回りの先生（3 時間目）。通路を左右に歩き、ときどき立ち止まって「！」を出してから、こちらを見る。
 */
export type PatrolState = 'walk' | 'warn' | 'look';

export class Patrol {
  state: PatrolState = 'walk';
  t = 0;
  dur: number;
  x: number = PATROL.minX;
  facing: number = 1;
  walk = 0;

  constructor(
    private readonly rand: Rand,
    private readonly emit: (e: TeacherEvent) => void
  ) {
    this.dur = between(rand, PATROL.walk);
    this.x = PATROL.minX + rand() * (PATROL.maxX - PATROL.minX);
    this.facing = rand() < 0.5 ? -1 : 1;
  }

  get watching(): boolean {
    return this.state === 'look';
  }

  update(dt: number): void {
    this.t += dt;
    switch (this.state) {
      case 'walk':
        this.x += this.facing * PATROL.speed * dt;
        this.walk += dt * 1.6;
        if (this.x >= PATROL.maxX) {
          this.x = PATROL.maxX;
          this.facing = -1;
        } else if (this.x <= PATROL.minX) {
          this.x = PATROL.minX;
          this.facing = 1;
        }
        if (this.t >= this.dur) {
          this.state = 'warn';
          this.t = 0;
          this.dur = PATROL.cue;
          this.emit('warn');
        }
        break;
      case 'warn':
        if (this.t >= this.dur) {
          this.state = 'look';
          this.t = 0;
          this.dur = between(this.rand, PATROL.look);
        }
        break;
      case 'look':
        if (this.t >= this.dur) {
          this.state = 'walk';
          this.t = 0;
          this.dur = between(this.rand, PATROL.walk);
        }
        break;
    }
  }
}
