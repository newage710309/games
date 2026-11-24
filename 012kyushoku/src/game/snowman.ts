// 雪だるまを Canvas2D で描く。シャッターチャンス（011）の snowman.ts をコピーし、
// 給食当番用に 溶けかけの姿（melt）を描き足したもの。3 めんで列に並び、かき氷だけを食べる。
// (cx, cy) = 足元の中心。scale 1 で高さ 約 36px。

const SNOW = {
  body: '#ffffff',
  shade: '#d5e4f2',
  line: '#5b7390',
  coal: '#26303c',
  carrot: '#f08a34',
  bucket: '#4f86c6',
  bucketDark: '#3a6aa3',
  twig: '#7a5536',
  cheek: 'rgba(255,150,170,0.55)'
} as const;

export interface SnowmanOptions {
  scale?: number;
  /** 歩く動き（左右にゆれながらすべる）。 */
  hop?: number;
  /** 腕を上げる量（雪玉を投げる・手をふる）。 */
  lift?: number;
  /** 目を細めてにっこり（こっそり写りこんでいるとき）。 */
  grin?: boolean;
  /** 横を向く（-1 = 左、1 = 右、0 = 正面）。にんじんの鼻の向きで表す。 */
  face?: number;
  rotate?: number;
  shadow?: boolean;
  alpha?: number;
  /** 溶けかけ 0..1（熱いものをもらったとき）。下へつぶれ、しずくが垂れ、足元に水たまりができる。 */
  melt?: number;
}

function ball(ctx: CanvasRenderingContext2D, y: number, r: number, light: string, dark: string, line: string): void {
  const g = ctx.createRadialGradient(-r * 0.3, y - r * 0.35, 1, 0, y, r * 1.15);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function twigArms(ctx: CanvasRenderingContext2D, lift = 0): void {
  ctx.strokeStyle = SNOW.twig;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(side * 8, -13);
    ctx.lineTo(side * 16, -17 - lift);
    ctx.moveTo(side * 13.2, -16 - lift * 0.7);
    ctx.lineTo(side * 15, -20.5 - lift);
  }
  ctx.stroke();
}

function carrot(ctx: CanvasRenderingContext2D, face: number, y = -23.8): void {
  ctx.fillStyle = SNOW.carrot;
  ctx.strokeStyle = '#b85d1c';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  if (face === 0) {
    // 正面向きなので、こちらへ突き出た鼻を短い三角＋先の丸で表す
    ctx.moveTo(-1.6, y - 1.2);
    ctx.lineTo(1.6, y - 1.2);
    ctx.lineTo(0.5, y + 4.2);
    ctx.lineTo(-0.5, y + 4.2);
  } else {
    // 横向き：にんじんが横へ長くのびる
    const s = face;
    ctx.moveTo(s * 2, y - 1.6);
    ctx.lineTo(s * 12, y + 0.4);
    ctx.lineTo(s * 2, y + 1.6);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function coalFace(ctx: CanvasRenderingContext2D, face: number, grin: boolean): void {
  const fx = face * 2.4;
  ctx.fillStyle = SNOW.coal;
  ctx.strokeStyle = SNOW.coal;
  if (grin) {
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const ex of [-2.9, 2.9]) {
      ctx.moveTo(ex + fx - 1.4, -25.4);
      ctx.quadraticCurveTo(ex + fx, -27.4, ex + fx + 1.4, -25.4);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-2.9 + fx, -26, 1.2, 0, Math.PI * 2);
    ctx.arc(2.9 + fx, -26, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const mx of [-2, -0.7, 0.7, 2]) {
    ctx.beginPath();
    ctx.arc(mx + fx, -18.6 + Math.abs(mx) * (grin ? 0.35 : -0.3), 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bucket(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(0, -31);
  ctx.rotate(-0.12);
  ctx.fillStyle = SNOW.bucket;
  ctx.beginPath();
  ctx.moveTo(-6.2, 1.6);
  ctx.lineTo(6.2, 1.6);
  ctx.lineTo(4.4, -5.4);
  ctx.lineTo(-4.4, -5.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = SNOW.bucketDark;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = SNOW.bucketDark;
  ctx.fillRect(-6.4, 0.4, 12.8, 1.6);
  ctx.restore();
}

function buttons(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SNOW.coal;
  ctx.beginPath();
  ctx.arc(0, -12.5, 1.1, 0, Math.PI * 2);
  ctx.arc(0, -8, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

function cheeks(ctx: CanvasRenderingContext2D, face: number): void {
  const fx = face * 2.4;
  ctx.fillStyle = SNOW.cheek;
  ctx.beginPath();
  ctx.ellipse(-4.6 + fx, -21.6, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(4.6 + fx, -21.6, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 溶けかけのしずく（体のふちから垂れる）。 */
function meltDrips(ctx: CanvasRenderingContext2D, melt: number): void {
  ctx.fillStyle = 'rgba(205,230,250,0.95)';
  ctx.strokeStyle = SNOW.line;
  ctx.lineWidth = 0.8;
  for (const [x, y, len] of [
    [-6.5, -29, 4],
    [5.8, -30, 3],
    [-9.5, -12, 5],
    [8.8, -15, 6],
    [2, -2, 3]
  ] as const) {
    const l = len * melt;
    ctx.beginPath();
    ctx.moveTo(x - 1.3, y);
    ctx.quadraticCurveTo(x - 1.4, y + l, x, y + l + 1.4);
    ctx.quadraticCurveTo(x + 1.4, y + l, x + 1.3, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 汗のような水しぶき
  ctx.fillStyle = '#8fd0ff';
  for (const [x, y] of [
    [-13, -30],
    [13, -33]
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 3.2 * melt);
    ctx.quadraticCurveTo(x - 2, y, x, y + 1);
    ctx.quadraticCurveTo(x + 2, y, x, y - 3.2 * melt);
    ctx.fill();
  }
}

/** 雪だるまを (cx, cy) = 足元 に描く。 */
export function drawSnowman(ctx: CanvasRenderingContext2D, cx: number, cy: number, opts: SnowmanOptions = {}): void {
  const { scale = 1, hop = 0, lift = 0, grin = false, face = 0, rotate = 0, shadow = true, alpha = 1, melt = 0 } = opts;
  const sway = Math.sin(hop * Math.PI * 2) * 0.06;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.fillStyle = 'rgba(40,70,110,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 12, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (melt > 0) {
    // 足元の水たまり
    ctx.fillStyle = `rgba(150,200,240,${0.55 * melt})`;
    ctx.strokeStyle = `rgba(90,140,190,${0.6 * melt})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(1, 1, 12 + melt * 7, 2.4 + melt * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.rotate(sway + rotate);
  // 溶けると、足元を支点に横へ広がって縦に縮む
  ctx.scale(1 + melt * 0.14, 1 - melt * 0.24);
  twigArms(ctx, lift - melt * 5);
  ball(ctx, -10, 10.5, SNOW.body, SNOW.shade, SNOW.line);
  ball(ctx, -24, 7.6, SNOW.body, SNOW.shade, SNOW.line);
  if (melt > 0) meltDrips(ctx, melt);
  buttons(ctx);
  bucket(ctx);
  cheeks(ctx, face);
  coalFace(ctx, face, grin);
  carrot(ctx, face);
  ctx.restore();
}

/** 雪玉。 */
export function drawSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin * 6);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#cfdeee');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#7d93ad';
  ctx.lineWidth = Math.max(0.8, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(125,147,173,0.5)';
  ctx.beginPath();
  ctx.arc(r * 0.2, r * 0.1, r * 0.45, 0.4, 2.2);
  ctx.stroke();
  ctx.restore();
}
