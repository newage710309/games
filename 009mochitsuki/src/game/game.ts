import type { SoundName } from './audio';
import type { BearFace } from './bear';
import { USU_X, USU_Y } from './constants';
import { isTouchDevice } from './device';
import type { RingKind } from './mochi';
import {
  buildChart,
  JUDGE,
  MAX_STUCK,
  PEEL_CHAIN,
  READY_TIME,
  RESUME_REWIND,
  SCORE,
  SNOW_FLIGHT,
  STAGES,
  starsOf,
  type Chart,
  type LessonSpan,
  type Note,
  type Rand,
  type Stage
} from './stages';
import { loadHighScore, saveHighScore } from './storage';

export type { Rand } from './stages';

/**
 * 流れ：
 *   title → ready（よーい）→ playing → stageClear → demo（休憩）→ 次の ready …
 *   3 うすめの stageClear → ending → result → title
 *   3 回ミス → buried（埋まる）→ gameover → title（コンティニューなし）
 */
export type Phase = 'title' | 'ready' | 'playing' | 'stageClear' | 'buried' | 'gameover' | 'demo' | 'ending' | 'result' | 'paused';

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

const hit = (b: Button, x: number | null, y: number | null): boolean =>
  x !== null && y !== null && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** 音と時計。ボットでは偽物を渡して、時間を一気に進める。 */
export interface GameAudio {
  now(): number;
  play(name: SoundName, pitch?: number): void;
  playAt(name: SoundName, at: number, pitch?: number): void;
  muted: boolean;
  toggleMute(): boolean;
}

export interface Pop {
  text: string;
  color: string;
  outline: string;
  size: number;
  t: number;
}

export function seededRandom(seed: number): Rand {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 雪だるまの立ち位置（3 うすめ）。 */
export const SNOWMEN = [
  { x: 40, y: 400, scale: 2 },
  { x: 240, y: 384, scale: 1.3 }
] as const;
/** 雪玉がはじかれる場所。 */
const SNOW_HIT = { x: USU_X - 36, y: USU_Y - 38 };

export class Game {
  phase: Phase = 'title';
  pausedFrom: Phase = 'playing';
  /** 画面の動き用の時間（判定には使わない）。 */
  time = 0;
  phaseTime = 0;

  stageIndex = 0;
  /** タイトルから始める面（開発時の ?stage= だけで変える）。 */
  firstStage = 0;
  chart: Chart | null = null;
  score = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  stuck = 0;
  chain = 0;
  combo = 0;
  left = 0;
  /** 面の成績。 */
  perfects = 0;
  goods = 0;
  misses = 0;
  judged = 0;
  stars = 0;
  ratio = 0;
  stageBonus = 0;
  noMissBonus = 0;
  starLog: number[] = [];
  totalPerfects = 0;

  pop: Pop | null = null;
  shake = 0;
  /** アニメーション用のタイマー（イベントからの経過秒。大きければ終わり）。 */
  flipT = 9;
  shineLevel = 0;
  sparkT = 9;
  flashT = 9;
  hitT = 9;
  bonkT = 9;
  dizzyT = 9;
  worryT = 9;
  exciteT = 9;
  snowBitsT = 9;
  snowBitsAt = { x: 0, y: 0 };

  private soundAt = 0;
  private strikeAt = 0;
  private exciteAt = 0;
  private pausedTotal = 0;
  private pausedAt = 0;
  private chartStart = 0;
  private lastStrikeTime = -99;

  constructor(
    private readonly audio: GameAudio,
    private readonly rand: Rand = Math.random,
    private readonly lateSlack: number = isTouchDevice() ? JUDGE.touchLateSlack : 0
  ) {}

  get muted(): boolean {
    return this.audio.muted;
  }

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  /** 拍の時計（ポーズで止まっていたぶんを除く）。 */
  now(): number {
    const raw = this.phase === 'paused' ? this.pausedAt : this.audio.now();
    return raw - this.pausedTotal;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // --- 入力 ------------------------------------------------------------------

  /** 押した瞬間。age = 押してからここへ届くまでの秒数。 */
  press(x: number | null, y: number | null, age = 0): void {
    switch (this.phase) {
      case 'title':
        this.audio.play('start');
        this.start();
        return;
      case 'ready':
        if (hit(PAUSE_BUTTON, x, y)) this.togglePause();
        return;
      case 'playing':
        if (hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else this.tapMochi(this.now() - age);
        return;
      case 'paused':
        if (hit(PAUSE_MENU.resume, x, y) || hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
        else if (hit(PAUSE_MENU.title, x, y)) this.toTitle();
        return;
      case 'stageClear':
        if (this.phaseTime > 1.2) this.afterClear();
        return;
      case 'demo':
        if (this.phaseTime > 1) this.nextStage();
        return;
      case 'ending':
        if (this.phaseTime > 1.5) this.finish();
        return;
      case 'gameover':
      case 'result':
        if (this.phaseTime > 1.2) this.toTitle();
        return;
      default:
        return;
    }
  }

  confirm(age = 0): void {
    if (this.phase === 'paused') this.togglePause();
    else this.press(null, null, age);
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'ready') {
      this.pausedFrom = this.phase;
      this.pausedAt = this.audio.now();
      this.phase = 'paused';
      this.audio.play('select');
    } else if (this.phase === 'paused') {
      // 止まっていたぶんを時計から除き、さらに少し巻きもどして、構えなおせるようにする
      this.pausedTotal += this.audio.now() - this.pausedAt;
      if (this.pausedFrom === 'playing') this.pausedTotal += RESUME_REWIND;
      this.phase = this.pausedFrom;
      this.audio.play('select');
    }
  }

  escape(): void {
    if (this.phase === 'playing' || this.phase === 'ready' || this.phase === 'paused') this.togglePause();
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  // --- 進行 ------------------------------------------------------------------

  start(): void {
    this.score = 0;
    this.newHiScore = false;
    this.starLog = [];
    this.totalPerfects = 0;
    this.stageIndex = this.firstStage;
    this.beginStage();
  }

  private beginStage(): void {
    this.setPhase('ready');
    this.chartStart = this.now() + READY_TIME;
    this.chart = buildChart(this.stage, this.chartStart, this.rand);
    this.soundAt = 0;
    this.strikeAt = 0;
    this.exciteAt = 0;
    this.left = this.chart.total;
    this.stuck = 0;
    this.chain = 0;
    this.combo = 0;
    this.perfects = 0;
    this.goods = 0;
    this.misses = 0;
    this.judged = 0;
    this.pop = null;
    this.shake = 0;
    this.flipT = this.sparkT = this.flashT = this.hitT = this.bonkT = this.dizzyT = this.worryT = this.exciteT = this.snowBitsT = 9;
    this.shineLevel = 0;
    this.lastStrikeTime = -99;
  }

  private nextStage(): void {
    this.stageIndex++;
    this.beginStage();
  }

  private afterClear(): void {
    this.setPhase(this.stageIndex >= STAGES.length - 1 ? 'ending' : 'demo');
    this.audio.play(this.phase === 'ending' ? 'jingle' : 'select');
  }

  private finish(): void {
    this.setPhase('result');
    this.saveHi();
    this.audio.play('clear');
  }

  private toTitle(): void {
    this.setPhase('title');
    this.chart = null;
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
    this.flipT += dt;
    this.sparkT += dt;
    this.flashT += dt;
    this.hitT += dt;
    this.bonkT += dt;
    this.dizzyT += dt;
    this.worryT += dt;
    this.exciteT += dt;
    this.snowBitsT += dt;
    this.shake = Math.max(0, this.shake - dt * 16);
    if (this.pop) {
      this.pop.t += dt;
      if (this.pop.t > 0.7) this.pop = null;
    }
    this.shineLevel = Math.max(this.perfectShare() * 0.5, this.shineLevel - dt * 1.1);

    if (this.phase === 'ready') {
      this.runChart();
      if (this.now() >= this.chartStart) this.setPhase('playing');
    } else if (this.phase === 'playing') {
      this.runChart();
      this.judgeTimeouts();
      if ((this.phase as Phase) === 'playing' && this.chart !== null && this.now() >= this.chart.end) this.clearStage();
    } else if (this.phase === 'buried') {
      if (this.phaseTime > 3.4) this.setPhase('gameover');
    }
  }

  private perfectShare(): number {
    return this.judged > 0 ? this.perfects / this.judged : 0;
  }

  /** 拍の音の予約と、杵が当たる瞬間の処理。 */
  private runChart(): void {
    const c = this.chart;
    if (c === null) return;
    const now = this.now();
    // 音は 0.2 秒先まで予約する（ポーズで引いたぶんは足しもどす）
    while (this.soundAt < c.sounds.length && c.sounds[this.soundAt]!.t < now + 0.2) {
      const s = c.sounds[this.soundAt++]!;
      if (s.t >= now - 0.05) this.audio.playAt(s.name, s.t + this.pausedTotal, s.pitch);
    }
    while (this.strikeAt < c.strikes.length && c.strikes[this.strikeAt]!.t <= now) {
      const s = c.strikes[this.strikeAt++]!;
      s.done = true;
      this.hitT = 0;
      this.lastStrikeTime = s.t;
      this.shake = Math.max(this.shake, 2);
      if (!s.lesson) this.left--;
    }
    while (this.exciteAt < c.excites.length && c.excites[this.exciteAt]! <= now) {
      this.exciteAt++;
      this.exciteT = 0;
    }
  }

  private inLesson(t: number): LessonSpan | null {
    return this.chart?.lessons.find((l) => t >= l.t0 && t <= l.t1) ?? null;
  }

  /** 時間切れになったものを判定する（返しそこね・がまん・雪玉の命中）。 */
  private judgeTimeouts(): void {
    const c = this.chart;
    if (c === null) return;
    const now = this.now();
    const late = JUDGE.good + this.lateSlack;
    for (const n of c.notes) {
      if (n.done) continue;
      if (n.t > now) break;
      if (n.lesson) {
        // お手本：さくらちゃんが自動で動く
        n.done = true;
        if (n.kind === 'feint') this.setPop('がまん！', '#d9f6c8', '#2e6b2e', 26);
        else {
          this.flipT = 0;
          if (n.kind === 'snow') this.snowDone();
        }
        continue;
      }
      if (n.t + late >= now) continue;
      n.done = true;
      if (n.kind === 'feint') {
        this.addScore(SCORE.feint);
        this.addCombo();
        this.setPop('がまん！ +50', '#d9f6c8', '#2e6b2e', 26);
        this.audio.play('gaman');
      } else if (n.kind === 'snow') {
        this.audio.play('splat');
        this.addMiss('びしゃっ！ ミス', 'miss');
      } else {
        this.judged++;
        this.addMiss('ミス', 'miss');
      }
      if ((this.phase as Phase) !== 'playing') return;
    }
  }

  /** タップの判定。t はタップの時刻。 */
  private tapMochi(t: number): void {
    const c = this.chart;
    if (c === null) return;
    this.flipT = 0;
    this.audio.play('pat');
    if (this.inLesson(t)) return;
    const late = JUDGE.good + this.lateSlack;
    let best: Note | null = null;
    let bestD = Infinity;
    for (const n of c.notes) {
      if (n.done || n.lesson) continue;
      const d = t - n.t;
      if (d > late) continue;
      const early = n.kind === 'feint' ? n.lead * 0.85 : Math.max(JUDGE.good, n.early);
      if (d < -early) continue;
      if (Math.abs(d) < bestD) {
        best = n;
        bestD = Math.abs(d);
      }
    }
    if (best !== null) {
      this.judgeTap(best, t - best.t);
      return;
    }
    // どの拍にも近くない：杵が落ちてくる瞬間なら、ごつん。それ以外は空振りで何も起きない
    const s = c.strikes[this.strikeAt];
    if (s !== undefined && !s.lesson && s.t - t >= 0 && s.t - t <= JUDGE.danger) {
      this.bonk();
      return;
    }
    const since = t - this.lastStrikeTime;
    if (since >= 0 && since <= JUDGE.dangerAfter && !this.inLesson(this.lastStrikeTime)) this.bonk();
  }

  private judgeTap(n: Note, d: number): void {
    n.done = true;
    if (n.kind === 'feint') {
      this.bonk();
      return;
    }
    if (n.kind === 'snow') {
      this.snowDone();
      this.addScore(SCORE.snow);
      this.addCombo();
      this.setPop('はじいた！ +100', '#d9f0ff', '#27507e', 26);
      this.audio.play('snowHit');
      return;
    }
    this.judged++;
    const slack = d > 0 ? this.lateSlack : 0;
    if (Math.abs(d) <= JUDGE.perfect + slack) {
      this.perfects++;
      this.totalPerfects++;
      this.addScore(SCORE.perfect);
      this.addCombo();
      this.shineLevel = 1;
      this.sparkT = 0;
      this.flashT = 0;
      this.setPop('ぴったり！', '#fff4a8', '#a8591a', 34);
      this.audio.play('perfect');
      this.chain++;
      if (this.chain >= PEEL_CHAIN) {
        this.chain = 0;
        if (this.stuck > 0) {
          this.stuck--;
          this.setPop('おもちが はがれた！', '#fff4a8', '#a8591a', 26);
          this.audio.play('peel');
        }
      }
    } else if (Math.abs(d) <= JUDGE.good + slack) {
      this.goods++;
      this.chain = 0;
      this.addScore(SCORE.good);
      this.addCombo();
      this.setPop('よし', '#ffffff', '#3a6aa3', 28);
      this.audio.play('good');
    } else {
      this.addMiss('はやい！ ミス', 'miss');
    }
  }

  private snowDone(): void {
    this.snowBitsT = 0;
    this.snowBitsAt = { x: SNOW_HIT.x, y: SNOW_HIT.y };
  }

  private bonk(): void {
    this.bonkT = 0;
    this.dizzyT = 0;
    this.addMiss('ごつん！', 'gotsun');
    this.shake = 6;
  }

  private addMiss(label: string, sound: SoundName): void {
    this.misses++;
    this.stuck++;
    this.chain = 0;
    this.combo = 0;
    this.worryT = 0;
    this.shake = Math.max(this.shake, 4);
    this.audio.play(sound);
    this.setPop(label, '#ffb4a8', '#7a1f18', label === 'ごつん！' ? 38 : 30);
    if (this.stuck >= MAX_STUCK) {
      this.setPhase('buried');
      this.saveHi();
      this.audio.play('sad');
    }
  }

  private addScore(n: number): void {
    this.score += n;
  }

  private addCombo(): void {
    this.combo++;
    if (this.combo % SCORE.comboEvery === 0) this.addScore(SCORE.combo);
  }

  private setPop(text: string, color: string, outline: string, size: number): void {
    this.pop = { text, color, outline, size, t: 0 };
  }

  private clearStage(): void {
    this.ratio = this.perfectShare();
    this.stars = starsOf(this.stage, this.ratio);
    this.starLog.push(this.stars);
    this.stageBonus = SCORE.stage;
    this.noMissBonus = this.misses === 0 ? SCORE.noMiss : 0;
    this.addScore(this.stageBonus + this.noMissBonus);
    this.saveHi();
    this.setPhase('stageClear');
    this.audio.play('stageClear');
  }

  // --- 描画のための問い合わせ ----------------------------------------------------

  /** 杵の振り上げぐあい。 */
  liftAt(now: number): number {
    const c = this.chart;
    if (c === null) return 0.9;
    let lift = this.baseLift(c, now);
    if (this.isGrinning(now)) lift += 0.06 + Math.sin(this.time * 9) * 0.02;
    // ごつん：一気に落として、もどす
    if (this.bonkT < 0.09) lift += (0.12 - lift) * (this.bonkT / 0.09);
    else if (this.bonkT < 0.5) lift = 0.12 + (lift - 0.12) * ((this.bonkT - 0.09) / 0.41);
    return lift;
  }

  private baseLift(c: Chart, now: number): number {
    const list = c.strikes;
    let i = -1;
    for (let k = 0; k < list.length; k++) {
      if (list[k]!.t <= now) i = k;
      else break;
    }
    const prev = i >= 0 ? list[i]! : null;
    const next = i + 1 < list.length ? list[i + 1]! : null;
    const interval = prev && next ? next.t - prev.t : 1.3;
    const peak = interval < 0.62 ? 0.72 : 1;
    if (next) {
      const drop = Math.min(JUDGE.danger, interval * 0.28);
      const u = next.t - now;
      if (u < drop) {
        const q = 1 - u / drop;
        return peak * (1 - q * q);
      }
    }
    if (prev) {
      const rise = Math.min(interval * 0.55, 0.42);
      const p = Math.min(1, (now - prev.t) / rise);
      return peak * (1 - (1 - p) * (1 - p));
    }
    return peak;
  }

  isGrinning(now: number): boolean {
    return this.chart?.grins.some((g) => now >= g.t0 && now <= g.t1) ?? false;
  }

  isAway(now: number): boolean {
    return this.chart?.aways.some((g) => now >= g.t0 && now <= g.t1) ?? false;
  }

  bearFace(now: number): BearFace {
    if (this.phase === 'stageClear') return 'excited';
    if (this.bonkT < 1) return 'shock';
    if (this.isGrinning(now)) return 'grin';
    if (this.isAway(now)) return 'away';
    if (this.exciteT < 1.5) return 'excited';
    return 'normal';
  }

  /** 出ている輪（近いものから 2 つまで）。p は 1 = 出はじめ、0 = ぴったり。 */
  rings(now: number): { p: number; kind: RingKind }[] {
    const c = this.chart;
    if (c === null) return [];
    const out: { p: number; kind: RingKind }[] = [];
    for (const n of c.notes) {
      if (n.done || n.kind === 'snow') continue;
      const u = n.t - now;
      if (u > n.lead) continue;
      if (u < -0.04) continue;
      const kind: RingKind = n.kind === 'feint' ? 'feint' : n.kind === 'fast' ? 'fast' : n.kind === 'away' ? 'faint' : 'normal';
      out.push({ p: Math.max(0, u / n.lead), kind });
      if (out.length === 2) break;
    }
    return out;
  }

  /** 飛んでいる雪玉（1 つだけ）。 */
  snowball(now: number): { x: number; y: number; spin: number; ring?: number } | null {
    const c = this.chart;
    if (c === null) return null;
    for (const n of c.notes) {
      if (n.done || n.kind !== 'snow') continue;
      const u = n.t - now;
      if (u > SNOW_FLIGHT) return null;
      const from = SNOWMEN[n.from]!;
      const sx = from.x;
      const sy = from.y - 20 * from.scale;
      const p = 1 - u / SNOW_FLIGHT;
      const x = sx + (SNOW_HIT.x - sx) * p;
      const y = sy + (SNOW_HIT.y - sy) * p - Math.sin(Math.min(1, p) * Math.PI) * 90;
      const ring = u < n.lead ? Math.max(0, 1 - u / n.lead) : undefined;
      return { x, y, spin: p * 9, ring };
    }
    return null;
  }

  /** 雪玉を投げているところ（0..1）。雪だるまがはねて知らせる。 */
  snowmanHop(index: number, now: number): number {
    const c = this.chart;
    if (c === null) return 0;
    for (const n of c.notes) {
      if (n.kind !== 'snow' || n.from !== index) continue;
      const u = n.t - SNOW_FLIGHT - now;
      if (Math.abs(u) < 0.3) return (0.3 - Math.abs(u)) / 0.3;
    }
    return 0;
  }

  get lesson(): LessonSpan | null {
    return this.chart === null ? null : this.inLesson(this.now());
  }

  /** おもちのつきあがりぐあい 0..1。 */
  get doneness(): number {
    const c = this.chart;
    if (c === null || c.total === 0) return 0;
    return 1 - this.left / c.total;
  }

  sinceStrike(now: number): number {
    return now - this.lastStrikeTime;
  }
}
