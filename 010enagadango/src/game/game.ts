// ゲームの進行（タイトル → 問題えらび → 問題 → クリア → 面クリア → デモ …）と、枝の上の状態。
import { BIRD_NAME as NAME, BIRD_WEIGHT, type BirdKind } from './birds';
import { BIRD_SCALE, UNDO_BTN, WIDTH, slotSpacing } from './constants';
import {
  allOrdersOk,

  idx,
  initialBoard,
  isDango,
  openSlots,
  overLimit,
  reservedFrom,
  tiltOf,
  type Board,
  type Puzzle
} from './rules';
import { angleFor, orderText as orderLine, slotPoint } from './scene';
import { ALL_PUZZLES, SCORE, STAGES, type Stage } from './stages';
import { loadHighScore, loadStars, saveHighScore, saveStars } from './storage';
import type { SoundName } from './audio';

export type Phase = 'title' | 'select' | 'intro' | 'playing' | 'cleared' | 'stageClear' | 'demo' | 'ending' | 'result' | 'paused';

export interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const PAUSE_BUTTON: Button = { x: 4, y: 4, w: 34, h: 32 };
export const PAUSE_MENU = {
  resume: { x: 140, y: 250, w: 200, h: 48 },
  sound: { x: 140, y: 312, w: 200, h: 48 },
  select: { x: 140, y: 374, w: 200, h: 48 }
} as const;

/** 問題えらびのカード。 */
export const SELECT_CARD = { w: 76, h: 88, gap: 10, top: 132, row: 150 } as const;
export const SELECT_BACK: Button = { x: 150, y: 584, w: 180, h: 40 };

export function selectCard(stage: number, index: number): Button {
  const n = STAGES[stage]!.puzzles.length;
  const total = n * SELECT_CARD.w + (n - 1) * SELECT_CARD.gap;
  return {
    x: WIDTH / 2 - total / 2 + index * (SELECT_CARD.w + SELECT_CARD.gap),
    y: SELECT_CARD.top + stage * SELECT_CARD.row + 30,
    w: SELECT_CARD.w,
    h: SELECT_CARD.h
  };
}

export interface GameAudio {
  play(name: SoundName, pitch?: number): void;
  toggleMute(): boolean;
  muted: boolean;
}

/** 動き（入力を止めて見せるもの）。 */
export type Anim =
  | { kind: 'fly'; pos: number; bird: BirdKind; from: { x: number; y: number }; t: number }
  | { kind: 'ball'; pos: number; weight: number; t: number }
  | { kind: 'fall'; t: number; birds: { bird: BirdKind; x: number; y: number; vx: number; vy: number }[]; dir: number }
  | { kind: 'finale'; t: number; dango: boolean };

export const FLY_TIME = 0.32;
export const BALL_TIME = 1.0;
export const BALL_WINDUP = 0.4;
export const FALL_TIME = 2.0;
export const JUMP_TIME = 0.9;
export const SQUEEZE_TIME = 0.6;
export const FINALE_TIME = 1.9;

/** 雪玉を投げる雪だるまの位置（3 めん）。 */
export const THROWER = { x: 420, y: 250 } as const;

interface Snapshot {
  board: Board;
  step: number;
}

export interface ClearInfo {
  stars: number;
  clean: boolean;
  dango: boolean;
  points: number;
  best: boolean;
}

const hit = (b: Button, x: number | null, y: number | null): boolean =>
  x !== null && y !== null && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

const flatIndex = (stage: number, index: number): number => ALL_PUZZLES.findIndex((p) => p.stage === stage && p.index === index);

export class Game {
  phase: Phase = 'title';
  pausedFrom: Phase = 'playing';
  /** 経過時間（ずっと進む。絵の動きに使う）。 */
  time = 0;
  phaseTime = 0;

  score = 0;
  hiScore = loadHighScore();
  newHiScore = false;
  /** 各問の最高の ★。 */
  stars: number[] = loadStars(ALL_PUZZLES.length);
  /** この回で取った ★（結果画面用）。 */
  runStars: number[] = [];

  stageIndex = 0;
  puzzleIndex = 0;
  board: Board = [];
  step = 0;
  history: Snapshot[] = [];
  cursor: number | null = null;
  /** スマホ：1 回目のタップで選んだ場所（2 回目で とまる）。 */
  armed: number | null = null;
  undoUsed = false;
  failed = false;
  anim: Anim | null = null;
  clear: ClearInfo | null = null;
  /** 枝の見た目の角度（ばねで目標に近づける）。 */
  angle = 0;
  private angleVel = 0;
  /** 一時的な案内（とまれない場所など）。 */
  note: { text: string; t: number } | null = null;
  /** 問題の始めからの時間（ヒントを出す）。 */
  puzzleTime = 0;
  /** 問題えらびで選んでいるカード（キーボード用）。 */
  selectCursor = 0;

  constructor(private readonly audio: GameAudio) {}

  get muted(): boolean {
    return this.audio.muted;
  }

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  get puzzle(): Puzzle {
    return this.stage.puzzles[this.puzzleIndex]!;
  }

  get flat(): number {
    return flatIndex(this.stageIndex, this.puzzleIndex);
  }

  get tilt(): number {
    return tiltOf(this.board, this.puzzle.perSide);
  }

  /** 今とまる鳥（雪玉の番や、全員とまったあとは null）。 */
  get current(): BirdKind | null {
    const a = this.puzzle.queue[this.step];
    return a && a.kind === 'bird' ? a.bird : null;
  }

  get allPlaced(): boolean {
    return this.step >= this.puzzle.queue.length;
  }

  /** 選べる問題：解いた問題と、そのつぎの 1 問。 */
  isUnlocked(flat: number): boolean {
    if (flat === 0) return true;
    return this.stars[flat]! > 0 || this.stars[flat - 1]! > 0;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // --- 入力 ------------------------------------------------------------------

  press(x: number | null, y: number | null, touch = false): void {
    switch (this.phase) {
      case 'title':
        this.audio.play('start');
        if (this.stars.every((s) => s === 0)) this.choose(0);
        else this.openSelect();
        return;
      case 'select': {
        if (hit(SELECT_BACK, x, y)) {
          this.audio.play('select');
          this.setPhase('title');
          return;
        }
        for (const p of ALL_PUZZLES) {
          if (!hit(selectCard(p.stage, p.index), x, y)) continue;
          const f = flatIndex(p.stage, p.index);
          if (this.isUnlocked(f)) {
            this.audio.play('start');
            this.choose(f);
          } else this.audio.play('nope');
          return;
        }
        return;
      }
      case 'intro':
        if (hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (this.phaseTime > 0.4) {
          this.audio.play('select');
          this.setPhase('playing');
        }
        return;
      case 'playing':
        if (hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (hit(UNDO_BTN, x, y)) this.undo();
        else this.tapBranch(x, y, touch);
        return;
      case 'paused':
        if (hit(PAUSE_MENU.resume, x, y) || hit(PAUSE_BUTTON, x, y)) this.togglePause();
        else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
        else if (hit(PAUSE_MENU.select, x, y)) {
          this.audio.play('select');
          this.openSelect();
        }
        return;
      case 'cleared':
        if (this.phaseTime > 0.9) this.afterClear();
        return;
      case 'stageClear':
        if (this.phaseTime > 1) {
          const last = this.stageIndex >= STAGES.length - 1;
          this.setPhase(last ? 'ending' : 'demo');
          this.audio.play(last ? 'jingle' : 'select');
        }
        return;
      case 'demo':
        if (this.phaseTime > 1) {
          this.stageIndex++;
          this.puzzleIndex = 0;
          this.beginPuzzle(true);
          this.audio.play('select');
        }
        return;
      case 'ending':
        if (this.phaseTime > 1.5) {
          this.setPhase('result');
          this.audio.play('clear');
        }
        return;
      case 'result':
        if (this.phaseTime > 1.2) this.setPhase('title');
        return;
      default:
        return;
    }
  }

  hover(x: number, y: number): void {
    if (this.phase === 'select') {
      for (const p of ALL_PUZZLES) {
        if (hit(selectCard(p.stage, p.index), x, y)) this.selectCursor = flatIndex(p.stage, p.index);
      }
      return;
    }
    if (this.phase !== 'playing' || this.anim !== null || this.current === null) return;
    const pos = this.slotAt(x, y);
    if (pos !== null && pos !== this.cursor && this.canPlace(pos)) {
      this.cursor = pos;
      this.audio.play('cursor');
    }
  }

  confirm(): void {
    if (this.phase === 'paused') {
      this.togglePause();
      return;
    }
    if (this.phase === 'select') {
      if (this.isUnlocked(this.selectCursor)) {
        this.audio.play('start');
        this.choose(this.selectCursor);
      }
      return;
    }
    if (this.phase === 'playing') {
      if (this.cursor !== null && this.canPlace(this.cursor)) this.place(this.cursor);
      return;
    }
    this.press(null, null);
  }

  action(a: 'left' | 'right' | 'undo'): void {
    if (this.phase === 'select') {
      const d = a === 'left' ? -1 : a === 'right' ? 1 : 0;
      this.selectCursor = Math.max(0, Math.min(ALL_PUZZLES.length - 1, this.selectCursor + d));
      if (d !== 0) this.audio.play('cursor');
      return;
    }
    if (this.phase !== 'playing') return;
    if (a === 'undo') {
      this.undo();
      return;
    }
    if (this.anim !== null || this.current === null) return;
    const open = openSlots(this.puzzle, this.board, this.step);
    if (open.length === 0) return;
    const d = a === 'left' ? -1 : 1;
    const from = this.cursor ?? 0;
    const next = d < 0 ? [...open].reverse().find((p) => p < from) : open.find((p) => p > from);
    if (next !== undefined) {
      this.cursor = next;
      this.audio.play('cursor');
    }
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'intro') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
      this.audio.play('select');
    } else if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
      this.audio.play('select');
    }
  }

  escape(): void {
    if (this.phase === 'playing' || this.phase === 'intro' || this.phase === 'paused') this.togglePause();
    else if (this.phase === 'select') this.setPhase('title');
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  // --- 枝の上 ----------------------------------------------------------------

  /** 画面の (x, y) にある、枝の上の場所（真ん中と枝の外は null）。 */
  slotAt(x: number | null, y: number | null): number | null {
    if (x === null || y === null) return null;
    const p = this.puzzle;
    const sp = slotSpacing(p.perSide);
    let best: number | null = null;
    let bestD = sp / 2;
    for (let pos = -p.perSide; pos <= p.perSide; pos++) {
      if (pos === 0) continue;
      const pt = slotPoint(p.perSide, pos, this.angle);
      if (y < pt.y - 120 || y > pt.y + 44) continue;
      const d = Math.abs(x - pt.x);
      if (d < bestD) {
        bestD = d;
        best = pos;
      }
    }
    return best;
  }

  canPlace(pos: number): boolean {
    return openSlots(this.puzzle, this.board, this.step).includes(pos);
  }

  /** 選んでいる場所にとまったときの、かたむき（予告）。 */
  ghostTilt(): number | null {
    const bird = this.current;
    if (bird === null || this.anim !== null || this.cursor === null || !this.canPlace(this.cursor)) return null;
    return this.tilt + BIRD_WEIGHT[bird] * this.cursor;
  }

  private tapBranch(x: number | null, y: number | null, touch: boolean): void {
    if (this.anim !== null || this.current === null) return;
    const pos = this.slotAt(x, y);
    if (pos === null) return;
    if (!this.canPlace(pos)) {
      this.audio.play('nope');
      const c = this.board[idx(this.puzzle.perSide, pos)];
      this.note = {
        text: c ? (c.kind === 'snow' ? '雪が 積もっていて とまれない' : 'もう ほかの 鳥が いるよ') : '雪玉が 来る 場所だよ',
        t: 0
      };
      return;
    }
    // スマホは、1 回目で予告を見せ、同じ場所の 2 回目で とまる
    if (touch && this.armed !== pos) {
      this.armed = pos;
      this.cursor = pos;
      this.note = null;
      this.audio.play('cursor');
      return;
    }
    this.place(pos);
  }

  private place(pos: number): void {
    const bird = this.current;
    if (bird === null) return;
    this.history.push({ board: this.board.slice(), step: this.step });
    const p = this.puzzle;
    const pt = slotPoint(p.perSide, pos, this.angle);
    this.anim = { kind: 'fly', pos, bird, from: { x: pt.x + (pos < 0 ? -40 : 40), y: pt.y - 90 }, t: 0 };
    this.armed = null;
    this.note = null;
  }

  private undo(): void {
    if (this.history.length === 0) return;
    if (this.anim !== null && this.anim.kind !== 'ball') return;
    const s = this.history.pop()!;
    this.board = s.board;
    this.step = s.step;
    this.anim = null;
    this.armed = null;
    this.undoUsed = true;
    this.note = null;
    this.audio.play('undo');
    if (this.cursor !== null && !this.canPlace(this.cursor)) this.cursor = this.defaultCursor();
  }

  private defaultCursor(): number | null {
    const open = openSlots(this.puzzle, this.board, this.step);
    if (open.length === 0) return null;
    // かたむきの軽い側の、いちばん内側
    const side = this.tilt > 0 ? -1 : 1;
    const inner = open.filter((q) => Math.sign(q) === side).sort((a, b) => Math.abs(a) - Math.abs(b));
    return inner[0] ?? open[0]!;
  }

  /** 鳥がとまった・雪玉が落ちたあと：落ちるか、つぎの雪玉か、さいごか。 */
  private advance(): void {
    const p = this.puzzle;
    if (overLimit(this.board, p)) {
      this.startFall();
      return;
    }
    const next = p.queue[this.step];
    if (next && next.kind === 'snowball') {
      this.anim = { kind: 'ball', pos: next.pos, weight: next.weight, t: 0 };
      this.audio.play('throw');
      return;
    }
    if (this.allPlaced) {
      if (this.tilt === 0 && allOrdersOk(this.board, p.perSide)) {
        const dango = isDango(this.board, p.perSide);
        this.anim = { kind: 'finale', t: 0, dango };
        this.audio.play('jump');
      } else {
        this.audio.play('nope');
      }
      return;
    }
    if (this.cursor === null || !this.canPlace(this.cursor)) this.cursor = this.defaultCursor();
    if (Math.abs(this.tilt) >= p.limit - 1 && this.tilt !== 0) this.audio.play('creak');
  }

  private startFall(): void {
    const p = this.puzzle;
    const dir = Math.sign(this.tilt) || 1;
    const birds: { bird: BirdKind; x: number; y: number; vx: number; vy: number }[] = [];
    for (let pos = -p.perSide; pos <= p.perSide; pos++) {
      const c = this.board[idx(p.perSide, pos)];
      if (!c || c.kind !== 'bird') continue;
      const pt = slotPoint(p.perSide, pos, this.angle);
      birds.push({ bird: c.bird, x: pt.x, y: pt.y, vx: pos * 22 + (pos > 0 ? 40 : -40), vy: 170 + Math.abs(pos) * 12 });
    }
    this.anim = { kind: 'fall', t: 0, birds, dir };
    this.failed = true;
    this.audio.play('flap');
    this.audio.play('sad');
  }

  /** 問題を最初の状態にする。fresh = 新しく始める（★ の条件もリセット）。 */
  private beginPuzzle(showIntro: boolean): void {
    const p = this.puzzle;
    this.board = initialBoard(p);
    this.step = 0;
    this.history = [];
    this.anim = null;
    this.clear = null;
    this.armed = null;
    this.note = null;
    this.undoUsed = false;
    this.failed = false;
    this.puzzleTime = 0;
    this.angle = angleFor(this.tilt, p.limit);
    this.angleVel = 0;
    this.cursor = this.defaultCursor();
    this.setPhase(showIntro && this.puzzleIndex === 0 ? 'intro' : 'playing');
    this.advanceStart();
  }

  /** 始めが雪玉なら、すぐ投げる。 */
  private advanceStart(): void {
    const first = this.puzzle.queue[0];
    if (first && first.kind === 'snowball') this.anim = { kind: 'ball', pos: first.pos, weight: first.weight, t: 0 };
  }

  private resetAfterFall(): void {
    const p = this.puzzle;
    this.board = initialBoard(p);
    this.step = 0;
    this.history = [];
    this.anim = null;
    this.armed = null;
    this.cursor = this.defaultCursor();
    this.note = { text: 'さいしょから やりなおし', t: 0 };
    this.advanceStart();
  }

  private finishPuzzle(): void {
    const dango = this.anim?.kind === 'finale' && this.anim.dango;
    const clean = !this.undoUsed && !this.failed;
    const stars = clean ? (dango ? 3 : 2) : 1;
    const points = SCORE.clear + (clean ? SCORE.clean : 0) + (stars === 3 ? SCORE.dango : 0);
    const f = this.flat;
    const best = stars > this.stars[f]!;
    if (best) {
      this.stars[f] = stars;
      saveStars(this.stars);
    }
    this.runStars[f] = Math.max(this.runStars[f] ?? 0, stars);
    this.score += points;
    this.saveHi();
    this.clear = { stars, clean, dango, points, best };
    this.anim = null;
    this.setPhase('cleared');
    this.audio.play('clear');
  }

  private afterClear(): void {
    if (this.puzzleIndex >= this.stage.puzzles.length - 1) {
      this.score += SCORE.stageClear;
      this.saveHi();
      this.setPhase('stageClear');
      this.audio.play('stageClear');
      return;
    }
    this.puzzleIndex++;
    this.beginPuzzle(false);
    this.audio.play('select');
  }

  private openSelect(): void {
    this.setPhase('select');
    const next = this.stars.findIndex((s) => s === 0);
    this.selectCursor = next < 0 ? 0 : next;
  }

  private choose(flat: number): void {
    const p = ALL_PUZZLES[flat]!;
    this.stageIndex = p.stage;
    this.puzzleIndex = p.index;
    this.score = 0;
    this.newHiScore = false;
    this.runStars = [];
    this.beginPuzzle(true);
  }

  private saveHi(): void {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHiScore = true;
      saveHighScore(this.score);
    }
  }

  // --- 時間 ------------------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;
    if (this.note) {
      this.note.t += dt;
      if (this.note.t > 2.2) this.note = null;
    }
    if (this.phase !== 'playing' && this.phase !== 'intro' && this.phase !== 'cleared') return;
    this.puzzleTime += dt;
    this.updateAngle(dt);
    if (this.phase !== 'playing') return;

    const a = this.anim;
    if (a === null) return;
    a.t += dt;
    const p = this.puzzle;
    if (a.kind === 'fly' && a.t >= FLY_TIME) {
      const arrival = p.queue[this.step];
      this.board[idx(p.perSide, a.pos)] = {
        kind: 'bird',
        bird: a.bird,
        ...(arrival && arrival.kind === 'bird' && arrival.order ? { order: arrival.order } : {})
      };
      this.step++;
      this.anim = null;
      this.angleVel += Math.sign(a.pos) * BIRD_WEIGHT[a.bird] * 0.12;
      this.audio.play('perch', 1.15 - BIRD_WEIGHT[a.bird] * 0.08);
      this.advance();
    } else if (a.kind === 'ball' && a.t >= BALL_TIME) {
      this.board[idx(p.perSide, a.pos)] = { kind: 'snow', weight: a.weight, ball: true };
      this.step++;
      this.anim = null;
      this.angleVel += Math.sign(a.pos) * a.weight * 0.14;
      this.audio.play('snowLand');
      this.advance();
    } else if (a.kind === 'fall' && a.t >= FALL_TIME) {
      this.resetAfterFall();
    } else if (a.kind === 'finale') {
      if (a.dango && a.t >= JUMP_TIME && a.t - dt < JUMP_TIME) this.audio.play('squeeze');
      if (a.t >= FINALE_TIME) this.finishPuzzle();
    }
  }

  private updateAngle(dt: number): void {
    const p = this.puzzle;
    const a = this.anim;
    const target = a && a.kind === 'fall' ? a.dir * 0.42 * Math.min(1, a.t / 0.3) * (a.t > 1.3 ? Math.max(0, 1 - (a.t - 1.3) / 0.6) : 1) : angleFor(this.tilt, p.limit);
    // ばね（少しゆれてから止まる）
    const acc = 120 * (target - this.angle) - 11 * this.angleVel;
    this.angleVel += acc * dt;
    this.angle += this.angleVel * dt;
  }

  // --- 描画のための問い合わせ -----------------------------------------------

  /** だんごの寄り集まり 0..1。 */
  dangoLevel(): number {
    if (this.phase === 'cleared' || this.phase === 'stageClear') return this.clear?.dango ? 1 : 0;
    const a = this.anim;
    if (!a || a.kind !== 'finale' || !a.dango) return 0;
    const k = Math.max(0, Math.min(1, (a.t - JUMP_TIME) / SQUEEZE_TIME));
    return k * k * (3 - 2 * k);
  }

  /** 雪玉が来る予定の場所。 */
  snowTargets(): number[] {
    return [...reservedFrom(this.puzzle, this.step)];
  }

  /** 下の欄の案内。 */
  message(): { text: string; color?: string } {
    const a = this.anim;
    if (a?.kind === 'fall') return { text: 'ばさばさっ！ かたむきすぎた…', color: '#ffb4c4' };
    if (a?.kind === 'finale') return { text: 'みんな とまった！ さくらちゃん、いくよ！', color: '#fff4a8' };
    if (a?.kind === 'ball') return { text: '雪玉が 来るよ！', color: '#bfe0ff' };
    if (this.note) return { text: this.note.text, color: '#ffd6a8' };
    const p = this.puzzle;
    if (this.allPlaced && this.phase === 'playing') {
      if (this.tilt !== 0) return { text: `まだ ${this.tilt > 0 ? 'みぎ' : 'ひだり'}に かたむいている…「ひとつもどす」で なおそう`, color: '#ffb4c4' };
      if (!allOrdersOk(this.board, p.perSide)) return { text: 'かなっていない 注文が あるよ（ひとつもどす）', color: '#ffb4c4' };
    }
    if (this.armed !== null) return { text: 'もういちど タップで とまる', color: COLOR_PINK };
    if (this.history.length === 0 && this.puzzleTime < 4 && p.hint) return { text: p.hint, color: '#fff4a8' };
    const arrival = p.queue[this.step];
    if (arrival && arrival.kind === 'bird') {
      if (arrival.order) return { text: `${NAME[arrival.bird]}「${orderLine(arrival.order)}」`, color: '#ffd0dc' };
      return { text: `${NAME[arrival.bird]}（おもさ ${BIRD_WEIGHT[arrival.bird]}）は どこに とまる？` };
    }
    return { text: '' };
  }

  /** 失敗で飛び立つ鳥の位置。 */
  fallBirds(): { bird: BirdKind; x: number; y: number; flap: number; rot: number }[] {
    const a = this.anim;
    if (!a || a.kind !== 'fall') return [];
    const t = a.t;
    return a.birds.map((b, i) => ({
      bird: b.bird,
      x: b.x + b.vx * t,
      y: b.y - b.vy * t + 20 * t * t - BIRD_SCALE,
      flap: 0.5 + 0.5 * Math.sin(this.time * 22 + i),
      rot: Math.sin(t * 6 + i) * 0.25
    }));
  }

  /** 飛んでくる鳥の今の位置。 */
  flyPos(): { bird: BirdKind; x: number; y: number; p: number } | null {
    const a = this.anim;
    if (!a || a.kind !== 'fly') return null;
    const p = Math.min(1, a.t / FLY_TIME);
    const e = 1 - (1 - p) * (1 - p);
    const to = slotPoint(this.puzzle.perSide, a.pos, this.angle);
    return { bird: a.bird, x: a.from.x + (to.x - a.from.x) * e, y: a.from.y + (to.y - a.from.y) * e, p };
  }

  /** 飛んでいる雪玉。 */
  ballPos(): { x: number; y: number; windup: number; spin: number } | null {
    const a = this.anim;
    if (!a || a.kind !== 'ball') return null;
    const to = slotPoint(this.puzzle.perSide, a.pos, this.angle);
    if (a.t < BALL_WINDUP) return { x: THROWER.x - 18, y: THROWER.y - 70, windup: a.t / BALL_WINDUP, spin: a.t * 8 };
    const p = Math.min(1, (a.t - BALL_WINDUP) / (BALL_TIME - BALL_WINDUP));
    const sx = THROWER.x - 18;
    const sy = THROWER.y - 70;
    return {
      x: sx + (to.x - sx) * p,
      y: sy + (to.y - 12 - sy) * p - Math.sin(p * Math.PI) * 90,
      windup: 0,
      spin: a.t * 8
    };
  }

}

const COLOR_PINK = '#f8c3d2';
