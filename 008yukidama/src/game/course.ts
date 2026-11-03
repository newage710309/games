// コースを組み立てる。遊ぶたびに配置が変わるが、区間の並びと数は面ごとに決まっている。
import { rockRadius, type GateLook, type PatchLook, type PropKind, type PropLook, type RidgeLook } from './props';
import { EAT_AT, radiusOf, type Stage } from './stages';

export type Rand = () => number;

/** コースの上のもの。 */
export interface Prop extends PropLook {
  /** 歩く中心（雪だるま兵）。 */
  x0: number;
  /** 歩くはば（雪だるま兵）。 */
  amp: number;
  /** 当たりの半径。 */
  r: number;
  /** 巻きこめる大きさ。0 はいつでも、null は巻きこめない。 */
  eatAt: number | null;
  /** 巻きこまれた。 */
  eaten: boolean;
  /** 1 度ぶつかった（同じものに続けて欠けない）。 */
  bumped: boolean;
}

export interface Patch extends PatchLook {
  /** 雪だまり：ぜんぶ通ると増える大きさ（cm）。 */
  amount: number;
  left: number;
}

export interface Lane {
  /** 近道の範囲。 */
  y1: number;
  y2: number;
  left: number;
  right: number;
}

export interface Course {
  length: number;
  props: Prop[];
  patches: Patch[];
  ridges: RidgeLook[];
  gates: GateLook[];
  lanes: Lane[];
  road: (y: number) => [number, number];
}

const STEP = 40;
/** はじめの、何も置かない長さ。 */
const START_CLEAR = 620;
/** 終わりの、とりでが見える直線の長さ。 */
const END_CLEAR = 900;
const CENTER = 240;
const RIDGE_W = 60;
/** 分かれ道のあいだの道はば。 */
const BRANCH_ROAD_W = 500;
/** 区間の長さの比。 */
const SECTION_SHARE = { open: 1, branch: 1.3, ice: 0.75 } as const;

const PROP_R: Record<Exclude<PropKind, 'rock'>, number> = { berry: 13, twig: 15, pebble: 13, soldier: 19, tree: 26 };

interface Span {
  y1: number;
  y2: number;
  w: number;
}

const smooth = (v: number): number => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

export function buildCourse(stage: Stage, rand: Rand): Course {
  const props: Prop[] = [];
  const patches: Patch[] = [];
  const ridges: RidgeLook[] = [];
  const gates: GateLook[] = [];
  const lanes: Lane[] = [];
  const spans: Span[] = [];
  const between = (a: number, b: number): number => a + rand() * (b - a);
  let seedN = 1;

  const place = (kind: PropKind, x: number, y: number): void => {
    const seed = seedN++;
    const eatAt = kind === 'berry' ? 0 : kind === 'rock' ? null : EAT_AT[kind];
    const r = kind === 'rock' ? rockRadius(seed) * 0.82 : PROP_R[kind];
    const amp = kind === 'soldier' ? between(30, 64) : 0;
    props.push({ kind, x, y, seed, x0: x, amp, r, eatAt, eaten: false, bumped: false });
  };
  const drift = (x: number, y: number, w: number, h: number, mul = 1): void => {
    patches.push({ kind: 'drift', x, y, w, h, seed: seedN++, amount: between(stage.driftCm[0], stage.driftCm[1]) * mul, left: 1 });
  };
  const berries = (x: number, y: number, n: number, dx: number): void => {
    for (let i = 0; i < n; i++) place('berry', x + i * dx, y + i * 60);
  };
  const pickKind = (allowRock: boolean): PropKind => {
    const w = stage.weights;
    const list: [PropKind, number][] = [
      ['twig', w.twig],
      ['pebble', w.pebble],
      ['soldier', w.soldier],
      ['tree', w.tree],
      ['rock', allowRock ? w.rock : 0]
    ];
    let v = rand() * list.reduce((s, [, n]) => s + n, 0);
    for (const [k, n] of list) {
      v -= n;
      if (v <= 0) return k;
    }
    return 'twig';
  };

  // --- 区間 ---
  /** 広いところ：列ごとにものを置き、ときどき雪だまりと木の実。 */
  const open = (y1: number, y2: number): void => {
    const half = stage.roadW / 2 - 34;
    let y = y1;
    let lastRock = -9999;
    let nextDrift = y1 + between(0.2, 0.8) * stage.driftGap;
    while (y < y2) {
      const k = pickKind(y - lastRock >= stage.rockGap);
      // 岩はまん中をさけて、大きくなってもどちらかを通れるようにする
      const x = k === 'rock' ? CENTER + (rand() < 0.5 ? -1 : 1) * between(half * 0.45, half) : CENTER + between(-half, half);
      place(k, x, y);
      if (k === 'rock') lastRock = y;
      // 小さいものは 2 つならぶことがある
      if (k !== 'rock' && rand() < 0.3) {
        const k2 = pickKind(false);
        const x2 = CENTER + between(-half, half);
        if (Math.abs(x2 - x) > 90) place(k2, x2, y + between(-30, 30));
      }
      if (rand() < 0.22) berries(CENTER + between(-half * 0.8, half * 0.8), y + 60, 3, between(-16, 16));
      if (y >= nextDrift) {
        const dx = between(-half * 0.7, half * 0.7);
        drift(CENTER + dx, y + 70, between(120, 170), between(110, 150));
        // 雪だまりのそばには、ときどき岩（ほしければ、よけながら）
        if (y - lastRock >= stage.rockGap * 0.6 && rand() < 0.45) {
          place('rock', CENTER + dx + (rand() < 0.5 ? -1 : 1) * between(60, 96), y - 30);
          lastRock = y;
        }
        nextDrift = y + stage.driftGap * between(0.8, 1.2);
      }
      y += between(stage.rowGap[0], stage.rowGap[1]);
    }
  };

  /** 氷の地面：すべる。岩をよけにくい。 */
  const ice = (y1: number, y2: number): void => {
    let y = y1;
    while (y < y2 - 200) {
      const h = between(420, 760);
      const w = between(230, 330);
      const cx = CENTER + between(-1, 1) * (stage.roadW / 2 - w / 2);
      patches.push({ kind: 'ice', x: cx, y: y + h / 2, w, h, seed: seedN++, amount: 0, left: 1 });
      // 氷の出口の岩（すべり終わってから、よけられるだけ離す）
      if (rand() < 0.7) place('rock', cx + between(-70, 70), y + h + between(120, 190));
      // 氷のとなりの雪だまり（遠回りすれば、すべらずに育てる）
      const side = cx < CENTER ? 1 : -1;
      const sx = Math.max(CENTER - stage.roadW / 2 + 60, Math.min(CENTER + stage.roadW / 2 - 60, cx + side * (w / 2 + 70)));
      drift(sx, y + h * 0.4, 110, 130);
      berries(cx + between(-50, 50), y + h * 0.25, 4, between(-12, 12));
      y += h + between(240, 380);
    }
  };

  /** 分かれ道：雪だまりと岩が多い広い道と、門の先の安全な近道。 */
  const branch = (y1: number, y2: number, cm: number): void => {
    const side = rand() < 0.5 ? -1 : 1;
    const gap = 2 * radiusOf(cm) + 10;
    const laneW = gap + 44;
    const roadL = CENTER - BRANCH_ROAD_W / 2;
    const roadR = CENTER + BRANCH_ROAD_W / 2;
    const gateY = y1 + 520;
    const end = y2 - 120;
    spans.push({ y1: y1 + 40, y2, w: BRANCH_ROAD_W });
    const left = side > 0 ? roadR - laneW : roadL;
    const right = left + laneW;
    const laneX = (left + right) / 2;
    const ridgeX = side > 0 ? left - RIDGE_W / 2 : right + RIDGE_W / 2;
    ridges.push({ x: ridgeX, w: RIDGE_W, y1: gateY - 50, y2: end });
    gates.push({ x: laneX, y: gateY, gap, cm, left, right, fits: true });
    lanes.push({ y1: gateY, y2: end, left, right });
    // 門の手前の日なた（わざと通って小さくする）
    const sunH = 430;
    patches.push({ kind: 'sun', x: laneX, y: gateY - 90 - sunH / 2, w: Math.max(170, laneW + 40), h: sunH, seed: seedN++, amount: 0, left: 1 });
    // 手前には広い道への案内（木の実）
    const wideX = side > 0 ? (roadL + ridgeX - RIDGE_W / 2) / 2 : (roadR + ridgeX + RIDGE_W / 2) / 2;
    berries(wideX, gateY - 260, 3, 0);

    // 近道：雪だまりは小さいものを少しだけ、あとは木の実
    for (let y = gateY + 160; y < end - 100; y += between(180, 280)) {
      if (rand() < 0.75) berries(laneX + between(-14, 14), y, 2, 0);
      else place(rand() < 0.5 ? 'twig' : 'pebble', laneX + between(-16, 16), y);
    }

    const laneDrifts = 2;
    for (let i = 1; i <= laneDrifts; i++) {
      drift(laneX, gateY + ((end - gateY) * i) / (laneDrifts + 1), laneW - 16, 130, 0.7);
    }

    // 広い道：雪だまりと、大きな岩
    const wl = side > 0 ? roadL + 24 : ridgeX + RIDGE_W / 2 + 24;
    const wr = side > 0 ? ridgeX - RIDGE_W / 2 - 24 : roadR - 24;
    let d = gateY - 60;
    while (d < end - 100) {
      drift(between(wl + 50, wr - 50), d, between(130, 170), between(120, 160), stage.wideDriftMul);
      d += stage.wideDriftGap * between(0.85, 1.15);
    }
    let r = gateY + 40;
    let rockSide = rand() < 0.5 ? -1 : 1;
    while (r < end - 80) {
      // 岩はかべ寄りに、左右かわるがわる置く（大きくなると、すり抜けるのがむずかしい）
      rockSide = -rockSide;
      const ww = (wr - wl) * between(0.05, 0.3);
      place('rock', rockSide < 0 ? wl + 14 + ww : wr - 14 - ww, r);
      if (rand() < 0.5) place(pickKind(false), between(wl, wr), r + between(90, 160));
      r += stage.wideRockGap * between(0.85, 1.25);
    }
  };

  // --- 組み立て ---
  const usable = stage.length - START_CLEAR - END_CLEAR;
  const total = stage.sections.reduce((s, k) => s + SECTION_SHARE[k], 0);
  let y = START_CLEAR;
  let gateN = 0;
  for (const k of stage.sections) {
    const len = (usable * SECTION_SHARE[k]) / total;
    if (k === 'open') open(y, y + len - 120);
    else if (k === 'ice') ice(y, y + len);
    else branch(y, y + len, stage.gates[gateN++]!);
    y += len;
  }
  // とりでの手前：だめ押しの雪だまりと木の実
  drift(CENTER - 110, stage.length - END_CLEAR + 200, 150, 130);
  drift(CENTER + 110, stage.length - END_CLEAR + 200, 150, 130);
  berries(CENTER, stage.length - END_CLEAR + 380, 4, 0);

  // --- 道の形 ---
  const N = Math.ceil((stage.length + 1600) / STEP) + 1;
  const ls = new Float32Array(N);
  const rs = new Float32Array(N);
  const phase = rand() * 10;
  for (let i = 0; i < N; i++) {
    const py = i * STEP - 600;
    // 道はばを広げる区間（ゆるやかに）と、とりでの前
    let open_ = 0;
    for (const s of spans) open_ = Math.max(open_, Math.min(smooth((py - s.y1 + 240) / 240), smooth((s.y2 + 240 - py) / 240)));
    const toFort = smooth((py - (stage.length - END_CLEAR)) / 400);
    const w = stage.roadW + (BRANCH_ROAD_W - stage.roadW) * open_;
    const wide = w + (BRANCH_ROAD_W + 20 - w) * toFort;
    const wob = Math.sin(py * 0.0031 + phase) * 16 * (1 - Math.max(open_, toFort));
    ls[i] = CENTER + wob - wide / 2;
    rs[i] = CENTER + wob + wide / 2;
  }
  const road = (py: number): [number, number] => {
    const f = Math.max(0, Math.min(N - 1.001, (py + 600) / STEP));
    const i = Math.floor(f);
    const k = f - i;
    return [ls[i]! + (ls[i + 1]! - ls[i]!) * k, rs[i]! + (rs[i + 1]! - rs[i]!) * k];
  };

  // はしからはみ出したものは道の中へ
  for (const p of props) {
    const [l, r] = road(p.y);
    const m = p.kind === 'rock' ? 26 : 22;
    p.x = Math.max(l + m, Math.min(r - m, p.x));
    p.x0 = p.x;
    if (p.amp > 0) p.amp = Math.min(p.amp, Math.max(0, p.x - l - 24), Math.max(0, r - 24 - p.x));
  }
  // 尾根にかかるものは取りのぞく
  const onRidge = (x: number, py: number): boolean => ridges.some((rd) => py > rd.y1 - 40 && py < rd.y2 + 40 && Math.abs(x - rd.x) < rd.w / 2 + 26);
  const keptProps = props.filter((p) => !onRidge(p.x, p.y)).sort((a, b) => a.y - b.y);
  const keptPatches = patches.filter((p) => p.kind === 'sun' || !onRidge(p.x, p.y));
  return { length: stage.length, props: keptProps, patches: keptPatches, ridges, gates, lanes, road };
}

/** 尾根の、y でのはんぶんのはば（先はとがっている）。 */
export function ridgeHalf(rd: RidgeLook, y: number): number {
  const d = Math.min(y - rd.y1, rd.y2 - y);
  if (d <= 0) return 0;
  return (rd.w / 2) * Math.min(1, d / 110);
}
