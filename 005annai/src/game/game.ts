import type { Audio } from './audio';
import { SAKURA_MAX_X, SAKURA_MIN_X, WIDTH } from './constants';
import { ANIMAL_NAME, BIRDS, type AnimalKind } from './guests';
import type { Dir } from './input';
import { DISGUISE_NAME, type Disguise } from './snowman';
import {
  BONUS_MAX,
  BONUS_STEPS,
  CATCH_UP_SPEED,
  GUEST_SCORE,
  MAX_STEPS,
  STAGES,
  START_STEPS,
  type Stage
} from './stages';
import { loadHighScore, saveHighScore } from './storage';

/**
 * 流れ：
 *   title → ready（よーい）→ playing → stageClear → demo（休憩）→ 次の ready …
 *   3 面の stageClear → ending → result → title
 *   まちがえた・待たせすぎた → miss → gameover → title（コンティニューなし）
 */
export type Phase =
  | 'title'
  | 'ready'
  | 'playing'
  | 'stageClear'
  | 'miss'
  | 'demo'
  | 'ending'
  | 'result'
  | 'gameover'
  | 'paused';

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

export const READY_TIME = 2.2;
export const STAGE_CLEAR_TIME = 2.4;
export const MISS_TIME = 2.4;
/** 休憩デモの秒数（タップで飛ばせる）。 */
export const DEMO_TIME = 7;
/** エンディングの秒数（タップで飛ばせる）。 */
export const ENDING_TIME = 10;
/** 案内したあと、さくらちゃんがポーズを取っている秒数。 */
const POSE_TIME = 0.35;
/** 一度に並べておく人数（見えているのは奥の門まで）。 */
const QUEUE_LENGTH = 22;

export type Guest = { type: 'animal'; kind: AnimalKind } | { type: 'snow'; disguise: Disguise };

export interface QueueGuest {
  readonly id: number;
  readonly guest: Guest;
}

/** 案内されて列から去っていくお客さん。 */
export interface Leaver {
  readonly guest: Guest;
  readonly dir: Dir;
  readonly correct: boolean;
  /** 去り始めた位置（歩数）と、列の中での横ずれ。 */
  readonly steps: number;
  readonly id: number;
  t: number;
}

export interface Pop {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  t: number;
}

export type MissReason = 'wrong' | 'timeout';

export type Rand = () => number;

const hit = (b: Button, x: number, y: number): boolean => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

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

/** そのお客さんの正しい案内の向き。 */
export function correctDir(g: Guest): Dir {
  if (g.type === 'snow') return 'up';
  return (BIRDS as readonly string[]).includes(g.kind) ? 'left' : 'right';
}

/** まちがえたときの、画面に出す見出しと説明。 */
export function missMessage(g: Guest, reason: MissReason): [string, string] {
  if (reason === 'timeout') {
    const name = g.type === 'snow' ? 'ゆきだるま' : ANIMAL_NAME[g.kind];
    return ['まちくたびれちゃった…', `${name}を またせすぎちゃった`];
  }
  if (g.type === 'snow') {
    return g.disguise === 'none'
      ? ['ゆきだるま だった！', 'ゆきだるまは おことわり だよ']
      : ['ゆきだるま だった！', `「${DISGUISE_NAME[g.disguise]}」に だまされちゃった…`];
  }
  const name = ANIMAL_NAME[g.kind];
  if (correctDir(g) === 'left') return ['とり だった！', `${name}は そらの かいじょう だよ`];
  if (g.kind === 'momonga') return ['けもの だった！', 'モモンガは とぶけど けもの だよ'];
  return ['けもの だった！', `${name}は もりの かいじょう だよ`];
}

function pick<T extends string>(weights: Partial<Record<T, number>>, r: number): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [k, w] of entries) {
    x -= w;
    if (x < 0) return k;
  }
  return entries[entries.length - 1]![0];
}

export class Game {
  phase: Phase = 'title';
  /** 今の場面になってからの秒数。 */
  phaseTime = 0;
  /** 画面の飾りの動きに使う通しの時間。 */
  time = 0;
  stageIndex = 0;
  score = 0;
  /** 案内できた人数（ぜんぶの面の合計）。 */
  guided = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  pausedFrom: Phase = 'playing';

  /** 1・2 面の残り秒数。 */
  timeLeft = 0;
  /** この面で案内した人数（3 面の残り人数に使う）。 */
  stageGuided = 0;
  /** この面で列に並べた人数（3 面は count まで）。 */
  private spawned = 0;
  private nextId = 1;

  /** 列（先頭が [0]）。 */
  queue: QueueGuest[] = [];
  /** 先頭の位置：受付の線から何人ぶん手前か。0 で時間切れ。 */
  front = START_STEPS;
  /** 列が歩いた量（歩く動きの位相に使う）。 */
  walked = 0;
  leavers: Leaver[] = [];
  pops: Pop[] = [];
  private hurried = false;

  // さくらちゃん
  sakuraX = WIDTH / 2;
  private sakuraTarget = WIDTH / 2;
  /** 最後の案内の向きと、そのポーズの残り秒数。 */
  poseDir: Dir = 'left';
  poseTime = 0;

  missReason: MissReason = 'wrong';
  missGuest: Guest | null = null;

  constructor(
    private readonly audio: Pick<Audio, 'play' | 'muted' | 'toggleMute'>,
    private rand: Rand = Math.random
  ) {}

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  /** 3 面の残り人数（1・2 面は undefined）。 */
  get guestsLeft(): number | undefined {
    const c = this.stage.count;
    return c === undefined ? undefined : c - this.stageGuided;
  }

  /** 乱数を差しかえる（開発時のシミュレーション用）。 */
  setRandom(rand: Rand): void {
    this.rand = rand;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // --- 入力 ------------------------------------------------------------

  tap(x: number | null, y: number | null): void {
    const onCanvas = x !== null && y !== null;
    switch (this.phase) {
      case 'title':
        if (this.phaseTime > 0.3) this.start();
        break;
      case 'ready':
      case 'playing':
        if (onCanvas && hit(PAUSE_BUTTON, x, y)) this.togglePause();
        break;
      case 'paused':
        if (!onCanvas) break;
        if (hit(PAUSE_MENU.resume, x, y) || hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
        else if (hit(PAUSE_MENU.title, x, y)) this.toTitle();
        break;
      case 'demo':
        if (this.phaseTime > 1) this.afterDemo();
        break;
      case 'ending':
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

  swipe(dir: Dir): void {
    if (this.phase !== 'playing') return;
    const head = this.queue[0];
    if (head === undefined) return;
    const correct = dir === correctDir(head.guest);
    this.queue.shift();
    this.leavers.push({ guest: head.guest, dir, correct, steps: this.front, id: head.id, t: 0 });
    this.poseDir = dir;
    this.poseTime = POSE_TIME;
    this.hurried = false;

    if (!correct) {
      this.missReason = 'wrong';
      this.missGuest = head.guest;
      this.enterMiss();
      return;
    }
    const bonus = Math.round(BONUS_MAX * Math.min(1, this.front / BONUS_STEPS));
    const gain = GUEST_SCORE + bonus;
    this.score += gain;
    this.guided++;
    this.stageGuided++;
    this.pops.push({ text: `+${gain}`, x: dir === 'up' ? 300 : WIDTH / 2 + (dir === 'left' ? -90 : 90), y: 330, t: 0 });
    this.audio.play(dir === 'up' ? 'refuse' : 'guide', dir === 'right' ? 1.12 : 1);
    // 次のお客さんは 1 人ぶんうしろにいる
    this.front += 1;
    this.fillQueue();
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
    this.stageIndex = 0;
    this.score = 0;
    this.guided = 0;
    this.newHiScore = false;
    this.audio.play('start');
    this.enterReady();
  }

  private enterReady(): void {
    this.timeLeft = this.stage.time ?? 0;
    this.stageGuided = 0;
    this.spawned = 0;
    this.queue = [];
    this.leavers = [];
    this.pops = [];
    this.front = START_STEPS;
    this.hurried = false;
    this.poseTime = 0;
    this.missGuest = null;
    this.fillQueue();
    this.setPhase('ready');
  }

  private enterMiss(): void {
    this.saveHi();
    this.setPhase('miss');
    this.audio.play('miss');
  }

  private toTitle(): void {
    this.setPhase('title');
  }

  private afterDemo(): void {
    this.stageIndex++;
    this.enterReady();
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

  /** 列が QUEUE_LENGTH 人になるまでうしろに足す（3 面は count 人まで）。 */
  private fillQueue(): void {
    const s = this.stage;
    while (this.queue.length < QUEUE_LENGTH && (s.count === undefined || this.spawned < s.count)) {
      this.queue.push({ id: this.nextId++, guest: this.randomGuest() });
      this.spawned++;
    }
  }

  private randomGuest(): Guest {
    const s = this.stage;
    // 雪だるまが 3 人続かないようにする（ぜんぶ上スワイプの連打にならないように）
    const tail = this.queue.slice(-2);
    const snowRun = tail.length === 2 && tail.every((q) => q.guest.type === 'snow');
    if (!snowRun && this.rand() < s.snowChance) {
      return { type: 'snow', disguise: pick(s.disguises, this.rand()) };
    }
    return { type: 'animal', kind: pick(s.animals, this.rand()) };
  }

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;
    this.updateEffects(dt);

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
      case 'stageClear':
        if (this.phaseTime >= STAGE_CLEAR_TIME) {
          if (this.stageIndex < STAGES.length - 1) {
            this.setPhase('demo');
            this.audio.play('jingle');
          } else {
            this.saveHi();
            this.setPhase('ending');
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
      case 'demo':
        if (this.phaseTime >= DEMO_TIME) this.afterDemo();
        break;
      case 'ending':
        if (this.phaseTime >= ENDING_TIME) this.toResult();
        break;
      default:
        break;
    }
  }

  /** 面の進み具合 0..1（列の速さに使う）。 */
  private get progress(): number {
    const s = this.stage;
    if (s.count !== undefined) return Math.min(1, this.stageGuided / s.count);
    const total = s.time ?? 1;
    return Math.min(1, 1 - this.timeLeft / total);
  }

  /** 今の列の速さ（人ぶん / 秒）。 */
  get speed(): number {
    const [a, b] = this.stage.speed;
    return a + (b - a) * this.progress;
  }

  private updatePlaying(dt: number): void {
    const s = this.stage;
    // 3 面：全員さばいたらおしまい
    if (this.queue.length === 0) {
      this.clearStage();
      return;
    }
    let move = this.speed * dt;
    // 先頭が奥に行きすぎていたら、すたすた詰めてくる
    if (this.front > MAX_STEPS) move = Math.max(move, Math.min(this.front - MAX_STEPS, CATCH_UP_SPEED * dt));
    this.front -= move;
    this.walked += move;

    if (!this.hurried && this.front < 0.7) {
      this.hurried = true;
      this.audio.play('hurry');
    }
    if (this.front <= 0) {
      this.front = 0;
      this.missReason = 'timeout';
      this.missGuest = this.queue[0]!.guest;
      this.enterMiss();
      return;
    }

    if (s.time !== undefined) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.clearStage();
      }
    }
    this.updateSakura(dt);
  }

  private clearStage(): void {
    this.setPhase('stageClear');
    this.audio.play('stageClear');
  }

  /** さくらちゃんは受付の前を左右にうろうろ。案内した直後は立ち止まってポーズ。 */
  private updateSakura(dt: number): void {
    if (this.poseTime > 0) return;
    const d = this.sakuraTarget - this.sakuraX;
    const step = 46 * dt;
    if (Math.abs(d) <= step) {
      this.sakuraX = this.sakuraTarget;
      if (this.rand() < dt * 1.5) this.sakuraTarget = SAKURA_MIN_X + this.rand() * (SAKURA_MAX_X - SAKURA_MIN_X);
    } else {
      this.sakuraX += Math.sign(d) * step;
    }
  }

  /** 去っていくお客さん・得点のポップ・ポーズの時間を進める（ミスの場面でも動かす）。 */
  private updateEffects(dt: number): void {
    this.poseTime = Math.max(0, this.poseTime - dt);
    for (const l of this.leavers) l.t += dt;
    this.leavers = this.leavers.filter((l) => l.t < 1.6 || !l.correct);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 0.8);
  }
}
