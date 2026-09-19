import {
  BALL_R,
  BALL_SPEED,
  BRICK_COLS,
  BRICK_H,
  BRICK_ROWS,
  BRICK_W,
  CLEAR_WAIT,
  DIFFICULTIES,
  type Difficulty,
  HEIGHT,
  HUD_H,
  MAX_BOUNCE_ANGLE,
  MIN_ANGLE_FROM_HORIZONTAL,
  PADDLE_H,
  PADDLE_KEY_SPEED,
  PADDLE_Y,
  PICTURE,
  SCORE_BRICK,
  SCORE_LIFE_BONUS,
  STAGE_PADDLE_SCALE,
  START_LIVES,
  WIDTH,
  clamp
} from './constants';
import { STAGES, type Stage, brickColor } from './levels';
import { SNOWDAY_BIRD, enagaRightEye } from './art';
import type { Audio } from './audio';
import { loadHighScore, saveHighScore } from './storage';

export type Phase = 'title' | 'serve' | 'playing' | 'paused' | 'stageClear' | 'allClear' | 'gameover';

export interface Brick {
  readonly row: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly color: string;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
  readonly color: string;
  readonly size: number;
}

/** キャンバス上に描くボタン（タイトルの難易度選択、ゲームオーバーの選択肢など）。 */
export interface Button {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const DIFFICULTY_BUTTONS: readonly Button[] = DIFFICULTIES.map((d, i) => ({
  id: d.id,
  label: d.label,
  x: 26 + i * 146,
  y: 492,
  w: 136,
  h: 72
}));

const GAMEOVER_BUTTONS: readonly Button[] = [
  { id: 'retry', label: 'このステージをやりなおす', x: 54, y: 490, w: 220, h: 52 },
  { id: 'title', label: 'タイトルへ', x: 286, y: 490, w: 140, h: 52 }
];

const ALLCLEAR_BUTTONS: readonly Button[] = [{ id: 'title', label: 'タイトルへ', x: 150, y: 510, w: 180, h: 52 }];

/** ポーズ中のボタン。消音はプレイ中に誤って押さないよう、ポーズ画面の中にだけ置く。 */
const PAUSE_BUTTONS: readonly Button[] = [
  { id: 'resume', label: 'つづける', x: 130, y: 264, w: 220, h: 52 },
  { id: 'mute', label: 'おと', x: 130, y: 328, w: 220, h: 52 }, // ラベルは描くときにオン／オフを付ける
  { id: 'title', label: 'タイトルへ', x: 130, y: 392, w: 220, h: 52 }
];

/**
 * タイトル画面では、ブロックを全部埋めたうえで、1 面のシマエナガの
 * 「向かって右の目」が入っているブロックと、その右隣の 2 個だけを空けてチラ見せする。
 */
const TEASER_OPEN: readonly { col: number; row: number }[] = (() => {
  const e = enagaRightEye(SNOWDAY_BIRD.x, SNOWDAY_BIRD.y, SNOWDAY_BIRD.width);
  const col = Math.floor(e.x / BRICK_W);
  const row = Math.floor(e.y / BRICK_H);
  return [
    { col, row }, // 右目
    { col: col + 1, row } // その右隣
  ];
})();

const GRAVITY = 700;

export class Game {
  phase: Phase = 'title';
  difficultyIndex = 1; // ふつう
  stageIndex = 0;
  lives = START_LIVES;
  score = 0;
  highScore: number;
  /** 経過時間。イラストの雪や花びらを動かすのに使う。 */
  elapsed = 0;
  /** 今のフェーズに入ってからの時間。 */
  phaseTime = 0;

  bricks: Brick[] = [];
  particles: Particle[] = [];
  readonly paddle = { x: WIDTH / 2, w: DIFFICULTIES[1]!.paddleW };
  readonly ball = { x: WIDTH / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0 };

  private keyDir = 0;
  private stageStartScore = 0;
  private pausedFrom: Phase = 'playing';

  constructor(private readonly audio: Audio) {
    this.highScore = loadHighScore(this.difficulty.id);
    this.buildBricks(true);
  }

  get difficulty(): Difficulty {
    return DIFFICULTIES[this.difficultyIndex]!;
  }

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  get stageCount(): number {
    return STAGES.length;
  }

  /** 点数の倍率（難易度で決まる）。 */
  get scoreMul(): number {
    return this.difficulty.scoreMul;
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  /** 面クリア後、「つぎへ」を受け付けられるようになったか。 */
  get clearReady(): boolean {
    return this.phaseTime >= CLEAR_WAIT;
  }

  /** ラケットの長さ = 難易度ごとの長さ × ステージごとの倍率。 */
  paddleWidthFor(difficultyIndex: number, stageIndex: number): number {
    return Math.round(DIFFICULTIES[difficultyIndex]!.paddleW * STAGE_PADDLE_SCALE[stageIndex]!);
  }

  /** 今の画面で押せるボタン。 */
  get buttons(): readonly Button[] {
    if (this.phase === 'title') return DIFFICULTY_BUTTONS;
    if (this.phase === 'gameover') return GAMEOVER_BUTTONS;
    if (this.phase === 'allClear' && this.clearReady) return ALLCLEAR_BUTTONS;
    if (this.phase === 'paused') return PAUSE_BUTTONS;
    return [];
  }

  // --- 入力から呼ばれる操作 --------------------------------------------

  /** マウス・指の位置にラケットを合わせる。タイトルではボタンのホバーに使う。 */
  pointTo(x: number, y: number): void {
    if (this.phase === 'serve' || this.phase === 'playing') {
      this.setPaddleX(x);
    } else if (this.phase === 'title') {
      const hit = this.hitButton(x, y);
      const i = DIFFICULTY_BUTTONS.findIndex((b) => b === hit);
      if (i >= 0 && i !== this.difficultyIndex) this.selectDifficulty(i);
    }
  }

  /** クリック・タップ。ボタンの上ならそのボタン、それ以外は画面に応じた「決定」。 */
  tap(x: number, y: number): void {
    const hit = this.hitButton(x, y);
    if (hit !== null) this.press(hit.id);
    else this.action();
  }

  /** Space / Enter、またはボタン以外の場所のタップ。 */
  action(): void {
    switch (this.phase) {
      case 'title':
        this.startGame();
        break;
      case 'serve':
        this.launch();
        break;
      case 'paused':
        this.togglePause();
        break;
      case 'stageClear':
        if (this.clearReady) this.startStage(this.stageIndex + 1);
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

  /** ← → を押した／離した。タイトルでは押した瞬間に難易度を切り替える。 */
  setKeyDir(dir: number, pressed: boolean): void {
    if (this.phase === 'title' && pressed && dir !== 0) {
      const next = clamp(this.difficultyIndex + dir, 0, DIFFICULTIES.length - 1);
      if (next !== this.difficultyIndex) this.selectDifficulty(next);
    }
    this.keyDir = dir;
  }

  togglePause(): void {
    if (this.phase === 'serve' || this.phase === 'playing') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
    } else if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
    }
  }

  // --- 進行 ------------------------------------------------------------

  private press(id: string): void {
    const d = DIFFICULTIES.findIndex((x) => x.id === id);
    if (d >= 0) {
      this.selectDifficulty(d);
      this.startGame();
    } else if (id === 'retry') {
      this.retryStage();
    } else if (id === 'title') {
      this.goTitle();
    } else if (id === 'resume') {
      this.togglePause();
    } else if (id === 'mute') {
      this.toggleMute();
    }
  }

  private selectDifficulty(i: number): void {
    this.difficultyIndex = i;
    this.highScore = loadHighScore(this.difficulty.id);
    this.audio.play('select');
  }

  startGame(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.startStage(0);
  }

  private startStage(i: number): void {
    this.stageIndex = i;
    this.stageStartScore = this.score;
    this.buildBricks(false);
    this.particles = [];
    this.paddle.w = this.paddleWidthFor(this.difficultyIndex, i);
    this.paddle.x = WIDTH / 2;
    this.serve();
  }

  private retryStage(): void {
    this.lives = START_LIVES;
    this.score = this.stageStartScore;
    this.startStage(this.stageIndex);
  }

  private goTitle(): void {
    // ポーズ画面から途中でやめた場合も、それまでの点数をハイスコアに反映する
    this.commitHighScore();
    this.setPhase('title');
    this.stageIndex = 0;
    this.particles = [];
    this.highScore = loadHighScore(this.difficulty.id);
    this.buildBricks(true);
  }

  private serve(): void {
    this.setPhase('serve');
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.stickBallToPaddle();
  }

  private launch(): void {
    // 真上から ±20° のどこかへ打ち出す
    const angle = ((Math.random() * 2 - 1) * 20 * Math.PI) / 180;
    this.ball.vx = BALL_SPEED * Math.sin(angle);
    this.ball.vy = -BALL_SPEED * Math.cos(angle);
    this.setPhase('playing');
    this.audio.play('launch');
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  private buildBricks(teaser: boolean): void {
    const stage = STAGES[teaser ? 0 : this.stageIndex]!;
    this.bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const x = PICTURE.x + col * BRICK_W;
        const y = PICTURE.y + row * BRICK_H;
        const alive = !(teaser && TEASER_OPEN.some((o) => o.col === col && o.row === row));
        this.bricks.push({ row, x, y, w: BRICK_W, h: BRICK_H, color: brickColor(stage, row, BRICK_ROWS), alive });
      }
    }
  }

  get bricksLeft(): number {
    let n = 0;
    for (const b of this.bricks) if (b.alive) n++;
    return n;
  }

  // --- 更新 ------------------------------------------------------------

  update(dt: number): void {
    if (this.phase === 'paused') return;
    this.elapsed += dt;
    this.phaseTime += dt;
    this.updateParticles(dt);

    if (this.phase === 'serve' || this.phase === 'playing') {
      if (this.keyDir !== 0) this.setPaddleX(this.paddle.x + this.keyDir * PADDLE_KEY_SPEED * dt);
    }
    if (this.phase === 'serve') this.stickBallToPaddle();
    else if (this.phase === 'playing') this.stepBall(dt);
  }

  private setPaddleX(x: number): void {
    const half = this.paddle.w / 2;
    this.paddle.x = clamp(x, half, WIDTH - half);
  }

  private stickBallToPaddle(): void {
    this.ball.x = this.paddle.x;
    this.ball.y = PADDLE_Y - BALL_R - 1;
  }

  /**
   * ボールを進める。1 フレームで大きく動くとブロックをすり抜けるので、
   * 1 回あたり 3px 以下の小さな刻みに分けて当たり判定をする。
   */
  private stepBall(dt: number): void {
    const b = this.ball;
    const steps = Math.max(1, Math.ceil((BALL_SPEED * dt) / 3));
    const h = dt / steps;

    for (let i = 0; i < steps; i++) {
      b.x += b.vx * h;
      b.y += b.vy * h;

      this.collideWalls();
      this.collidePaddle();
      if (this.collideBricks() && this.bricksLeft === 0) {
        this.stageCleared();
        return;
      }
      if (b.y - BALL_R > HEIGHT) {
        this.loseLife();
        return;
      }
    }
  }

  private collideWalls(): void {
    const b = this.ball;
    let hit = false;
    if (b.x < BALL_R) {
      b.x = BALL_R;
      b.vx = Math.abs(b.vx);
      hit = true;
    } else if (b.x > WIDTH - BALL_R) {
      b.x = WIDTH - BALL_R;
      b.vx = -Math.abs(b.vx);
      hit = true;
    }
    if (b.y < HUD_H + BALL_R) {
      b.y = HUD_H + BALL_R;
      b.vy = Math.abs(b.vy);
      hit = true;
    }
    if (hit) {
      this.normalizeVelocity();
      this.audio.play('wall');
    }
  }

  /** ラケットの上面で跳ね返す。当たった位置が端に近いほど斜めに飛ぶ。 */
  private collidePaddle(): void {
    const b = this.ball;
    const p = this.paddle;
    if (b.vy <= 0) return;
    const withinX = b.x >= p.x - p.w / 2 - BALL_R && b.x <= p.x + p.w / 2 + BALL_R;
    const touchingTop = b.y + BALL_R >= PADDLE_Y && b.y < PADDLE_Y + PADDLE_H / 2;
    if (!withinX || !touchingTop) return;

    b.y = PADDLE_Y - BALL_R;
    const offset = clamp((b.x - p.x) / (p.w / 2), -1, 1);
    const angle = offset * MAX_BOUNCE_ANGLE;
    b.vx = BALL_SPEED * Math.sin(angle);
    b.vy = -BALL_SPEED * Math.cos(angle);
    this.audio.play('paddle');
  }

  /** 当たったブロックを 1 つだけ壊して跳ね返す。壊したら true。 */
  private collideBricks(): boolean {
    const b = this.ball;
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      const nx = clamp(b.x, brick.x, brick.x + brick.w);
      const ny = clamp(b.y, brick.y, brick.y + brick.h);
      const dx = b.x - nx;
      const dy = b.y - ny;
      if (dx * dx + dy * dy > BALL_R * BALL_R) continue;

      // 近い面の向きで跳ね返す（横の面なら左右、上下の面なら上下を反転）
      if (Math.abs(dx) > Math.abs(dy)) {
        const s = Math.sign(dx);
        b.vx = s * Math.abs(b.vx);
        b.x = nx + s * (BALL_R + 0.01);
      } else if (dy !== 0) {
        const s = Math.sign(dy);
        b.vy = s * Math.abs(b.vy);
        b.y = ny + s * (BALL_R + 0.01);
      } else {
        // 中心がブロックの中に入ってしまった場合（まれ）は、来た方向へ戻す
        b.vy = -b.vy;
      }
      this.normalizeVelocity();
      this.breakBrick(brick);
      return true;
    }
    return false;
  }

  private breakBrick(brick: Brick): void {
    brick.alive = false;
    this.score += SCORE_BRICK * this.scoreMul;
    // 上の段ほど高い音
    this.audio.play('brick', 1 + (BRICK_ROWS - 1 - brick.row) * 0.04);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 140;
      this.particles.push({
        x: brick.x + Math.random() * brick.w,
        y: brick.y + Math.random() * brick.h,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.5,
        maxLife: 0.5,
        color: brick.color,
        size: 2 + Math.random() * 3
      });
    }
  }

  /** 速さを常に一定に保ち、水平に寝すぎた角度を起こす。 */
  private normalizeVelocity(): void {
    const b = this.ball;
    const minVy = BALL_SPEED * Math.sin(MIN_ANGLE_FROM_HORIZONTAL);
    if (Math.abs(b.vy) < minVy) {
      const sy = b.vy === 0 ? -1 : Math.sign(b.vy);
      const sx = b.vx === 0 ? 1 : Math.sign(b.vx);
      b.vy = sy * minVy;
      b.vx = sx * Math.sqrt(BALL_SPEED * BALL_SPEED - minVy * minVy);
    } else {
      const len = Math.hypot(b.vx, b.vy);
      b.vx = (b.vx / len) * BALL_SPEED;
      b.vy = (b.vy / len) * BALL_SPEED;
    }
  }

  private loseLife(): void {
    this.lives -= 1;
    this.audio.play('lose');
    if (this.lives <= 0) {
      this.setPhase('gameover');
      this.commitHighScore();
    } else {
      this.serve();
    }
  }

  private stageCleared(): void {
    this.score += this.lives * SCORE_LIFE_BONUS * this.scoreMul;
    this.commitHighScore();
    this.audio.play('clear');
    this.setPhase(this.stageIndex >= STAGES.length - 1 ? 'allClear' : 'stageClear');
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private commitHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.difficulty.id, this.highScore);
    }
  }

  private hitButton(x: number, y: number): Button | null {
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }
}
