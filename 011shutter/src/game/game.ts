// ゲームの進行（タイトル → お題 → 撮影 → 写真の一覧 → 新聞 → … → エンディング → 結果）と、撮影中の状態。
// 描画は render.ts。ここはブラウザがなくても動く（ボットが使う）。

import type { SoundName } from './audio';
import { FRAME_H, FRAME_W, HEIGHT, HUD_H, PAUSE_BTN, SHUTTER, WIDTH } from './constants';
import { Field } from './field';
import { POPUP_TIME, renderPhotoCanvas, type PopupState } from './hud';
import { passes, scorePhoto, type PhotoResult } from './photo';
import { POSES, type PoseId } from './poses';
import { BEST_SCORE, FILM, FILM_OUT_WAIT, SCORE, STAGES, STAGE_TIME, WIND_TIME, starsFor, type Stage } from './stages';
import { loadAlbum, loadHighScore, loadZukan, saveAlbum, saveHighScore, saveZukan, type AlbumEntry } from './storage';
import type { Snapshot } from './world';

export type Phase =
  | 'title'
  | 'zukan'
  | 'album'
  | 'intro'
  | 'playing'
  | 'results'
  | 'paper'
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
  { x: 120, y: 436, w: 240, h: 50 },
  { x: 50, y: 502, w: 180, h: 42 },
  { x: 250, y: 502, w: 180, h: 42 }
];
export const PAUSE_MENU = {
  resume: { x: 140, y: 250, w: 200, h: 48 },
  sound: { x: 140, y: 312, w: 200, h: 48 },
  title: { x: 140, y: 374, w: 200, h: 48 }
} as const;
export const BACK_BTN: Button = { x: 150, y: 584, w: 180, h: 42 };
export const PAGE_PREV: Button = { x: 24, y: 584, w: 100, h: 42 };
export const PAGE_NEXT: Button = { x: 356, y: 584, w: 100, h: 42 };
/** アルバムの 1 ページの枚数。 */
export const ALBUM_PAGE = 9;

export interface GameAudio {
  play(name: SoundName, pitch?: number): void;
  toggleMute(): boolean;
  muted: boolean;
}

/** 撮った写真。 */
export interface Photo {
  snap: Snapshot;
  fx: number;
  fy: number;
  r: PhotoResult;
  /** 描いておいた写真の画像（ブラウザのときだけ）。 */
  image: HTMLCanvasElement | null;
  /** 撮った順。 */
  no: number;
}

/** 面の結果。 */
export interface StageRecord {
  stage: number;
  photos: Photo[];
  /** 写真の点数の合計（ボーナス込み）＝ ★ の基準。 */
  total: number;
  stars: number;
  cleared: boolean;
  /** 新聞にのせる写真（いちばん点の高い写真）。 */
  best: Photo | null;
  newPoses: PoseId[];
  /** この面で入った点数。 */
  points: { photos: number; theme: number; poses: number; clear: number };
}

/** 押したとき (x, y) がボタンの中か。 */
export const hit = (b: Button, x: number | null, y: number | null): boolean =>
  x !== null && y !== null && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** シャッターボタンの中か（少し大きめに取る）。 */
export const onShutter = (x: number, y: number): boolean => Math.hypot(x - SHUTTER.x, y - SHUTTER.y) <= SHUTTER.r + 10;

const FRAME_MIN_Y = HUD_H;
/** 矢印キーで枠を動かす速さ（px/秒）。 */
const KEY_SPEED = 420;
/** 指のドラッグを、枠の動きに何倍で伝えるか。 */
const DRAG_GAIN = 1.15;

interface GameOptions {
  /** ブラウザなし（ボット）。写真の画像を作らず、保存もしない。 */
  headless?: boolean;
  /** 乱数の種（面ごとに足して使う）。 */
  seed?: number;
}

export class Game {
  phase: Phase = 'title';
  pausedFrom: Phase = 'playing';
  /** 経過時間（ずっと進む。絵の動きに使う）。 */
  time = 0;
  phaseTime = 0;

  score = 0;
  hiScore: number;
  newHiScore = false;
  zukan: Set<PoseId>;
  album: AlbumEntry[];
  albumPage = 0;
  titleCursor = 0;

  stageIndex = 0;
  field: Field | null = null;
  view: Snapshot | null = null;
  /** カメラの枠の左上。 */
  frameX = (WIDTH - FRAME_W) / 2;
  frameY = 360 - FRAME_H / 2;
  film = FILM;
  /** フィルムを巻いている残り時間（0 なら撮れる）。 */
  wind = 0;
  /** シャッターを切った直後の白い光。 */
  shutterFlash = 0;
  /** シャッターボタンを押している見た目。 */
  shutterDown = 0;
  /** フィルムを使いきってからの時間。 */
  filmOut = 0;
  photos: Photo[] = [];
  popup: PopupState | null = null;
  records: StageRecord[] = [];
  /** 面を始めるたびに変える乱数の種。 */
  private seed: number;

  private keys = { left: false, right: false, up: false, down: false };
  /** 押している指（id → ドラッグか、シャッターか）。 */
  private pointers = new Map<number, { mode: 'drag' | 'shutter'; x: number; y: number }>();
  private readonly headless: boolean;

  constructor(
    private readonly audio: GameAudio,
    opts: GameOptions = {}
  ) {
    this.headless = opts.headless ?? false;
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    this.hiScore = this.headless ? 0 : loadHighScore();
    this.zukan = this.headless ? new Set() : loadZukan();
    this.album = this.headless ? [] : loadAlbum();
  }

  get muted(): boolean {
    return this.audio.muted;
  }

  get stage(): Stage {
    return STAGES[this.stageIndex]!;
  }

  /** この面の写真の点数の合計。 */
  get stageTotal(): number {
    return this.photos.reduce((s, p) => s + p.r.score, 0);
  }

  /** お題に合う 60 点以上の写真が撮れたか。 */
  get themeOk(): boolean {
    return this.photos.some((p) => passes(p.r));
  }

  get timeLeft(): number {
    return this.field ? Math.max(0, 1 - this.field.t / STAGE_TIME) : 1;
  }

  /** 今の面の記録（写真の一覧・新聞で使う）。 */
  get record(): StageRecord | null {
    return this.records[this.records.length - 1] ?? null;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // --- 進行 ------------------------------------------------------------------

  startRun(): void {
    this.score = 0;
    this.newHiScore = false;
    this.records = [];
    this.stageIndex = 0;
    this.startStage();
  }

  private startStage(): void {
    this.field = new Field(this.stageIndex + 1, this.seed + this.stageIndex * 7919);
    this.seed += 104729;
    this.view = this.field.snapshot();
    this.film = FILM;
    this.wind = 0;
    this.filmOut = 0;
    this.shutterFlash = 0;
    this.photos = [];
    this.popup = null;
    this.frameX = (WIDTH - FRAME_W) / 2;
    this.frameY = 380 - FRAME_H / 2;
    this.setPhase('intro');
  }

  /** 面の終わり：写真を点数の高い順に並べ、点数を足す。 */
  private endStage(): void {
    const photos = [...this.photos].sort((p, q) => q.r.score - p.r.score || p.no - q.no);
    const total = this.stageTotal;
    const cleared = this.themeOk;
    const newPoses: PoseId[] = [];
    for (const p of this.photos) {
      if (p.r.pose && !this.zukan.has(p.r.pose) && !newPoses.includes(p.r.pose)) newPoses.push(p.r.pose);
    }
    for (const id of newPoses) this.zukan.add(id);
    const points = {
      photos: total * SCORE.photo,
      theme: cleared ? SCORE.theme : 0,
      poses: newPoses.length * SCORE.newPose,
      clear: cleared ? SCORE.clear : 0
    };
    this.score += points.photos + points.theme + points.poses + points.clear;
    this.records.push({
      stage: this.stageIndex + 1,
      photos,
      total,
      stars: cleared ? starsFor(total) : 0,
      cleared,
      best: photos[0] ?? null,
      newPoses,
      points
    });
    if (!this.headless) {
      saveZukan(this.zukan);
      const at = Date.now();
      for (const p of this.photos) {
        if (p.r.subject !== 'sakura') continue;
        this.album.push({ snap: p.snap, fx: p.fx, fy: p.fy, score: p.r.score, at });
      }
      saveAlbum(this.album);
      this.album = loadAlbum();
    }
    this.pointers.clear();
    this.popup = null;
    this.audio.play(cleared ? 'stageClear' : 'sad');
    this.setPhase('results');
  }

  private finishRun(): void {
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHiScore = true;
      if (!this.headless) saveHighScore(this.score);
    }
    this.setPhase('final');
  }

  /** つぎへ進む（決定・タップ）。 */
  confirm(): void {
    switch (this.phase) {
      case 'title':
        this.titleSelect(this.titleCursor);
        return;
      case 'zukan':
      case 'album':
        this.audio.play('select');
        this.setPhase('title');
        return;
      case 'intro':
        if (this.phaseTime < 0.5) return;
        this.audio.play('start');
        this.setPhase('playing');
        return;
      case 'playing':
        this.shoot();
        return;
      case 'results': {
        if (this.phaseTime < 1.2) return;
        this.audio.play('select');
        if (this.record?.cleared) {
          this.audio.play('paper');
          this.setPhase('paper');
        } else this.setPhase('gameover');
        return;
      }
      case 'paper':
        if (this.phaseTime < 2.4) return;
        this.audio.play('select');
        if (this.stageIndex < STAGES.length - 1) {
          this.stageIndex++;
          this.startStage();
        } else {
          this.audio.play('jingle');
          this.setPhase('ending');
        }
        return;
      case 'gameover':
        if (this.phaseTime < 1.5) return;
        this.finishRun();
        return;
      case 'ending':
        if (this.phaseTime < 8.2) return;
        this.finishRun();
        return;
      case 'final':
        if (this.phaseTime < 1.2) return;
        this.audio.play('select');
        this.setPhase('title');
        return;
      case 'paused':
        this.togglePause();
        return;
    }
  }

  private titleSelect(i: number): void {
    if (i === 0) {
      this.audio.play('start');
      this.startRun();
    } else {
      this.audio.play('select');
      // あたらしい写真のページから見せる
      this.albumPage = 0;
      this.setPhase(i === 1 ? 'zukan' : 'album');
    }
  }

  togglePause(): void {
    if (this.phase === 'playing' || this.phase === 'intro') {
      this.pausedFrom = this.phase;
      this.phase = 'paused';
      this.pointers.clear();
      this.keys = { left: false, right: false, up: false, down: false };
      this.audio.play('select');
    } else if (this.phase === 'paused') {
      this.phase = this.pausedFrom;
      this.audio.play('select');
    }
  }

  escape(): void {
    if (this.phase === 'playing' || this.phase === 'intro' || this.phase === 'paused') this.togglePause();
    else if (this.phase === 'zukan' || this.phase === 'album') this.setPhase('title');
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  // --- 入力 ------------------------------------------------------------------

  pointerDown(id: number, x: number | null, y: number | null, touch: boolean): void {
    switch (this.phase) {
      case 'title': {
        const i = TITLE_BTNS.findIndex((b) => hit(b, x, y));
        if (i >= 0) this.titleSelect(i);
        else if (y !== null && y < 420) this.titleSelect(0);
        return;
      }
      case 'album':
        if (hit(PAGE_PREV, x, y)) this.page(-1);
        else if (hit(PAGE_NEXT, x, y)) this.page(1);
        else if (hit(BACK_BTN, x, y)) this.confirm();
        return;
      case 'zukan':
        if (hit(BACK_BTN, x, y)) this.confirm();
        return;
      case 'intro':
        if (hit(PAUSE_BTN, x, y)) this.togglePause();
        else this.confirm();
        return;
      case 'playing': {
        if (hit(PAUSE_BTN, x, y)) {
          this.togglePause();
          return;
        }
        if (x === null || y === null) return;
        if (touch) {
          if (onShutter(x, y)) {
            this.pointers.set(id, { mode: 'shutter', x, y });
            this.shoot();
          } else {
            this.pointers.set(id, { mode: 'drag', x, y });
          }
        } else {
          // マウス：枠をカーソルに合わせて、クリックで撮る（シャッターボタンの上なら枠は動かさない）
          if (!onShutter(x, y)) this.centerFrame(x, y);
          this.shoot();
        }
        return;
      }
      case 'paused':
        if (hit(PAUSE_MENU.resume, x, y) || hit(PAUSE_BTN, x, y)) this.togglePause();
        else if (hit(PAUSE_MENU.sound, x, y)) this.toggleMute();
        else if (hit(PAUSE_MENU.title, x, y)) {
          this.audio.play('select');
          this.setPhase('title');
        }
        return;
      default:
        this.confirm();
    }
  }

  pointerMove(id: number, x: number, y: number, touch: boolean): void {
    if (this.phase !== 'playing') return;
    if (!touch) {
      if (!onShutter(x, y)) this.centerFrame(x, y);
      return;
    }
    const p = this.pointers.get(id);
    if (!p || p.mode !== 'drag') return;
    this.moveFrame((x - p.x) * DRAG_GAIN, (y - p.y) * DRAG_GAIN);
    p.x = x;
    p.y = y;
  }

  pointerUp(id: number): void {
    this.pointers.delete(id);
  }

  key(k: 'left' | 'right' | 'up' | 'down', down: boolean): void {
    this.keys[k] = down;
    if (!down) return;
    if (this.phase === 'title' && (k === 'left' || k === 'right' || k === 'up' || k === 'down')) {
      const d = k === 'left' || k === 'up' ? -1 : 1;
      this.titleCursor = (this.titleCursor + d + TITLE_BTNS.length) % TITLE_BTNS.length;
      this.audio.play('select');
    } else if (this.phase === 'album' && (k === 'left' || k === 'right')) {
      this.page(k === 'left' ? -1 : 1);
    }
  }

  private page(d: number): void {
    const pages = Math.max(1, Math.ceil(this.album.length / ALBUM_PAGE));
    const next = Math.max(0, Math.min(pages - 1, this.albumPage + d));
    if (next !== this.albumPage) {
      this.albumPage = next;
      this.audio.play('select');
    }
  }

  // --- カメラ ------------------------------------------------------------------

  moveFrame(dx: number, dy: number): void {
    this.frameX = Math.max(0, Math.min(WIDTH - FRAME_W, this.frameX + dx));
    this.frameY = Math.max(FRAME_MIN_Y, Math.min(HEIGHT - FRAME_H, this.frameY + dy));
  }

  centerFrame(x: number, y: number): void {
    this.moveFrame(x - FRAME_W / 2 - this.frameX, y - FRAME_H / 2 - this.frameY);
  }

  get canShoot(): boolean {
    return this.phase === 'playing' && this.wind <= 0 && this.film > 0;
  }

  /** シャッターを切る。撮れたら採点結果を返す。 */
  shoot(): PhotoResult | null {
    if (this.phase !== 'playing' || this.field === null) return null;
    this.shutterDown = 0.15;
    if (!this.canShoot) {
      this.audio.play('nope');
      return null;
    }
    const snap = this.field.snapshot();
    const r = scorePhoto(snap, this.frameX, this.frameY, this.stage.theme);
    const hadTheme = this.themeOk;
    this.film--;
    this.wind = WIND_TIME;
    this.shutterFlash = 1;
    const image = this.headless ? null : renderPhotoCanvas(snap, this.frameX, this.frameY, 140, (140 * FRAME_H) / FRAME_W);
    const photo: Photo = { snap, fx: this.frameX, fy: this.frameY, r, image, no: this.photos.length };
    this.photos.push(photo);
    const poseName = r.pose ? (POSES.find((p) => p.id === r.pose)?.name ?? null) : null;
    this.popup = {
      snap,
      fx: this.frameX,
      fy: this.frameY,
      score: r.score,
      reason: r.reason,
      theme: r.theme,
      poseName,
      age: 0,
      image
    };
    // 音：60 点未満はカシャ、80 点以上はカシャ＋キラン、ポーズ発見はファンファーレ
    this.audio.play('shutter');
    if (r.pose) this.audio.play('fanfare');
    else if (r.score >= BEST_SCORE) this.audio.play('kira');
    else if (!hadTheme && this.themeOk) this.audio.play('theme');
    this.audio.play('wind', 1);
    return r;
  }

  // --- 毎フレーム ----------------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'paused') return;
    this.phaseTime += dt;
    if (this.phase !== 'playing' || this.field === null) return;

    const f = this.field;
    const prevFlash = f.flash;
    f.update(dt);
    if (f.flash > prevFlash + 0.5) this.audio.play('splat');
    this.view = f.snapshot();

    const kx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const ky = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
    if (kx !== 0 || ky !== 0) this.moveFrame(kx * KEY_SPEED * dt, ky * KEY_SPEED * dt);

    this.wind = Math.max(0, this.wind - dt);
    this.shutterFlash = Math.max(0, this.shutterFlash - dt * 5);
    this.shutterDown = Math.max(0, this.shutterDown - dt);
    if (this.popup) {
      this.popup.age += dt;
      if (this.popup.age >= POPUP_TIME) this.popup = null;
    }
    if (this.film === 0) this.filmOut += dt;
    if (f.t >= STAGE_TIME || (this.film === 0 && this.filmOut >= FILM_OUT_WAIT && this.popup === null)) this.endStage();
  }
}
