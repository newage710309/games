import type { Audio } from './audio';
import {
  BLOCK_SPEED,
  CELL,
  CLEAR_WAIT,
  COLS,
  DEATH_TIME,
  DELTA,
  DEMO_SKIP_WAIT,
  DIRS,
  ENEMY_BREAK_TIME,
  ENEMY_SPEEDUP,
  ENEMY_SPEEDUP_MAX,
  HATCH_TIME,
  INVINCIBLE_TIME,
  OPPOSITE,
  PLAYER_SPEED,
  PUSH_COOLDOWN,
  PUSH_HOLD,
  BREAK_ANIM_TIME,
  READY_TIME,
  RESPAWN_DELAY,
  RESPAWN_READY_TIME,
  ROWS,
  SCORE_BREAK,
  SCORE_CRUSH,
  SCORE_EGG,
  SCORE_KICK,
  SPEEDUP_EVERY,
  START_LIVES,
  STUN_TIME,
  TIME_BONUS,
  TOUCH_DIST,
  WALL_SHAKE_COOLDOWN,
  WALL_SHAKE_TIME,
  WIDTH,
  cellCenterX,
  cellCenterY,
  type Dir
} from './constants';
import { STAGES, type Stage } from './levels';
import { loadHighScore, saveHighScore } from './storage';

export type Phase =
  | 'title'
  | 'ready' // 面の始め・ミスのあと。少し待ってから動き出す
  | 'playing'
  | 'dying'
  | 'paused'
  | 'stageClear'
  | 'demo' // 面クリアごとの幕間デモ
  | 'allClear'
  | 'gameover';

/** マスからマスへ動くもの（さくらちゃん・雪だるま）。t は 0..1 の進み具合。 */
export interface Mover {
  col: number;
  row: number;
  toCol: number;
  toRow: number;
  t: number;
  moving: boolean;
}

export interface Player extends Mover {
  facing: Dir;
  /** 氷を押してからの時間（押すしぐさの演出用）。 */
  pushTime: number;
  /** 氷に向かって押し続けている時間（ためが要るときは PUSH_HOLD に達すると押せる）。 */
  pushCharge: number;
  /**
   * 歩いてきて止まったときの向き。この向きのまま氷に当たったときだけ、押すのにためが要る。
   * 止まっている状態から押したとき（いったん離した・向きを変えた）は、すぐに押せる。
   */
  arrivedDir: Dir | null;
  /** 次の操作を受け付けるまでの時間。 */
  cooldown: number;
  /** 0 より大きい間はぶつかっても平気（点滅する）。 */
  invincible: number;
  /** 歩いた距離（マス）。歩くしぐさの演出用。 */
  walked: number;
}

export type EnemyState =
  | 'hatch' // 卵から出てくるところ（ぶつかっても平気）
  | 'walk'
  | 'break' // 氷を壊しているところ
  | 'stun' // 壁のゆれで気絶中（さわるとやっつけられる）
  | 'carried' // すべってくる氷に押されている
  | 'squashed' // 氷につぶされた（演出が終わったら消える）
  | 'kicked'; // 気絶中にさわられて飛んでいく（演出が終わったら消える）

export interface Enemy extends Mover {
  readonly id: number;
  state: EnemyState;
  dir: Dir;
  /** 左右どちらを向いているか（-1 = 左、1 = 右）。上下に歩くときは直前の向きのまま。 */
  facing: number;
  /** 状態ごとのタイマー。 */
  timer: number;
  /** 分かれ道で迷っている（待っている）残り時間。 */
  wait: number;
  breakCol: number;
  breakRow: number;
  /** 演出用の画面座標と速度（つぶされた・飛んでいくとき）。 */
  px: number;
  py: number;
  vx: number;
  vy: number;
}

/** すべっている氷。col, row から dir の方向へ t（0..1）だけ進んでいる。 */
export interface Slide {
  col: number;
  row: number;
  readonly dir: Dir;
  t: number;
  readonly egg: boolean;
  readonly victims: Enemy[];
}

export interface Popup {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  age: number;
}

/** 割れている途中の氷（見た目だけ。マスはもう空いている）。 */
export interface BreakingIce {
  readonly col: number;
  readonly row: number;
  readonly egg: boolean;
  age: number;
}

export interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  readonly life: number;
  readonly size: number;
  readonly color: string;
}

/** キャンバス上に描くボタン。 */
export interface Button {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** 上の帯の右端のポーズボタン（PC でもクリックで押せる）。 */
export const PAUSE_BUTTON: Button = { id: 'pause', label: '❚❚ ポーズ', x: WIDTH - 104, y: 5, w: 96, h: 30 };

const PAUSE_BUTTONS: readonly Button[] = [
  { id: 'resume', label: 'つづける', x: 130, y: 264, w: 220, h: 52 },
  { id: 'mute', label: 'おと', x: 130, y: 328, w: 220, h: 52 }, // ラベルは描くときにオン／オフを付ける
  { id: 'title', label: 'タイトルへ', x: 130, y: 392, w: 220, h: 52 }
];

const GAMEOVER_BUTTONS: readonly Button[] = [
  { id: 'retry', label: 'このステージをやりなおす', x: 54, y: 420, w: 220, h: 52 },
  { id: 'title', label: 'タイトルへ', x: 286, y: 420, w: 140, h: 52 }
];

const ALLCLEAR_BUTTONS: readonly Button[] = [{ id: 'title', label: 'タイトルへ', x: 150, y: 470, w: 180, h: 52 }];

/** 幕間デモの長さ（秒）。面ごと。 */
export const DEMO_TIME: readonly number[] = [7, 8, 10];

/** 飛んでいく雪だるまの重力（px/秒²）。 */
const KICK_GRAVITY = 900;
const SQUASH_TIME = 0.7;
const KICK_TIME = 1.1;
const POPUP_TIME = 1.1;

/** 決まった種から同じ乱数列を出す（開発時のテストで動きを再現するため）。 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const idx = (col: number, row: number): number => row * COLS + col;
const inBounds = (col: number, row: number): boolean => col >= 0 && col < COLS && row >= 0 && row < ROWS;

/** 動いているものの今の位置（マス単位、小数）。 */
export const posCol = (m: Mover): number => m.col + (m.toCol - m.col) * m.t;
export const posRow = (m: Mover): number => m.row + (m.toRow - m.row) * m.t;
/** 半分以上進んでいたら行き先のマスにいるとみなす。 */
const cellOf = (m: Mover): { col: number; row: number } =>
  m.moving && m.t >= 0.5 ? { col: m.toCol, row: m.toRow } : { col: m.col, row: m.row };

export class Game {
  phase: Phase = 'title';
  stageIndex = 0;
  lives = START_LIVES;
  score = 0;
  highScore: number;
  /** 起動してからの時間（点滅・雪の演出用）。 */
  elapsed = 0;
  /** 今のフェーズに入ってからの時間。 */
  phaseTime = 0;
  /** この面を遊んでいる時間（ready・ポーズ中は数えない）。タイムボーナスと雪だるまの加速に使う。 */
  stageTime = 0;
  /** 面クリアでもらったタイムボーナス。 */
  timeBonus = 0;
  /** ready の長さ（面の始めとミスのあとで違う）。 */
  readyTime = READY_TIME;
  /** ready が面の始めか（卵の点滅を見せる）。 */
  readyIsStageStart = true;

  /** 氷があるマス。 */
  ice = new Uint8Array(COLS * ROWS);
  /** 卵の入った氷のマス。 */
  egg = new Uint8Array(COLS * ROWS);
  slides: Slide[] = [];
  enemies: Enemy[] = [];
  popups: Popup[] = [];
  shards: Shard[] = [];
  breaking: BreakingIce[] = [];
  /** 壁ごとのゆれの残り時間。 */
  readonly wallShake: Record<Dir, number> = { up: 0, down: 0, left: 0, right: 0 };

  readonly player: Player = {
    col: 0,
    row: 0,
    toCol: 0,
    toRow: 0,
    t: 0,
    moving: false,
    facing: 'down',
    pushTime: 99,
    pushCharge: 0,
    arrivedDir: null,
    cooldown: 0,
    invincible: 0,
    walked: 0
  };
  /** 面の始めに必ず最初にかえる卵（迷路の F）。序盤をやさしくするために置く。 */
  private firstEggs: { col: number; row: number }[] = [];
  private startCol = 0;
  private startRow = 0;
  private moveDir: Dir = 'down';

  private keyDir: Dir | null = null;
  private padDir: Dir | null = null;
  private pausedFrom: Phase = 'playing';
  private spawnTimer = 0;
  private nextEnemyId = 1;

  /** 乱数。開発時のテストでは seededRandom に差し替えて動きを再現する。 */
  rng: () => number = Math.random;

  constructor(private readonly audio: Audio) {
    this.highScore = loadHighScore();
    this.loadMaze(0);
  }

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  get stageCount(): number {
    return STAGES.length;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  /** クリア画面で「つぎへ」を受け付けられるようになったか。 */
  get clearReady(): boolean {
    return this.phaseTime >= CLEAR_WAIT;
  }

  get demoTime(): number {
    return DEMO_TIME[this.stageIndex] ?? 7;
  }

  /** 盤面に出ている雪だるまの数（つぶされた・飛んでいったものは数えない）。 */
  get activeEnemies(): number {
    return this.enemies.filter((e) => e.state !== 'squashed' && e.state !== 'kicked').length;
  }

  /** まだかえっていない卵の数（すべっている氷の中の卵も数える）。 */
  get eggsLeft(): number {
    let n = 0;
    for (let i = 0; i < this.egg.length; i++) n += this.egg[i]!;
    for (const s of this.slides) if (s.egg) n++;
    return n;
  }

  /** のこりの雪だるま（盤面の雪だるま＋卵）。 */
  get enemiesLeft(): number {
    return this.activeEnemies + this.eggsLeft;
  }

  /** 雪だるまの速さ。面ごとの速さに、時間がたつほど少しずつ上乗せする。 */
  get enemySpeed(): number {
    const up = Math.min(ENEMY_SPEEDUP_MAX, Math.floor(this.stageTime / SPEEDUP_EVERY) * ENEMY_SPEEDUP);
    return this.stage.enemySpeed * (1 + up);
  }

  get enemyHurried(): boolean {
    return this.stageTime >= SPEEDUP_EVERY;
  }

  hasIce(col: number, row: number): boolean {
    return inBounds(col, row) && this.ice[idx(col, row)] === 1;
  }

  hasEgg(col: number, row: number): boolean {
    return inBounds(col, row) && this.egg[idx(col, row)] === 1;
  }

  /** 今の画面で押せるボタン。 */
  get buttons(): readonly Button[] {
    if (this.phase === 'paused') return PAUSE_BUTTONS;
    if (this.phase === 'gameover') return GAMEOVER_BUTTONS;
    if (this.phase === 'allClear' && this.clearReady) return ALLCLEAR_BUTTONS;
    if (this.phase === 'ready' || this.phase === 'playing') return [PAUSE_BUTTON];
    return [];
  }

  // --- 入力から呼ばれる操作 --------------------------------------------

  setKeyDir(dir: Dir | null): void {
    this.keyDir = dir;
  }

  setPadDir(dir: Dir | null): void {
    this.padDir = dir;
  }

  /** 今押している向き。十字キーを優先する。 */
  get heldDir(): Dir | null {
    return this.padDir ?? this.keyDir;
  }

  /** クリック・タップ。ボタンの上ならそのボタン、それ以外は画面に応じた「決定」。 */
  tap(x: number, y: number): void {
    const hit = this.buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (hit !== undefined) {
      this.press(hit.id);
      return;
    }
    // プレイ中は、盤面をタップしても何も起きない（誤操作でポーズしないように）
    if (this.phase === 'ready' || this.phase === 'playing' || this.phase === 'dying') return;
    this.action();
  }

  /** Space / Enter、またはボタン以外の場所のタップ。 */
  action(): void {
    switch (this.phase) {
      case 'title':
        this.startGame();
        break;
      case 'paused':
        this.togglePause();
        break;
      case 'stageClear':
        if (this.clearReady) this.startDemo();
        break;
      case 'demo':
        if (this.phaseTime >= DEMO_SKIP_WAIT) this.endDemo();
        break;
      case 'allClear':
        if (this.clearReady) this.goTitle();
        break;
      case 'gameover':
        this.retryStage();
        break;
      default:
        break;
    }
  }

  /** Esc：ゲームオーバーならタイトルへ、プレイ中ならポーズ。 */
  escape(): void {
    if (this.phase === 'gameover') this.goTitle();
    else this.togglePause();
  }

  togglePause(): void {
    if (this.phase === 'ready' || this.phase === 'playing') {
      this.pausedFrom = this.phase;
      this.phase = 'paused'; // phaseTime はそのまま（ready の残り時間を保つ）
    } else if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
    }
  }

  private press(id: string): void {
    if (id === 'pause' || id === 'resume') this.togglePause();
    else if (id === 'mute') this.toggleMute();
    else if (id === 'retry') this.retryStage();
    else if (id === 'title') this.goTitle();
  }

  // --- 進行 ------------------------------------------------------------

  startGame(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.audio.play('start');
    this.startStage(0);
  }

  /** ゲームオーバーからのコンティニュー。同じ面を最初から、スコアは 0 から。 */
  private retryStage(): void {
    this.lives = START_LIVES;
    this.score = 0;
    this.audio.play('start');
    this.startStage(this.stageIndex);
  }

  private goTitle(): void {
    // ポーズ画面から途中でやめた場合も、それまでの点数をハイスコアに反映する
    this.commitHighScore();
    this.stageIndex = 0;
    this.loadMaze(0);
    this.setPhase('title');
  }

  startStage(i: number): void {
    this.stageIndex = i;
    this.loadMaze(i);
    this.stageTime = 0;
    this.timeBonus = 0;
    this.readyTime = READY_TIME;
    this.readyIsStageStart = true;
    this.setPhase('ready');
  }

  private loadMaze(i: number): void {
    const stage = STAGES[i]!;
    this.ice.fill(0);
    this.egg.fill(0);
    this.slides = [];
    this.enemies = [];
    this.popups = [];
    this.shards = [];
    this.breaking = [];
    this.spawnTimer = 0;
    this.firstEggs = [];
    for (const d of DIRS) this.wallShake[d] = 0;
    stage.maze.forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (ch === '#' || ch === 'E' || ch === 'F') this.ice[idx(col, row)] = 1;
        if (ch === 'E' || ch === 'F') this.egg[idx(col, row)] = 1;
        if (ch === 'F') this.firstEggs.push({ col, row });
        if (ch === 'P') {
          this.startCol = col;
          this.startRow = row;
        }
      });
    });
    this.placePlayer(this.startCol, this.startRow);
    this.player.facing = 'down';
  }

  private placePlayer(col: number, row: number): void {
    const p = this.player;
    p.col = p.toCol = col;
    p.row = p.toRow = row;
    p.t = 0;
    p.moving = false;
    p.cooldown = 0;
    p.pushTime = 99;
    p.pushCharge = 0;
    p.arrivedDir = null;
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  private startDemo(): void {
    this.setPhase('demo');
    this.audio.play('jingle');
  }

  private endDemo(): void {
    if (this.stageIndex + 1 < STAGES.length) {
      this.startStage(this.stageIndex + 1);
    } else {
      this.commitHighScore();
      this.setPhase('allClear');
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;

    if (this.phase !== 'title' && this.phase !== 'demo') this.updateEffects(dt);

    switch (this.phase) {
      case 'ready':
        if (this.phaseTime >= this.readyTime) {
          const first = this.readyIsStageStart;
          this.setPhase('playing');
          if (first) this.hatchInitial();
        }
        break;
      case 'playing':
        this.stepPlaying(dt);
        break;
      case 'dying':
        if (this.phaseTime >= DEATH_TIME) this.afterDeath();
        break;
      case 'demo':
        if (this.phaseTime >= this.demoTime) this.endDemo();
        break;
      default:
        break;
    }
  }

  private stepPlaying(dt: number): void {
    this.stageTime += dt;
    for (const d of DIRS) this.wallShake[d] = Math.max(0, this.wallShake[d] - dt);

    this.updatePlayer(dt);
    this.updateSlides(dt);
    this.updateEnemies(dt);
    if (this.checkTouch()) return;
    this.updateSpawn(dt);

    if (this.enemiesLeft === 0) this.clearStage();
  }

  private clearStage(): void {
    const bonus = TIME_BONUS.find(([sec]) => this.stageTime < sec)?.[1] ?? 0;
    this.timeBonus = bonus;
    this.score += bonus;
    this.audio.play('clear');
    this.setPhase('stageClear');
  }

  // --- さくらちゃん ----------------------------------------------------

  private updatePlayer(dt: number): void {
    const p = this.player;
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invincible = Math.max(0, p.invincible - dt);
    p.pushTime += dt;
    const want = this.heldDir;

    if (p.moving) {
      // 歩いている途中でも、反対を押したらすぐ引き返せる
      if (want !== null && want === OPPOSITE[this.moveDir]) {
        [p.col, p.toCol] = [p.toCol, p.col];
        [p.row, p.toRow] = [p.toRow, p.row];
        p.t = 1 - p.t;
        this.moveDir = want;
        p.facing = want;
      }
      p.t += PLAYER_SPEED * dt;
      p.walked += PLAYER_SPEED * dt;
      if (p.t < 1) return;
      const leftover = (p.t - 1) / PLAYER_SPEED;
      p.col = p.toCol;
      p.row = p.toRow;
      p.t = 0;
      p.moving = false;
      p.arrivedDir = this.moveDir;
      // 押しっぱなしなら、止まらずに次のマスへ（余った時間のぶん進める）
      if (want !== null && this.tryStart(want)) p.t = Math.min(0.99, leftover * PLAYER_SPEED);
      return;
    }

    // 止まって手を離した・止まったまま向きを変えたら、次はすぐに押せる
    if (want !== p.arrivedDir) p.arrivedDir = null;
    if (want === null || p.cooldown > 0) {
      p.pushCharge = 0;
      return;
    }
    // 歩いてきてそのまま氷に当たったときだけ、少し押し続けてから押す
    // （歩いた勢いで、すぐにすべって・割れてしまわないように）。止まっている状態から押したときはすぐ押す。
    const { dx, dy } = DELTA[want];
    const nc = p.col + dx;
    const nr = p.row + dy;
    if (this.hasIce(nc, nr)) {
      if (p.facing !== want) p.pushCharge = 0;
      p.facing = want;
      p.pushCharge += dt;
      if (p.arrivedDir === want && p.pushCharge < PUSH_HOLD) return;
      p.pushCharge = 0;
      p.arrivedDir = null;
      this.pushIce(nc, nr, want);
      p.cooldown = PUSH_COOLDOWN;
      p.pushTime = 0;
      return;
    }
    p.pushCharge = 0;
    this.tryStart(want);
  }

  /** dir の方向へ動く。壁ならゆらす（氷は updatePlayer で押し続けたときに押す）。歩き出したら true。 */
  private tryStart(dir: Dir): boolean {
    const p = this.player;
    p.facing = dir;
    const { dx, dy } = DELTA[dir];
    const nc = p.col + dx;
    const nr = p.row + dy;

    if (!inBounds(nc, nr)) {
      this.shakeWall(dir);
      p.cooldown = WALL_SHAKE_COOLDOWN;
      p.pushTime = 0;
      return false;
    }
    if (this.hasIce(nc, nr)) return false;
    if (this.slideAt(nc, nr) !== null) return false;
    // 卵から出てくる途中の雪だるまには重ならない（出てきた瞬間にぶつかるのは理不尽なので）
    if (this.enemies.some((e) => e.state === 'hatch' && e.col === nc && e.row === nr)) return false;

    p.toCol = nc;
    p.toRow = nr;
    p.t = 0;
    p.moving = true;
    this.moveDir = dir;
    return true;
  }

  // --- 氷 ----------------------------------------------------------------

  /** 氷を押す。先に何もなければすべらせ、つっかえていれば割る。 */
  private pushIce(col: number, row: number, dir: Dir): void {
    const { dx, dy } = DELTA[dir];
    if (this.slideBlocked(col + dx, row + dy, null)) {
      this.breakIce(col, row);
      return;
    }
    const i = idx(col, row);
    const egg = this.egg[i] === 1;
    this.ice[i] = 0;
    this.egg[i] = 0;
    // 氷を押したら、その氷を壊そうとしていた雪だるまはあきらめる
    for (const e of this.enemies) {
      if (e.state === 'break' && e.breakCol === col && e.breakRow === row) e.state = 'walk';
    }
    this.slides.push({ col, row, dir, t: 0, egg, victims: [] });
    this.audio.play('push');
  }

  /** さくらちゃんが氷を割る。卵入りなら卵ごと消える。 */
  private breakIce(col: number, row: number): void {
    const i = idx(col, row);
    this.ice[i] = 0;
    const x = cellCenterX(col);
    const y = cellCenterY(row);
    this.breaking.push({ col, row, egg: this.egg[i] === 1, age: 0 });
    if (this.egg[i] === 1) {
      this.egg[i] = 0;
      this.addScore(SCORE_EGG, x, y);
      this.audio.play('egg');
    } else {
      this.addScore(SCORE_BREAK, x, y, false);
      this.audio.play('break');
    }
    this.burst(x, y, 12);
  }

  /** すべる氷がこのマスに入れないか。 */
  private slideBlocked(col: number, row: number, self: Slide | null): boolean {
    if (!inBounds(col, row) || this.hasIce(col, row)) return true;
    for (const s of this.slides) {
      if (s === self) continue;
      if (s.col === col && s.row === row) return true;
      const { dx, dy } = DELTA[s.dir];
      if (s.t > 0 && s.col + dx === col && s.row + dy === row) return true;
    }
    // さくらちゃんには当たって止まる（自分の押した氷が戻ってくることはないが、横から入ってきたとき用）
    const p = this.player;
    if (p.col === col && p.row === row) return true;
    if (p.moving && p.toCol === col && p.toRow === row) return true;
    return false;
  }

  /** このマスを通っている（入りかけの）すべる氷。 */
  private slideAt(col: number, row: number): Slide | null {
    for (const s of this.slides) {
      if (s.col === col && s.row === row) return s;
      const { dx, dy } = DELTA[s.dir];
      if (s.t > 0 && s.col + dx === col && s.row + dy === row) return s;
    }
    return null;
  }

  private updateSlides(dt: number): void {
    for (const s of [...this.slides]) {
      const { dx, dy } = DELTA[s.dir];
      // 途中で行き先がふさがれたら（別の氷が止まったなど）、今のマスで止まる
      if (this.slideBlocked(s.col + dx, s.row + dy, s)) {
        s.t = 0;
        this.stopSlide(s);
        continue;
      }
      s.t += BLOCK_SPEED * dt;
      let stopped = false;
      while (s.t >= 1) {
        s.t -= 1;
        s.col += dx;
        s.row += dy;
        if (this.slideBlocked(s.col + dx, s.row + dy, s)) {
          s.t = 0;
          this.catchEnemies(s);
          this.stopSlide(s);
          stopped = true;
          break;
        }
        this.catchEnemies(s);
      }
      if (!stopped) this.catchEnemies(s);
    }
  }

  /** すべる氷の前にいる雪だるまを巻きこむ。 */
  private catchEnemies(s: Slide): void {
    const { dx, dy } = DELTA[s.dir];
    const bx = s.col + dx * s.t;
    const by = s.row + dy * s.t;
    for (const e of this.enemies) {
      if (e.state !== 'walk' && e.state !== 'break' && e.state !== 'stun' && e.state !== 'hatch') continue;
      const ex = posCol(e) - bx;
      const ey = posRow(e) - by;
      const along = ex * dx + ey * dy;
      const perp = Math.abs(ex * dy) + Math.abs(ey * dx);
      if (along > -0.3 && along < 1.0 && perp < 0.6) {
        e.state = 'carried';
        e.moving = false;
        s.victims.push(e);
      }
    }
  }

  /** すべる氷が止まった。巻きこんだ雪だるまはここでつぶれる。 */
  private stopSlide(s: Slide): void {
    const i = idx(s.col, s.row);
    this.ice[i] = 1;
    if (s.egg) this.egg[i] = 1;
    this.slides.splice(this.slides.indexOf(s), 1);
    const n = s.victims.length;
    if (n === 0) {
      this.audio.play('stop');
      return;
    }
    const { dx, dy } = DELTA[s.dir];
    const x = cellCenterX(s.col) + dx * CELL * 0.5;
    const y = cellCenterY(s.row) + dy * CELL * 0.5;
    for (const e of s.victims) {
      e.state = 'squashed';
      e.timer = 0;
      e.px = x;
      e.py = y;
      e.vx = dx; // つぶれる向き（演出用）
      e.vy = dy;
    }
    this.addScore(SCORE_CRUSH[Math.min(n, SCORE_CRUSH.length) - 1]!, x, y);
    this.audio.play('crush', 1 + (n - 1) * 0.25);
    this.burst(x, y, 10 + n * 6, '#ffffff');
  }

  // --- 壁 ----------------------------------------------------------------

  /** 外周の壁をゆらして、その壁ぎわにいる雪だるまを気絶させる。 */
  private shakeWall(dir: Dir): void {
    this.wallShake[dir] = WALL_SHAKE_TIME;
    this.audio.play('wall');
    for (const e of this.enemies) {
      if (e.state !== 'walk' && e.state !== 'break' && e.state !== 'stun') continue;
      const c = cellOf(e);
      const touching =
        (dir === 'up' && c.row === 0) ||
        (dir === 'down' && c.row === ROWS - 1) ||
        (dir === 'left' && c.col === 0) ||
        (dir === 'right' && c.col === COLS - 1);
      if (!touching) continue;
      e.state = 'stun';
      e.timer = STUN_TIME;
    }
  }

  // --- 雪だるま ----------------------------------------------------------

  private hatchInitial(): void {
    let n = Math.min(this.stage.maxActive, this.eggsLeft);
    // F の卵があれば、まずそれをかえす（足りない分はいつもどおり遠くの卵から）
    for (const f of this.firstEggs) {
      if (n === 0) break;
      if (!this.hasEgg(f.col, f.row)) continue;
      this.hatchAt(f.col, f.row);
      n--;
    }
    for (let k = 0; k < n; k++) this.hatchOne();
  }

  private updateSpawn(dt: number): void {
    if (this.activeEnemies >= this.stage.maxActive || this.eggsLeft === 0) {
      this.spawnTimer = 0;
      return;
    }
    this.spawnTimer += dt;
    if (this.spawnTimer >= RESPAWN_DELAY) {
      this.spawnTimer = 0;
      this.hatchOne();
    }
  }

  /** 卵を 1 つかえす。さくらちゃんから遠い卵ほど選ばれやすい。 */
  private hatchOne(): void {
    const p = cellOf(this.player);
    const eggs: { col: number; row: number; d: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.egg[idx(col, row)] === 1) eggs.push({ col, row, d: Math.abs(col - p.col) + Math.abs(row - p.row) });
      }
    }
    if (eggs.length === 0) return; // 卵は全部すべっている途中
    eggs.sort((a, b) => b.d - a.d);
    const pick = eggs[Math.floor(this.rng() * Math.ceil(eggs.length / 2))]!;
    this.hatchAt(pick.col, pick.row);
  }

  /** (col, row) の卵をかえす。 */
  private hatchAt(col: number, row: number): void {
    const pick = { col, row };
    const i = idx(col, row);
    this.ice[i] = 0;
    this.egg[i] = 0;
    this.enemies.push({
      id: this.nextEnemyId++,
      col: pick.col,
      row: pick.row,
      toCol: pick.col,
      toRow: pick.row,
      t: 0,
      moving: false,
      state: 'hatch',
      dir: 'down',
      facing: this.rng() < 0.5 ? -1 : 1,
      timer: 0,
      wait: 0,
      breakCol: 0,
      breakRow: 0,
      px: 0,
      py: 0,
      vx: 0,
      vy: 0
    });
    this.burst(cellCenterX(pick.col), cellCenterY(pick.row), 10);
    this.audio.play('hatch');
  }

  /** 雪だるまがこのマスへ歩いていけるか。 */
  private enemyCanEnter(col: number, row: number): boolean {
    return inBounds(col, row) && !this.hasIce(col, row) && this.slideAt(col, row) === null;
  }

  /** ほかの雪だるまがいる（向かっている）マスか。重なって歩かないようにする。 */
  private reserved(col: number, row: number, self: Enemy): boolean {
    return this.enemies.some(
      (e) =>
        e !== self &&
        (e.state === 'walk' || e.state === 'break' || e.state === 'stun' || e.state === 'hatch') &&
        ((e.col === col && e.row === row) || (e.moving && e.toCol === col && e.toRow === row))
    );
  }

  private updateEnemies(dt: number): void {
    const speed = this.enemySpeed;
    for (const e of this.enemies) {
      switch (e.state) {
        case 'hatch':
          e.timer += dt;
          if (e.timer >= HATCH_TIME) {
            e.state = 'walk';
            e.wait = 0;
          }
          break;
        case 'stun':
          e.timer -= dt;
          if (e.timer <= 0) e.state = 'walk';
          break;
        case 'break':
          if (!this.hasIce(e.breakCol, e.breakRow) || this.hasEgg(e.breakCol, e.breakRow)) {
            e.state = 'walk';
            break;
          }
          e.timer += dt;
          if (e.timer >= ENEMY_BREAK_TIME) {
            this.ice[idx(e.breakCol, e.breakRow)] = 0;
            this.breaking.push({ col: e.breakCol, row: e.breakRow, egg: false, age: 0 });
            this.burst(cellCenterX(e.breakCol), cellCenterY(e.breakRow), 10);
            this.audio.play('break', 0.7);
            e.state = 'walk';
            e.wait = 0;
          }
          break;
        case 'walk':
          this.walkEnemy(e, speed, dt);
          break;
        default:
          break;
      }
    }
  }

  private walkEnemy(e: Enemy, speed: number, dt: number): void {
    if (e.moving) {
      // 歩いている途中で、行き先に氷がすべってきて止まったら引き返す
      if (!this.enemyCanEnter(e.toCol, e.toRow) && this.slideAt(e.toCol, e.toRow) === null) {
        [e.col, e.toCol] = [e.toCol, e.col];
        [e.row, e.toRow] = [e.toRow, e.row];
        e.t = 1 - e.t;
        e.dir = OPPOSITE[e.dir];
      }
      e.t += speed * dt;
      if (e.t < 1) return;
      e.col = e.toCol;
      e.row = e.toRow;
      e.t = 0;
      e.moving = false;
    }
    if (e.wait > 0) {
      e.wait -= dt;
      return;
    }
    this.decideEnemy(e);
  }

  /** 分かれ道（マスの中心）で、次に進む向きを決める。 */
  private decideEnemy(e: Enemy): void {
    const stage = this.stage;
    const p = cellOf(this.player);
    const ddx = p.col - e.col;
    const ddy = p.row - e.row;
    const toward: Dir =
      Math.abs(ddx) > Math.abs(ddy) || (Math.abs(ddx) === Math.abs(ddy) && this.rng() < 0.5)
        ? ddx < 0
          ? 'left'
          : 'right'
        : ddy < 0
          ? 'up'
          : 'down';

    // ときどき、さくらちゃんのほうにある氷を壊しにいく
    if (this.rng() < stage.breakChance && this.startBreak(e, [toward])) return;

    const open = DIRS.filter((d) => {
      const { dx, dy } = DELTA[d];
      return this.enemyCanEnter(e.col + dx, e.row + dy) && !this.reserved(e.col + dx, e.row + dy, e);
    });
    let choices = open.filter((d) => d !== OPPOSITE[e.dir]);
    if (choices.length === 0) choices = open;
    if (choices.length === 0) {
      // 閉じこめられたら氷を壊して出る（さくらちゃんのほうを優先）
      if (!this.startBreak(e, [toward, ...DIRS.filter((d) => d !== toward)])) e.wait = 0.3;
      return;
    }

    let dir: Dir;
    if (this.rng() < stage.chase) {
      let best = Infinity;
      let bests: Dir[] = [];
      for (const d of choices) {
        const { dx, dy } = DELTA[d];
        const dist = Math.abs(p.col - (e.col + dx)) + Math.abs(p.row - (e.row + dy));
        if (dist < best) {
          best = dist;
          bests = [d];
        } else if (dist === best) {
          bests.push(d);
        }
      }
      dir = bests[Math.floor(this.rng() * bests.length)]!;
    } else {
      dir = choices[Math.floor(this.rng() * choices.length)]!;
    }

    const { dx, dy } = DELTA[dir];
    e.dir = dir;
    if (dx !== 0) e.facing = dx;
    e.toCol = e.col + dx;
    e.toRow = e.row + dy;
    e.t = 0;
    e.moving = true;
  }

  /** dirs の順に、となりの（卵の入っていない）氷を壊しはじめる。始めたら true。 */
  private startBreak(e: Enemy, dirs: readonly Dir[]): boolean {
    for (const d of dirs) {
      const { dx, dy } = DELTA[d];
      const c = e.col + dx;
      const r = e.row + dy;
      if (!this.hasIce(c, r) || this.hasEgg(c, r)) continue;
      e.state = 'break';
      e.timer = 0;
      e.breakCol = c;
      e.breakRow = r;
      e.dir = d;
      if (dx !== 0) e.facing = dx;
      return true;
    }
    return false;
  }

  // --- ぶつかる ----------------------------------------------------------

  /** さくらちゃんと雪だるまの当たり判定。ミスしたら true。 */
  private checkTouch(): boolean {
    const p = this.player;
    const px = posCol(p);
    const py = posRow(p);
    for (const e of this.enemies) {
      if (Math.hypot(posCol(e) - px, posRow(e) - py) >= TOUCH_DIST) continue;
      if (e.state === 'stun') {
        this.kick(e);
      } else if ((e.state === 'walk' || e.state === 'break') && p.invincible <= 0) {
        this.die();
        return true;
      }
    }
    return false;
  }

  /** 気絶している雪だるまにさわって、はじき飛ばす。 */
  private kick(e: Enemy): void {
    const { dx } = DELTA[this.player.facing];
    e.state = 'kicked';
    e.timer = 0;
    e.px = cellCenterX(posCol(e));
    e.py = cellCenterY(posRow(e));
    e.vx = (dx !== 0 ? dx : e.facing) * 160;
    e.vy = -380;
    this.addScore(SCORE_KICK, e.px, e.py);
    this.audio.play('kick');
  }

  private die(): void {
    this.lives -= 1;
    this.audio.play('lose');
    this.setPhase('dying');
  }

  private afterDeath(): void {
    if (this.lives <= 0) {
      this.commitHighScore();
      this.setPhase('gameover');
      return;
    }
    const spot = this.respawnSpot();
    this.placePlayer(spot.col, spot.row);
    this.player.invincible = INVINCIBLE_TIME;
    this.readyTime = RESPAWN_READY_TIME;
    this.readyIsStageStart = false;
    this.setPhase('ready');
  }

  /**
   * ミスのあとの再開位置。スタート位置が空いていて雪だるまから離れていればそこ、
   * だめなら雪だるまからいちばん離れた空きマス（スタート位置に近いものを優先）。
   */
  private respawnSpot(): { col: number; row: number } {
    const enemyCells = this.enemies
      .filter((e) => e.state !== 'squashed' && e.state !== 'kicked')
      .map((e) => cellOf(e));
    const safety = (col: number, row: number): number =>
      enemyCells.reduce((m, c) => Math.min(m, Math.abs(c.col - col) + Math.abs(c.row - row)), 99);
    const free = (col: number, row: number): boolean => !this.hasIce(col, row) && this.slideAt(col, row) === null;

    if (free(this.startCol, this.startRow) && safety(this.startCol, this.startRow) >= 3) {
      return { col: this.startCol, row: this.startRow };
    }
    let best = { col: this.startCol, row: this.startRow };
    let bestScore = -Infinity;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!free(col, row)) continue;
        const s = Math.min(safety(col, row), 4) * 10 - (Math.abs(col - this.startCol) + Math.abs(row - this.startRow));
        if (s > bestScore) {
          bestScore = s;
          best = { col, row };
        }
      }
    }
    return best;
  }

  // --- 得点・演出 --------------------------------------------------------

  private addScore(points: number, x: number, y: number, popup = true): void {
    this.score += points;
    if (popup) this.popups.push({ x, y, text: String(points), age: 0 });
  }

  /** 氷のかけら・雪を飛び散らせる。 */
  private burst(x: number, y: number, n: number, color = '#cfeeff'): void {
    for (let k = 0; k < n; k++) {
      const a = this.rng() * Math.PI * 2;
      const v = 60 + this.rng() * 160;
      this.shards.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        age: 0,
        life: 0.4 + this.rng() * 0.35,
        size: 2 + this.rng() * 3,
        color
      });
    }
  }

  private updateEffects(dt: number): void {
    for (const b of this.breaking) b.age += dt;
    this.breaking = this.breaking.filter((b) => b.age < BREAK_ANIM_TIME);
    for (const s of this.shards) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 500 * dt;
    }
    this.shards = this.shards.filter((s) => s.age < s.life);
    for (const p of this.popups) p.age += dt;
    this.popups = this.popups.filter((p) => p.age < POPUP_TIME);

    for (const e of this.enemies) {
      if (e.state === 'squashed') e.timer += dt;
      if (e.state === 'kicked') {
        e.timer += dt;
        e.px += e.vx * dt;
        e.py += e.vy * dt;
        e.vy += KICK_GRAVITY * dt;
      }
    }
    this.enemies = this.enemies.filter(
      (e) => !((e.state === 'squashed' && e.timer >= SQUASH_TIME) || (e.state === 'kicked' && e.timer >= KICK_TIME))
    );
  }

  private commitHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.score);
    }
  }
}
