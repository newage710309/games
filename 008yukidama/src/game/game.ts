import type { Audio } from './audio';
import { WIDTH } from './constants';
import { buildCourse, ridgeHalf, type Course, type Prop, type Rand } from './course';
import { FORT_H } from './fort';
import type { Stuck, StuckKind } from './snowball';
import {
  BERRY_SCORE,
  CHIP,
  EAT_SCORE,
  fallSpeed,
  fortDamage,
  ICE_GRIP,
  ICE_SPEED,
  INVULN_TIME,
  LANE_SPEED,
  MIN_CM,
  NO_MISS_BONUS,
  PX_PER_M,
  radiusOf,
  SIZE_SCORE,
  STAGE_BONUS,
  STAGES,
  starsOf,
  START_CM,
  steerAccel,
  steerMax,
  SUN_MELT,
  zoomOf,
  type Stage
} from './stages';
import { loadHighScore, saveHighScore } from './storage';

export type { Rand } from './course';

/**
 * 流れ：
 *   title → ready（よーい）→ playing → charge（とりでへ自動でつっこむ）→ impact（くずれる）
 *   → stageClear → demo（休憩）→ 次の ready …
 *   3 面の stageClear → ending → result → title
 *   小さくなりすぎた・目標に届かなかった → miss → gameover → title（コンティニューなし）
 */
export type Phase =
  | 'title'
  | 'ready'
  | 'playing'
  | 'charge'
  | 'impact'
  | 'stageClear'
  | 'miss'
  | 'demo'
  | 'ending'
  | 'result'
  | 'gameover'
  | 'paused';

/** おしまいの理由。 */
export type MissReason = 'small' | 'bounced';

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
export const STAGE_CLEAR_TIME = 4;
export const MISS_TIME = 2.2;
/** 体当たりしてから、結果を出すまでの秒数。 */
export const IMPACT_TIME = 2;
/** 休憩デモの秒数（タップで飛ばせる）。 */
export const DEMO_TIME = 8;
/** エンディングの秒数（タップで飛ばせる）。 */
export const ENDING_TIME = 15;
/** とりでの手前、自動でつっこみ始める距離。 */
const CHARGE_DIST = 620;
/** つっこむときの速さの倍率。 */
const CHARGE_SPEED = 1.35;
/** 門にはじかれて戻る秒数と速さ。 */
const KNOCK_TIME = 0.55;
const KNOCK_SPEED = 620;
/** ぶつかったあと、速さが戻るまでの秒数。 */
const SLOW_TIME = 0.7;
/** 指のドラッグの倍率。 */
const DRAG_GAIN = 1.5;
/** 刺さっているものの上限。 */
const MAX_STUCK = 42;
/** さくらちゃんの表情が続く秒数。 */
const MOOD_TIME = 0.8;

export interface Pop {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  t: number;
  readonly color?: string;
}

/** 飛び散りの演出。 */
export interface Burst {
  x: number;
  y: number;
  r: number;
  t: number;
  readonly dur: number;
  readonly seed: number;
  readonly n: number;
}

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

export class Game {
  phase: Phase = 'title';
  /** 今の場面になってからの秒数。 */
  phaseTime = 0;
  /** 画面の飾りの動きに使う通しの時間。 */
  time = 0;
  stageIndex = 0;
  score = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  pausedFrom: Phase = 'playing';
  missReason: MissReason = 'small';

  course: Course = buildCourse(STAGES[0]!, Math.random);
  /** この面で動いている時間（雪だるま兵の歩きなど）。 */
  stageTime = 0;

  // --- 雪玉 ---
  x = 240;
  y = 0;
  vx = 0;
  cm = START_CM;
  /** 見た目の半径（なめらかに変わる）。 */
  shownR = radiusOf(START_CM);
  roll = 0;
  stuck: Stuck[] = [];
  invuln = 0;
  /** ぶつかった直後の赤い点滅 0..1。 */
  flash = 0;
  private slowT = 0;
  private knockT = 0;
  trail: { x: number; y: number; r: number }[] = [];
  /** 下る向きの今の速さ。 */
  speed = 0;

  // --- 入力 ---
  /** キーの向き（-1, 0, 1）。 */
  private axis = 0;
  /** マウス・指で決めた行き先（ゲーム世界の x）。 */
  private target: number | null = null;

  // --- カメラ ---
  camX = 240;
  camY = 0;
  zoom = zoomOf(START_CM);
  shake = 0;

  // --- とりで ---
  fortDamage = 0;
  fortFly = 0;
  /** 大きさが今減っている（日なた・欠けた直後）。 */
  shrinking = false;

  // --- 記録 ---
  /** この面で欠けた回数。 */
  chips = 0;
  /** とりでに着いたときの大きさ。 */
  arrivedCm = 0;
  /** この面でもらったボーナス。 */
  sizeBonus = 0;
  stageBonus = 0;
  noMissBonus = 0;
  stars = 0;
  /** 面ごとの星。 */
  starLog: number[] = [];
  /** 巻きこんだ数（ぜんぶの面の合計）。 */
  eaten = 0;

  pops: Pop[] = [];
  bursts: Burst[] = [];
  private burstSeed = 1;
  moodEyes: 'dot' | 'happy' | 'shock' = 'dot';
  private moodT = 0;

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

  /** とりでまでののこり（m）。 */
  get left(): number {
    return Math.max(0, Math.ceil((this.course.length - this.y) / PX_PER_M));
  }

  get r(): number {
    return radiusOf(this.cm);
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
      case 'charge':
        if (onCanvas && hit(PAUSE_BUTTON, x, y)) this.togglePause();
        break;
      case 'paused':
        if (!onCanvas) break;
        if (hit(PAUSE_MENU.resume, x, y) || hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
        else if (hit(PAUSE_MENU.title, x, y)) this.toTitle();
        break;
      case 'stageClear':
        if (this.phaseTime > 1.2) this.afterClear();
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

  /** スペース・Enter。 */
  confirm(): void {
    if (this.phase === 'paused') this.togglePause();
    else this.tap(null, null);
  }

  /** キーの向き（-1, 0, 1）。キーを使うと、マウスの行き先は忘れる。 */
  setAxis(dir: number): void {
    this.axis = dir;
    if (dir !== 0) this.target = null;
  }

  /** 指のドラッグ：動かした分だけ行き先をずらす（dx は画面の座標）。 */
  dragBy(dx: number): void {
    const base = this.target ?? this.x;
    this.target = base + (dx * DRAG_GAIN) / this.zoom;
  }

  /** マウス：画面の左はしから右はしが、道の左はしから右はしにあたる。 */
  mouseTo(sx: number): void {
    const [l, h] = this.course.road(this.y + 120);
    this.target = l + (Math.max(0, Math.min(480, sx)) / 480) * (h - l);
  }

  /** 行き先を直接決める（ボット用）。 */
  setTarget(x: number | null): void {
    this.target = x;
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'ready' || this.phase === 'charge') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
      this.axis = 0;
      this.audio.play('select');
    } else if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
      this.audio.play('select');
    }
  }

  escape(): void {
    if (this.phase === 'playing' || this.phase === 'ready' || this.phase === 'charge' || this.phase === 'paused') this.togglePause();
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
    this.starLog = [];
    this.newHiScore = false;
    this.audio.play('start');
    this.enterReady();
  }

  private enterReady(): void {
    this.course = buildCourse(this.stage, this.rand);
    this.stageTime = 0;
    this.x = 240;
    this.y = 0;
    this.vx = 0;
    this.cm = START_CM;
    this.shownR = radiusOf(START_CM);
    this.roll = 0;
    this.stuck = [];
    this.invuln = 0;
    this.flash = 0;
    this.slowT = 0;
    this.knockT = 0;
    this.trail = [];
    this.speed = 0;
    this.axis = 0;
    this.target = null;
    this.camX = 240;
    this.camY = 0;
    this.zoom = zoomOf(START_CM);
    this.shake = 0;
    this.fortDamage = 0;
    this.fortFly = 0;
    this.shrinking = false;
    this.chips = 0;
    this.arrivedCm = 0;
    this.sizeBonus = 0;
    this.stageBonus = 0;
    this.noMissBonus = 0;
    this.stars = 0;
    this.pops = [];
    this.bursts = [];
    this.moodEyes = 'dot';
    this.moodT = 0;
    this.setPhase('ready');
  }

  private toTitle(): void {
    this.setPhase('title');
  }

  private afterClear(): void {
    if (this.stageIndex < STAGES.length - 1) {
      this.setPhase('demo');
    } else {
      this.saveHi();
      this.setPhase('ending');
    }
    this.audio.play('jingle');
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

  // --- 毎フレーム ------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;
    this.updateEffects(dt);

    switch (this.phase) {
      case 'ready':
        this.followCamera(dt);
        if (this.phaseTime >= READY_TIME) {
          this.setPhase('playing');
          this.audio.play('start');
        }
        break;
      case 'playing':
        this.updateRolling(dt);
        break;
      case 'charge':
        this.updateCharge(dt);
        break;
      case 'impact':
        this.updateImpact(dt);
        break;
      case 'stageClear':
        if (this.phaseTime >= STAGE_CLEAR_TIME) this.afterClear();
        break;
      case 'miss':
        this.updateMiss(dt);
        if (this.phaseTime >= MISS_TIME) {
          this.saveHi();
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

  /** 雪玉の下の地面。 */
  private groundAt(): { ice: boolean; sun: boolean } {
    let ice = false;
    let sun = false;
    for (const p of this.course.patches) {
      if (p.kind === 'drift') continue;
      if (Math.abs(this.y - p.y) < p.h / 2 && Math.abs(this.x - p.x) < p.w / 2) {
        if (p.kind === 'ice') ice = true;
        else sun = true;
      }
    }
    return { ice, sun };
  }

  private updateRolling(dt: number): void {
    this.stageTime += dt;
    const c = this.course;
    const { ice, sun } = this.groundAt();
    this.shrinking = false;

    // 下る速さ
    let v = fallSpeed(this.stage, this.cm);
    if (ice) v *= ICE_SPEED;
    if (c.lanes.some((l) => this.y > l.y1 && this.y < l.y2 && this.x > l.left && this.x < l.right)) v *= LANE_SPEED;
    if (this.slowT > 0) {
      this.slowT -= dt;
      v *= 1 - 0.55 * Math.max(0, this.slowT / SLOW_TIME);
    }
    const prevY = this.y;
    if (this.knockT > 0) {
      this.knockT -= dt;
      this.y -= KNOCK_SPEED * Math.max(0, this.knockT / KNOCK_TIME) * dt;
      this.speed = 0;
    } else {
      this.y += v * dt;
      this.speed = v;
    }

    this.steer(dt, ice);
    this.collideWalls();

    // 大きさの増減
    if (sun) {
      this.cm -= this.cm * SUN_MELT * dt;
      this.shrinking = true;
    } else if (!ice) {
      this.cm += this.stage.snowRate * dt;
    }
    this.updateDrifts(prevY);
    this.updateProps();
    this.updateGates(prevY);
    this.updateProgress(dt);

    if (this.cm < MIN_CM) {
      this.fallOff();
      return;
    }
    if (this.y >= c.length - CHARGE_DIST) {
      this.setPhase('charge');
      this.target = null;
      this.audio.play('charge');
    }
  }

  private steer(dt: number, ice: boolean): void {
    const max = steerMax(this.cm);
    let want = 0;
    if (this.axis !== 0) want = this.axis * max;
    else if (this.target !== null) {
      const d = this.target - this.x;
      want = Math.max(-max, Math.min(max, d * 7));
    }
    const a = steerAccel(this.cm) * (ice ? ICE_GRIP : 1);
    const dv = want - this.vx;
    this.vx += Math.max(-a * dt, Math.min(a * dt, dv));
    this.x += this.vx * dt;
  }

  private collideWalls(): void {
    const c = this.course;
    const r = this.r;
    const [l, h] = c.road(this.y);
    const m = r * 0.92;
    if (this.x < l + m) {
      this.x = l + m;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > h - m) {
      this.x = h - m;
      if (this.vx > 0) this.vx = 0;
    }
    for (const rd of c.ridges) {
      const half = ridgeHalf(rd, this.y);
      if (half <= 0) continue;
      const d = this.x - rd.x;
      if (Math.abs(d) < half + m) {
        this.x = rd.x + (d < 0 ? -1 : 1) * (half + m);
        this.vx = 0;
      }
    }
  }

  private updateDrifts(prevY: number): void {
    const dy = Math.abs(this.y - prevY);
    const r = this.r;
    for (const p of this.course.patches) {
      if (p.kind !== 'drift' || p.left <= 0) continue;
      if (Math.abs(this.y - p.y) > p.h / 2 + r * 0.4) continue;
      const over = p.w / 2 + r * 0.6 - Math.abs(this.x - p.x);
      if (over <= 0) continue;
      // 真ん中を通るほど多くもらえる。1 回通りぬけると、なくなる
      const width = Math.min(1, over / Math.min(p.w, 2 * r));
      const take = Math.min(p.left, (dy / (p.h + r)) * width * 1.15);
      if (take <= 0) continue;
      const first = p.left === 1;
      p.left -= take;
      this.cm += p.amount * take;
      if (first) {
        this.audio.play('drift');
        this.pops.push({ text: 'ふかふか！', x: this.x, y: this.y - r, t: 0, color: '#4f9fe0' });
      }
    }
  }

  private updateProps(): void {
    const r = this.r;
    for (const p of this.course.props) {
      if (p.y > this.y + 240) break;
      if (p.eaten) continue;
      if (p.amp > 0) {
        p.x = p.x0 + Math.sin(this.stageTime * 2.2 + p.seed) * p.amp;
      }
      if (p.bumped) continue;
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const reach = r * 0.88 + p.r;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (p.eatAt !== null && this.cm >= p.eatAt) this.eat(p);
      else if (this.invuln <= 0) {
        p.bumped = true;
        this.chip(Math.sign(dx) || 1);
      }
    }
    // 画面の外のものも歩かせておく
    for (const p of this.course.props) {
      if (p.amp > 0 && !p.eaten && p.y > this.y + 240) p.x = p.x0 + Math.sin(this.stageTime * 2.2 + p.seed) * p.amp;
    }
  }

  private eat(p: Prop): void {
    p.eaten = true;
    if (p.kind === 'berry') {
      this.addScore(BERRY_SCORE, p.x, p.y, '#e0404f');
      this.audio.play('berry');
    } else {
      const k = p.kind as keyof typeof EAT_SCORE;
      this.addScore(EAT_SCORE[k], p.x, p.y);
      this.audio.play('eat', p.kind === 'tree' ? 0.7 : p.kind === 'soldier' ? 0.85 : 1);
      this.eaten++;
    }
    this.setEyes('happy');
    this.stickOn(p.kind as StuckKind);
  }

  /** 雪玉の見えているところに刺す（転がると一緒に回る）。 */
  private stickOn(kind: StuckKind): void {
    const y = this.rand() * 1.2 - 0.6;
    const a = this.rand() * Math.PI;
    const s = Math.sqrt(1 - y * y);
    // 今の角度を巻きもどして、玉の座標に直す
    const px = Math.cos(a) * s;
    const py = y;
    const pz = Math.sin(a) * s;
    const c = Math.cos(-this.roll);
    const n = Math.sin(-this.roll);
    this.stuck.push({ kind, x: px, y: py * c + pz * n, z: -py * n + pz * c, seed: this.stuck.length });
    if (this.stuck.length > MAX_STUCK) this.stuck.shift();
  }

  /** 2 割欠ける。 */
  private chip(dir: number): void {
    this.cm *= 1 - CHIP;
    this.chips++;
    this.invuln = INVULN_TIME;
    this.flash = 1;
    this.slowT = SLOW_TIME;
    this.vx = dir * 240;
    this.shake = 0.5;
    this.shrinking = true;
    this.setEyes('shock', 1.1);
    this.bursts.push({ x: this.x, y: this.y, r: this.r, t: 0, dur: 0.75, seed: this.burstSeed++, n: 24 });
    this.pops.push({ text: 'かけた！', x: this.x, y: this.y - this.r - 40, t: 0, color: '#d9534f' });
    // 刺さっていたものも、いくつか落ちる
    this.stuck = this.stuck.filter(() => this.rand() > 0.2);
    this.audio.play('chip');
    if (this.cm < MIN_CM) this.fallOff();
  }

  private updateGates(prevY: number): void {
    const r = this.r;
    for (const g of this.course.gates) {
      g.fits = this.cm <= g.cm;
      const inLane = this.x > g.left && this.x < g.right;
      // 通れる大きさのときは、門のすき間へ少し寄せる（ふちで引っかからないように）
      if (g.fits && inLane && this.y > g.y - 200 && this.y < g.y) {
        const room = Math.max(0, g.gap / 2 - r);
        const clamped = Math.max(g.x - room, Math.min(g.x + room, this.x));
        this.x += (clamped - this.x) * 0.12;
      }
      const line = g.y - r * 0.6;
      if (prevY < line && this.y >= line && inLane) {
        if (g.fits) {
          this.addScore(0, this.x, this.y - r);
          this.audio.play('gate');
        } else {
          // 通れない：欠けて、はじき返される
          this.y = line - 1;
          this.knockT = KNOCK_TIME;
          if (this.invuln <= 0) this.chip(g.x < 240 ? 1 : -1);
          else this.audio.play('bump');
        }
      }
    }
  }

  private addScore(pts: number, x: number, y: number, color?: string): void {
    if (pts <= 0) return;
    this.score += pts;
    this.pops.push({ text: `+${pts}`, x, y: y - 16, t: 0, color });
  }

  private setEyes(eyes: 'dot' | 'happy' | 'shock', time = MOOD_TIME): void {
    this.moodEyes = eyes;
    this.moodT = time;
  }

  /** 小さくなりすぎて、さくらちゃんが転げ落ちる。 */
  private fallOff(): void {
    if (this.phase === 'miss') return;
    this.missReason = 'small';
    this.setPhase('miss');
    this.audio.play('miss');
  }

  private updateProgress(dt: number): void {
    this.roll += ((this.speed > 0 ? this.speed : -KNOCK_SPEED * 0.4) / Math.max(10, this.r)) * dt;
    const last = this.trail[this.trail.length - 1];
    if (last === undefined || Math.abs(this.y - last.y) > 26) {
      this.trail.push({ x: this.x, y: this.y, r: this.r });
      if (this.trail.length > 46) this.trail.shift();
    }
    this.followCamera(dt);
  }

  private followCamera(dt: number): void {
    this.camX += (240 + (this.x - 240) * 0.55 - this.camX) * Math.min(1, dt * 8);
    this.camY += (this.y - this.camY) * Math.min(1, dt * 14);
    // 道が広いところ（分かれ道）では、門が画面からはみ出さないように引く
    const [l, h] = this.course.road(this.y + 240);
    this.zoom += (Math.min(zoomOf(this.cm), WIDTH / (h - l + 30)) - this.zoom) * Math.min(1, dt * 1.6);
  }

  private updateCharge(dt: number): void {
    this.stageTime += dt;
    const c = this.course;
    const fortY = c.length;
    const prevY = this.y;
    this.speed = fallSpeed(this.stage, this.cm) * CHARGE_SPEED;
    this.y += this.speed * dt;
    // まん中へ自動でよる
    this.x += (240 - this.x) * Math.min(1, dt * 3);
    this.vx = 0;
    this.cm += this.stage.snowRate * dt;
    this.updateDrifts(prevY);
    this.updateProps();
    this.updateProgress(dt);
    this.setEyes(this.cm >= this.stage.goal ? 'happy' : 'shock', 0.2);
    if (this.y + this.r >= fortY) this.hitFort();
  }

  private hitFort(): void {
    const g = this.stage.goal;
    this.arrivedCm = this.cm;
    this.sizeBonus = Math.floor(this.cm) * SIZE_SCORE;
    this.score += this.sizeBonus;
    this.stars = starsOf(this.cm, g);
    this.fortDamage = fortDamage(this.cm, g);
    this.fortFly = 0.001;
    this.shake = this.stars > 0 ? 1 + this.stars * 0.5 : 0.8;
    if (this.stars > 0) {
      this.audio.play('crash', 1 - this.stars * 0.08);
      this.bursts.push({ x: this.x, y: this.y + this.r, r: this.r, t: 0, dur: 1, seed: this.burstSeed++, n: 40 });
    } else {
      this.audio.play('bump');
    }
    this.setPhase('impact');
  }

  private updateImpact(dt: number): void {
    this.stageTime += dt;
    this.fortFly += dt;
    if (this.stars > 0) {
      // とりでをつきぬけて、ゆっくり止まる
      const s = Math.max(0, 1 - this.phaseTime / IMPACT_TIME);
      this.speed = 220 * s;
      this.y += this.speed * dt;
      this.updateProgress(dt);
      if (this.phaseTime >= IMPACT_TIME) this.clearStage();
    } else {
      // はじき返される
      const s = Math.max(0, 1 - this.phaseTime / 0.9);
      this.y -= 520 * s * dt;
      this.speed = 0;
      this.updateProgress(dt);
      this.setEyes('shock', 0.2);
      if (this.phaseTime >= 1.4) {
        this.missReason = 'bounced';
        this.setPhase('miss');
        this.audio.play('miss');
      }
    }
  }

  private clearStage(): void {
    this.stageBonus = STAGE_BONUS;
    this.noMissBonus = this.chips === 0 ? NO_MISS_BONUS : 0;
    this.score += this.stageBonus + this.noMissBonus;
    this.starLog.push(this.stars);
    this.setPhase('stageClear');
    this.audio.play('stageClear');
  }

  private updateMiss(dt: number): void {
    this.fortFly += this.fortFly > 0 ? dt : 0;
    this.followCamera(dt);
  }

  private updateEffects(dt: number): void {
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 0.9);
    for (const b of this.bursts) b.t += dt;
    this.bursts = this.bursts.filter((b) => b.t < b.dur);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.shake = Math.max(0, this.shake - dt * 2);
    this.shownR += (radiusOf(this.cm) - this.shownR) * Math.min(1, dt * 10);
    if (this.moodT > 0) {
      this.moodT -= dt;
      if (this.moodT <= 0) this.moodEyes = 'dot';
    }
    if (this.phase === 'stageClear') this.fortFly += dt;
  }

  /** とりでの高さ込みの下はし（描くかどうかの判定用）。 */
  get fortBottom(): number {
    return this.course.length + FORT_H;
  }
}
