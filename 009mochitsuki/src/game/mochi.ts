// 臼・おもち・くっついたおもち・タイミングの輪・雪玉を Canvas2D で描く。
import { drawSakura, type SakuraOptions } from './sakura';
import { hash, outlinedText } from './ui';

const MOCHI = {
  light: '#fffdf6',
  body: '#f8f2e2',
  shade: '#e5dcc6',
  line: '#a39578',
  rice: '#e9dfc4'
} as const;

const WOOD = {
  rim: '#c99a60',
  rimLight: '#e3bf8a',
  body: '#a87a48',
  bodyDark: '#7a5430',
  bodyLight: '#c39661',
  inner: '#5a3c22',
  line: '#4a3326'
} as const;

// --- 臼 -----------------------------------------------------------------

export const USU_RX = 86;
export const USU_RY = 27;
export const USU_H = 106;

function usuSide(ctx: CanvasRenderingContext2D): void {
  const b = USU_H;
  ctx.beginPath();
  ctx.moveTo(-USU_RX, 0);
  ctx.bezierCurveTo(-USU_RX + 4, b * 0.34, -USU_RX + 24, b * 0.5, -USU_RX + 14, b * 0.82);
  ctx.lineTo(-USU_RX + 8, b);
  ctx.quadraticCurveTo(0, b + 22, USU_RX - 8, b);
  ctx.lineTo(USU_RX - 14, b * 0.82);
  ctx.bezierCurveTo(USU_RX - 24, b * 0.5, USU_RX - 4, b * 0.34, USU_RX, 0);
  ctx.closePath();
}

/** 臼の後ろ側と胴（おもちより先に描く）。(x, y) = 口の中心。 */
export function drawUsu(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  // 影
  ctx.fillStyle = 'rgba(40,50,80,0.25)';
  ctx.beginPath();
  ctx.ellipse(4, USU_H + 8, USU_RX + 2, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // 胴
  const g = ctx.createLinearGradient(-USU_RX, 0, USU_RX, 0);
  g.addColorStop(0, WOOD.bodyDark);
  g.addColorStop(0.32, WOOD.bodyLight);
  g.addColorStop(0.62, WOOD.body);
  g.addColorStop(1, WOOD.bodyDark);
  ctx.fillStyle = g;
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 2.2;
  usuSide(ctx);
  ctx.fill();
  ctx.stroke();
  // 木目
  ctx.save();
  usuSide(ctx);
  ctx.clip();
  ctx.strokeStyle = 'rgba(70,40,15,0.28)';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 7; k++) {
    const gx = -66 + k * 22 + hash(k, 3) * 6;
    ctx.beginPath();
    ctx.moveTo(gx, 10);
    ctx.bezierCurveTo(gx + 5 * (k % 2 ? 1 : -1), 40, gx - 4 * (k % 2 ? 1 : -1), 74, gx * 0.92, USU_H + 14);
    ctx.stroke();
  }
  // たが（なわ）
  ctx.strokeStyle = '#d8c28e';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(0, 22, USU_RX - 2, USU_RY - 2, 0, 0.06, Math.PI - 0.06);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,30,0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.ellipse(0, 22, USU_RX - 2, USU_RY - 2, 0, 0.06, Math.PI - 0.06);
  ctx.stroke();
  ctx.restore();
  // 口
  ctx.fillStyle = WOOD.rim;
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, USU_RX, USU_RY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = WOOD.rimLight;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, USU_RX - 5, USU_RY - 3, 0, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  ctx.fillStyle = WOOD.inner;
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 1, USU_RX - 15, USU_RY - 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- おもち（臼の中） -----------------------------------------------------

export interface MochiLook {
  /** つきあがりぐあい 0..1。0 はごはんつぶが残り、1 はなめらか。 */
  done?: number;
  /** つやつや 0..1。 */
  shine?: number;
  /** つぶれ -0.3..1。正でぺちゃんこ（つかれた瞬間）、負で盛り上がり（返した瞬間）。 */
  squash?: number;
  /** 返すときの、かたむき（ラジアン）。 */
  tilt?: number;
  /** 大きさの倍率。 */
  scale?: number;
  t?: number;
}

/** おもちを描く。(x, y) = 底のまん中。 */
export function drawMochi(ctx: CanvasRenderingContext2D, x: number, y: number, look: MochiLook = {}): void {
  const { done = 1, shine = 0, squash = 0, tilt = 0, scale = 1, t = 0 } = look;
  const rx = 62 * (1 + squash * 0.22);
  const ry = 34 * (1 - squash * 0.62);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(tilt);
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx, -ry * 0.92, -rx * 0.56, -ry * 1.28, 0, -ry * 1.28);
    ctx.bezierCurveTo(rx * 0.56, -ry * 1.28, rx, -ry * 0.92, rx, 0);
    ctx.bezierCurveTo(rx * 0.82, ry * 0.3, -rx * 0.82, ry * 0.3, -rx, 0);
    ctx.closePath();
  };
  const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.9, 3, 0, -ry * 0.2, rx * 1.1);
  g.addColorStop(0, MOCHI.light);
  g.addColorStop(0.65, MOCHI.body);
  g.addColorStop(1, MOCHI.shade);
  ctx.fillStyle = g;
  ctx.strokeStyle = MOCHI.line;
  ctx.lineWidth = 2;
  path();
  ctx.fill();
  ctx.stroke();

  // ごはんつぶ（つくほど消える）
  if (done < 1) {
    ctx.save();
    path();
    ctx.clip();
    for (let k = 0; k < 34; k++) {
      if (hash(k, 11) < done) continue;
      const a = hash(k, 2) * Math.PI * 2;
      const q = Math.sqrt(hash(k, 3));
      const gx = Math.cos(a) * q * rx * 0.95;
      const gy = -ry * 0.5 + Math.sin(a) * q * ry * 0.75;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(hash(k, 4) * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = MOCHI.rice;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // つや
  if (shine > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, shine);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.36, -ry * 0.92, rx * 0.25, ry * 0.2, -0.28, 0, Math.PI * 2);
    ctx.ellipse(-rx * 0.03, -ry * 1.07, rx * 0.06, ry * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // きらっ
    for (let k = 0; k < 3; k++) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 6 + k * 2.1);
      const sx = [-rx * 0.62, rx * 0.5, rx * 0.12][k]!;
      const sy = [-ry * 1.25, -ry * 1.15, -ry * 1.72][k]!;
      sparkle(ctx, sx, sy, (5 + k * 1.6) * pulse);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 十字のきらめき。 */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#fff6c2'): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// --- さくらちゃんにくっつくおもち ------------------------------------------

type Blob = [x: number, y: number, rx: number, ry: number];

/** 楕円をくっつけて、ひとつながりのおもちに見せる（まず全部の縁を描いて、上から全部を塗る）。 */
function blobs(ctx: CanvasRenderingContext2D, list: Blob[]): void {
  ctx.strokeStyle = MOCHI.line;
  ctx.lineWidth = 1.1;
  for (const [x, y, rx, ry] of list) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = MOCHI.body;
  for (const [x, y, rx, ry] of list) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ふくらみの明るいところ
  ctx.fillStyle = MOCHI.light;
  for (const [x, y, rx, ry] of list) {
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.22, y - ry * 0.28, rx * 0.58, ry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** くっつきの段階ごとの形（さくらちゃんの体の座標 = scale 1 のとき）。 */
const STUCK_BACK: Blob[][] = [[], [], [[0, 3, 21, 19]]];
const STUCK_FRONT: Blob[][] = [
  [],
  [
    [-8, -13, 8, 5],
    [-13, -9, 5, 5],
    [12, 11, 7, 6.5]
  ],
  [
    [-5, -14, 11, 6],
    [9, -14.5, 8, 4.5],
    [-15, -5, 5.5, 8],
    [15, -3, 5, 7],
    [0, 15, 18, 8],
    [-13, 9, 8, 8],
    [13, 9, 8, 8]
  ]
];

export interface StuckSakuraOptions extends SakuraOptions {
  /** くっついた回数 0..2。3 回目はさくらちゃんごと消える（臼のおもちに目が出る）ので、ここでは描かない。 */
  stage: number;
}

/** おもちのくっついたさくらちゃん。(x, y) = 中心（drawSakura と同じ）。 */
export function drawStuckSakura(ctx: CanvasRenderingContext2D, x: number, y: number, opts: StuckSakuraOptions): void {
  const s = opts.scale ?? 1;
  const stage = Math.max(0, Math.min(2, opts.stage));
  const back = STUCK_BACK[stage]!;
  const front = STUCK_FRONT[stage]!;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  blobs(ctx, back);
  ctx.restore();
  drawSakura(ctx, x, y, { ...opts, shadow: opts.shadow ?? back.length === 0 });
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  blobs(ctx, front);
  ctx.restore();
}

/** 臼のおもちに現れる、さくらちゃんの目（ゲームオーバー）。(x, y) = 臼の口の中心。 */
export function drawPeekEyes(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#1c1418';
  ctx.beginPath();
  ctx.arc(x - 10, y - 18, 3.3, 0, Math.PI * 2);
  ctx.arc(x + 10, y - 18, 3.3, 0, Math.PI * 2);
  ctx.fill();
}

/** 目を回したときに頭のまわりを回る星。 */
export function drawDizzy(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, r = 34): void {
  for (let k = 0; k < 4; k++) {
    const a = t * 5 + (k * Math.PI) / 2;
    sparkle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.32, 9, '#ffd84a');
  }
}

// --- タイミングの輪 -------------------------------------------------------

/**
 * 輪の種類。
 * normal = ふつう、fast = はやつき（ピンク）、feint = フェイント（赤い点線で「×」）、
 * faint = ふりむき（見えにくい）。
 */
export type RingKind = 'normal' | 'fast' | 'feint' | 'faint';

export interface RingLook {
  x: number;
  y: number;
  /** ぴったりのときの半径。 */
  r: number;
  /** いまの半径（縮む輪）。null なら、的だけ描く。 */
  now: number | null;
  kind?: RingKind;
  /** 判定の瞬間の光 0..1。 */
  flash?: number;
}

const RING_COLOR: Record<RingKind, { ring: string; target: string; band: string }> = {
  normal: { ring: '#ffffff', target: 'rgba(255,255,255,0.72)', band: 'rgba(255,230,120,0.3)' },
  fast: { ring: '#ff9cc4', target: 'rgba(255,190,220,0.8)', band: 'rgba(255,150,200,0.3)' },
  feint: { ring: '#ff5f52', target: 'rgba(255,120,110,0.8)', band: 'rgba(255,90,80,0.14)' },
  faint: { ring: '#ffffff', target: 'rgba(255,255,255,0.12)', band: 'rgba(255,255,255,0.03)' }
};

export function drawRing(ctx: CanvasRenderingContext2D, look: RingLook): void {
  const { x, y, r, now, kind = 'normal', flash = 0 } = look;
  const c = RING_COLOR[kind];
  ctx.save();
  ctx.lineCap = 'round';
  // ぴったりの帯と的
  ctx.strokeStyle = c.band;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = c.target;
  ctx.lineWidth = 2.4;
  if (kind === 'feint') ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 縮む輪
  if (now !== null) {
    const near = Math.max(0, 1 - Math.abs(now - r) / 60);
    const alpha = kind === 'faint' ? 0.16 : 0.55 + near * 0.45;
    ctx.globalAlpha = alpha;
    // 暗い縁どりで、明るい背景でも見えるように
    if (kind !== 'faint') {
      ctx.strokeStyle = 'rgba(30,30,60,0.6)';
      ctx.lineWidth = 8.5;
      if (kind === 'feint') ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.arc(x, y, now, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = kind === 'normal' && near > 0.5 ? '#ffe36a' : c.ring;
    ctx.lineWidth = kind === 'faint' ? 3 : 5.5;
    if (kind === 'feint') ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(x, y, now, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  if (kind === 'feint') {
    // タップしない印
    outlinedText(ctx, '×', x, y - r - 8, 34, '#ff5f52', '#ffffff');
  }
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.strokeStyle = '#fff6b0';
    ctx.lineWidth = 8 + (1 - flash) * 16;
    ctx.beginPath();
    ctx.arc(x, y, r + (1 - flash) * 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// --- 雪玉 -----------------------------------------------------------------

/** 飛んでくる雪玉（はじく的の輪つき）。ring は 0..1 で、1 のときがはじく瞬間。 */
export function drawThrownSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r * 1.15);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c6d9ec');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#5b7390';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(91,115,144,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.1, r * 0.55, 0.3, 2.4);
  ctx.stroke();
  ctx.restore();
}

/** 飛び散るかけら（おもち・雪玉）。p は 0..1 の進み。 */
export function drawBits(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, color: string, n = 9, spread = 70): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(70,80,110,0.55)';
  ctx.lineWidth = 1;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI * (0.05 + (0.9 * k) / (n - 1));
    const v = spread * (0.6 + hash(k, 5) * 0.6);
    const bx = x + Math.cos(a) * v * p;
    const by = y + Math.sin(a) * v * p + 90 * p * p;
    ctx.beginPath();
    ctx.arc(bx, by, 3 + hash(k, 8) * 4 * (1 - p * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
