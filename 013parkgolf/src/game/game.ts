// ゲームの進行（タイトル → コースの紹介 → ホールを見わたす → 打つ → … → スコアカード → デモ → … → エンディング → 結果）。
// 描画は render.ts。ここはブラウザがなくても動く（ボットが使う）。

import type { SoundName } from './audio';
import { HEIGHT, HUD_H, PAUSE_BTN, VIEW_BTN, WIDTH } from './constants';
import type { Hole } from './course';
import type { GolferPose } from './golfer';
import { HOLES } from './holes';
import { STEP, launch, newBall, stepBall, type Ball, type BallEvent } from './physics';
import {
  COURSES,
  SCORE,
  courseStars,
  coursePar,
  courseTarget,
  holeMax,
  holePoints,
  holeWord,
  type Course
} from './stages';
import {
  loadBest,
  loadHighScore,
  loadStamps,
  saveBest,
  saveHighScore,
  saveStamps,
  type CourseBest
} from './storage';

export type Phase =
  | 'title'
  | 'stamps'
  | 'courseIntro'
  | 'flyover'
  | 'aim'
  | 'rolling'
  | 'result'
  | 'holeEnd'
  | 'card'
  | 'demo'
  | 'gameover'
  | 'ending'
  | 'final'
  | 'paused';

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TITLE_BTNS: Button[] = [
  { x: 110, y: 456, w: 260, h: 50 },
  { x: 110, y: 518, w: 260, h: 42 }
];
export const PAUSE_MENU = {
  resume: { x: 140, y: 250, w: 200, h: 48 },
  sound: { x: 140, y: 312, w: 200, h: 48 },
  title: { x: 140, y: 374, w: 200, h: 48 }
} as const;
export const BACK_BTN: Button = { x: 150, y: 584, w: 180, h: 42 };

export const hit = (b: Button, x: number | null, y: number | null, pad = 0): boolean =>
  x !== null && y !== null && x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

export interface GameAudio {
  play(name: SoundName, pitch?: number): void;
  toggleMute(): boolean;
  muted: boolean;
}

/** 引っぱる長さ（px）が、この長さで強さ 1。 */
export const DRAG_FULL = 150;
/** これより短く引いてはなすと、打つのをやめる。 */
export const DRAG_CANCEL = 16;
/** タッチ：下へこの長さ引くと強さ 1（指で細かく合わせられるように、マウスより長め）。 */
export const TOUCH_FULL = 190;
/** タッチ：これだけ動かしたら、左右（向き）か下（強さ）かを決める。 */
const TOUCH_DECIDE = 10;
/** タッチ：左右に 1px 動かしたときに回る向き（ラジアン。約 0.25°）。 */
const TOUCH_TURN = (0.25 * Math.PI) / 180;
/** 思いきり（くるっと回る）とみなす強さ。 */
export const BIG_POWER = 0.92;
/** キーボードで向きを変える速さ（ラジアン/秒）。 */
const KEY_TURN = 0.7;
/** Space 長押しで強さが 0 → 1 → 0 と行き来する時間（秒）。 */
const KEY_CHARGE = 2.4;

/** 仲間の反応。 */
export type Reaction = 'watch' | 'clap' | 'cover' | 'hooray' | 'shock';

/** コースの記録。 */
export interface CourseRecord {
  course: number;
  strokes: number[];
  aces: boolean[];
  total: number;
  stars: number;
  cleared: boolean;
  points: number;
}

interface GameOptions {
  /** ブラウザなし（ボット）。保存もしない。 */
  headless?: boolean;
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export class Game {
  phase: Phase = 'title';
  pausedFrom: Phase = 'aim';
  time = 0;
  phaseTime = 0;
  readonly headless: boolean;

  score = 0;
  hiScore: number;
  newHiScore = false;
  best: (CourseBest | null)[];
  /** ホールごとのきねんスタンプ（0 = まだ、1 = バーディ以上、2 = ホールインワン）。 */
  stamps: number[];
  /** このホールで新しく押したスタンプ（0 = なし）。 */
  newStamp = 0;
  titleCursor = 0;

  courseIndex = 0;
  holeIndex = 0;
  hole: Hole = HOLES[0]!;
  /** このホールの時計（雪だるまの位置を決める）。 */
  clock = 0;
  ball: Ball = newBall(0, 0);
  aim = -Math.PI / 2;
  strokes = 0;
  /** いまのコースで回ったホールの打数。 */
  courseStrokes: number[] = [];
  courseAces: boolean[] = [];
  records: CourseRecord[] = [];
  /** 最後のショットの強さ。 */
  lastPower = 0;
  /** 最後のショットで起きたこと。 */
  events: BallEvent[] = [];
  /** 結果の表示（バーディ！ ポチャン！ など）。 */
  message: { text: string; sub: string; good: boolean; t: number } | null = null;
  /** ホールの結果。 */
  holeResult: { strokes: number; word: string; points: number; ace: boolean; pickedUp: boolean } | null = null;
  /** スコアカードの演出の時間。 */
  cardTime = 0;

  // カメラ
  camY = 0;
  viewing = false;
  viewY = 0;
  private flyFrom = 0;
  private flyTo = 0;
  flyDur = 2;

  // 打つ人と仲間
  golferX = 0;
  golferY = 0;
  golferAim = -Math.PI / 2;
  golferPose: GolferPose = 'address';
  golferT = 0;
  bearX = 0;
  bearY = 0;
  foxX = 0;
  foxY = 0;
  private bearTX = 0;
  private bearTY = 0;
  private foxTX = 0;
  private foxTY = 0;
  reaction: Reaction = 'watch';
  reactionT = 0;
  hint: { text: string; t: number } | null = null;
  private hintsShown = new Set<number>();
  /** ホールインワンの演出の経過時間（null = なし）。 */
  aceT: number | null = null;

  // 入力
  /**
   * 引っぱり中の指・マウス。
   * マウスは「打つ向きの反対へ引っぱり、はなして打つ」。
   * タッチは、動かしはじめの向きで分ける：左右なら向きを回す（はなしても打たない）、下へなら強さ（はなして打つ）。
   */
  drag: {
    id: number;
    sx: number;
    sy: number;
    x: number;
    y: number;
    touch: boolean;
    mode: 'undecided' | 'aim' | 'power';
    /** 向きを回しはじめたときの向き。 */
    aim0: number;
  } | null = null;
  private viewDrag: { id: number; y: number; camY: number } | null = null;
  keys = { left: false, right: false, up: false, down: false };
  charging = false;
  chargeT = 0;

  /** デモの番号（1 = 1 めんのあと、2 = 2 めんのあと）。 */
  demoNo = 1;

  private acc = 0;
  /** 転がしている間の時計（1 歩ずつ進める。雪だるまの位置をフレームの長さに関係なく決めるため）。 */
  private simClock = 0;

  constructor(
    private readonly audio: GameAudio,
    opts: GameOptions = {}
  ) {
    this.headless = opts.headless ?? false;
    this.hiScore = this.headless ? 0 : loadHighScore();
    this.best = this.headless ? [null, null, null] : loadBest();
    this.stamps = this.headless ? new Array<number>(9).fill(0) : loadStamps();
  }

  get muted(): boolean {
    return this.audio.muted;
  }
  get course(): Course {
    return COURSES[this.courseIndex]!;
  }
  get holeNo(): number {
    return this.courseIndex * 3 + this.holeIndex;
  }
  get maxStrokes(): number {
    return holeMax(this.hole);
  }
  get target(): number {
    return courseTarget(this.course);
  }
  /** コースの合計打数（いまのホールもふくむ）。 */
  get courseTotal(): number {
    const done = this.courseStrokes.reduce((s, v) => s + v, 0);
    return done + (this.phase === 'holeEnd' || this.phase === 'card' ? 0 : this.strokes);
  }
  /** 打てる状態か。 */
  get canShoot(): boolean {
    return this.phase === 'aim' && !this.viewing;
  }
  /** 引っぱりの強さ（0..1）と、やめる長さかどうか。 */
  get dragPower(): { power: number; cancel: boolean } | null {
    if (this.drag?.touch) {
      if (this.drag.mode !== 'power') return null;
      const d = this.drag.y - this.drag.sy;
      return { power: clamp(d / TOUCH_FULL, 0, 1), cancel: d < DRAG_CANCEL };
    }
    if (this.drag) {
      const d = Math.hypot(this.drag.x - this.drag.sx, this.drag.y - this.drag.sy);
      return { power: clamp(d / DRAG_FULL, 0, 1), cancel: d < DRAG_CANCEL };
    }
    if (this.charging) return { power: this.chargePower, cancel: false };
    return null;
  }
  get chargePower(): number {
    const p = (this.chargeT / KEY_CHARGE) % 1;
    return p < 0.5 ? p * 2 : 2 - p * 2;
  }

  private play(s: SoundName, pitch?: number): void {
    if (!this.headless) this.audio.play(s, pitch);
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  // --- 進行 -----------------------------------------------------------------------

  startRun(): void {
    this.score = 0;
    this.newHiScore = false;
    this.newStamp = 0;
    this.records = [];
    this.courseIndex = 0;
    this.startCourse();
    this.play('start');
  }

  private startCourse(): void {
    this.holeIndex = 0;
    this.courseStrokes = [];
    this.courseAces = [];
    this.loadHole();
    this.setPhase('courseIntro');
    this.camY = this.flyFrom;
  }

  private loadHole(): void {
    this.hole = this.course.holes[this.holeIndex]!;
    this.clock = 0;
    this.strokes = 0;
    this.ball = newBall(this.hole.tee.x, this.hole.tee.y);
    this.aim = this.hole.teeAim;
    this.hintsShown.clear();
    this.hint = null;
    this.message = null;
    this.holeResult = null;
    this.aceT = null;
    this.viewing = false;
    this.drag = null;
    this.charging = false;
    this.flyFrom = this.clampCam(this.hole.cup.y - 220);
    this.flyTo = this.aimCam();
    this.flyDur = 1.2 + Math.abs(this.flyTo - this.flyFrom) / 420;
    this.placeGolfer(true);
  }

  private clampCam(y: number): number {
    return clamp(y, -HUD_H + 20, this.hole.h - HEIGHT + 10);
  }

  /** 打つときのカメラ（ボールが画面の下のほうに来る。打つ向きが下なら上のほうに）。 */
  private aimCam(): number {
    const down = Math.sin(this.aim) > 0.35;
    if (down) return this.clampCam(this.ball.y - 220);
    // カップが近ければ、カップも入るように少し上を見せる（ボールは画面の下のはしより上に残す）
    const y = Math.max(this.ball.y - 555, Math.min(this.ball.y - 420, this.hole.cup.y - HUD_H - 70));
    return this.clampCam(y);
  }

  /** 打つ人と仲間を、ボールのまわりに置く。 */
  private placeGolfer(snap: boolean): void {
    this.golferX = this.ball.x;
    this.golferY = this.ball.y;
    this.golferAim = this.aim;
    this.golferPose = 'address';
    this.golferT = 0;
    const ax = Math.cos(this.aim);
    const ay = Math.sin(this.aim);
    // 打つ向きの右手（さくらちゃんの反対側）の、少しうしろ
    let side = 1;
    const sx = (k: number): number => this.ball.x - ay * 74 * k - ax * 26;
    if (sx(1) < 30 || sx(1) > 450) side = -1.4;
    const bx = this.ball.x - ay * 74 * side - ax * 26;
    const by = this.ball.y + ax * 74 * side - ay * 26 + 14;
    this.bearTX = clamp(bx, 26, 454);
    this.bearTY = by;
    this.foxTX = clamp(bx - ay * 52 * Math.sign(side) - ax * 34, 22, 458);
    this.foxTY = by + ax * 52 * Math.sign(side) - ay * 34 - 8;
    if (snap) {
      this.bearX = this.bearTX;
      this.bearY = this.bearTY;
      this.foxX = this.foxTX;
      this.foxY = this.foxTY;
    }
    this.reaction = 'watch';
  }

  private startAim(): void {
    this.setPhase('aim');
    this.placeGolfer(false);
    this.message = null;
    // 1 めんだけ、キツネがときどきヒントをくれる
    if (this.courseIndex === 0) {
      for (const [i, h] of this.hole.hints.entries()) {
        if (this.hintsShown.has(i)) continue;
        if (Math.hypot(this.ball.x - h.x, this.ball.y - h.y) <= h.r) {
          this.hintsShown.add(i);
          this.hint = { text: h.text, t: 0 };
          break;
        }
      }
    }
  }

  /** 打つ。 */
  shoot(aim: number, power: number): void {
    if (this.phase !== 'aim') return;
    this.aim = aim;
    this.golferAim = aim;
    this.lastPower = power;
    this.strokes++;
    launch(this.ball, aim, power);
    this.simClock = this.clock;
    this.acc = 0;
    this.events = [];
    this.golferPose = power >= BIG_POWER ? 'spin' : 'swing';
    this.golferT = 0;
    this.hint = null;
    this.drag = null;
    this.charging = false;
    this.play(power >= BIG_POWER ? 'shotBig' : 'shot');
    this.setPhase('rolling');
  }

  private react(r: Reaction): void {
    this.reaction = r;
    this.reactionT = 0;
  }

  /** ボールが止まった・入った・落ちた。 */
  private ballDone(): void {
    const b = this.ball;
    const cupD = Math.hypot(b.x - this.hole.cup.x, b.y - this.hole.cup.y);
    if (b.done === 'cup') {
      this.finishHole(false);
      return;
    }
    if (b.done === 'water' || b.done === 'ob') {
      this.strokes++;
      this.play(b.done === 'water' ? 'splash' : 'ob');
      this.react('cover');
      this.golferPose = 'sad';
      this.golferT = 0;
      this.message = {
        text: b.done === 'water' ? 'ポチャン！' : 'OB！',
        sub: '1打 ペナルティ。はいる てまえから うちなおし',
        good: false,
        t: 0
      };
    } else {
      // 止まった
      if (cupD < 36) {
        this.message = { text: 'おしい！', sub: '', good: true, t: 0 };
        this.react('clap');
        this.play('clap');
      } else if (this.lastPower >= BIG_POWER) {
        this.react('shock');
      }
    }
    if (this.strokes >= this.maxStrokes) {
      this.finishHole(true);
      return;
    }
    this.setPhase('result');
  }

  private finishHole(pickedUp: boolean): void {
    const strokes = pickedUp ? this.maxStrokes : this.strokes;
    const par = this.hole.par;
    const ace = !pickedUp && strokes === 1;
    const points = pickedUp ? 0 : holePoints(strokes, par);
    this.score += points;
    this.courseStrokes.push(strokes);
    this.courseAces.push(ace);
    this.holeResult = { strokes, word: pickedUp ? 'ひろいあげ' : holeWord(strokes, par), points, ace, pickedUp };
    // きねんスタンプ：バーディ以上で押す。ホールインワンなら格上げ
    this.newStamp = 0;
    const level = ace ? 2 : !pickedUp && strokes <= par - 1 ? 1 : 0;
    if (level > (this.stamps[this.holeNo] ?? 0)) {
      this.stamps[this.holeNo] = level;
      this.newStamp = level;
      if (!this.headless) saveStamps(this.stamps);
    }
    this.strokes = strokes;
    this.golferX = this.hole.cup.x - 30;
    this.golferY = this.hole.cup.y + 40;
    this.golferAim = -Math.PI / 2;
    this.golferT = 0;
    if (pickedUp) {
      this.play('pickup');
      this.golferPose = 'sad';
      this.react('watch');
      this.golferX = this.ball.x;
      this.golferY = this.ball.y;
    } else if (ace) {
      this.play('cupin');
      this.play('ace');
      this.aceT = 0;
      this.golferPose = 'happy';
      this.react('hooray');
    } else {
      this.play('cupin');
      const good = strokes <= par;
      this.golferPose = good ? 'happy' : strokes <= par + 1 ? 'wait' : 'sad';
      if (good) {
        this.play('good');
        this.play('clap');
      }
      this.react(good ? 'clap' : 'watch');
    }
    // 仲間はカップのそばへ
    this.bearTX = clamp(this.hole.cup.x + 60, 30, 450);
    this.bearTY = this.hole.cup.y + 70;
    this.foxTX = clamp(this.hole.cup.x - 70, 30, 450);
    this.foxTY = this.hole.cup.y + 60;
    if (pickedUp) {
      this.bearTX = clamp(this.ball.x + 60, 30, 450);
      this.bearTY = this.ball.y + 20;
      this.foxTX = clamp(this.ball.x + 100, 30, 450);
      this.foxTY = this.ball.y - 10;
    }
    this.setPhase('holeEnd');
  }

  private nextHole(): void {
    if (this.holeIndex < 2) {
      this.holeIndex++;
      this.loadHole();
      this.camY = this.flyFrom;
      this.setPhase('flyover');
      return;
    }
    // コースの終わり
    const c = this.course;
    const total = this.courseStrokes.reduce((s, v) => s + v, 0);
    const par = coursePar(c);
    const cleared = total <= courseTarget(c);
    const stars = cleared ? courseStars(total, par) : 0;
    let points = 0;
    for (const [i, s] of this.courseStrokes.entries()) points += holePoints(s, c.holes[i]!.par);
    if (cleared) {
      this.score += SCORE.courseClear;
      points += SCORE.courseClear;
    }
    this.records.push({ course: c.no, strokes: [...this.courseStrokes], aces: [...this.courseAces], total, stars, cleared, points });
    const prev = this.best[this.courseIndex];
    const nb: CourseBest = {
      stars: Math.max(prev?.stars ?? 0, stars),
      strokes: Math.min(prev?.strokes ?? 999, total)
    };
    this.best[this.courseIndex] = nb;
    if (!this.headless) saveBest(this.best);
    this.cardTime = 0;
    this.setPhase('card');
    this.play(cleared ? 'clear' : 'sad');
  }

  private afterCard(): void {
    const rec = this.records[this.records.length - 1]!;
    if (!rec.cleared) {
      this.setPhase('gameover');
      return;
    }
    if (this.courseIndex < 2) {
      this.demoNo = this.courseIndex + 1;
      this.setPhase('demo');
      this.play('jingle');
    } else {
      this.setPhase('ending');
      this.play('jingle');
    }
  }

  private toFinal(): void {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHiScore = true;
      if (!this.headless) saveHighScore(this.score);
    }
    this.setPhase('final');
  }

  // --- 毎フレーム ---------------------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;
    const p = this.phase;
    if (p === 'courseIntro' || p === 'flyover' || p === 'aim' || p === 'rolling' || p === 'result' || p === 'holeEnd') {
      this.clock += dt;
    }
    this.golferT += dt;
    this.reactionT += dt;
    if (this.message) this.message.t += dt;
    if (this.hint) {
      this.hint.t += dt;
      if (this.hint.t > 6) this.hint = null;
    }
    if (this.aceT !== null) this.aceT += dt;
    // 仲間はゆっくり歩いて移動
    const k = Math.min(1, dt * 2.2);
    this.bearX += (this.bearTX - this.bearX) * k;
    this.bearY += (this.bearTY - this.bearY) * k;
    this.foxX += (this.foxTX - this.foxX) * k;
    this.foxY += (this.foxTY - this.foxY) * k;

    if (p === 'courseIntro') {
      this.camY = this.flyFrom;
    } else if (p === 'flyover') {
      const u = clamp(this.phaseTime / this.flyDur, 0, 1);
      const e = u * u * (3 - 2 * u);
      // 最初の 0.6 秒はカップを見せて止まる
      const v = clamp((this.phaseTime - 0.6) / this.flyDur, 0, 1);
      const ev = v * v * (3 - 2 * v);
      void e;
      this.camY = this.flyFrom + (this.flyTo - this.flyFrom) * ev;
      if (this.phaseTime >= this.flyDur + 0.9) this.startAim();
    } else if (p === 'aim') {
      if (this.keys.left) this.aim -= KEY_TURN * dt;
      if (this.keys.right) this.aim += KEY_TURN * dt;
      if (this.charging) this.chargeT += dt;
      if (this.drag && !this.drag.touch) {
        const d = Math.hypot(this.drag.x - this.drag.sx, this.drag.y - this.drag.sy);
        if (d >= DRAG_CANCEL) this.aim = Math.atan2(this.drag.sy - this.drag.y, this.drag.sx - this.drag.x);
      }
      this.golferAim = this.aim;
      const dp = this.dragPower;
      this.golferPose = dp && !dp.cancel ? 'back' : 'address';
      if (this.viewing) {
        const sp = 520 * dt;
        if (this.keys.up) this.viewY -= sp;
        if (this.keys.down) this.viewY += sp;
        this.viewY = this.clampCam(this.viewY);
        this.camY += (this.viewY - this.camY) * Math.min(1, dt * 10);
      } else {
        this.camY += (this.aimCam() - this.camY) * Math.min(1, dt * 4);
      }
    } else if (p === 'rolling') {
      this.acc += dt;
      while (this.acc >= STEP && !this.ball.done) {
        this.acc -= STEP;
        const before = this.events.length;
        stepBall(this.hole, this.ball, this.simClock, this.events);
        this.simClock += STEP;
        for (let i = before; i < this.events.length; i++) this.onEvent(this.events[i]!);
      }
      if (this.golferPose === 'swing' && this.golferT > 0.7) this.golferPose = 'wait';
      this.camY += (this.clampCam(this.ball.y - 330) - this.camY) * Math.min(1, dt * 3);
      if (this.ball.done) {
        this.acc = 0;
        this.ballDone();
      }
    } else if (p === 'result') {
      if (this.phaseTime > (this.message && !this.message.good ? 1.8 : 0.7)) this.startAim();
    } else if (p === 'holeEnd') {
      this.camY += (this.clampCam(this.golferY - 330) - this.camY) * Math.min(1, dt * 3);
      const wait = this.holeResult?.ace ? 5 : 2.6;
      if (this.headless || this.phaseTime > wait) {
        if (this.headless) this.nextHole();
      }
    } else if (p === 'card') {
      this.cardTime += dt;
    }
  }

  private onEvent(e: BallEvent): void {
    if (e === 'tree' || e === 'rock' || e === 'kamakura') this.play('knock');
    else if (e === 'root') this.play('bump');
    else if (e === 'tunnel') this.play('whoosh');
    else if (e === 'snowman') {
      this.play('boing');
      this.react('shock');
    } else if (e === 'lip') this.play('lip');
  }

  // --- 入力 ------------------------------------------------------------------------

  pointerDown(id: number, x: number | null, y: number | null, touch: boolean): void {
    if (x === null || y === null) return;
    const p = this.phase;
    if (p === 'paused') {
      if (hit(PAUSE_MENU.resume, x, y)) this.togglePause();
      else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
      else if (hit(PAUSE_MENU.title, x, y)) {
        this.play('select');
        this.setPhase('title');
      } else if (hit(PAUSE_BTN, x, y, 4)) this.togglePause();
      return;
    }
    if (p === 'title') {
      if (hit(TITLE_BTNS[1]!, x, y)) {
        this.play('select');
        this.setPhase('stamps');
      } else this.startRun();
      return;
    }
    if (p === 'stamps') {
      this.play('select');
      this.setPhase('title');
      return;
    }
    const inPlay = p === 'courseIntro' || p === 'flyover' || p === 'aim' || p === 'rolling' || p === 'result' || p === 'holeEnd';
    if (inPlay && hit(PAUSE_BTN, x, y, 4)) {
      this.togglePause();
      return;
    }
    if (p === 'aim' && hit(VIEW_BTN, x, y, 4)) {
      this.toggleView();
      return;
    }
    if (p === 'aim') {
      if (this.viewing) {
        this.viewDrag = { id, y, camY: this.viewY };
        return;
      }
      if (y < HUD_H) return;
      this.drag = { id, sx: x, sy: y, x, y, touch, mode: 'undecided', aim0: this.aim };
      return;
    }
    this.confirm();
  }

  pointerMove(id: number, x: number, y: number, _touch: boolean): void {
    void _touch;
    const d = this.drag;
    if (d && d.id === id) {
      d.x = x;
      d.y = y;
      if (d.touch && this.phase === 'aim') {
        const dx = x - d.sx;
        const dy = y - d.sy;
        // 動かしはじめの向きで、向きを回すか強さを決めるかを分ける（1 回の指の中では変えない）
        if (d.mode === 'undecided' && Math.hypot(dx, dy) >= TOUCH_DECIDE) {
          d.mode = Math.abs(dx) > Math.abs(dy) ? 'aim' : 'power';
          // 向きは決めた所から回しはじめる（決めるまでの 10px で、急に回らないように）
          if (d.mode === 'aim') d.sx = x;
          d.aim0 = this.aim;
        }
        if (d.mode === 'aim') this.aim = d.aim0 + (x - d.sx) * TOUCH_TURN;
      }
    }
    if (this.viewDrag && this.viewDrag.id === id) {
      this.viewY = this.clampCam(this.viewDrag.camY - (y - this.viewDrag.y) * 1.6);
    }
  }

  pointerUp(id: number): void {
    if (this.viewDrag && this.viewDrag.id === id) this.viewDrag = null;
    const d = this.drag;
    if (!d || d.id !== id) return;
    this.drag = null;
    if (this.phase !== 'aim') return;
    if (d.touch) {
      // 左右に動かしただけ（向きを回した）なら打たない。下へ引いてはなしたら打つ
      if (d.mode !== 'power') return;
      const pull = d.y - d.sy;
      if (pull < DRAG_CANCEL) return;
      this.shoot(this.aim, clamp(pull / TOUCH_FULL, 0, 1));
      return;
    }
    const len = Math.hypot(d.x - d.sx, d.y - d.sy);
    if (len < DRAG_CANCEL) return; // 少しだけ引いてはなした：打たない
    this.shoot(Math.atan2(d.sy - d.y, d.sx - d.x), clamp(len / DRAG_FULL, 0, 1));
  }

  key(k: 'left' | 'right' | 'up' | 'down' | 'space', down: boolean): void {
    if (k === 'space') {
      if (down) {
        if (this.canShoot && !this.drag) {
          this.charging = true;
          this.chargeT = 0;
        }
      } else if (this.charging) {
        this.charging = false;
        const pw = this.chargePower;
        if (this.canShoot && pw * DRAG_FULL >= DRAG_CANCEL) this.shoot(this.aim, pw);
      }
      return;
    }
    if (down && this.phase === 'title' && (k === 'up' || k === 'down')) this.moveCursor(k === 'up' ? -1 : 1);
    this.keys[k] = down;
  }

  toggleView(): void {
    if (this.phase !== 'aim') return;
    this.viewing = !this.viewing;
    this.drag = null;
    this.charging = false;
    this.viewY = this.camY;
    this.play('tap');
  }

  /** クリック・Space・Enter（打つ操作以外）。 */
  confirm(): void {
    const p = this.phase;
    if (p === 'title') {
      if (this.titleCursor === 1) {
        this.play('select');
        this.setPhase('stamps');
      } else this.startRun();
    } else if (p === 'stamps') {
      this.play('select');
      this.setPhase('title');
    } else if (p === 'courseIntro') {
      if (this.phaseTime > 0.4) {
        this.play('select');
        this.setPhase('flyover');
      }
    } else if (p === 'flyover') {
      if (this.phaseTime > 0.3) {
        this.camY = this.flyTo;
        this.startAim();
      }
    } else if (p === 'holeEnd') {
      if (this.phaseTime > 0.6) this.nextHole();
    } else if (p === 'card') {
      const ready = this.cardTime > this.cardRevealTime;
      if (!ready) this.cardTime = this.cardRevealTime + 0.01;
      else this.afterCard();
    } else if (p === 'demo') {
      if (this.phaseTime > 0.8) {
        this.courseIndex++;
        this.startCourse();
      }
    } else if (p === 'gameover') {
      if (this.phaseTime > 1.2) this.toFinal();
    } else if (p === 'ending') {
      if (this.phaseTime > 1) {
        if (this.phaseTime < ENDING_TIME) this.phaseTime = Math.max(this.phaseTime, this.nextEndingCut());
        else this.toFinal();
      }
    } else if (p === 'final') {
      if (this.phaseTime > 1.2) {
        this.play('select');
        this.setPhase('title');
      }
    }
  }

  /** スコアカードで、合計まで出しおえる時間。 */
  get cardRevealTime(): number {
    return 0.5 + 3 * 0.55 + 0.4;
  }

  private nextEndingCut(): number {
    for (const c of ENDING_CUTS) if (c > this.phaseTime + 0.05) return c;
    return ENDING_TIME;
  }

  togglePause(): void {
    if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
      return;
    }
    const p = this.phase;
    if (p === 'courseIntro' || p === 'flyover' || p === 'aim' || p === 'rolling' || p === 'result' || p === 'holeEnd') {
      this.pausedFrom = p;
      this.phase = 'paused';
      this.drag = null;
      this.charging = false;
      this.viewDrag = null;
    }
  }

  escape(): void {
    if (this.phase === 'stamps') {
      this.setPhase('title');
      return;
    }
    if (this.viewing) {
      this.toggleView();
      return;
    }
    this.togglePause();
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  /** タイトルのボタン選び（キーボード）。 */
  moveCursor(d: number): void {
    if (this.phase !== 'title') return;
    this.titleCursor = (this.titleCursor + d + 2) % 2;
    this.play('tap');
  }
}

/** エンディングの場面の区切り（秒）と全体の長さ。 */
export const ENDING_CUTS = [0, 4, 8, 12.5];
export const ENDING_TIME = 17;

void WIDTH;
