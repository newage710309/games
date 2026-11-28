// クラブを持ったさくらちゃん（打つ人）と、木のクラブ・ボール・カップと旗・ティーを描く。
// コースは真上から見た絵だが、人物は立ったすがたで描く（ボールの横に立ち、ボールのほうへ目を向ける）。
// クラブは体より長い木のクラブで、つかむ所を頭の高さに持ち上げ、全身で振る。

import { BALL_R, CUP_R, GOLFER_SCALE } from './constants';
import { SAKURA, drawSakura, drawSakuraFlower, type SakuraEyes } from './sakura';

const WOOD = {
  shaft: '#c99258',
  shaftLight: '#e2b47c',
  head: '#b97b43',
  headLight: '#dca46a',
  headDark: '#8a5428',
  face: '#6e4220',
  grip: '#b8485e',
  gripDark: '#7a2a3c',
  line: '#4a2c18'
} as const;

/**
 * 打つ人のポーズ。
 * address = かまえ、back = 引っぱっている（バックスイング）、swing = 打った直後、
 * spin = 思いきり打って勢いあまってくるっと回る、happy = 喜ぶ、sad = がっかり、
 * wait = ボールを見送る（転がっている間）。
 */
export type GolferPose = 'address' | 'back' | 'swing' | 'spin' | 'happy' | 'sad' | 'wait';

export interface GolferState {
  pose: GolferPose;
  /** 打つ向き（ラジアン、0 = 右、-π/2 = 上）。 */
  aim: number;
  /** バックスイングの量 0..1（back のとき）。 */
  swing?: number;
  /** ポーズの経過時間（秒）。 */
  t?: number;
  scale?: number;
}

/** 打つ人が立つ位置（ボールから見た位置）。打つ向きの左手に立つ。 */
export function golferSpot(bx: number, by: number, aim: number, scale = GOLFER_SCALE): { x: number; y: number } {
  const ax = Math.cos(aim);
  const ay = Math.sin(aim);
  // 打つ向きを左へ 90° 回した向き
  return { x: bx + ay * 34 * scale, y: by - ax * 34 * scale - 4 * scale };
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * 木のクラブ。つかむ所 (gx, gy) から、地面のヘッド (hx, hy) へ。柄はつかむ所より ext だけ上へのびる。
 * aim はヘッドの打つ面の向き。lift はヘッドが地面から浮いている高さ（影だけ地面に残す）。
 */
export function drawClub(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  hx: number,
  hy: number,
  aim: number,
  scale = 1,
  lift = 0,
  ext = 12
): void {
  const s = scale;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 影（地面のヘッドの下）
  ctx.fillStyle = 'rgba(30,50,30,0.22)';
  ctx.beginPath();
  ctx.ellipse(hx, hy + 2 * s, 9 * s, 4 * s, aim + Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();
  const hy2 = hy - lift;
  // ヘッドの付け根（ヒール側）
  const px = Math.cos(aim + Math.PI / 2);
  const py = Math.sin(aim + Math.PI / 2);
  const nx = hx - px * 4 * s;
  const ny = hy2 - py * 4 * s;
  const dx = nx - gx;
  const dy = ny - gy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // 柄の上はし（つかむ所より上へのびる）
  const tx = gx - ux * ext * s;
  const ty = gy - uy * ext * s;
  // シャフト
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 4.4 * s;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(nx, ny);
  ctx.stroke();
  ctx.strokeStyle = WOOD.shaft;
  ctx.lineWidth = 2.8 * s;
  ctx.stroke();
  ctx.strokeStyle = WOOD.shaftLight;
  ctx.lineWidth = 0.9 * s;
  ctx.beginPath();
  ctx.moveTo(lerp(gx, nx, 0.1) - 0.6 * s, lerp(gy, ny, 0.1) - 0.6 * s);
  ctx.lineTo(lerp(gx, nx, 0.85) - 0.6 * s, lerp(gy, ny, 0.85) - 0.6 * s);
  ctx.stroke();
  // グリップ（上はしからつかむ所まで巻いた布）
  ctx.strokeStyle = WOOD.gripDark;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(gx + ux * 3 * s, gy + uy * 3 * s);
  ctx.stroke();
  ctx.strokeStyle = WOOD.grip;
  ctx.lineWidth = 3.4 * s;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 0.7 * s;
  ctx.beginPath();
  for (let c = 1.5 * s; c < (ext + 2) * s; c += 3 * s) {
    const bx = tx + ux * c;
    const by = ty + uy * c;
    ctx.moveTo(bx - uy * 1.6 * s, by + ux * 1.6 * s);
    ctx.lineTo(bx + ux * 1.6 * s + uy * 1.6 * s, by + uy * 1.6 * s - ux * 1.6 * s);
  }
  ctx.stroke();
  // ヘッド（打つ面が前を向いた、木の角ばった頭）
  ctx.save();
  ctx.translate(hx, hy2);
  ctx.rotate(aim);
  const g = ctx.createLinearGradient(-5 * s, 0, 5 * s, 0);
  g.addColorStop(0, WOOD.headDark);
  g.addColorStop(0.5, WOOD.headLight);
  g.addColorStop(1, WOOD.head);
  ctx.fillStyle = g;
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.roundRect(-5 * s, -9 * s, 10 * s, 18 * s, 3.2 * s);
  ctx.fill();
  ctx.stroke();
  // 打つ面
  ctx.fillStyle = WOOD.face;
  ctx.beginPath();
  ctx.roundRect(3 * s, -8 * s, 2 * s, 16 * s, 1 * s);
  ctx.fill();
  // 木目
  ctx.strokeStyle = 'rgba(90,50,20,0.35)';
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(-2 * s, -7 * s);
  ctx.quadraticCurveTo(-3 * s, 0, -2 * s, 7 * s);
  ctx.moveTo(0.8 * s, -6 * s);
  ctx.quadraticCurveTo(0, 0, 0.8 * s, 6 * s);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** 体のわきから、クラブをつかむ所までのばした翼。 */
function holdingWing(ctx: CanvasRenderingContext2D, x0: number, y0: number, gx: number, gy: number, s: number): void {
  const dx = gx - x0;
  const dy = gy - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  ctx.save();
  ctx.fillStyle = SAKURA.wing;
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 0.9 * s;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + nx * 2.4 * s, y0 + ny * 2.4 * s);
  ctx.quadraticCurveTo(x0 + dx * 0.5 + nx * 2.6 * s, y0 + dy * 0.5 + ny * 2.6 * s, gx + nx * 1.5 * s, gy + ny * 1.5 * s);
  ctx.lineTo(gx - nx * 1.5 * s, gy - ny * 1.5 * s);
  ctx.quadraticCurveTo(x0 + dx * 0.5 - nx * 1.6 * s, y0 + dy * 0.5 - ny * 1.6 * s, x0 - nx * 2.4 * s, y0 - ny * 2.4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  wingTips(ctx, gx, gy, s);
}

/** つかんでいる翼の先（クラブの上にかぶせて、持っているように見せる）。 */
function wingTips(ctx: CanvasRenderingContext2D, gx: number, gy: number, s: number): void {
  ctx.save();
  ctx.fillStyle = SAKURA.wing;
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 0.9 * s;
  ctx.beginPath();
  ctx.ellipse(gx, gy, 3 * s, 2.2 * s, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = SAKURA.wingFeather;
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  ctx.moveTo(gx - 1.6 * s, gy - 0.4 * s);
  ctx.lineTo(gx + 1.6 * s, gy + 0.6 * s);
  ctx.stroke();
  ctx.restore();
}

/** 打つ人（さくらちゃん＋クラブ）を、ボール (bx, by) のそばに描く。 */
export function drawGolfer(ctx: CanvasRenderingContext2D, bx: number, by: number, st: GolferState): void {
  const s = st.scale ?? GOLFER_SCALE;
  const t = st.t ?? 0;
  const aim = st.aim;
  const ax = Math.cos(aim);
  const ay = Math.sin(aim);
  const spot = golferSpot(bx, by, aim, s);
  const sx = spot.x;
  const sy = spot.y;
  // ボールのほうへの向き（目線）
  const gaze = Math.max(-1, Math.min(1, (bx - sx) / (30 * s)));
  // 体から見たボールの向き（クラブのヘッドを外側へ逃がすのに使う）
  const ox = (sx - bx) / (34 * s);
  const oy = (sy - by) / (34 * s);

  if (st.pose === 'happy' || st.pose === 'sad') {
    drawAfterShot(ctx, sx, sy, aim, s, t, st.pose === 'happy');
    return;
  }

  ctx.save();
  let spin = 0;
  if (st.pose === 'spin') {
    // 勢いあまって、その場でくるっと 1 回転（0.7 秒）。回りおわると目が回っている
    const k = clamp01(t / 0.7);
    spin = (1 - Math.pow(1 - k, 2.2)) * Math.PI * 2;
    ctx.translate(sx, sy + 12 * s);
    ctx.rotate(spin);
    ctx.translate(-sx, -(sy + 12 * s));
  }

  // ヘッドの位置
  let hx = bx - ax * 9 * s;
  let hy = by - ay * 9 * s;
  let lift = 0;
  let eyes: SakuraEyes = 'dot';
  let squash = 0;
  let lean = 0;
  if (st.pose === 'back') {
    const k = clamp01(st.swing ?? 0);
    hx = bx - ax * (9 + 34 * k) * s + ox * 10 * k * s;
    hy = by - ay * (9 + 34 * k) * s + oy * 10 * k * s;
    lift = 9 * k * s;
    squash = -0.05 * k;
    lean = -0.12 * k * Math.sign(ax || 1);
    eyes = k > 0.85 ? 'squint' : 'dot';
  } else if (st.pose === 'swing' || (st.pose === 'spin' && t < 0.7) || st.pose === 'wait') {
    const k = st.pose === 'wait' ? 1 : clamp01(t / 0.18);
    hx = bx + ax * lerp(4, 30, k) * s + ox * 12 * k * s;
    hy = by + ay * lerp(4, 30, k) * s + oy * 12 * k * s;
    lift = 12 * k * s;
    lean = 0.12 * k * Math.sign(ax || 1);
    if (st.pose === 'spin') eyes = 'squint';
  } else if (st.pose === 'spin') {
    // 回りおわった：クラブを地面について、ふらふら
    eyes = 'shock';
    lean = Math.sin(t * 7) * 0.12;
  }
  // つかむ所は、顔の横（ボールの側）。翼を上げて持ち、柄はそこから上へのびるので、体より長く見える
  const tdx = hx - sx;
  const tdy = hy - sy;
  const tl = Math.hypot(tdx, tdy) || 1;
  const gx = sx + (tdx / tl) * 18 * s;
  const gy = sy - 8 * s + (tdy / tl) * 10 * s;

  // クラブを先に描き、体に重なる柄の上はしは体のうしろにかくす
  drawClub(ctx, gx, gy, hx, hy, aim, s, lift);
  drawSakura(ctx, sx, sy, { scale: s, gaze, eyes, squash, rotate: lean, tail: 1 });
  holdingWing(ctx, sx + (tdx / tl) * 13 * s, sy + 7 * s, gx, gy, s);
  if (st.pose === 'spin' && t > 0.7) dizzy(ctx, sx, sy - 22 * s, s, t);
  ctx.restore();
  // 回るときの風の線
  if (st.pose === 'spin' && t < 0.8) swirl(ctx, sx, sy + 4 * s, s, spin, 1 - t / 0.8);
}

/** 打ったあと：喜ぶ（クラブをかかげてはねる）／がっかり（クラブを引きずってしょんぼり）。 */
function drawAfterShot(ctx: CanvasRenderingContext2D, sx: number, sy: number, aim: number, s: number, t: number, happy: boolean): void {
  if (happy) {
    const hop = Math.abs(Math.sin(t * 7)) * 7 * s;
    // クラブを横に立てかけてバンザイ
    drawClub(ctx, sx + 18 * s, sy - 12 * s, sx + 22 * s, sy + 14 * s, -Math.PI / 2, s, 0, 14);
    drawSakura(ctx, sx, sy - hop, { scale: s, eyes: 'happy', spread: 0.85 + 0.15 * Math.sin(t * 14), blush: 0.4, tail: 1 });
    sparkle(ctx, sx - 18 * s, sy - 26 * s - hop, s, t);
    sparkle(ctx, sx + 20 * s, sy - 30 * s - hop, s, t + 0.4);
  } else {
    // クラブを地面につけて、うつむく
    drawClub(ctx, sx + 17 * s, sy + 2 * s, sx + 28 * s, sy + 18 * s, aim, s, 0);
    drawSakura(ctx, sx, sy, { scale: s, eyes: 'closed', squash: 0.1, up: false, tail: 1, gaze: 0 });
    holdingWing(ctx, sx + 13 * s, sy + 7 * s, sx + 17 * s, sy + 2 * s, s);
    // しょんぼり線
    ctx.save();
    ctx.strokeStyle = 'rgba(70,80,120,0.6)';
    ctx.lineWidth = 1.2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const x = sx - 8 * s + k * 6 * s;
      ctx.moveTo(x, sy - 22 * s);
      ctx.lineTo(x, sy - 16 * s);
    }
    ctx.stroke();
    ctx.restore();
  }
  void aim;
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const k = 0.6 + 0.4 * Math.sin(t * 9);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * s, k * s);
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 5 : 1.6;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 目が回っている（頭の上のぐるぐる）。 */
function dizzy(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  ctx.save();
  ctx.strokeStyle = '#7a6aa8';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 3.2 + t * 6;
    const r = (1.5 + k * 0.22) * s;
    const px = x + Math.cos(a) * r * 1.6;
    const py = y + Math.sin(a) * r * 0.6;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** 回るときの風の線。 */
function swirl(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, spin: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2 * s;
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const a0 = spin + k * Math.PI;
    ctx.beginPath();
    ctx.ellipse(x, y, 26 * s, 12 * s, 0, a0, a0 + 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

/** 丸くなって休んでいるさくらちゃん（エンディング用。白いボールに見える）。(x, y) = 中心。 */
export function drawSakuraCurled(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, t = 0): void {
  const s = scale;
  const breathe = 1 + 0.03 * Math.sin(t * 2.4);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(30,50,30,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 11, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(breathe, 1 / breathe);
  // 尻尾の先が少しだけ見える
  ctx.fillStyle = SAKURA.wing;
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.quadraticCurveTo(15, 5, 16, 1.5);
  ctx.quadraticCurveTo(13, 2.4, 8.5, 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // まんまるの体
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, SAKURA.body);
  ctx.fillStyle = g;
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // たたんだ翼
  ctx.fillStyle = SAKURA.wing;
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.quadraticCurveTo(9, 3, 9.6, 6.4);
  ctx.quadraticCurveTo(6, 6.4, 4, 2);
  ctx.fill();
  // ねむった目とくちばし（顔を少しうずめる）
  ctx.strokeStyle = SAKURA.ink;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const ex of [-5.6, -0.6]) {
    ctx.moveTo(ex - 1.5, -0.6);
    ctx.quadraticCurveTo(ex, 0.8, ex + 1.5, -0.6);
  }
  ctx.stroke();
  ctx.fillStyle = SAKURA.beak;
  ctx.beginPath();
  ctx.moveTo(-4.2, 1.4);
  ctx.lineTo(-2, 1.4);
  ctx.lineTo(-3.1, 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SAKURA.cheek;
  ctx.beginPath();
  ctx.ellipse(-7.6, 2.2, 1.6, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSakuraFlower(ctx, 3.5, -7.5, 3.4);
  ctx.restore();
}

/** 「Zzz」。 */
export function drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, scale = 1): void {
  ctx.save();
  ctx.font = `bold ${10 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.fillStyle = '#6a7aa8';
    ctx.fillText('z', x + p * 12 * scale + k * 2, y - p * 18 * scale);
  }
  ctx.restore();
}

// --- ボール・カップ・ティー -------------------------------------------------

/** ボールの色。冬は雪の上で見えるようにオレンジ。 */
export type BallColor = 'white' | 'orange';

const BALL_COLORS: Record<BallColor, { light: string; dark: string; line: string; mark: string }> = {
  white: { light: '#ffffff', dark: '#dfe4ea', line: '#5a6470', mark: SAKURA.petal },
  orange: { light: '#ffc98a', dark: '#f07a26', line: '#8a3e10', mark: '#ffffff' }
};

/** ボール（小さな桜のしるし入り）。lift は浮いて見せる高さ（拾い上げ・デモ用）。 */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  roll = 0,
  lift = 0,
  r = BALL_R,
  color: BallColor = 'white'
): void {
  const C = BALL_COLORS[color];
  ctx.save();
  ctx.fillStyle = 'rgba(20,40,20,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 1.2, y + r * 0.55, r * 1.05, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  const yy = y - lift;
  const g = ctx.createRadialGradient(x - r * 0.35, yy - r * 0.4, r * 0.1, x, yy, r);
  g.addColorStop(0, C.light);
  g.addColorStop(1, C.dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, yy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 転がると動くしるし
  const mx = Math.cos(roll) * r * 0.45;
  if (Math.sin(roll) > -0.2) {
    ctx.fillStyle = C.mark;
    ctx.beginPath();
    ctx.arc(x + mx, yy - r * 0.05, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** カップのまわりのきれいに刈った芝（旗の下の丸）と、カップの穴。 */
export function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.arc(x, y, CUP_R + 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, CUP_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d2a22';
  ctx.beginPath();
  ctx.arc(x, y + 0.6, CUP_R - 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2.4, CUP_R - 3, 2.2, 0, 0, Math.PI);
  ctx.fill();
  ctx.restore();
}

/** 旗。wave はゆれの強さ（ホールインワンで大きくゆれる）。 */
export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, wave = 0.15, color = '#ff6f98', hole = 1): void {
  const pole = 44;
  ctx.save();
  // 影
  ctx.strokeStyle = 'rgba(20,40,20,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 22, y + 10);
  ctx.stroke();
  // ポール
  ctx.strokeStyle = '#f4f4f4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - pole);
  ctx.stroke();
  ctx.strokeStyle = '#8a8a8a';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x + 1, y);
  ctx.lineTo(x + 1, y - pole);
  ctx.stroke();
  // 布
  const top = y - pole;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(80,20,40,0.6)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + 1, top);
  const N = 6;
  const w = 24;
  const h = 15;
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    ctx.lineTo(x + 1 + u * w, top + Math.sin(t * 6 - u * 4) * wave * 12 * u);
  }
  for (let k = N; k >= 0; k--) {
    const u = k / N;
    ctx.lineTo(x + 1 + u * w * 0.98, top + h + Math.sin(t * 6 - u * 4) * wave * 12 * u - u * 1.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(hole), x + 11, top + 7.5 + Math.sin(t * 6 - 1.8) * wave * 5);
  // 先の玉
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.arc(x, top - 1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** ティー（ゴムのマット）。(x, y) はボールを置く所。 */
export function drawTee(ctx: CanvasRenderingContext2D, x: number, y: number, aim = -Math.PI / 2): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aim + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.roundRect(-15, -13, 32, 32, 4);
  ctx.fill();
  ctx.fillStyle = '#3f7a4a';
  ctx.strokeStyle = '#24452b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-16, -15, 32, 32, 4);
  ctx.fill();
  ctx.stroke();
  // 人工芝の目
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) ctx.fillRect(-13 + i * 7, -12 + j * 7, 3, 3);
  // ゴムのティー
  ctx.fillStyle = '#e2574c';
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // 打つ向きの白い線
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-12, -13, 24, 2);
  ctx.restore();
}
