/**
 * ブロックの下に隠れているイラスト。画像ファイルは使わず、すべて Canvas2D で描く。
 * 各イラストは PICTURE（448×288）の左上を原点とした座標で描く。
 * 雪や花びらは経過時間 t でゆっくり動く（崩したところから動いているのが見える）。
 */

// --- シマエナガ ---------------------------------------------------------

export interface EnagaStyle {
  readonly bodyLight: string;
  readonly body: string;
  readonly line: string;
  readonly wing: string;
  readonly cheek: string;
  /** 向かって右の頭に桜の花飾りを付ける。 */
  readonly flower: boolean;
}

/** ふつうの白いシマエナガ。 */
export const WHITE_ENAGA: EnagaStyle = {
  bodyLight: '#ffffff',
  body: '#e8edf4',
  line: '#4a5068',
  wing: '#24212b',
  cheek: 'rgba(240,130,155,0.45)',
  flower: false
};

/** 桜色のシマエナガ「さくらちゃん」（「さくらちゃんの大横断」と同じデザイン）。 */
export const SAKURA_ENAGA: EnagaStyle = {
  bodyLight: '#fff6f8',
  body: '#fbe1e8',
  line: '#5e3448',
  wing: '#262024',
  cheek: 'rgba(242,120,150,0.6)',
  flower: true
};

export interface EnagaPose {
  /** 体の傾き（ラジアン）。 */
  readonly tilt?: number;
  /** 足を描く（枝や雪の上にとまっているとき）。 */
  readonly feet?: boolean;
  /** 目を「^ ^」のにっこり顔にする。 */
  readonly happy?: boolean;
  /** 目線。-1 = 左、0 = 正面、1 = 右。 */
  readonly gaze?: number;
}

const INK = '#1c1418';
const BEAK = '#3a2a30';
/** 尾羽は真っ黒だと棒のように見えるので、少しだけ明るい濃灰色にする。 */
const TAIL = '#34313d';
const KAPPA = 0.5523; // ベジェで楕円の 1/4 を近似する係数

/** 体の輪郭。頭は丸く、下半分がふっくらした「おもち」形（単位座標）。 */
function bodyPath(ctx: CanvasRenderingContext2D): void {
  const a = 14.3;
  const cy = 7;
  const b = 9;
  ctx.beginPath();
  ctx.moveTo(0, -12.8);
  ctx.bezierCurveTo(7.6, -12.8, 11.4, -8.2, 12.0, -3.0);
  ctx.bezierCurveTo(12.6, 1.8, a, 4.2, a, cy);
  ctx.bezierCurveTo(a, cy + KAPPA * b, KAPPA * a, cy + b, 0, cy + b);
  ctx.bezierCurveTo(-KAPPA * a, cy + b, -a, cy + KAPPA * b, -a, cy);
  ctx.bezierCurveTo(-a, 4.2, -12.6, 1.8, -12.0, -3.0);
  ctx.bezierCurveTo(-11.4, -8.2, -7.6, -12.8, 0, -12.8);
  ctx.closePath();
}

/** 単位座標の幅（体のいちばん太いところ）。 */
const UNIT_WIDTH = 28.6;

/**
 * (cx, cy) を体の中心、width を体の幅として単位座標系に切り替える。
 * 線の太さを求めるための倍率 s を返す。
 */
function enterEnaga(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, tilt: number): number {
  const s = width / UNIT_WIDTH;
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  ctx.translate(0, -1.6); // 体の上下の中心を原点に合わせる
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return s;
}

/**
 * 線の太さ（単位座標）。単位座標のままだと大きく描いたときに線まで太くなり、
 * 手描き風の重ね線がにじんで見えるので、画面上で maxPx を超えないようにする。
 */
const lineW = (units: number, maxPx: number, s: number): number => Math.min(units, maxPx / s);

/** 桜の花。5 枚の花びらを中心から放射状に並べる。 */
export function drawSakuraFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  line: string,
  rotation = -0.25
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  for (let k = 0; k < 5; k++) {
    ctx.save();
    ctx.rotate((k / 5) * Math.PI * 2 - Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f283a8';
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = r * 0.15;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#d94d78';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe38a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 長い尾羽。枝にとまる絵では「尾羽 → 枝 → 体」の順に重ねたいので、体とは別に描けるようにしている。
 * 引数は drawEnaga と同じ。
 */
export function drawEnagaTail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  style: EnagaStyle,
  pose: EnagaPose = {}
): void {
  ctx.save();
  const s = enterEnaga(ctx, cx, cy, width, pose.tilt ?? 0);
  // 根元は太く、先へ行くほど細くなる細長い尾
  ctx.beginPath();
  ctx.moveTo(-2.3, 10);
  ctx.lineTo(2.3, 10);
  ctx.quadraticCurveTo(1.6, 24, 0.9, 34);
  ctx.quadraticCurveTo(0, 36.5, -0.9, 34);
  ctx.quadraticCurveTo(-1.6, 24, -2.3, 10);
  ctx.closePath();
  ctx.fillStyle = TAIL;
  ctx.fill();
  ctx.strokeStyle = style.line;
  ctx.lineWidth = lineW(0.9, 2.2, s);
  ctx.stroke();
  // 外側の白い羽（シマエナガの尾は両端が白い）
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = lineW(0.6, 1.6, s);
  ctx.beginPath();
  ctx.moveTo(-1.6, 17);
  ctx.quadraticCurveTo(-1.1, 25, -0.6, 32);
  ctx.moveTo(1.6, 17);
  ctx.quadraticCurveTo(1.1, 25, 0.6, 32);
  ctx.stroke();
  ctx.restore();
}

/** 正面向きのシマエナガ。(cx, cy) は体の中心、width は体の幅（px）。 */
export function drawEnaga(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  style: EnagaStyle,
  pose: EnagaPose = {}
): void {
  const fx = (pose.gaze ?? 0) * 1.4;
  ctx.save();
  const s = enterEnaga(ctx, cx, cy, width, pose.tilt ?? 0);

  // 足（体の下からのぞかせるので先に描く）
  if (pose.feet === true) {
    ctx.strokeStyle = style.line;
    ctx.lineWidth = lineW(1.1, 2.6, s);
    ctx.beginPath();
    for (const lx of [-4, 4]) {
      ctx.moveTo(lx, 14.5);
      ctx.lineTo(lx, 17.6);
      ctx.moveTo(lx - 1.8, 17.8);
      ctx.lineTo(lx + 1.8, 17.8);
    }
    ctx.stroke();
  }

  // 体
  const grad = ctx.createRadialGradient(-4, -6, 1, 0, 2, 16);
  grad.addColorStop(0, style.bodyLight);
  grad.addColorStop(1, style.body);
  ctx.fillStyle = grad;
  bodyPath(ctx);
  ctx.fill();
  // 手描き風の輪郭：本線に、わずかにずらした途切れ線を薄く重ねる
  ctx.strokeStyle = style.line;
  ctx.lineWidth = lineW(1.2, 3.4, s);
  bodyPath(ctx);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha *= 0.45;
  ctx.translate(0.5, -0.3);
  ctx.setLineDash([26, 7]);
  bodyPath(ctx);
  ctx.stroke();
  ctx.restore();

  // 脇の小さな切れ込み（羽毛のふわふわ感）
  ctx.lineWidth = lineW(0.9, 2.4, s);
  ctx.beginPath();
  ctx.moveTo(-12.4, 0.6);
  ctx.lineTo(-10.9, 1.9);
  ctx.lineTo(-12.7, 3.0);
  ctx.moveTo(12.3, -0.4);
  ctx.lineTo(10.8, 0.9);
  ctx.lineTo(12.6, 2.0);
  ctx.stroke();

  // 黒い翼と、白っぽい羽の線
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(9.6, 4.4);
    ctx.quadraticCurveTo(13.4, 7.2, 12.0, 11.4);
    ctx.quadraticCurveTo(9.9, 9.6, 9.6, 4.4);
    ctx.closePath();
    ctx.fillStyle = style.wing;
    ctx.fill();
    ctx.strokeStyle = style.line;
    ctx.lineWidth = lineW(0.9, 2.4, s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = lineW(0.6, 1.8, s);
    ctx.beginPath();
    ctx.moveTo(10.7, 7.4);
    ctx.lineTo(12.1, 8.3);
    ctx.stroke();
    ctx.restore();
  }

  // ほっぺ
  ctx.fillStyle = style.cheek;
  ctx.beginPath();
  ctx.ellipse(-8.4 + fx, 2.4, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.ellipse(8.4 + fx, 2.4, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 目
  if (pose.happy === true) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lineW(1.2, 3.2, s);
    for (const ex of [-5.8, 5.8]) {
      ctx.beginPath();
      ctx.arc(ex + fx, -1.6, 1.7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-5.8 + fx, -2.4, 1.35, 0, Math.PI * 2);
    ctx.arc(5.8 + fx, -2.4, 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // くちばし
  ctx.fillStyle = BEAK;
  ctx.beginPath();
  ctx.moveTo(-1.3 + fx, -0.2);
  ctx.lineTo(1.3 + fx, -0.2);
  ctx.lineTo(fx, 1.6);
  ctx.closePath();
  ctx.fill();

  if (style.flower) drawSakuraFlower(ctx, 6.4, -9.6, 4.6, style.line);

  ctx.restore();
}

// --- 背景の小物 ---------------------------------------------------------

/** 毎フレーム同じ並びになる疑似乱数（位置を固定したまま動かすため）。 */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const W = 448;
const H = 288;

function skyGradient(ctx: CanvasRenderingContext2D, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** ぼんやりした光の玉。 */
function bokeh(ctx: CanvasRenderingContext2D, seed: number, count: number, color: string): void {
  const rnd = seeded(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H * 0.8, 14 + rnd() * 34, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** ゆっくり降る雪。 */
function snowfall(ctx: CanvasRenderingContext2D, t: number, seed: number, count: number): void {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    const x0 = rnd() * W;
    const y0 = rnd() * H;
    const r = 1.2 + rnd() * 2.4;
    const speed = 10 + rnd() * 16;
    const sway = rnd() * Math.PI * 2;
    const y = (y0 + t * speed) % (H + 10) - 5;
    const x = x0 + Math.sin(t * 0.8 + sway) * 6;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,210,0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

/** ひらひら落ちる桜の花びら。 */
function petals(ctx: CanvasRenderingContext2D, t: number, seed: number, count: number): void {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    const x0 = rnd() * W;
    const y0 = rnd() * H;
    const size = 3 + rnd() * 3;
    const speed = 12 + rnd() * 14;
    const spin = rnd() * Math.PI * 2;
    const y = (y0 + t * speed) % (H + 12) - 6;
    const x = (x0 + t * speed * 0.5 + Math.sin(t + spin) * 8) % (W + 12) - 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin + t * 1.2);
    ctx.fillStyle = 'rgba(243,140,172,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 二次ベジェの枝。y(x) の値も返せるように、端点と制御点を持たせる。 */
interface Branch {
  readonly x0: number;
  readonly y0: number;
  readonly cx: number;
  readonly cy: number;
  readonly x1: number;
  readonly y1: number;
  readonly width: number;
}

/** 枝の中心線の y（x に対して近似。枝がほぼ水平なので x から t を線形に求める）。 */
function branchY(b: Branch, x: number): number {
  const t = (x - b.x0) / (b.x1 - b.x0);
  const u = 1 - t;
  return u * u * b.y0 + 2 * u * t * b.cy + t * t * b.y1;
}

/** 鳥の足が枝の上にのるような、体の中心の y。 */
function perchY(b: Branch, x: number, width: number): number {
  const s = width / UNIT_WIDTH;
  return branchY(b, x) - b.width / 2 - (17.8 - 1.6) * s + 2;
}

function drawBranch(ctx: CanvasRenderingContext2D, b: Branch, color: string, snowCap: boolean): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = b.width;
  ctx.beginPath();
  ctx.moveTo(b.x0, b.y0);
  ctx.quadraticCurveTo(b.cx, b.cy, b.x1, b.y1);
  ctx.stroke();
  // 木肌の線
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(b.x0, b.y0 + b.width * 0.2);
  ctx.quadraticCurveTo(b.cx, b.cy + b.width * 0.2, b.x1, b.y1 + b.width * 0.2);
  ctx.stroke();
  if (snowCap) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.setLineDash([60, 14, 34, 18]);
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0 - b.width / 2 + 1);
    ctx.quadraticCurveTo(b.cx, b.cy - b.width / 2 + 1, b.x1, b.y1 - b.width / 2 + 1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// --- 3 枚のイラスト ------------------------------------------------------

/** ステージ 1「ゆきのひ」：雪の上にちょこんと座る、大きな 1 羽。 */
export function drawPictureSnowDay(ctx: CanvasRenderingContext2D, t: number): void {
  skyGradient(ctx, '#bcdcff', '#f1f8ff');
  bokeh(ctx, 11, 7, 'rgba(255,255,255,0.35)');

  // 遠くの雪山
  ctx.fillStyle = '#e3eefb';
  ctx.beginPath();
  ctx.moveTo(0, 210);
  ctx.quadraticCurveTo(90, 150, 180, 200);
  ctx.quadraticCurveTo(290, 140, 448, 196);
  ctx.lineTo(448, 288);
  ctx.lineTo(0, 288);
  ctx.closePath();
  ctx.fill();

  // 手前の雪の地面
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(224, 322, 330, 94, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,210,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawEnaga(ctx, 224, 146, 158, WHITE_ENAGA, { feet: true });
  snowfall(ctx, t, 7, 42);
}

/** ステージ 2「えだのうえで」：雪の積もった枝に、2 羽がならんでとまる。 */
export function drawPictureOnBranch(ctx: CanvasRenderingContext2D, t: number): void {
  skyGradient(ctx, '#d6e4f5', '#fde9dd');
  bokeh(ctx, 23, 6, 'rgba(255,255,255,0.3)');

  const branch: Branch = { x0: -20, y0: 214, cx: 224, cy: 188, x1: 468, y1: 204, width: 16 };
  const birds = [
    { x: 150, w: 104, pose: { tilt: -0.08, feet: true, gaze: 1 } },
    { x: 290, w: 114, pose: { tilt: 0.06, feet: true } }
  ];

  // 尾羽 → 枝 → 体 の順に重ねると、尾羽が枝の後ろに垂れて見える
  for (const b of birds) drawEnagaTail(ctx, b.x, perchY(branch, b.x, b.w), b.w, WHITE_ENAGA, b.pose);
  drawBranch(ctx, branch, '#7a5236', true);
  // 小枝
  ctx.strokeStyle = '#7a5236';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(380, 196);
  ctx.quadraticCurveTo(404, 168, 430, 150);
  ctx.stroke();
  for (const b of birds) drawEnaga(ctx, b.x, perchY(branch, b.x, b.w), b.w, WHITE_ENAGA, b.pose);

  snowfall(ctx, t, 31, 34);
}

/** ステージ 3「さくらちゃんとなかま」：桜の枝で、さくらちゃんと 2 羽がおしくらまんじゅう。 */
export function drawPictureSakuraFriends(ctx: CanvasRenderingContext2D, t: number): void {
  skyGradient(ctx, '#ffd6e4', '#fff6f9');
  bokeh(ctx, 47, 8, 'rgba(255,255,255,0.4)');

  const branch: Branch = { x0: -20, y0: 222, cx: 224, cy: 204, x1: 468, y1: 216, width: 16 };
  // 両脇の 2 羽を先に描き、まんなかのさくらちゃんを手前に重ねる
  const birds = [
    { x: 128, w: 100, style: WHITE_ENAGA, pose: { tilt: 0.14, feet: true, happy: true } },
    { x: 320, w: 100, style: WHITE_ENAGA, pose: { tilt: -0.14, feet: true, gaze: -1 } },
    { x: 224, w: 120, style: SAKURA_ENAGA, pose: { feet: true } }
  ];

  for (const b of birds) drawEnagaTail(ctx, b.x, perchY(branch, b.x, b.w), b.w, b.style, b.pose);
  drawBranch(ctx, branch, '#6d4a36', false);
  // 枝に咲く桜
  const blossoms: readonly [number, number, number][] = [
    [30, 222, 11], [62, 232, 8], [395, 206, 12], [428, 222, 9], [360, 226, 7], [176, 226, 7], [270, 222, 7]
  ];
  for (const [x, y, r] of blossoms) drawSakuraFlower(ctx, x, y, r, '#8a4b63', x * 0.05);
  for (const b of birds) drawEnaga(ctx, b.x, perchY(branch, b.x, b.w), b.w, b.style, b.pose);

  petals(ctx, t, 59, 26);
}
