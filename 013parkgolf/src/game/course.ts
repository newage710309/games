// コース（ホール）のデータの形と、ある地点がどんな地面かを調べる関数。
// 描画（field.ts）と転がり（physics.ts）の両方がここを使うので、絵と当たりが必ず一致する。

/** 地面の種類。ob はコースの外（白いくいの外）。 */
export type Surface = 'fairway' | 'rough' | 'water' | 'ob' | 'leaves' | 'snow' | 'ice' | 'bridge';

/**
 * 形。
 * poly = 閉じた多角形（smooth なら角を丸めた曲線にする）、circle = 円、
 * band = 太さ w の線（川・小川・まがった芝の道）。点は [x0, y0, x1, y1, ...]。
 */
export type Shape =
  | { k: 'poly'; pts: readonly number[]; smooth?: boolean }
  | { k: 'circle'; x: number; y: number; r: number }
  | { k: 'band'; pts: readonly number[]; w: number };

export interface Area {
  surf: Surface;
  shape: Shape;
  /** 池・川・小川の見た目の区別（当たりは同じ水）。 */
  look?: 'pond' | 'river' | 'stream';
}

/** 傾斜。dir は下る向き（ラジアン）、g はボールを引っぱる強さ（px/秒²）。 */
export interface Slope {
  shape: Shape;
  dir: number;
  g: number;
}

/** 木・岩・切り株など、ボールがはね返るもの（円）。 */
export interface Obstacle {
  k: 'tree' | 'rock' | 'stump';
  x: number;
  y: number;
  r: number;
  /** 木の色の種類（面ごとに決まる）。 */
  v?: number;
}

/** 木の根。ボールが線を横切ると、向きが turn（ラジアン）だけ曲がり、少し遅くなる。 */
export interface Root {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  turn: number;
}

/** 決まった道を往復する雪だるま。period 秒で 1 往復。 */
export interface SnowmanPath {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  period: number;
  phase: number;
}

/**
 * かまくらのトンネル。入口のかまくら (ix, iy) の、face の向きにあいた穴に入ると、
 * 出口のかまくら (ox, oy) の穴から dir の向きへ出てくる。かまくらの穴以外の所に当たると、はね返る。
 */
export interface Tunnel {
  ix: number;
  iy: number;
  face: number;
  ox: number;
  oy: number;
  dir: number;
}

export interface Hole {
  /** ホールの名前（画面に出す）。 */
  name: string;
  par: number;
  /** ホールの縦の長さ（横は画面と同じ 480）。 */
  h: number;
  tee: { x: number; y: number };
  cup: { x: number; y: number };
  /** ティーでの、最初の打つ向き。 */
  teeAim: number;
  /** 地面。あとに書いたものほど上（先に当たる）。最初の 1 つがコースの外わく（ふつうはラフ）。 */
  areas: Area[];
  slopes: Slope[];
  obstacles: Obstacle[];
  roots: Root[];
  snowmen: SnowmanPath[];
  tunnels: Tunnel[];
  /** 芝（フェアウェイ）の転がりにくさの倍率（冬の圧雪は芝より転がりにくい）。 */
  fairwayDrag?: number;
  /** 1 めんのキツネのヒント（打つ前のボールがこの円の中にあるときに出す）。 */
  hints: { x: number; y: number; r: number; text: string }[];
}

// --- 形の下ごしらえ ----------------------------------------------------------

/** smooth な多角形を、こまかい折れ線に直したもの（描画と当たりで同じものを使う）。 */
const polyCache = new WeakMap<object, Float64Array>();

/** 角の丸い閉じた曲線：各辺のまん中を通り、頂点を制御点にした 2 次曲線でつなぐ。 */
export function polyPoints(shape: { pts: readonly number[]; smooth?: boolean }): Float64Array {
  const hit = polyCache.get(shape);
  if (hit) return hit;
  const p = shape.pts;
  const n = p.length / 2;
  let out: number[];
  if (!shape.smooth) out = [...p];
  else {
    out = [];
    const STEPS = 8;
    for (let i = 0; i < n; i++) {
      const ax = (p[i * 2]! + p[((i + n - 1) % n) * 2]!) / 2;
      const ay = (p[i * 2 + 1]! + p[((i + n - 1) % n) * 2 + 1]!) / 2;
      const cx = p[i * 2]!;
      const cy = p[i * 2 + 1]!;
      const bx = (p[i * 2]! + p[((i + 1) % n) * 2]!) / 2;
      const by = (p[i * 2 + 1]! + p[((i + 1) % n) * 2 + 1]!) / 2;
      for (let k = 0; k < STEPS; k++) {
        const t = k / STEPS;
        const u = 1 - t;
        out.push(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by);
      }
    }
  }
  const arr = Float64Array.from(out);
  polyCache.set(shape, arr);
  return arr;
}

function insidePoly(pts: Float64Array, x: number, y: number): boolean {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2]!;
    const yi = pts[i * 2 + 1]!;
    const xj = pts[j * 2]!;
    const yj = pts[j * 2 + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 点 (x, y) と線分の距離の 2 乗。 */
export function segDist2(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((x - x1) * dx + (y - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + dx * t - x;
  const py = y1 + dy * t - y;
  return px * px + py * py;
}

export function inShape(s: Shape, x: number, y: number): boolean {
  if (s.k === 'circle') return (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r;
  if (s.k === 'poly') return insidePoly(polyPoints(s), x, y);
  const h2 = (s.w / 2) ** 2;
  for (let i = 0; i + 3 < s.pts.length; i += 2) {
    if (segDist2(x, y, s.pts[i]!, s.pts[i + 1]!, s.pts[i + 2]!, s.pts[i + 3]!) <= h2) return true;
  }
  return false;
}

/** 形のパスを ctx に作る（beginPath から）。 */
export function shapePath(ctx: CanvasRenderingContext2D, s: Shape): void {
  ctx.beginPath();
  if (s.k === 'circle') {
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    return;
  }
  if (s.k === 'poly') {
    const p = polyPoints(s);
    ctx.moveTo(p[0]!, p[1]!);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
    ctx.closePath();
    return;
  }
  // band：線のまわりを丸い端で囲んだ形を、塗れるように円と四角の組み合わせで作る
  const p = s.pts;
  const r = s.w / 2;
  for (let i = 0; i + 1 < p.length; i += 2) {
    ctx.moveTo(p[i]! + r, p[i + 1]!);
    ctx.arc(p[i]!, p[i + 1]!, r, 0, Math.PI * 2);
  }
  for (let i = 0; i + 3 < p.length; i += 2) {
    const x1 = p[i]!;
    const y1 = p[i + 1]!;
    const x2 = p[i + 2]!;
    const y2 = p[i + 3]!;
    const l = Math.hypot(x2 - x1, y2 - y1) || 1;
    // 円（arc）と同じ回り方（画面で時計回り）にそろえる。逆回りがまざると、重なった所が抜けてしまう
    const nx = ((y2 - y1) / l) * r;
    const ny = (-(x2 - x1) / l) * r;
    ctx.moveTo(x1 + nx, y1 + ny);
    ctx.lineTo(x2 + nx, y2 + ny);
    ctx.lineTo(x2 - nx, y2 - ny);
    ctx.lineTo(x1 - nx, y1 - ny);
    ctx.closePath();
  }
}

// --- 地面を調べる ----------------------------------------------------------------

/** (x, y) の地面。上に重なったものから順に調べ、どれにも入らなければコースの外。 */
export function surfaceAt(hole: Hole, x: number, y: number): Surface {
  if (x < 0 || x > 480 || y < 0 || y > hole.h) return 'ob';
  for (let i = hole.areas.length - 1; i >= 0; i--) {
    const a = hole.areas[i]!;
    if (inShape(a.shape, x, y)) return a.surf;
  }
  return 'ob';
}

/** (x, y) の傾斜の引っぱり（px/秒²）。重なっていれば足し合わせる。 */
export function slopeAt(hole: Hole, x: number, y: number): { ax: number; ay: number } {
  let ax = 0;
  let ay = 0;
  for (const s of hole.slopes) {
    if (!inShape(s.shape, x, y)) continue;
    ax += Math.cos(s.dir) * s.g;
    ay += Math.sin(s.dir) * s.g;
  }
  return { ax, ay };
}

/** 雪だるまの、時刻 t での位置。往復は、はしでゆっくりになる（見て読みやすいように）。 */
export function snowmanPos(p: SnowmanPath, t: number): { x: number; y: number; dir: number } {
  const ph = ((t / p.period + p.phase) % 1 + 1) % 1;
  const u = 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
  return { x: p.x1 + (p.x2 - p.x1) * u, y: p.y1 + (p.y2 - p.y1) * u, dir: ph < 0.5 ? 1 : -1 };
}

/** 雪だるまの当たりの半径。 */
export const SNOWMAN_R = 13;
/** かまくらの入口の当たりの半径（入口の穴）と、ドームの半径。 */
export const TUNNEL_IN_R = 11;
export const KAMAKURA_R = 26;
