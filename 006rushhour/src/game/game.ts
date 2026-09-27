import type { Audio } from './audio';
import type { AnimalKind } from './guests';
import { DOOR_X, GRANNY_X, grannyPos, slotPos, staffAtGranny, yukimaruPos } from './station';
import { loadHighScore, saveHighScore } from './storage';
import {
  DANGER_TIME,
  DEPART_BONUS,
  GRANNY_INTERVAL,
  GRANNY_SCORE,
  GRANNY_STAY,
  GRANNY_TURN,
  LUGGAGE_SCORE,
  MAX_IN_LINE,
  PASSENGERS,
  PUSH_SCORE,
  PUSH_TIME,
  TRAINS,
  WALK_SPEED,
  YUKIMARU_AT,
  YUKIMARU_RUN,
  YUKIMARU_SCORE,
  type Train
} from './trains';

/**
 * 流れ：
 *   title → ready（電車が入ってくる）→ playing → depart（発車）→ 次の ready …
 *   3 本目の depart → clear（エンディング）→ result → title
 *   列がホームの端まで来た・へんそうおばあちゃんを助けた → miss → gameover → title（コンティニューなし）
 */
export type Phase = 'title' | 'ready' | 'playing' | 'depart' | 'miss' | 'clear' | 'result' | 'gameover' | 'paused';

export interface Button {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const PAUSE_BUTTON: Button = { x: 4, y: 4, w: 34, h: 32 };
export const PAUSE_MENU = {
  resume: { x: 140, y: 250, w: 200, h: 48 },
  sound: { x: 140, y: 312, w: 200, h: 48 },
  title: { x: 140, y: 374, w: 200, h: 48 }
} as const;

export const READY_TIME = 2.4;
export const DEPART_TIME = 3.2;
export const MISS_TIME = 2.2;
export const CLEAR_TIME = 9;

/** おばあちゃんの前 = -1、ドア = 0..2。 */
export type Lane = -1 | 0 | 1 | 2;

export interface Passenger {
  readonly id: number;
  readonly kind: AnimalKind;
  /** 大荷物（2 回押さないと入らない）。 */
  readonly luggage: boolean;
  /** 残りの押す回数。 */
  hits: number;
  /** 押されてぐらっとした時間（大荷物の 1 回目）。 */
  shake: number;
}

/** 車内に押しこまれていくところ（見た目だけ）。 */
export interface Entering {
  readonly kind: AnimalKind;
  readonly luggage: boolean;
  readonly door: number;
  t: number;
}

export interface Granny {
  readonly fake: boolean;
  t: number;
  /** こちらを向いている（助けられる）。 */
  facing: boolean;
  turnIn: number;
  /** 助けてもらって帰るところ（秒）。 */
  thanked: number;
}

export interface Pop {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  t: number;
}

export type MissReason = 'edge' | 'fake';

export type Rand = () => number;

const hit = (b: Button, x: number, y: number): boolean => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const between = (r: Rand, [a, b]: readonly [number, number]): number => a + (b - a) * r();

/** 乱数を固定したいとき用（開発時の再現・シミュレーション）。mulberry32。 */
export function seededRandom(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** タップした x から、どの列（またはおばあちゃん）へ行くかを決める。 */
export function laneAt(x: number): Lane {
  if (x < (GRANNY_X + DOOR_X[0]) / 2) return -1;
  let best = 0;
  for (const [i, dx] of DOOR_X.entries()) {
    if (Math.abs(x - dx) < Math.abs(x - DOOR_X[best]!)) best = i;
  }
  return best as Lane;
}

export class Game {
  phase: Phase = 'title';
  phaseTime = 0;
  time = 0;
  trainIndex = 0;
  score = 0;
  /** 押しこんだ人数（ぜんぶの電車の合計）。 */
  pushedTotal = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  pausedFrom: Phase = 'playing';

  /** この電車に押しこんだ人数。 */
  pushed = 0;
  /** ドアごとの、あふれたお客さん（[0] がドアのすぐ前）。 */
  cols: Passenger[][] = [[], [], []];
  entering: Entering[] = [];
  private nextId = 1;
  private spawnIn = 1;
  /** 発車までの残り秒数。0 になるとお客さんがあふれるのが止まる（ドアが閉まる前の片づけ）。 */
  timeLeft = 0;
  /**
   * 列ごとの「あぶない！」の経過時間（-1 = なし）。5 人目がホームの端に着くと始まり、
   * DANGER_TIME のうちに押しこんで 4 人以下に戻せばセーフ、間に合わなければアウト。
   */
  danger: number[] = [-1, -1, -1];

  // さくらちゃん
  lane: Lane = 1;
  staffX: number = DOOR_X[1];
  staffY = 0;
  /** 行き先に着いている。 */
  arrived = true;
  private pushIn = PUSH_TIME;
  /** 最後に押した瞬間からの秒数（押す動きの見た目）。 */
  pushAnim = 9;
  /** タップした場所の波紋。 */
  tapMark: { x: number; y: number; t: number } | null = null;

  granny: Granny | null = null;
  private grannyIn = 8;
  /** ゆきまるくんが走っている時間（null = いない）。 */
  yukimaru: number | null = null;
  private yukimaruDone = false;
  /** ゆきまるくんを乗せた（飛びこむ見た目の時間）。 */
  yukimaruBoard: { x: number; y: number; t: number } | null = null;

  pops: Pop[] = [];
  missReason: MissReason = 'edge';
  /** アウトになった列（ホームの端）。 */
  missDoor = -1;

  constructor(
    private readonly audio: Pick<Audio, 'play' | 'muted' | 'toggleMute'>,
    private rand: Rand = Math.random
  ) {
    this.placeStaff();
  }

  get train(): Train {
    return TRAINS[this.trainIndex]!;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  /** 発車までの進み具合 0..1。 */
  get departProgress(): number {
    return Math.min(1, 1 - this.timeLeft / this.train.time);
  }

  /** 時間になって、ホームのお客さんを押しこむだけの状態（あふれない）。 */
  get closing(): boolean {
    return this.timeLeft <= 0;
  }

  setRandom(rand: Rand): void {
    this.rand = rand;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  /** さくらちゃんの行き先（列の最後尾、空ならドアの前。おばあちゃんならベンチの横）。 */
  staffTarget(lane: Lane = this.lane): { x: number; y: number } {
    if (lane < 0) return staffAtGranny();
    // 5 人目がホームの端にいるときは、さくらちゃんはその端に立つ（線路には出ない）
    const p = slotPos(lane, Math.min(this.cols[lane]!.length, MAX_IN_LINE - 0.45));
    return { x: p.x, y: p.y + 14 };
  }

  private placeStaff(): void {
    const p = this.staffTarget();
    this.staffX = p.x;
    this.staffY = p.y;
    this.arrived = true;
  }

  // --- 入力 ------------------------------------------------------------

  tap(x: number | null, y: number | null): void {
    const onCanvas = x !== null && y !== null;
    switch (this.phase) {
      case 'title':
        if (this.phaseTime > 0.3) this.start();
        break;
      case 'ready':
      case 'depart':
      case 'playing':
        if (onCanvas && hit(PAUSE_BUTTON, x, y)) {
          if (this.phase !== 'depart') this.togglePause();
          return;
        }
        if (this.phase === 'playing' && onCanvas && y > 60) this.tapField(x, y);
        break;
      case 'paused':
        if (!onCanvas) break;
        if (hit(PAUSE_MENU.resume, x, y) || hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
        else if (hit(PAUSE_MENU.title, x, y)) this.toTitle();
        break;
      case 'clear':
        if (this.phaseTime > 1.5) this.toResult();
        break;
      case 'result':
      case 'gameover':
        if (this.phaseTime > 1.2) this.toTitle();
        break;
      default:
        break;
    }
  }

  private tapField(x: number, y: number): void {
    // 走っているゆきまるくんをタップ → 乗せる
    if (this.yukimaru !== null) {
      const p = yukimaruPos(this.yukimaru / YUKIMARU_RUN);
      if (Math.hypot(x - p.x, y - (p.y - 20)) < 44) {
        this.boardYukimaru(p);
        return;
      }
    }
    this.moveTo(laneAt(x));
    const t = this.staffTarget();
    this.tapMark = { x: this.lane < 0 ? grannyPos().x : t.x, y: t.y + 6, t: 0 };
  }

  /** ← → キー：となりの列へ。 */
  step(dir: -1 | 1): void {
    if (this.phase !== 'playing') return;
    const next = Math.max(-1, Math.min(2, this.lane + dir)) as Lane;
    this.moveTo(next);
  }

  private moveTo(lane: Lane): void {
    if (lane === this.lane) return;
    this.lane = lane;
    this.arrived = false;
    this.pushIn = PUSH_TIME;
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'ready') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
      this.audio.play('select');
    } else if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
      this.audio.play('select');
    }
  }

  escape(): void {
    if (this.phase === 'playing' || this.phase === 'ready' || this.phase === 'paused') this.togglePause();
  }

  toggleMute(): void {
    this.audio.toggleMute();
    this.audio.play('select');
  }

  // --- 流れ ------------------------------------------------------------

  start(): void {
    this.trainIndex = 0;
    this.score = 0;
    this.pushedTotal = 0;
    this.newHiScore = false;
    this.audio.play('start');
    this.enterReady();
  }

  private enterReady(): void {
    this.pushed = 0;
    this.timeLeft = this.train.time;
    this.danger = [-1, -1, -1];
    this.cols = [[], [], []];
    this.entering = [];
    this.pops = [];
    this.granny = null;
    this.grannyIn = between(this.rand, GRANNY_INTERVAL) * 0.6;
    this.yukimaru = null;
    this.yukimaruDone = false;
    this.yukimaruBoard = null;
    this.spawnIn = 1.2;
    this.lane = 1;
    this.placeStaff();
    this.tapMark = null;
    this.setPhase('ready');
  }

  private toTitle(): void {
    this.setPhase('title');
  }

  private toResult(): void {
    this.setPhase('result');
    this.audio.play('clear');
  }

  private saveHi(): void {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHiScore = true;
      saveHighScore(this.score);
    }
  }

  private miss(reason: MissReason, door = -1): void {
    this.missReason = reason;
    this.missDoor = door;
    this.saveHi();
    this.setPhase('miss');
    this.audio.play('miss');
  }

  private addPop(text: string, x: number, y: number): void {
    this.pops.push({ text, x, y, t: 0 });
  }

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 0.9);
    for (const e of this.entering) e.t += dt;
    this.entering = this.entering.filter((e) => e.t < 0.3);
    if (this.tapMark !== null) {
      this.tapMark.t += dt;
      if (this.tapMark.t > 0.45) this.tapMark = null;
    }
    if (this.yukimaruBoard !== null) {
      this.yukimaruBoard.t += dt;
      if (this.yukimaruBoard.t > 0.8) this.yukimaruBoard = null;
    }

    switch (this.phase) {
      case 'ready':
        if (this.phaseTime >= READY_TIME) {
          this.setPhase('playing');
          this.audio.play('start');
        }
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'depart':
        if (this.phaseTime >= DEPART_TIME) {
          if (this.trainIndex < TRAINS.length - 1) {
            this.trainIndex++;
            this.enterReady();
          } else {
            this.saveHi();
            this.setPhase('clear');
            this.audio.play('jingle');
          }
        }
        break;
      case 'miss':
        if (this.phaseTime >= MISS_TIME) {
          this.setPhase('gameover');
          this.audio.play('sad');
        }
        break;
      case 'clear':
        if (this.phaseTime >= CLEAR_TIME) this.toResult();
        break;
      default:
        break;
    }
  }

  private updatePlaying(dt: number): void {
    for (const col of this.cols) for (const p of col) p.shake = Math.max(0, p.shake - dt);
    this.pushAnim += dt;

    // 時間になったらあふれるのが止まり、ホームのお客さんをぜんぶ押しこんだら発車
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.closing && this.cols.every((c) => c.length === 0)) {
      this.depart();
      return;
    }

    // お客さんがドアからあふれ出る（ドアのすぐ前に出て、列全体がホーム側へずれる）
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && !this.closing) {
      const [a, b] = this.train.spawn;
      this.spawnIn = a + (b - a) * this.departProgress;
      this.spawn();
    }

    // あぶない！：時間内に押しこめばセーフ、間に合わなければアウト
    for (const [door, t] of this.danger.entries()) {
      if (t < 0) continue;
      if (this.cols[door]!.length < MAX_IN_LINE) {
        this.danger[door] = -1;
        const p = slotPos(door, MAX_IN_LINE - 1);
        this.addPop('セーフ！', p.x, p.y - 30);
        continue;
      }
      this.danger[door] = t + dt;
      if (t + dt >= DANGER_TIME) {
        this.miss('edge', door);
        return;
      }
    }

    this.updateStaff(dt);
    if (this.phase !== 'playing') return;
    this.updateGranny(dt);
    if (this.phase !== 'playing') return;
    this.updateYukimaru(dt);
  }

  /**
   * お客さんをあふれさせる（ときどき 2 つの列に同時に）。
   * さくらちゃんがドアの前に立っている列（空の列に着いている）には出さない。
   */
  private spawn(): void {
    const blocked = this.lane >= 0 && this.arrived && this.cols[this.lane]!.length === 0 ? this.lane : -1;
    // ホームの端まで並んでいる列（あぶない！の最中）にも出さない
    const doors = [0, 1, 2].filter((d) => d !== blocked && this.cols[d]!.length < MAX_IN_LINE);
    const count = this.rand() < this.train.double ? 2 : 1;
    for (let k = 0; k < count && doors.length > 0; k++) {
      let i = Math.floor(this.rand() * doors.length);
      // あと 1 人でホームの端になる列に続けて出にくくする（1 回だけ選びなおす）
      if (this.cols[doors[i]!]!.length >= MAX_IN_LINE - 1) i = Math.floor(this.rand() * doors.length);
      const door = doors.splice(i, 1)[0]!;
      const luggage = this.rand() < this.train.luggageChance;
      const kind = PASSENGERS[Math.floor(this.rand() * PASSENGERS.length)]!;
      const col = this.cols[door]!;
      col.unshift({ id: this.nextId++, kind, luggage, hits: luggage ? 2 : 1, shake: 0 });
      this.audio.play('spill', 0.9 + door * 0.08);
      if (col.length >= MAX_IN_LINE && this.danger[door]! < 0) {
        this.danger[door] = 0;
        this.audio.play('danger');
      }
    }
  }

  private updateStaff(dt: number): void {
    const target = this.staffTarget();
    const dx = target.x - this.staffX;
    const dy = target.y - this.staffY;
    const d = Math.hypot(dx, dy);
    // 同じ列の中で前後するだけなら速く（列がずれたのについていく）
    const speed = this.arrived ? WALK_SPEED * 1.6 : WALK_SPEED;
    if (d <= speed * dt) {
      this.staffX = target.x;
      this.staffY = target.y;
      if (!this.arrived) {
        this.arrived = true;
        this.pushIn = PUSH_TIME * 0.6;
      }
    } else {
      this.staffX += (dx / d) * speed * dt;
      this.staffY += (dy / d) * speed * dt;
    }
    if (!this.arrived || this.lane < 0) return;

    // 列の最後尾に着いたら、自動で押しこむ
    const col = this.cols[this.lane]!;
    if (col.length === 0) {
      this.pushIn = PUSH_TIME * 0.6;
      return;
    }
    this.pushIn -= dt;
    if (this.pushIn > 0) return;
    this.pushIn = PUSH_TIME;
    this.pushAnim = 0;
    const front = col[0]!;
    front.hits--;
    if (front.hits > 0) {
      // 大荷物：1 回目はぐらっとするだけ
      front.shake = 0.3;
      this.audio.play('heave');
      return;
    }
    col.shift();
    this.entering.push({ kind: front.kind, luggage: front.luggage, door: this.lane, t: 0 });
    const gain = front.luggage ? LUGGAGE_SCORE : PUSH_SCORE;
    this.score += gain;
    this.pushed++;
    this.pushedTotal++;
    const p = slotPos(this.lane, 0);
    this.addPop(`+${gain}`, p.x + 36, p.y - 40);
    this.audio.play('push', 1 + (this.pushed % 3) * 0.06);
  }

  private depart(): void {
    this.score += DEPART_BONUS;
    this.granny = null;
    this.yukimaru = null;
    this.setPhase('depart');
    this.audio.play('depart');
  }

  private updateGranny(dt: number): void {
    const g = this.granny;
    if (g === null) {
      this.grannyIn -= dt;
      if (this.grannyIn <= 0) {
        this.granny = {
          fake: this.rand() < this.train.fakeGrannyChance,
          t: 0,
          facing: true,
          turnIn: between(this.rand, GRANNY_TURN),
          thanked: 0
        };
        this.audio.play('granny');
      }
      return;
    }
    g.t += dt;
    if (g.thanked > 0) {
      g.thanked += dt;
      if (g.thanked > 1.2) this.leaveGranny();
      return;
    }
    g.turnIn -= dt;
    if (g.turnIn <= 0) {
      g.facing = !g.facing;
      g.turnIn = between(this.rand, GRANNY_TURN) * (g.facing ? 1 : 0.8);
    }
    // さくらちゃんが横に来て、こちらを向いていたら助ける
    if (this.lane < 0 && this.arrived && g.facing) {
      if (g.fake) {
        this.miss('fake');
        return;
      }
      g.thanked = 0.001;
      this.score += GRANNY_SCORE;
      const p = grannyPos();
      this.addPop(`+${GRANNY_SCORE}`, p.x + 36, p.y - 100);
      this.audio.play('thanks');
      return;
    }
    // 助けてもらえないまま時間がたつと、よいしょと座りなおして帰っていく（ミスではない）
    if (g.t > GRANNY_STAY) this.leaveGranny();
  }

  private leaveGranny(): void {
    this.granny = null;
    this.grannyIn = between(this.rand, GRANNY_INTERVAL);
  }

  private updateYukimaru(dt: number): void {
    if (this.yukimaru === null) {
      if (this.train.yukimaru && !this.yukimaruDone && !this.closing && this.timeLeft <= YUKIMARU_AT) {
        this.yukimaru = 0;
        this.yukimaruDone = true;
        this.audio.play('yukimaru');
      }
      return;
    }
    this.yukimaru += dt;
    if (this.yukimaru >= YUKIMARU_RUN) this.yukimaru = null;
  }

  private boardYukimaru(p: { x: number; y: number }): void {
    this.yukimaru = null;
    this.yukimaruBoard = { x: p.x, y: p.y, t: 0 };
    this.score += YUKIMARU_SCORE;
    this.addPop(`+${YUKIMARU_SCORE}`, p.x, p.y - 70);
    this.audio.play('thanks', 1.2);
  }
}


