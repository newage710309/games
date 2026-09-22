import type { Audio, SoundName } from './audio';
import {
  BELL_TIME,
  CAUGHT_TIME,
  CRAM_MULTIPLIER,
  CRAM_TIME,
  EAT_RATE,
  NUT_SCORE,
  PUFF_RELEASE_TIME,
  READY_TIME
} from './constants';
import { ENDING_SCORES, STAGES, type Stage } from './stages';
import { loadHighScore, saveHighScore } from './storage';
import { Owl, Patrol, type Rand, type TeacherEvent } from './teacher';

/**
 * 流れ：
 *   title → ready（よーい）→ playing（授業）→ bell（チャイム）→ demo（休み時間）→ 次の ready …
 *   3 時間目の bell → ending（点数で 3 通り）→ result → title
 *   見つかったら caught（しかられる）→ gameover → title（コンティニューなし）
 */
export type Phase =
  | 'title'
  | 'ready'
  | 'playing'
  | 'bell'
  | 'caught'
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

/** 情報欄の左端のポーズボタン。ここを押しても「食べる」にはならない。 */
export const PAUSE_BUTTON: Button = { x: 4, y: 4, w: 34, h: 32 };
/** ポーズ中のボタン。 */
export const PAUSE_MENU = {
  resume: { x: 140, y: 250, w: 200, h: 48 },
  sound: { x: 140, y: 312, w: 200, h: 48 },
  title: { x: 140, y: 374, w: 200, h: 48 }
} as const;

/** 休み時間のデモの秒数（タップで飛ばせる）。 */
export const DEMO_TIME = 7;
/** エンディングのデモの秒数（タップで飛ばせる）。 */
export const ENDING_TIME = 9;

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

const TEACHER_SOUND: Record<TeacherEvent, SoundName> = {
  cough: 'cough',
  turn: 'turn',
  take: 'take',
  chalk: 'chalk',
  put: 'put',
  feint: 'turn',
  warn: 'warn'
};

export class Game {
  phase: Phase = 'title';
  /** 今の場面になってからの秒数。 */
  phaseTime = 0;
  /** 画面の飾りの動きに使う通しの時間。 */
  time = 0;
  stageIndex = 0;
  score = 0;
  eaten = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  timeLeft = 0;
  owl: Owl;
  patrol: Patrol | null = null;
  /** ポーズ前の場面。 */
  pausedFrom: Phase = 'playing';
  /** エンディングの種類（0 = もうすこし、1 = おなかいっぱい、2 = 食べすぎて給食が入らない＝クリア）。 */
  endingTier = 0;

  // さくらちゃん
  /** 押しっぱなしの秒数（放すと 0）。 */
  holdTime = 0;
  /** ほっぺの膨らみ 0..1。 */
  puff = 0;
  /** ついばみの深さ 0..1（見た目）。 */
  peck = 0;
  cram = false;
  private nutFraction = 0;
  /** ついばみの回数（小数つき。見た目の頭の上下に使う）。 */
  chew = 0;

  /**
   * 「食べる」に数える押し方。授業中に押し始めたものだけ数える
   * （スタートのタップや、よーいの間から押しっぱなしの指は数えない）。
   */
  private holds = new Set<string>();

  constructor(
    private readonly audio: Pick<Audio, 'play' | 'muted' | 'toggleMute'>,
    private rand: Rand = Math.random
  ) {
    this.owl = this.makeOwl();
  }

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  get holding(): boolean {
    return this.holds.size > 0;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  get isClear(): boolean {
    return this.endingTier === 2;
  }

  /** 乱数を差しかえる（開発時のシミュレーション用）。 */
  setRandom(rand: Rand): void {
    this.rand = rand;
  }

  private makeOwl(): Owl {
    return new Owl(this.stage, this.rand, (e) => this.audio.play(TEACHER_SOUND[e], e === 'feint' ? 0.8 : 1));
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // --- 入力 ------------------------------------------------------------

  down(id: string, x: number | null, y: number | null): void {
    const onCanvas = x !== null && y !== null;
    switch (this.phase) {
      case 'title':
        if (this.phaseTime > 0.3) this.start();
        break;
      case 'ready':
        if (onCanvas && hit(PAUSE_BUTTON, x, y)) this.togglePause();
        break;
      case 'playing':
        if (onCanvas && hit(PAUSE_BUTTON, x, y)) {
          this.togglePause();
          return;
        }
        this.holds.add(id);
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

  up(id: string): void {
    this.holds.delete(id);
  }

  upAll(): void {
    this.holds.clear();
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'ready') {
      this.pausedFrom = this.phase;
      this.holds.clear();
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
    this.eaten = 0;
    this.newHiScore = false;
    this.audio.play('start');
    this.enterReady();
  }

  private enterReady(): void {
    this.owl = this.makeOwl();
    this.owl.turn = 1;
    this.patrol = this.stage.patrol
      ? new Patrol(this.rand, (e) => this.audio.play(TEACHER_SOUND[e]))
      : null;
    this.timeLeft = this.stage.time;
    this.holds.clear();
    this.holdTime = 0;
    this.puff = 0;
    this.peck = 0;
    this.cram = false;
    this.nutFraction = 0;
    this.setPhase('ready');
  }

  private toTitle(): void {
    this.holds.clear();
    this.setPhase('title');
  }

  private afterDemo(): void {
    this.stageIndex++;
    this.enterReady();
  }

  private toResult(): void {
    this.setPhase('result');
    this.audio.play(this.isClear ? 'clear' : 'select');
  }

  private saveHi(): void {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHiScore = true;
      saveHighScore(this.score);
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;

    switch (this.phase) {
      case 'ready':
        if (this.phaseTime >= READY_TIME) {
          this.owl.begin();
          this.setPhase('playing');
          this.audio.play('start');
        }
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'bell':
        this.relaxSakura(dt);
        if (this.phaseTime >= BELL_TIME) {
          if (this.stageIndex < STAGES.length - 1) {
            this.setPhase('demo');
            this.audio.play('jingle');
          } else {
            this.endingTier = this.score >= ENDING_SCORES[1] ? 2 : this.score >= ENDING_SCORES[0] ? 1 : 0;
            this.saveHi();
            this.setPhase('ending');
            this.audio.play(this.endingTier === 0 ? 'sad' : 'jingle');
          }
        }
        break;
      case 'caught':
        if (this.phaseTime >= CAUGHT_TIME) {
          this.saveHi();
          this.setPhase('gameover');
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

  private updatePlaying(dt: number): void {
    this.timeLeft -= dt;
    this.owl.update(dt);
    this.patrol?.update(dt);

    if (this.holding) this.eat(dt);
    else this.relaxSakura(dt);

    // 見ているときに押していたら見つかる
    if (this.holding && (this.owl.watching || (this.patrol?.watching ?? false))) {
      this.holds.clear();
      this.setPhase('caught');
      this.audio.play('caught');
      return;
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.holds.clear();
      this.setPhase('bell');
      this.audio.play('bell');
    }
  }

  /** 押している間：ついばんで木の実を食べる。押しっぱなしが続くとほおばりモード。 */
  private eat(dt: number): void {
    // 押し始めは頭を上げたところから（すぐに 1 回目をついばむ）
    if (this.holdTime === 0) this.chew = 0.6;
    this.holdTime += dt;
    this.chew += dt * (EAT_RATE / 2) * (this.cram ? 1.6 : 1);
    this.peck = Math.min(1, this.peck + dt / 0.08);
    this.puff = Math.min(1, this.holdTime / CRAM_TIME);
    if (!this.cram && this.holdTime >= CRAM_TIME) {
      this.cram = true;
      this.audio.play('cram');
    }
    this.nutFraction += EAT_RATE * (this.cram ? CRAM_MULTIPLIER : 1) * dt;
    while (this.nutFraction >= 1) {
      this.nutFraction -= 1;
      this.eaten++;
      this.score += NUT_SCORE;
      this.audio.play('peck', this.cram ? 1.25 : 1);
    }
  }

  /** 放している間：まじめなふり。ほっぺは少しかけて元に戻る。 */
  private relaxSakura(dt: number): void {
    this.holdTime = 0;
    this.cram = false;
    this.peck = Math.max(0, this.peck - dt / 0.06);
    this.puff = Math.max(0, this.puff - dt / PUFF_RELEASE_TIME);
  }
}
