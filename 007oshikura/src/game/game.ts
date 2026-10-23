import type { Audio } from './audio';
import { cellX, cellY, type Grid, type Piece } from './board';
import { CELL, COLS, ROWS, SPAWN_COL } from './constants';
import {
  applyGravity,
  CHILD_OFFSET,
  emptyGrid,
  findGroups,
  meltTargets,
  removeGroups,
  type Cell,
  type Fall,
  type Group
} from './logic';
import type { SakuraMood } from './scene';
import {
  ANIMAL_SCORE,
  CHAIN_MULT,
  LOCK_TIME,
  LOCK_TIME_SOFT,
  MELT_SCORE,
  MULTI_BONUS,
  SOFT_FALL,
  STAGE_BONUS,
  STAGES,
  type Stage
} from './stages';
import { loadHighScore, saveHighScore } from './storage';

/**
 * 流れ：
 *   title → ready（よーい）→ playing → stageClear → demo（休憩）→ 次の ready …
 *   3 面の stageClear → ending → result → title
 *   出てくる場所がふさがった → miss → gameover → title（コンティニューなし）
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

/**
 * playing の中の段階。
 *   fall：組を動かしている / drop：浮いたものが落ちている / gyu：かたまりがぎゅっと消えている
 */
export type Step = 'fall' | 'drop' | 'gyu';

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
export const STAGE_CLEAR_TIME = 2.6;
export const MISS_TIME = 2.2;
/** 休憩デモの秒数（タップで飛ばせる）。 */
export const DEMO_TIME = 7;
/** エンディングの秒数（タップで飛ばせる）。 */
export const ENDING_TIME = 10;
/** ぎゅっと消える演出の秒数。 */
export const GYU_TIME = 0.6;
/** 浮いたものが落ちる速さ（段 / 秒）。 */
const DROP_SPEED = 16;
/** 着地したあと、左右に動かしたり回したりして固まるのを待てる回数。 */
const LOCK_RESETS = 10;
/** さくらちゃんがよろこんでいる秒数。 */
const CHEER_TIME = 1.4;

/** 動かしている組。axis を軸に child が回る。y は axis の段（小数で落ちている途中）。 */
export interface Active {
  axis: Piece;
  child: Piece;
  col: number;
  y: number;
  rot: number;
  lockT: number;
  resets: number;
}

/** 落ちている途中のもの（y は今の段、小数）。 */
export interface Faller extends Fall {
  y: number;
  v: number;
}

export interface Pop {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  t: number;
}

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

/** 1 回消えたときの点（消した数・種類の数・れんさの数から）。 */
export function scoreOf(cleared: number, kinds: number, chain: number): number {
  const mult = CHAIN_MULT[Math.min(chain, CHAIN_MULT.length) - 1]!;
  return cleared * ANIMAL_SCORE * mult + (kinds - 1) * MULTI_BONUS;
}

export class Game {
  phase: Phase = 'title';
  /** 今の場面になってからの秒数。 */
  phaseTime = 0;
  /** 画面の飾りの動きに使う通しの時間。 */
  time = 0;
  stageIndex = 0;
  score = 0;
  /** 消した動物の数（ぜんぶの面の合計）。 */
  cleared = 0;
  /** いちばん長かったれんさ。 */
  maxChain = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  pausedFrom: Phase = 'playing';

  grid: Grid = emptyGrid();
  step: Step = 'fall';
  active: Active | null = null;
  /** つぎの組 [上（child）, 下（axis）]。 */
  next: [Piece, Piece] = ['shimaenaga', 'shimaenaga'];
  fallers: Faller[] = [];
  /** ぎゅっと消えているかたまりと、溶けている雪だるま。 */
  gyuGroups: Group[] = [];
  melting: Cell[] = [];
  /** 今の段階になってからの秒数（ぎゅっの演出用）。 */
  stepTime = 0;
  /** 今のれんさの数。 */
  chain = 0;
  /** 画面に出すれんさの表示（数と経過秒）。 */
  chainShow: { n: number; t: number } | null = null;
  /** この面で消した数。 */
  stageCleared = 0;
  /** 前の雪だるまから何組落としたか。 */
  pairsSinceSnow = 0;
  /** 雪だるまを降らせ終わったところ（続けて降らせない）。 */
  private snowJustDropped = false;
  /** 次に降る雪だるまの数（予告に出す）。 */
  snowNext = 2;
  soft = false;
  pops: Pop[] = [];

  sakuraMood: SakuraMood = 'idle';
  sakuraSay: string | undefined;
  private moodTime = 0;
  /** あぶない状態（0..1）。 */
  danger = 0;
  private dangerWarned = false;

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

  /** あと何匹で面クリアか。 */
  get left(): number {
    return Math.max(0, this.stage.goal - this.stageCleared);
  }

  /** 雪だるまがあと何組で降るか（0 = この組のあと）。 */
  get snowIn(): number {
    return Math.max(0, this.stage.snowEvery - this.pairsSinceSnow);
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

  /** タップ（指を動かさずに離した）。プレイ中は回す。 */
  tap(x: number | null, y: number | null): void {
    const onCanvas = x !== null && y !== null;
    switch (this.phase) {
      case 'title':
        if (this.phaseTime > 0.3) this.start();
        break;
      case 'ready':
      case 'playing':
        if (onCanvas && hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else this.rotate(1);
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

  /** スペース・Enter。プレイ中は回す、それ以外は決定。 */
  confirm(): void {
    if (this.phase === 'playing') this.rotate(1);
    else this.tap(null, null);
  }

  move(dir: -1 | 1): void {
    const a = this.controllable();
    if (a === null) return;
    if (!this.fits(a.col + dir, a.y, a.rot)) return;
    a.col += dir;
    this.touchLock(a);
    this.audio.play('move');
  }

  /** 回す。dir 1 = 右回り、-1 = 左回り。かべや他のものに当たるときは、軸を横にずらして回す。 */
  rotate(dir: -1 | 1): void {
    const a = this.controllable();
    if (a === null) return;
    const rot = (a.rot + dir + 4) % 4;
    const [, dc] = CHILD_OFFSET[rot];
    const tries: [number, number][] = [
      [a.col, a.y],
      [a.col - dc, a.y]
    ];
    // 下向きにするとき床や下のものに当たるなら、1 段持ち上げる
    if (rot === 2) tries.push([a.col, Math.ceil(a.y) - 1]);
    for (const [col, y] of tries) {
      if (this.fits(col, y, rot)) {
        a.col = col;
        a.y = y;
        a.rot = rot;
        this.touchLock(a);
        this.audio.play('rotate');
        return;
      }
    }
    // 左右とも狭くて回せないときは、上下を入れかえる
    if (a.rot % 2 === 0) {
      const flip = (a.rot + 2) % 4;
      const y = flip === 2 ? Math.min(a.y, this.restY(a.col, flip)) : a.y;
      if (this.fits(a.col, y, flip)) {
        a.rot = flip;
        a.y = y;
        this.touchLock(a);
        this.audio.play('rotate');
      }
    }
  }

  setSoft(on: boolean): void {
    this.soft = on;
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'ready') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
      this.soft = false;
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

  private controllable(): Active | null {
    if (this.phase !== 'playing' || this.step !== 'fall') return null;
    return this.active;
  }

  /** 着地しているときに動かしたら、固まるまでの時間を少し戻す（何度もはできない）。 */
  private touchLock(a: Active): void {
    if (a.lockT > 0 && a.resets < LOCK_RESETS) {
      a.lockT = 0;
      a.resets++;
    }
  }

  // --- 組の位置 ---------------------------------------------------------

  private blocked(r: number, c: number): boolean {
    if (c < 0 || c >= COLS || r >= ROWS) return true;
    if (r < 0) return false;
    return this.grid[r][c] !== null;
  }

  /** 軸の段が y（小数あり）のとき、2 匹とも空いているところにいられるか。 */
  fits(col: number, y: number, rot: number): boolean {
    const [dr, dc] = CHILD_OFFSET[rot];
    for (const r of new Set([Math.floor(y), Math.ceil(y)])) {
      if (this.blocked(r, col) || this.blocked(r + dr, col + dc)) return false;
    }
    return true;
  }

  /** その列・向きで、まっすぐ落としたときに止まる軸の段。 */
  restY(col: number, rot: number, fromY = -2): number {
    let y = Math.ceil(fromY);
    while (this.fits(col, y + 1, rot)) y++;
    return y;
  }

  // --- 流れ ------------------------------------------------------------

  start(): void {
    this.stageIndex = 0;
    this.score = 0;
    this.cleared = 0;
    this.maxChain = 0;
    this.newHiScore = false;
    this.audio.play('start');
    this.enterReady();
  }

  private enterReady(): void {
    this.grid = emptyGrid();
    this.active = null;
    this.fallers = [];
    this.gyuGroups = [];
    this.melting = [];
    this.pops = [];
    this.chain = 0;
    this.chainShow = null;
    this.stageCleared = 0;
    this.pairsSinceSnow = 0;
    this.snowJustDropped = false;
    this.snowNext = this.rollSnowCount();
    this.soft = false;
    this.danger = 0;
    this.dangerWarned = false;
    this.setMood('idle');
    this.next = this.randomPair();
    this.step = 'fall';
    this.setPhase('ready');
  }

  private enterMiss(): void {
    this.saveHi();
    this.active = null;
    this.soft = false;
    this.setMood('sad');
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

  private randomPair(): [Piece, Piece] {
    const k = this.stage.kinds;
    const pick = (): Piece => k[Math.floor(this.rand() * k.length)]!;
    return [pick(), pick()];
  }

  private rollSnowCount(): number {
    const [a, b] = this.stage.snowCount;
    return a + Math.floor(this.rand() * (b - a + 1));
  }

  private setMood(mood: SakuraMood, say?: string, time = CHEER_TIME): void {
    this.sakuraMood = mood;
    this.sakuraSay = say;
    this.moodTime = time;
  }

  // --- 毎フレーム ------------------------------------------------------

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
          this.spawn();
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

  /** 今の落ちる速さ（段 / 秒）。消した数に合わせて少しずつ速くなる。 */
  get fallSpeed(): number {
    const [a, b] = this.stage.fall;
    return a + (b - a) * Math.min(1, this.stageCleared / this.stage.goal);
  }

  private updatePlaying(dt: number): void {
    if (this.step === 'fall') this.updateFall(dt);
    else if (this.step === 'drop') this.updateDrop(dt);
    else this.updateGyu();
    this.updateDanger();
  }

  private updateFall(dt: number): void {
    const a = this.active;
    if (a === null) return;
    const speed = this.soft ? Math.max(SOFT_FALL, this.fallSpeed) : this.fallSpeed;
    const ny = a.y + speed * dt;
    if (this.fits(a.col, ny, a.rot)) {
      a.y = ny;
      a.lockT = 0;
      return;
    }
    // 着地：止まれる段まで下ろして、少し待ってから固まる
    a.y = Math.max(Math.floor(a.y), this.restY(a.col, a.rot, Math.floor(a.y)));
    if (a.lockT === 0) this.audio.play('land');
    a.lockT += dt;
    if (a.lockT >= (this.soft ? LOCK_TIME_SOFT : LOCK_TIME)) this.lock();
  }

  /** 組を固めて、ます目に置く。片方の下が空いていれば、その 1 匹だけ落ちる。 */
  private lock(): void {
    const a = this.active;
    if (a === null) return;
    this.active = null;
    const [dr, dc] = CHILD_OFFSET[a.rot];
    const y = Math.round(a.y);
    // 下のものから置く
    const parts: [number, number, Piece][] = [
      [y, a.col, a.axis],
      [y + dr, a.col + dc, a.child]
    ];
    parts.sort((p, q) => q[0] - p[0]);
    for (const [r, c, p] of parts) if (r >= 0) this.grid[r][c] = p;
    this.pairsSinceSnow++;
    this.snowJustDropped = false;
    this.chain = 0;
    this.startDrop();
  }

  private startDrop(): void {
    const falls = applyGravity(this.grid);
    for (const f of falls) this.grid[f.to][f.col] = null;
    this.fallers.push(...falls.map((f) => ({ ...f, y: f.from, v: 4 })));
    this.step = 'drop';
    if (this.fallers.length === 0) this.afterDrop();
  }

  private updateDrop(dt: number): void {
    let landed = false;
    for (const f of this.fallers) {
      f.v = Math.min(DROP_SPEED, f.v + 60 * dt);
      f.y = Math.min(f.to, f.y + f.v * dt);
      if (f.y >= f.to && f.y - f.v * dt < f.to) landed = true;
    }
    if (landed) this.audio.play('land');
    if (this.fallers.some((f) => f.y < f.to)) return;
    for (const f of this.fallers) this.grid[f.to][f.col] = f.piece;
    this.fallers = [];
    this.afterDrop();
  }

  /** 落ち終わったら：くっついているものを消す、なければ雪だるま、なければ次の組。 */
  private afterDrop(): void {
    const groups = findGroups(this.grid);
    if (groups.length > 0) {
      this.startGyu(groups);
      return;
    }
    this.chain = 0;
    if (this.stageCleared >= this.stage.goal) {
      this.clearStage();
      return;
    }
    if (!this.snowJustDropped && this.pairsSinceSnow >= this.stage.snowEvery) {
      this.dropSnow();
      return;
    }
    this.spawn();
  }

  private startGyu(groups: Group[]): void {
    this.chain++;
    this.maxChain = Math.max(this.maxChain, this.chain);
    this.gyuGroups = groups;
    this.melting = meltTargets(this.grid, groups);
    const n = groups.reduce((s, g) => s + g.cells.length, 0);
    const kinds = new Set(groups.map((g) => g.kind)).size;
    const pts = scoreOf(n, kinds, this.chain) + this.melting.length * MELT_SCORE;
    this.score += pts;
    this.cleared += n;
    this.stageCleared += n;
    // 点のポップは、かたまりのまん中に
    const all = groups.flatMap((g) => g.cells);
    const mx = all.reduce((s, [, c]) => s + cellX(c), 0) / all.length + CELL / 2;
    const my = all.reduce((s, [r]) => s + cellY(r), 0) / all.length;
    this.pops.push({ text: `+${pts}`, x: mx, y: my - 34, t: 0 });
    if (this.chain >= 2) this.chainShow = { n: this.chain, t: 0 };
    this.audio.play('gyu', 1 + (this.chain - 1) * 0.12);
    if (this.melting.length > 0) this.audio.play('melt');
    const say = this.chain >= 2 ? 'すごーい！' : this.melting.length > 0 ? 'とけた！' : 'いいね！';
    this.setMood('cheer', say);
    this.step = 'gyu';
    this.stepTime = 0;
  }

  private updateGyu(): void {
    if (this.stepTime < GYU_TIME) return;
    removeGroups(this.grid, this.gyuGroups, this.melting);
    this.gyuGroups = [];
    this.melting = [];
    this.startDrop();
  }

  private dropSnow(): void {
    this.pairsSinceSnow = 0;
    this.snowJustDropped = true;
    const cols = Array.from({ length: COLS }, (_, c) => c);
    // 列をまぜて、先頭から n 列に降らせる
    for (let i = cols.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [cols[i], cols[j]] = [cols[j]!, cols[i]!];
    }
    const n = Math.min(COLS, this.snowNext);
    for (const [k, c] of cols.slice(0, n).entries()) {
      let to = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          to = r;
          break;
        }
      }
      if (to < 0) continue;
      const piece: Piece = this.rand() < this.stage.bigChance ? 'bigsnow' : 'snow';
      const from = -1.2 - k * 0.45;
      this.fallers.push({ col: c, piece, from, to, y: from, v: 2 });
    }
    this.snowNext = this.rollSnowCount();
    this.audio.play('snow');
    this.setMood('panic', 'わっ！', 1);
    this.step = 'drop';
    if (this.fallers.length === 0) this.afterDrop();
  }

  private spawn(): void {
    // 出てくる場所がふさがっていたらおしまい
    if (this.grid[0][SPAWN_COL] !== null) {
      this.enterMiss();
      return;
    }
    const [child, axis] = this.next;
    this.next = this.randomPair();
    this.active = { axis, child, col: SPAWN_COL, y: -1, rot: 0, lockT: 0, resets: 0 };
    this.step = 'fall';
  }

  private clearStage(): void {
    this.score += STAGE_BONUS;
    this.active = null;
    this.setMood('cheer', 'やったね！', 99);
    this.setPhase('stageClear');
    this.audio.play('stageClear');
  }

  /** 出てくる場所のまわりがどれだけ詰まっているか。 */
  private updateDanger(): void {
    let top = ROWS;
    for (let r = 0; r < ROWS; r++) {
      if (this.grid[r][SPAWN_COL] !== null || this.grid[r][SPAWN_COL + 1] !== null) {
        top = r;
        break;
      }
    }
    this.danger = top <= 1 ? 1 : top <= 3 ? 0.5 : 0;
    if (this.danger >= 1 && !this.dangerWarned) {
      this.dangerWarned = true;
      this.audio.play('danger');
    }
    if (this.danger === 0) this.dangerWarned = false;
    if (this.danger > 0 && this.moodTime <= 0) this.setMood('panic', 'あぶない！', 0.3);
  }

  /** 得点のポップ・れんさの表示・さくらちゃんの様子の時間を進める。 */
  private updateEffects(dt: number): void {
    this.stepTime += dt;
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 0.9);
    if (this.chainShow !== null) {
      this.chainShow.t += dt;
      if (this.chainShow.t > 1.2) this.chainShow = null;
    }
    if (this.moodTime > 0) {
      this.moodTime -= dt;
      if (this.moodTime <= 0 && this.phase === 'playing') this.setMood('idle', undefined, 0);
    }
  }

  /** 今の組がまっすぐ落ちたときの、2 匹の止まる位置（着地点の目印）。 */
  landing(): [number, number, Piece][] {
    const a = this.active;
    if (a === null) return [];
    const [dr, dc] = CHILD_OFFSET[a.rot];
    if (dc === 0) {
      const y = this.restY(a.col, a.rot, a.y);
      return [
        [y, a.col, a.axis],
        [y + dr, a.col, a.child]
      ];
    }
    // 横向きのときは、それぞれの列で下まで落ちる
    const land = (c: number): number => {
      let r = -1;
      while (r + 1 < ROWS && this.grid[r + 1][c] === null) r++;
      return r;
    };
    return [
      [land(a.col), a.col, a.axis],
      [land(a.col + dc), a.col + dc, a.child]
    ];
  }
}
