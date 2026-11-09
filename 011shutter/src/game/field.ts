// 撮影の場面の動き。さくらちゃん・そっくりさん・鳥・なかま・雪だるまを毎フレーム動かし、場面の情報（Snapshot）を作る。
// 描画には関わらない（ボットがブラウザなしで動かせるように）。乱数は種から作るので、同じ種なら同じ動きになる。

import type { BirdKind, Mood } from './birds';
import { WIDTH, groundY, parallax, scaleAt } from './constants';
import { POSES, TAIL_FAKE, TAIL_REAL, defaultLook, type PoseId, type SakuraLook } from './poses';
import {
  CROSS_TIMES,
  DANGO_TIME,
  DANGO_TIMES,
  FAKE_COUNT,
  FLASH_TIME,
  SCROLL_SPEED,
  STAGES,
  THROW_FLIGHT,
  THROW_TIMES,
  THROW_WINDUP,
  type Stage
} from './stages';
import { bigTreeBranches, visibleProps, type Actor, type Snapshot } from './world';

/** 種つきの乱数（mulberry32）。 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Mode = 'idle' | 'move' | 'hide' | 'omen' | 'pose' | 'fly' | 'dango';

/** z の 1 あたりの、画面上の縦の長さ（動く速さの換算用）。 */
const Z_SPAN = 300;
const X_MIN = 46;
const X_MAX = WIDTH - 46;
const Z_MIN = 0.06;
const Z_MAX = 0.88;

/** さくらちゃん（とそっくりさん）。 */
export class Walker {
  x: number;
  z: number;
  lift = 0;
  look: SakuraLook;
  mode: Mode = 'idle';
  modeT = 0;
  modeDur = 1.5;
  tx = 0;
  tz = 0;
  speed = 60;
  hop = 0;
  /** 移動の向き（見た目の左右）。 */
  dir = 1;
  /** 正面を向いているときの目線の切りかえ。 */
  gazeT = 0;
  pose: PoseId | null = null;
  /** つぎのポーズまで（秒）。 */
  poseIn: number;
  /** 最近したポーズ（同じものを続けない）。 */
  recent: PoseId[] = [];
  /** 飛ぶときの高さ。 */
  flyH = 0;
  fromX = 0;
  fromZ = 0;
  dango = false;
  /** 画面上の速さ。 */
  v = 0;
  private px = 0;
  private py = 0;

  constructor(
    readonly fake: boolean,
    x: number,
    z: number,
    private readonly rng: () => number,
    private readonly stage: Stage
  ) {
    this.x = x;
    this.z = z;
    this.look = defaultLook();
    this.look.bird = fake ? 'fake' : 'sakura';
    this.look.tail = fake ? TAIL_FAKE : TAIL_REAL;
    this.poseIn = 2.5 + rng() * 3;
    this.px = x;
    this.py = this.screenY();
  }

  get s(): number {
    return scaleAt(this.z);
  }

  screenY(): number {
    return groundY(this.z) - this.lift * this.s - 15.5 * this.s;
  }

  private rand(a: number, b: number): number {
    return a + (b - a) * this.rng();
  }

  private set(mode: Mode, dur: number): void {
    this.mode = mode;
    this.modeT = 0;
    this.modeDur = dur;
  }

  /** つぎにすることを決める。 */
  private next(canFly: boolean, props: { x: number; z: number; type: string }[]): void {
    this.pose = null;
    this.look.pose = null;
    const r = this.rng();
    // 画面のはしに寄りすぎたら、まん中へもどる
    if (this.x < 90 || this.x > WIDTH - 90) {
      this.goTo(this.rand(170, 330), this.rand(0.2, 0.75), this.rng() < 0.5);
      return;
    }
    if (!this.fake && this.poseIn <= 0) {
      this.startPose();
      return;
    }
    if (canFly && r < 0.3) {
      this.startFly();
      return;
    }
    if (r < this.stage.hide) {
      // 木の陰・しげみ・雪山のうしろへ
      const hides = props.filter((p) => p.type !== 'pine' && p.x > 70 && p.x < WIDTH - 70 && p.z > 0.15);
      if (hides.length > 0) {
        const h = hides[Math.floor(this.rng() * hides.length)]!;
        this.goTo(h.x + this.rand(-6, 6), Math.max(Z_MIN, h.z - 0.07), false);
        this.mode = 'hide';
        return;
      }
    }
    if (r < Math.max(0.78, this.stage.hide + 0.18)) {
      this.goTo(this.x + this.rand(-170, 190), this.z + this.rand(-0.35, 0.35), this.rng() < 0.5);
      return;
    }
    this.set('idle', this.rand(1.0, 2.2) * this.stage.calm);
  }

  private goTo(x: number, z: number, run: boolean): void {
    this.tx = Math.max(X_MIN + 30, Math.min(X_MAX - 30, x));
    this.tz = Math.max(Z_MIN, Math.min(Z_MAX, z));
    this.speed = (run ? 125 : 62) * this.stage.speed;
    this.set('move', 99);
  }

  private startPose(): void {
    const list = this.stage.poses.filter((p) => !this.recent.includes(p));
    const pick = list[Math.floor(this.rng() * list.length)] ?? this.stage.poses[0]!;
    this.pose = pick;
    this.recent.push(pick);
    if (this.recent.length > 3) this.recent.shift();
    this.poseIn = this.rand(this.stage.poseGap[0], this.stage.poseGap[1]);
    this.set('omen', 1.4);
  }

  private startFly(): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.tx = Math.max(X_MIN + 40, Math.min(X_MAX - 40, this.x + this.rand(-200, 220)));
    this.tz = Math.max(Z_MIN, Math.min(Z_MAX, this.z + this.rand(-0.3, 0.3)));
    this.flyH = this.rand(28, 52);
    this.set('fly', this.rand(1.5, 2.2));
  }

  /** だんごのために、その場で止まる（3 めん）。 */
  joinDango(): void {
    this.pose = null;
    this.look.pose = null;
    this.dango = true;
    this.set('dango', 99);
  }

  leaveDango(): void {
    this.dango = false;
    this.set('idle', 0.6);
  }

  update(dt: number, t: number, canFly: boolean, props: { x: number; z: number; type: string }[]): void {
    this.modeT += dt;
    this.poseIn -= dt;
    const L = this.look;
    // 場面が流れるので、地面にいるものは画面の左へ流れる
    this.x -= SCROLL_SPEED * parallax(this.z) * dt;
    L.flap = 0;
    L.spread = 0;
    L.squash = 0;
    this.lift = 0;

    switch (this.mode) {
      case 'idle':
      case 'dango': {
        L.pose = null;
        this.gazeT -= dt;
        if (this.gazeT <= 0) {
          this.gazeT = this.rand(0.7, 1.6);
          const r = this.rng();
          if (this.mode === 'dango') {
            L.view = 'front';
            L.gaze = r < 0.5 ? 0 : r < 0.75 ? -0.6 : 0.6;
          } else if (r < this.stage.facing) {
            L.view = 'front';
            L.gaze = r < this.stage.facing * 0.65 ? 0 : r < this.stage.facing * 0.82 ? 0.3 : -0.3;
          } else if (r < this.stage.facing + 0.2) {
            L.view = 'front';
            L.gaze = r < this.stage.facing + 0.1 ? -1 : 1;
          } else {
            L.view = this.rng() < 0.5 ? 'left' : 'right';
          }
        }
        L.squash = this.mode === 'dango' ? 0.1 : 0.02 * Math.sin(t * 3);
        if (this.mode === 'idle' && this.stage.fidget > 0) this.lift = Math.abs(Math.sin(t * 7)) * this.stage.fidget;
        if (this.mode === 'idle' && this.modeT >= this.modeDur) this.next(canFly, props);
        break;
      }
      case 'move':
      case 'hide': {
        const dx = this.tx - this.x;
        const dzPx = (this.tz - this.z) * Z_SPAN;
        const d = Math.hypot(dx, dzPx);
        const k = 0.55 + 0.22 * this.s;
        const step = this.speed * k * dt;
        if (d <= step + 1) {
          this.x = this.tx;
          this.z = this.tz;
          if (this.mode === 'hide') this.set('idle', this.rand(1.8, 3) * this.stage.calm);
          else this.set('idle', this.rand(0.8, 2) * this.stage.calm);
          break;
        }
        this.x += (dx / d) * step;
        this.z += (dzPx / d) * (step / Z_SPAN);
        this.hop += dt * (this.speed > 90 ? 15 : 11);
        this.lift = Math.abs(Math.sin(this.hop)) * (this.speed > 90 ? 6 : 3.5);
        if (Math.abs(dx) > Math.abs(dzPx) * 0.8) {
          this.dir = dx > 0 ? 1 : -1;
          L.view = dx > 0 ? 'right' : 'left';
        } else {
          L.view = dzPx < 0 ? 'back' : 'front';
          L.gaze = dx > 0 ? 0.4 : -0.4;
        }
        if (Math.abs(Math.sin(this.hop)) < 0.2) L.squash = 0.08;
        // 長く歩きすぎたら、いったん止まる
        if (this.modeT > 6) this.set('idle', 1);
        break;
      }
      case 'fly': {
        const p = Math.min(1, this.modeT / this.modeDur);
        const e = p * p * (3 - 2 * p);
        // 場面の流れとは別に、もとの場所から目標へ（流れたぶんは足している）
        const drift = SCROLL_SPEED * parallax(this.z) * dt;
        this.fromX -= drift;
        this.tx -= drift;
        this.x = this.fromX + (this.tx - this.fromX) * e;
        this.z = this.fromZ + (this.tz - this.fromZ) * e;
        this.lift = Math.sin(p * Math.PI) * this.flyH;
        L.view = this.tx >= this.fromX ? 'right' : 'left';
        L.flap = 0.5 + 0.5 * Math.sin(t * 17);
        if (p < 0.12 || p > 0.88) L.flap = Math.max(L.flap, 0.85);
        if (p >= 1) this.set('idle', this.rand(1, 2));
        break;
      }
      case 'omen':
      case 'pose': {
        L.pose = this.pose;
        L.posePhase = this.mode;
        L.poseT = Math.min(1, this.modeT / this.modeDur);
        L.view = 'front';
        L.gaze = 0;
        if (this.modeT >= this.modeDur) {
          if (this.mode === 'omen') this.set('pose', this.stage.poseTime);
          else {
            L.pose = null;
            this.pose = null;
            this.set('idle', this.rand(0.8, 1.6));
          }
        }
        break;
      }
    }
    if (this.mode !== 'omen' && this.mode !== 'pose') L.pose = null;
    L.bird = this.fake ? 'fake' : 'sakura';
    // 画面上の速さ（体のまん中）
    const sy = this.screenY();
    this.v = Math.hypot(this.x - this.px, sy - this.py) / Math.max(dt, 1e-3);
    this.px = this.x;
    this.py = sy;
  }

  actor(): Actor {
    return {
      kind: this.fake ? 'fake' : 'sakura',
      x: this.x,
      z: this.z,
      v: this.v,
      dango: this.dango || undefined,
      // 跳ねている高さは見た目に入れる（影は地面に落とす）
      look: { ...this.look, lift: this.lift }
    };
  }
}

/** ほかの鳥（2 めんの地面を歩く鳥、3 めんのなかま）。 */
interface Bird {
  kind: BirdKind;
  x: number;
  z: number;
  lift: number;
  flap: number;
  mood: Mood;
  puff: number;
  tx: number;
  wait: number;
}

/** 3 めんのだんご。 */
interface DangoEvent {
  start: number;
  /** なかまの、さくらちゃんからの横の位置（体の幅の何倍か）。 */
  slots: number[];
}

export class Field {
  t = 0;
  camX = 0;
  readonly rng: () => number;
  readonly stage: Stage;
  sakura: Walker;
  fakes: Walker[] = [];
  birds: Bird[] = [];
  friends: Bird[] = [];
  /** こっそりついてくる小さな雪だるま。 */
  tiny = { x: 0, z: 0.1, side: 1, flipIn: 8, hop: 0 };
  flash = 0;
  private dangoNow: DangoEvent | null = null;
  /** 雪玉を投げる雪だるまの位置（画面のはし、奥）。 */
  private throwerX = 60;

  constructor(
    readonly stageNo: number,
    seed: number
  ) {
    this.rng = makeRng(seed);
    this.stage = STAGES[stageNo - 1]!;
    this.sakura = new Walker(false, 200 + this.rng() * 60, 0.45 + this.rng() * 0.15, this.rng, this.stage);
    // そっくりさん（2 めんから）。画面じゅうに散らばって出る
    const nf = FAKE_COUNT[stageNo - 1] ?? 0;
    for (let k = 0; k < nf; k++) {
      const x = 70 + ((k + 0.5) / nf) * 340 + (this.rng() - 0.5) * 50;
      this.fakes.push(new Walker(true, x, 0.15 + this.rng() * 0.6, this.rng, this.stage));
    }
    if (stageNo === 2) {
      const kinds: BirdKind[] = ['yamagara', 'gojukara'];
      for (const kind of kinds) {
        this.birds.push({ kind, x: 100 + this.rng() * 280, z: 0.5 + this.rng() * 0.35, lift: 0, flap: 0, mood: 'normal', puff: 0, tx: 0, wait: 1 });
      }
    }
    this.tiny.x = this.sakura.x - 60;
    this.tiny.z = Math.max(0.03, this.sakura.z - 0.22);
  }

  private dangoUpdate(dt: number): void {
    if (this.stageNo !== 3) return;
    const sak = this.sakura;
    const start = DANGO_TIMES.find((s) => this.t >= s && this.t < s + DANGO_TIME);
    if (start !== undefined && this.dangoNow === null && sak.mode !== 'omen' && sak.mode !== 'pose' && sak.mode !== 'fly') {
      // 画面のまん中寄りでないと、なかまが来にくいので寄せておく
      this.dangoNow = { start: this.t, slots: this.rng() < 0.5 ? [-1, 1, 2] : [-2, -1, 1] };
      sak.joinDango();
      this.friends = this.dangoNow.slots.map((k) => ({
        kind: 'enaga' as BirdKind,
        x: k < 0 ? -40 : WIDTH + 40,
        z: sak.z,
        lift: 60,
        flap: 1,
        mood: 'normal' as Mood,
        puff: 0,
        tx: k,
        wait: 0
      }));
    }
    const ev = this.dangoNow;
    if (ev === null) {
      this.friends = [];
      return;
    }
    const e = this.t - ev.start;
    const s = sak.s;
    const spacing = 19 * s;
    const leaving = e > DANGO_TIME - 1.1;
    for (const f of this.friends) {
      f.z = sak.z + 0.001;
      const gx = sak.x + f.tx * spacing * 0.92;
      if (!leaving) {
        // 飛んできて、となりにとまる（とまったあとは、さくらちゃんといっしょに流れる）
        const k = Math.min(1, dt * 4);
        f.x += (gx - f.x) * k;
        if (Math.abs(gx - f.x) < 10) f.wait = 1;
        if (f.wait > 0) f.x = gx;
        const arrive = f.wait > 0;
        f.lift = arrive ? Math.max(0, f.lift - dt * 120) : Math.max(f.lift, 18);
        f.flap = f.lift > 0 ? 0.5 + 0.5 * Math.sin(this.t * 18 + f.tx) : 0;
        f.puff = f.lift === 0 ? Math.min(0.2, f.puff + dt * 0.5) : 0;
        f.mood = f.lift === 0 ? 'happy' : 'normal';
      } else {
        f.x += (f.tx < 0 ? -1 : 1) * 260 * dt;
        f.lift += dt * 90;
        f.flap = 0.5 + 0.5 * Math.sin(this.t * 18 + f.tx);
        f.puff = 0;
        f.mood = 'normal';
      }
    }
    if (e >= DANGO_TIME) {
      sak.leaveDango();
      this.dangoNow = null;
      this.friends = [];
    }
  }

  /** なかまがとまって、だんごになっているか。 */
  get dangoReady(): boolean {
    return this.dangoNow !== null && this.friends.filter((f) => f.lift === 0).length >= 2;
  }

  private birdsUpdate(dt: number): void {
    for (const b of this.birds) {
      b.x -= SCROLL_SPEED * parallax(b.z) * dt;
      b.wait -= dt;
      if (b.wait <= 0 && b.tx === 0) {
        b.tx = Math.max(60, Math.min(WIDTH - 60, 120 + this.rng() * 260));
      }
      if (b.tx !== 0) {
        const d = b.tx - b.x;
        const st = 50 * dt;
        if (Math.abs(d) <= st) {
          b.tx = 0;
          b.wait = 1.5 + this.rng() * 3;
          b.lift = 0;
        } else {
          b.x += Math.sign(d) * st;
          b.lift = Math.abs(Math.sin(this.t * 12)) * 4;
        }
      }
    }
  }

  private tinyUpdate(dt: number): void {
    const sak = this.sakura;
    const tn = this.tiny;
    tn.flipIn -= dt;
    if (tn.flipIn <= 0) {
      tn.side = -tn.side;
      tn.flipIn = 7 + this.rng() * 5;
    }
    // 画面のはしでは内側へ
    let side = tn.side;
    if (sak.x < 120) side = 1;
    if (sak.x > WIDTH - 120) side = -1;
    const gx = sak.x + side * (24 + 15 * sak.s);
    const gz = Math.max(0.03, sak.z - 0.22);
    const k = Math.min(1, dt * 1.6);
    const ox = tn.x;
    tn.x += (gx - tn.x) * k;
    tn.z += (gz - tn.z) * k;
    tn.hop += Math.abs(tn.x - ox) * 0.05;
  }

  update(dt: number): void {
    this.t += dt;
    this.camX += SCROLL_SPEED * dt;
    const props = visibleProps(this.stageNo, this.camX);
    const canFly = this.stageNo === 2;
    this.dangoUpdate(dt);
    this.sakura.update(dt, this.t, canFly, props);
    for (const f of this.fakes) f.update(dt, this.t, canFly, props);
    this.birdsUpdate(dt);
    this.tinyUpdate(dt);
    // 雪玉が当たって画面が白くなる
    if (this.stageNo === 3) {
      const hitAt = THROW_TIMES.find((s) => this.t >= s && this.t - dt < s);
      if (hitAt !== undefined) this.flash = 1;
    }
    this.flash = Math.max(0, this.flash - dt / FLASH_TIME);
  }

  /** いま投げようとしている雪玉（構えている、飛んでいる）。 */
  private throwState(): { at: number; e: number } | null {
    for (const at of THROW_TIMES) {
      const e = this.t - (at - THROW_WINDUP - THROW_FLIGHT);
      if (e >= 0 && this.t < at) return { at, e };
    }
    return null;
  }

  /** この瞬間の場面。 */
  snapshot(): Snapshot {
    const actors: Actor[] = [];
    const balls: { x: number; y: number; r: number }[] = [];
    const tn = this.tiny;
    actors.push({ kind: 'tiny', x: tn.x, z: tn.z, face: tn.x < this.sakura.x ? 1 : -1, hop: tn.hop });
    for (const f of this.fakes) actors.push(f.actor());
    actors.push(this.sakura.actor());
    for (const b of this.birds) actors.push({ kind: b.kind, x: b.x, z: b.z, lift: b.lift, flap: b.flap, mood: b.mood });
    for (const f of this.friends) actors.push({ kind: f.kind, x: f.x, z: f.z, lift: f.lift, flap: f.flap, mood: f.mood, puff: f.puff });

    if (this.stageNo === 2) {
      // 大きな木の枝にとまっている鳥（場面の小物から決まる）
      const kinds: BirdKind[] = ['yamagara', 'gojukara', 'akagera', 'karasu', 'yamagara'];
      for (const p of visibleProps(2, this.camX)) {
        if (p.type !== 'bigtree') continue;
        const brs = bigTreeBranches(p.x, p.z);
        for (const [i, br] of brs.entries()) {
          const kind = kinds[(p.seed + i) % kinds.length]!;
          const u = 0.35 + ((p.seed * 7 + i * 3) % 5) * 0.1;
          const flap = Math.sin(this.t * 0.9 + p.seed + i) > 0.93 ? 0.5 + 0.5 * Math.sin(this.t * 18) : 0;
          actors.push({ kind, x: br.x0 + (br.x1 - br.x0) * u, z: p.z, y: br.y - 2, s: scaleAt(p.z) * 0.62, flap });
        }
      }
    }
    if (this.stageNo === 3) {
      for (const start of CROSS_TIMES) {
        const e = this.t - start;
        if (e < 0 || e > 6) continue;
        const dir = Math.floor(start) % 2 === 0 ? 1 : -1;
        const x = dir > 0 ? -90 + e * 120 : WIDTH + 90 - e * 120;
        actors.push({ kind: 'snowman', x, z: 1.14, hop: e * 1.6, face: dir, arm: 2 });
      }
      const th = this.throwState();
      if (th !== null) {
        const side = Math.floor(th.at) % 2 === 0 ? 1 : -1;
        this.throwerX = side > 0 ? WIDTH - 50 : 50;
        const windup = Math.min(1, th.e / THROW_WINDUP);
        actors.push({ kind: 'snowman', x: this.throwerX, z: 0.22, arm: windup * 7, face: -side });
        if (th.e >= THROW_WINDUP) {
          const p = (th.e - THROW_WINDUP) / THROW_FLIGHT;
          const sx = this.throwerX - side * 10;
          const sy = groundY(0.22) - 40;
          const ex = WIDTH / 2 + (side > 0 ? -60 : 60);
          const ey = 360;
          balls.push({ x: sx + (ex - sx) * p, y: sy + (ey - sy) * p - Math.sin(p * Math.PI) * 60, r: 5 + p * p * 90 });
        }
      }
    }
    return { stage: this.stageNo, camX: this.camX, t: this.t, actors, flash: this.flash, balls };
  }
}

/** ポーズの名前。 */
export const poseName = (id: PoseId): string => POSES.find((p) => p.id === id)?.name ?? '';
