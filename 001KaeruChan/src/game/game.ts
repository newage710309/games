import {
  BASE_SPEED,
  CELL,
  CLEAR_DURATION,
  DEATH_DURATION,
  HEIGHT,
  HITBOX_INSET,
  HOME_COLS,
  HOP_DURATION,
  LEVEL_SPEED_STEP,
  ROW_HOME,
  ROW_ROAD_FIRST,
  ROW_ROAD_LAST,
  ROW_START,
  ROW_WATER_FIRST,
  ROW_WATER_LAST,
  SCORE_FLY,
  SCORE_FORWARD,
  SCORE_HOME,
  SCORE_LEVEL_CLEAR,
  SCORE_TIME_PER_SEC,
  START_LIVES,
  TIME_LIMIT,
  WIDTH,
  clamp,
  colX,
  rowY
} from './constants';
import { LANES, type LaneObject, laneObjects } from './level';
import type { Direction } from './input';
import { Audio } from './audio';
import { loadHighScore, saveHighScore } from './storage';

export type Phase = 'title' | 'playing' | 'paused' | 'dying' | 'clear' | 'gameover';
export type DeathCause = 'car' | 'water' | 'time' | 'edge' | 'bay';

interface Frog {
  x: number;
  fromX: number;
  toX: number;
  fromRow: number;
  toRow: number;
  hopping: boolean;
  hopT: number;
  facing: Direction;
}

const START_X = colX(6);
const isWaterRow = (row: number): boolean => row >= ROW_WATER_FIRST && row <= ROW_WATER_LAST;
const isRoadRow = (row: number): boolean => row >= ROW_ROAD_FIRST && row <= ROW_ROAD_LAST;

function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class Game {
  phase: Phase = 'title';
  score = 0;
  highScore = loadHighScore();
  lives = START_LIVES;
  level = 1;
  timeLeft = TIME_LIMIT;
  homes: boolean[] = [false, false, false, false, false];
  deathCause: DeathCause = 'car';

  /** レーンのスクロールに使う経過時間。タイトル画面でも進む。 */
  elapsed = 0;
  /** 画面全体のシェイク量（描画用）。 */
  shake = 0;

  flyBay: number | null = null;

  readonly frog: Frog = {
    x: START_X,
    fromX: START_X,
    toX: START_X,
    fromRow: ROW_START,
    toRow: ROW_START,
    hopping: false,
    hopT: 0,
    facing: 'up'
  };

  /** 現フレームのレーン上オブジェクト（描画と当たり判定で共用）。 */
  laneObjects: LaneObject[][] = LANES.map(() => []);

  private deathTimer = 0;
  private clearTimer = 0;
  private bestRow = ROW_START;
  private flyLife = 0;
  private flyCooldown = 6;

  constructor(private readonly audio: Audio) {}

  get speedMul(): number {
    return BASE_SPEED * (1 + (this.level - 1) * LEVEL_SPEED_STEP);
  }

  /** ホップ進行度 0..1（描画の跳ね上がり表現に使う）。 */
  get hopProgress(): number {
    return this.frog.hopping ? clamp(this.frog.hopT / HOP_DURATION, 0, 1) : 1;
  }

  get frogX(): number {
    return this.frog.x;
  }

  get frogY(): number {
    const p = this.hopProgress;
    return rowY(this.frog.fromRow) + (rowY(this.frog.toRow) - rowY(this.frog.fromRow)) * p;
  }

  get frogFacing(): Direction {
    return this.frog.facing;
  }

  /** 描画用：死亡演出の進行度 0..1。 */
  get deathProgress(): number {
    return this.phase === 'dying' ? clamp(1 - this.deathTimer / DEATH_DURATION, 0, 1) : 0;
  }

  get boardHeight(): number {
    return HEIGHT;
  }

  // --- 外部から呼ぶ操作 -------------------------------------------------

  action(): void {
    if (this.phase === 'title' || this.phase === 'gameover') {
      this.startGame();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
    }
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  move(dir: Direction): void {
    if (this.phase !== 'playing' || this.frog.hopping) return;

    const f = this.frog;
    f.facing = dir;
    f.fromX = f.x;
    f.fromRow = f.toRow;

    if (dir === 'left' || dir === 'right') {
      const delta = dir === 'left' ? -CELL : CELL;
      f.toX = clamp(f.x + delta, 0, WIDTH - CELL);
      if (f.toX === f.fromX) return; // 端では跳ねない
    } else {
      f.toX = f.x;
      const nextRow = f.toRow + (dir === 'up' ? -1 : 1);
      // 上は HOME 行まで、下は START 行まで。
      f.toRow = clamp(nextRow, ROW_HOME, ROW_START);
      if (f.toRow === f.fromRow) return;
    }

    f.hopping = true;
    f.hopT = 0;
    this.audio.play('hop');
  }

  startGame(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.homes = [false, false, false, false, false];
    this.flyBay = null;
    this.flyCooldown = 6;
    this.shake = 0;
    this.respawn();
    this.phase = 'playing';
  }

  // --- 更新 ------------------------------------------------------------

  update(dt: number): void {
    this.elapsed += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.refreshLanes();

    switch (this.phase) {
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'dying':
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.afterDeath();
        break;
      case 'clear':
        this.clearTimer -= dt;
        if (this.clearTimer <= 0) this.nextLevel();
        break;
      default:
        break;
    }
  }

  private refreshLanes(): void {
    const mul = this.speedMul;
    for (let i = 0; i < LANES.length; i++) {
      this.laneObjects[i] = laneObjects(LANES[i]!, this.elapsed, mul);
    }
  }

  private updatePlaying(dt: number): void {
    this.updateFly(dt);
    this.updateHop(dt);

    const row = this.frog.toRow;

    if (isWaterRow(row)) {
      if (!this.rideOrDrown(dt)) return; // 溺れた
    } else if (isRoadRow(row) && !this.frog.hopping && this.hitByVehicle()) {
      this.die('car');
      return;
    }

    // 乗り物ごと画面外へ流された。
    const center = this.frog.x + CELL / 2;
    if (center < 0 || center > WIDTH) {
      this.die('edge');
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.die('time');
    }
  }

  private updateHop(dt: number): void {
    const f = this.frog;
    if (!f.hopping) return;

    f.hopT += dt;
    const p = clamp(f.hopT / HOP_DURATION, 0, 1);
    f.x = f.fromX + (f.toX - f.fromX) * p;

    if (p >= 1) {
      f.hopping = false;
      f.x = f.toX;
      f.fromRow = f.toRow;
      f.fromX = f.toX;
      this.onLand();
    }
  }

  private onLand(): void {
    const row = this.frog.toRow;

    if (row < this.bestRow) {
      this.score += SCORE_FORWARD * (this.bestRow - row);
      this.bestRow = row;
    }

    if (row === ROW_HOME) this.resolveHome();
  }

  /** 水面レーンでは乗り物に乗せて流す。乗れていなければ溺れる。 */
  private rideOrDrown(dt: number): boolean {
    const f = this.frog;
    const center = f.x + CELL / 2;

    for (let i = 0; i < LANES.length; i++) {
      const lane = LANES[i]!;
      if (lane.row !== f.toRow) continue;

      for (const obj of this.laneObjects[i]!) {
        if (!obj.rideable) continue;
        if (center < obj.x || center > obj.x + obj.w) continue;

        const dx = lane.speed * this.speedMul * dt;
        f.x += dx;
        f.fromX += dx;
        f.toX += dx;
        return true;
      }
    }

    if (f.hopping) return true; // 跳んでいる最中はまだ判定しない
    this.die('water');
    return false;
  }

  private hitByVehicle(): boolean {
    const f = this.frog;
    const fx = f.x + HITBOX_INSET;
    const fy = rowY(f.toRow) + HITBOX_INSET;
    const size = CELL - HITBOX_INSET * 2;

    for (let i = 0; i < LANES.length; i++) {
      const lane = LANES[i]!;
      if (lane.row !== f.toRow) continue;
      for (const obj of this.laneObjects[i]!) {
        if (overlaps(fx, fy, size, size, obj.x + 2, obj.y + 5, obj.w - 4, obj.h - 10)) {
          return true;
        }
      }
    }
    return false;
  }

  private resolveHome(): void {
    const center = this.frog.x + CELL / 2;
    let best = -1;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < HOME_COLS.length; i++) {
      const d = Math.abs(center - (colX(HOME_COLS[i]!) + CELL / 2));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    if (best < 0 || bestDist > CELL * 0.7 || this.homes[best] === true) {
      this.die('bay');
      return;
    }

    this.homes[best] = true;
    this.score += SCORE_HOME + Math.floor(this.timeLeft) * SCORE_TIME_PER_SEC;

    if (this.flyBay === best) {
      this.score += SCORE_FLY;
      this.flyBay = null;
      this.flyCooldown = 8;
      this.audio.play('fly');
    }

    if (this.homes.every((h) => h)) {
      this.score += SCORE_LEVEL_CLEAR;
      this.phase = 'clear';
      this.clearTimer = CLEAR_DURATION;
      this.audio.play('clear');
    } else {
      this.audio.play('home');
      this.respawn();
    }
    this.commitHighScore();
  }

  private updateFly(dt: number): void {
    if (this.flyBay !== null) {
      this.flyLife -= dt;
      if (this.flyLife <= 0) {
        this.flyBay = null;
        this.flyCooldown = 7 + Math.random() * 6;
      }
      return;
    }

    this.flyCooldown -= dt;
    if (this.flyCooldown > 0) return;

    const empty: number[] = [];
    for (let i = 0; i < this.homes.length; i++) {
      if (this.homes[i] !== true) empty.push(i);
    }
    if (empty.length === 0) {
      this.flyCooldown = 4;
      return;
    }
    this.flyBay = empty[Math.floor(Math.random() * empty.length)]!;
    this.flyLife = 6;
  }

  private die(cause: DeathCause): void {
    this.deathCause = cause;
    this.phase = 'dying';
    this.deathTimer = DEATH_DURATION;
    this.lives -= 1;
    this.shake = 1;
    this.audio.play('death');
    this.commitHighScore();
  }

  private afterDeath(): void {
    if (this.lives <= 0) {
      this.phase = 'gameover';
      this.commitHighScore();
      return;
    }
    this.respawn();
    this.phase = 'playing';
  }

  private respawn(): void {
    const f = this.frog;
    f.x = START_X;
    f.fromX = START_X;
    f.toX = START_X;
    f.fromRow = ROW_START;
    f.toRow = ROW_START;
    f.hopping = false;
    f.hopT = 0;
    f.facing = 'up';
    this.timeLeft = TIME_LIMIT;
    this.bestRow = ROW_START;
  }

  private nextLevel(): void {
    this.level += 1;
    this.homes = [false, false, false, false, false];
    this.flyBay = null;
    this.flyCooldown = 6;
    this.respawn();
    this.phase = 'playing';
  }

  private commitHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
  }
}
