// コースに出てくるもの（木の実・小枝・小石・雪だるま兵・小さな木・岩・門・雪だまり・氷・日なた）を描く。
import { drawSnowGuest } from './snowman';
import { hash, rr, text } from './ui';

export type PropKind = 'berry' | 'twig' | 'pebble' | 'soldier' | 'tree' | 'rock';

export interface PropLook {
  kind: PropKind;
  x: number;
  y: number;
  seed: number;
  /** undefined = 印なし、true = 巻きこめる、false = 当たると欠ける。 */
  edible?: boolean;
}

/** 木を描く（x, y = 根もと）。 */
export function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shadow = true, color = '#2f6250'): void {
  if (shadow) {
    ctx.fillStyle = 'rgba(50,80,125,0.24)';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.06, y + s * 0.03, s * 0.42, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6a4a32';
  ctx.fillRect(x - s * 0.06, y - s * 0.12, s * 0.12, s * 0.14);
  for (let k = 0; k < 3; k++) {
    const top = y - s * (1 - k * 0.27);
    const w = s * (0.22 + k * 0.1);
    const h = s * 0.44;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top + h);
    ctx.quadraticCurveTo(x, top + h + s * 0.06, x - w, top + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,50,40,0.75)';
    ctx.lineWidth = Math.max(1, s * 0.016);
    ctx.lineJoin = 'round';
    ctx.stroke();
    // 枝につもった雪（とがった形が雪の地面に溶けないように、下の段は少なく）
    const cap = k === 0 ? 0.42 : 0.26;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, top + s * 0.015);
    ctx.lineTo(x + w * cap, top + h * cap);
    ctx.quadraticCurveTo(x + w * cap * 0.4, top + h * cap * 0.8, x, top + h * cap * 1.15);
    ctx.quadraticCurveTo(x - w * cap * 0.4, top + h * cap * 0.8, x - w * cap, top + h * cap);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBerry(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const bob = Math.sin(t * 3 + x) * 1.2;
  ctx.fillStyle = 'rgba(50,80,125,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 7, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y + bob);
  // 葉っぱ
  ctx.fillStyle = '#3f8f5f';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(dir * 6, -6, 6, 3, dir * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#8f1f30';
  for (const [bx, by] of [
    [-4.5, 0.5],
    [4.5, 0.5],
    [0, -4.5]
  ] as const) {
    ctx.fillStyle = '#e0404f';
    ctx.beginPath();
    ctx.arc(bx, by, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(bx - 1.4, by - 1.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTwig(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(50,80,125,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 15, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate((hash(seed, 2) - 0.5) * 0.9);
  ctx.strokeStyle = '#6a4a32';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.quadraticCurveTo(0, -2, 14, 1);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-8, -7);
  ctx.moveTo(5, 0);
  ctx.lineTo(10, -6);
  ctx.stroke();
  ctx.restore();
}

function drawPebble(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.fillStyle = 'rgba(50,80,125,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5.5, 12, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y - 8, x, y + 8);
  g.addColorStop(0, '#aab6c4');
  g.addColorStop(1, '#6f7c90');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#4e5a6f';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 8, (hash(seed, 5) - 0.5) * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 5.2, 6, 2.2, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

/** 雪だるま兵。小枝のやりと赤い旗を持ち、左右に歩く。 */
function drawSoldier(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, seed: number): void {
  const walk = t * 2.2 + seed;
  const dir = Math.cos(walk) >= 0 ? 1 : -1;
  const s = 1.65;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#7a5536';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(dir * 20, -2);
  ctx.lineTo(dir * 20, -60);
  ctx.stroke();
  ctx.fillStyle = '#d9534f';
  ctx.beginPath();
  ctx.moveTo(dir * 20, -60);
  ctx.lineTo(dir * 34, -54);
  ctx.lineTo(dir * 20, -48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawSnowGuest(ctx, x, y, 'none', { scale: s, hop: walk * 0.4 });
  // 赤いたすき
  ctx.fillStyle = '#d9534f';
  ctx.beginPath();
  ctx.ellipse(x, y - 16.4 * s, 7.6 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 大きな岩（巻きこめない）。角ばった形で、さわれないものだと分かるようにする。 */
export function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  ctx.fillStyle = 'rgba(40,60,100,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.08, y + r * 0.55, r * 1.1, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  const pts: [number, number][] = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const k = 0.82 + hash(i, seed) * 0.32;
    pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.86]);
  }
  const g = ctx.createLinearGradient(x, y - r, x, y + r);
  g.addColorStop(0, '#7d8aa1');
  g.addColorStop(1, '#3f4a60');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#2b3448';
  ctx.lineWidth = Math.max(1.6, r * 0.04);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 面のかげ
  ctx.strokeStyle = 'rgba(30,38,56,0.55)';
  ctx.lineWidth = Math.max(1.2, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(pts[3]![0], pts[3]![1]);
  ctx.lineTo(x + r * 0.08, y + r * 0.08);
  ctx.lineTo(pts[5]![0], pts[5]![1]);
  ctx.moveTo(x + r * 0.08, y + r * 0.08);
  ctx.lineTo(x + r * 0.1, y - r * 0.3);
  ctx.stroke();
  // 上につもった雪
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(pts[7]![0] + r * 0.12, pts[7]![1] + r * 0.1);
  ctx.lineTo(pts[8]![0], pts[8]![1]);
  ctx.lineTo(pts[0]![0], pts[0]![1]);
  ctx.lineTo(pts[1]![0], pts[1]![1]);
  ctx.lineTo(pts[2]![0] - r * 0.12, pts[2]![1] + r * 0.05);
  ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.28, x, y - r * 0.42);
  ctx.quadraticCurveTo(x - r * 0.25, y - r * 0.26, pts[7]![0] + r * 0.12, pts[7]![1] + r * 0.1);
  ctx.closePath();
  ctx.fill();
}

export const rockRadius = (seed: number): number => 46 + hash(seed, 9) * 18;

/** 巻きこめるか・当たると欠けるかの印（足もとの輪）。 */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, edible: boolean, t: number): void {
  ctx.save();
  if (edible) {
    ctx.strokeStyle = 'rgba(64,158,235,0.85)';
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -t * 14;
  } else {
    ctx.strokeStyle = 'rgba(226,70,84,0.9)';
  }
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDangerBadge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#e24654';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, '!', x, y + 0.5, 12, '#ffffff', true);
}

export function drawProp(ctx: CanvasRenderingContext2D, p: PropLook, t: number): void {
  const marked = p.edible !== undefined;
  switch (p.kind) {
    case 'berry':
      drawBerry(ctx, p.x, p.y, t);
      break;
    case 'twig':
      if (marked) drawMark(ctx, p.x, p.y + 4, 21, p.edible!, t);
      drawTwig(ctx, p.x, p.y, p.seed);
      if (p.edible === false) drawDangerBadge(ctx, p.x + 15, p.y - 15);
      break;
    case 'pebble':
      if (marked) drawMark(ctx, p.x, p.y + 5, 19, p.edible!, t);
      drawPebble(ctx, p.x, p.y, p.seed);
      if (p.edible === false) drawDangerBadge(ctx, p.x + 14, p.y - 14);
      break;
    case 'soldier':
      if (marked) drawMark(ctx, p.x, p.y, 28, p.edible!, t);
      drawSoldier(ctx, p.x, p.y, t, p.seed);
      if (p.edible === false) drawDangerBadge(ctx, p.x - 20, p.y - 56);
      break;
    case 'tree':
      if (marked) drawMark(ctx, p.x, p.y + 1, 36, p.edible!, t);
      drawPine(ctx, p.x, p.y, 84);
      if (p.edible === false) drawDangerBadge(ctx, p.x + 22, p.y - 62);
      break;
    case 'rock':
      drawRock(ctx, p.x, p.y, rockRadius(p.seed), p.seed);
      break;
  }
}

export interface GateLook {
  /** すき間の中心。 */
  x: number;
  y: number;
  /** すき間の幅（ゲーム世界の座標）。 */
  gap: number;
  /** 通れる大きさ（cm）。 */
  cm: number;
  /** 門のかべを伸ばす左右のはし。 */
  left: number;
  right: number;
  /** 今の雪玉が通れるか（看板の色を変える）。 */
  fits: boolean;
}

/** 雪ブロックのかべ（門の左右）。 */
function drawBricks(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number): void {
  const H = 34;
  const w = x1 - x0;
  if (w <= 0) return;
  ctx.fillStyle = 'rgba(50,80,125,0.25)';
  ctx.fillRect(x0, y + 2, w, 10);
  const g = ctx.createLinearGradient(0, y - H, 0, y);
  g.addColorStop(0, '#f2f8fd');
  g.addColorStop(1, '#a9c5df');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y - H, w, H);
  ctx.strokeStyle = '#7f9abb';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y - H, w, H);
  ctx.beginPath();
  for (let r = 1; r < 3; r++) {
    ctx.moveTo(x0, y - H + (r * H) / 3);
    ctx.lineTo(x1, y - H + (r * H) / 3);
  }
  for (let r = 0; r < 3; r++) {
    for (let bx = x0 + (r % 2) * 11 + 11; bx < x1; bx += 22) {
      ctx.moveTo(bx, y - H + (r * H) / 3);
      ctx.lineTo(bx, y - H + ((r + 1) * H) / 3);
    }
  }
  ctx.stroke();
}

/** 細い門。左右の雪ブロックのかべに、丸太の柱と看板。 */
export function drawGate(ctx: CanvasRenderingContext2D, g: GateLook, t: number): void {
  const l = g.x - g.gap / 2;
  const r = g.x + g.gap / 2;
  drawBricks(ctx, g.left, l, g.y);
  drawBricks(ctx, r, g.right, g.y);
  // 通り道の目印
  ctx.strokeStyle = g.fits ? 'rgba(64,158,235,0.8)' : 'rgba(226,70,84,0.85)';
  ctx.setLineDash([7, 6]);
  ctx.lineDashOffset = -t * 18;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(l + 6, g.y + 2);
  ctx.lineTo(r - 6, g.y + 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 柱
  for (const px of [l, r]) {
    ctx.fillStyle = '#7a5536';
    ctx.strokeStyle = '#4a3326';
    ctx.lineWidth = 1.4;
    rr(ctx, px - 6, g.y - 58, 12, 62, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(px, g.y - 58, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 横木と看板
  ctx.fillStyle = '#8c6442';
  ctx.strokeStyle = '#4a3326';
  rr(ctx, l - 4, g.y - 52, r - l + 8, 7, 3);
  ctx.fill();
  ctx.stroke();
  const sw = 62;
  ctx.fillStyle = g.fits ? '#fff6dc' : '#ffd9d6';
  ctx.strokeStyle = g.fits ? '#7a5536' : '#c23f46';
  ctx.lineWidth = 2;
  rr(ctx, g.x - sw / 2, g.y - 66, sw, 24, 6);
  ctx.fill();
  ctx.stroke();
  text(ctx, `${g.cm}cm`, g.x, g.y - 53.5, 14, g.fits ? '#4a3326' : '#b02a35', true);
}

export interface RidgeLook {
  /** 分かれ道のあいだの尾根。中心 x、はば w、y1 から y2 まで。 */
  x: number;
  w: number;
  y1: number;
  y2: number;
}

/** 分かれ道を分ける尾根（通れない）。ごつごつした岩に雪がつもり、木が生えている。 */
export function drawRidge(ctx: CanvasRenderingContext2D, rd: RidgeLook): void {
  const { x, w, y1, y2 } = rd;
  const side = (dir: number): [number, number][] => {
    const pts: [number, number][] = [];
    const n = Math.max(3, Math.round((y2 - y1) / 34));
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      const taper = Math.min(1, (Math.min(p, 1 - p) * (y2 - y1)) / 110);
      const j = Math.floor(y1 + p * (y2 - y1));
      pts.push([x + dir * (w / 2) * taper * (0.84 + hash(j, dir + 3) * 0.28), y1 + p * (y2 - y1)]);
    }
    return pts;
  };
  const left = side(-1);
  const right = side(1);
  const outline = (k: number, dx = 0, dy = 0): void => {
    ctx.beginPath();
    [...left, ...[...right].reverse()].forEach(([px, py], i) => {
      const qx = x + (px - x) * k + dx;
      if (i === 0) ctx.moveTo(qx, py + dy);
      else ctx.lineTo(qx, py + dy);
    });
    ctx.closePath();
  };
  ctx.save();
  ctx.fillStyle = 'rgba(40,60,100,0.25)';
  outline(1, 8, 8);
  ctx.fill();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#74839b');
  g.addColorStop(0.5, '#5c6a82');
  g.addColorStop(1, '#3f4a60');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#2b3448';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  outline(1);
  ctx.fill();
  ctx.stroke();
  // てっぺんの雪
  ctx.fillStyle = '#f7fbff';
  outline(0.56);
  ctx.fill();
  for (let yy = y1 + 60; yy < y2 - 16; yy += 78) {
    drawPine(ctx, x + (hash(yy, 8) - 0.5) * w * 0.26, yy, 54 + hash(yy, 2) * 16, false);
  }
  ctx.restore();
}

export type PatchKind = 'drift' | 'ice' | 'sun';

export interface PatchLook {
  kind: PatchKind;
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  /** 雪だまりののこり 0..1。 */
  left?: number;
}

/** ふちがゆらいだ丸い形。 */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  ctx.beginPath();
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // 長方形に近い丸（超楕円）に、波をのせる
    const k = Math.pow(Math.pow(Math.abs(c), 3.4) + Math.pow(Math.abs(s), 3.4), -1 / 3.4);
    const wob = 1 + Math.sin(a * 3 + seed * 5) * 0.05 + Math.sin(a * 7 + seed * 11) * 0.03;
    const px = x + c * k * wob * (w / 2);
    const py = y + s * k * wob * (h / 2);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawDrift(ctx: CanvasRenderingContext2D, p: PatchLook, t: number): void {
  const left = p.left ?? 1;
  if (left <= 0) return;
  const n = Math.max(4, Math.round((p.w * p.h) / 1500));
  const lumps = Array.from({ length: n }, (_, i) => ({
    x: p.x + (hash(i, p.seed) - 0.5) * p.w * 0.84,
    y: p.y + (hash(i, p.seed + 1) - 0.5) * p.h * 0.8,
    r: (0.5 + hash(i, p.seed + 2) * 0.5) * Math.min(p.w, p.h) * 0.34 * (0.6 + left * 0.4)
  })).sort((a, b) => a.y - b.y);
  ctx.fillStyle = 'rgba(70,110,165,0.2)';
  blob(ctx, p.x, p.y + 6, p.w, p.h, p.seed);
  ctx.fill();
  for (const l of lumps) {
    const g = ctx.createRadialGradient(l.x - l.r * 0.3, l.y - l.r * 0.4, l.r * 0.1, l.x, l.y, l.r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#fbfdff');
    g.addColorStop(1, '#c5d9ee');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(120,155,195,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.r, l.r * 0.74, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // きらきら
  for (let i = 0; i < 5; i++) {
    const a = (Math.sin(t * 3 + i * 1.7 + p.seed) + 1) / 2;
    if (a < 0.45) continue;
    const sx = p.x + (hash(i, p.seed + 5) - 0.5) * p.w * 0.8;
    const sy = p.y + (hash(i, p.seed + 6) - 0.5) * p.h * 0.7;
    const s = 3.5 * a;
    ctx.strokeStyle = 'rgba(90,170,240,0.95)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx - s, sy);
    ctx.lineTo(sx + s, sy);
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx, sy + s);
    ctx.stroke();
  }
}

function drawIce(ctx: CanvasRenderingContext2D, p: PatchLook, t: number): void {
  ctx.save();
  blob(ctx, p.x, p.y, p.w, p.h, p.seed);
  const g = ctx.createLinearGradient(p.x - p.w / 2, p.y - p.h / 2, p.x + p.w / 2, p.y + p.h / 2);
  g.addColorStop(0, '#b6e6fa');
  g.addColorStop(0.5, '#8fd2f2');
  g.addColorStop(1, '#6db8e4');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#ecfaff';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.clip();
  // すべすべの光（ななめの筋が流れる）
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineCap = 'round';
  const span = p.w + p.h;
  for (let i = 0; i < 6; i++) {
    const o = ((hash(i, p.seed) * span + t * 16) % span) - span / 2;
    ctx.lineWidth = 3 + hash(i, p.seed + 3) * 7;
    ctx.beginPath();
    ctx.moveTo(p.x + o - p.h / 2, p.y + p.h / 2);
    ctx.lineTo(p.x + o + p.h / 2, p.y - p.h / 2);
    ctx.stroke();
  }
  // ひび
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    let cx = p.x + (hash(i, p.seed + 7) - 0.5) * p.w * 0.8;
    let cy = p.y + (hash(i, p.seed + 8) - 0.5) * p.h * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 3; k++) {
      cx += (hash(i * 3 + k, p.seed + 9) - 0.5) * 34;
      cy += (hash(i * 3 + k, p.seed + 10) - 0.5) * 34;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawSun(ctx: CanvasRenderingContext2D, p: PatchLook, t: number): void {
  ctx.save();
  blob(ctx, p.x, p.y, p.w, p.h, p.seed);
  const g = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, Math.max(p.w, p.h) * 0.62);
  g.addColorStop(0, '#fff0b0');
  g.addColorStop(0.75, '#ffe08a');
  g.addColorStop(1, '#ffd477');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,80,0.9)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.clip();
  // 雪がとけた水たまりと、のぞいた地面
  for (let i = 0; i < 5; i++) {
    const x = p.x + (hash(i, p.seed + 1) - 0.5) * p.w * 0.8;
    const y = p.y + (hash(i, p.seed + 2) - 0.5) * p.h * 0.8;
    const r = 9 + hash(i, p.seed + 3) * 15;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(120,190,235,0.62)' : 'rgba(150,180,95,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ななめの日ざし
  ctx.strokeStyle = 'rgba(255,255,240,0.5)';
  ctx.lineWidth = 11;
  const span = p.w + p.h;
  for (let i = 0; i < 5; i++) {
    const o = (((i / 5) * span + t * 9) % span) - span / 2;
    ctx.beginPath();
    ctx.moveTo(p.x + o - p.h / 2, p.y - p.h / 2);
    ctx.lineTo(p.x + o + p.h / 2, p.y + p.h / 2);
    ctx.stroke();
  }
  ctx.restore();
  // ゆげ（とける）
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const v = (t * 0.55 + i / 4) % 1;
    const x = p.x + (hash(i, p.seed + 4) - 0.5) * p.w * 0.7;
    const y = p.y + (hash(i, p.seed + 5) - 0.5) * p.h * 0.5 - v * 22;
    ctx.globalAlpha = Math.sin(v * Math.PI);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 5, y - 6, x + 5, y - 11, x, y - 17);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPatch(ctx: CanvasRenderingContext2D, p: PatchLook, t: number): void {
  if (p.kind === 'drift') drawDrift(ctx, p, t);
  else if (p.kind === 'ice') drawIce(ctx, p, t);
  else drawSun(ctx, p, t);
}
