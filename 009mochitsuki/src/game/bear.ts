// クマ（もちをつく係）と杵を Canvas2D で描く。(x, y) = 足元の中心。scale 1 で高さ 約 280px。
// 杵は振り上げぐあい lift（0 = おもちの上、1 = 頭の上）だけで位置が決まる。

const BEAR = {
  fur: '#b27c48',
  furLight: '#cf9d67',
  furDark: '#8c5c31',
  muzzle: '#f3e0c0',
  belly: '#e6c79a',
  line: '#4a3326',
  ink: '#21140c',
  nose: '#33211a',
  cheek: 'rgba(240,110,110,0.45)',
  band: '#e2574c',
  bandDot: '#fff4ea'
} as const;

const WOOD = {
  head: '#c79a62',
  headLight: '#e0bb86',
  headDark: '#8f6638',
  handle: '#b98a54',
  line: '#4a3326'
} as const;

/** 表情。normal = ふつう、grin = ニヤッ、excited = のってきた、shock = あっ、proud = まだまだ！、away = よそ見。 */
export type BearFace = 'normal' | 'grin' | 'excited' | 'shock' | 'proud' | 'away';

export interface BearOptions {
  scale?: number;
  /** 杵の振り上げぐあい。0 = おもちの上、1 = 頭の上（1 を少しこえると、ふりかぶり）。 */
  lift?: number;
  face?: BearFace;
  /** 体のゆれ（上下、ピクセル）。 */
  bob?: number;
  /** 汗を出す。 */
  sweat?: boolean;
  /** どこを描くか。body = 体と頭、arms = 腕と杵。あいだに臼をはさむために分ける。 */
  layer?: 'all' | 'body' | 'arms';
  /** 杵を持たない（デモ用）。腕は体のわきへ下ろす。 */
  noKine?: boolean;
  /** バンザイ（デモ用。noKine のときだけ）。 */
  cheer?: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 杵の柄の長さ（にぎる所から頭の中心まで）と、頭の長さ・太さ。 */
const KINE_LEN = 158;
const KINE_HEAD_LONG = 76;
const KINE_HEAD_WIDE = 44;

interface KinePose {
  /** にぎる所（足元からの相対）。 */
  gx: number;
  gy: number;
  /** にぎる所から杵の頭へ向かう向き（ラジアン）。 */
  angle: number;
  /** 杵の頭の中心（足元からの相対）。 */
  hx: number;
  hy: number;
}

/** 振り上げぐあいから、杵の位置を出す。 */
export function kinePose(lift: number): KinePose {
  const gx = lerp(0, -4, lift);
  const gy = lerp(-150, -300, lift);
  const angle = lerp((184 * Math.PI) / 180, (250 * Math.PI) / 180, lift);
  return { gx, gy, angle, hx: gx + Math.cos(angle) * KINE_LEN, hy: gy + Math.sin(angle) * KINE_LEN };
}

function drawKine(ctx: CanvasRenderingContext2D, p: KinePose): void {
  ctx.save();
  ctx.translate(p.gx, p.gy);
  ctx.rotate(p.angle);
  // 柄（x が杵の頭の向き）。にぎる所より少し後ろまである
  ctx.fillStyle = WOOD.handle;
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-16, -5.5, KINE_LEN + 2, 11, 5);
  ctx.fill();
  ctx.stroke();
  // 頭（柄と直角の筒。上下の端が平らで、おもちに当たる）
  ctx.translate(KINE_LEN, 0);
  const w = KINE_HEAD_WIDE / 2;
  const l = KINE_HEAD_LONG / 2;
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, WOOD.headDark);
  g.addColorStop(0.45, WOOD.headLight);
  g.addColorStop(1, WOOD.head);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-w, -l, w * 2, l * 2, 7);
  ctx.fill();
  ctx.stroke();
  // 木目と、柄の差しこみ
  ctx.strokeStyle = 'rgba(90,60,30,0.32)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, -l + 5);
  ctx.lineTo(-8, l - 5);
  ctx.moveTo(8, -l + 7);
  ctx.lineTo(8, l - 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.beginPath();
  ctx.roundRect(-w + 1, -6.5, 8, 13, 2);
  ctx.fill();
  ctx.restore();
}

/** 太い腕を、肩 (sx, sy) からひじ (cx, cy) を通って手 (px, py) まで描く。 */
function arm(ctx: CanvasRenderingContext2D, sx: number, sy: number, cx: number, cy: number, px: number, py: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = BEAR.line;
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, px, py);
  ctx.stroke();
  ctx.strokeStyle = BEAR.fur;
  ctx.lineWidth = 29;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, px, py);
  ctx.stroke();
  // 手
  ctx.fillStyle = BEAR.furLight;
  ctx.strokeStyle = BEAR.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawArmsAndKine(ctx: CanvasRenderingContext2D, lift: number): void {
  const p = kinePose(lift);
  const dx = Math.cos(p.angle);
  const dy = Math.sin(p.angle);
  drawKine(ctx, p);
  const nearX = p.gx + dx * 4;
  const nearY = p.gy + dy * 4;
  const farX = p.gx + dx * 44;
  const farY = p.gy + dy * 44;
  const l = Math.min(1, lift);
  // ひじは外へ張って、振り上げても顔にかぶらないようにする
  arm(ctx, 62, -160, lerp(92, 104, l), lerp(-120, -240, l), nearX, nearY);
  arm(ctx, -62, -160, lerp(-40, -100, l), lerp(-112, -240, l), farX, farY);
}

function drawBody(ctx: CanvasRenderingContext2D): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = BEAR.line;
  ctx.lineWidth = 2.2;
  // 足
  for (const side of [-1, 1]) {
    ctx.fillStyle = BEAR.furDark;
    ctx.beginPath();
    ctx.ellipse(side * 40, -13, 32, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 胴
  const g = ctx.createRadialGradient(-20, -130, 12, 0, -90, 112);
  g.addColorStop(0, BEAR.furLight);
  g.addColorStop(1, BEAR.fur);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-52, -172);
  ctx.bezierCurveTo(-88, -130, -88, -20, -48, -14);
  ctx.lineTo(48, -14);
  ctx.bezierCurveTo(88, -20, 88, -130, 52, -172);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // おなか
  ctx.fillStyle = BEAR.belly;
  ctx.beginPath();
  ctx.ellipse(0, -74, 50, 56, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeadband(ctx: CanvasRenderingContext2D, shift: number): void {
  // ねじりはちまき（顔の向きに合わせて結び目が動く）
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 63, 57, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = BEAR.band;
  ctx.beginPath();
  ctx.moveTo(-66, -20);
  ctx.quadraticCurveTo(shift * 0.3, -36, 66, -20);
  ctx.lineTo(66, -8);
  ctx.quadraticCurveTo(shift * 0.3, -24, -66, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BEAR.bandDot;
  for (let k = -3; k <= 3; k++) {
    const x = k * 17 + shift * 0.3;
    ctx.beginPath();
    ctx.arc(x, -22 - (1 - (k * k) / 9) * 6, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 結び目のはし
  const kx = 58 - shift * 1.8;
  ctx.fillStyle = BEAR.band;
  ctx.strokeStyle = BEAR.line;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(kx, -16);
  ctx.quadraticCurveTo(kx + 14, -32, kx + 22, -26);
  ctx.quadraticCurveTo(kx + 14, -18, kx, -12);
  ctx.closePath();
  ctx.moveTo(kx, -16);
  ctx.quadraticCurveTo(kx + 18, -12, kx + 20, -3);
  ctx.quadraticCurveTo(kx + 8, -5, kx, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHead(ctx: CanvasRenderingContext2D, face: BearFace, sweat: boolean): void {
  ctx.save();
  ctx.translate(0, -212);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // 顔の向き：ふだんは臼（左）のほうへ少し向く。よそ見は右上へ大きく向く
  const fx = face === 'away' ? 26 : -7;
  const fy = face === 'away' ? -7 : 0;
  // 耳
  ctx.strokeStyle = BEAR.line;
  ctx.lineWidth = 2.2;
  for (const side of [-1, 1]) {
    const ex = side * 46 + fx * 0.45;
    ctx.fillStyle = BEAR.fur;
    ctx.beginPath();
    ctx.arc(ex, -44, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BEAR.belly;
    ctx.beginPath();
    ctx.arc(ex, -43, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  // 頭
  const g = ctx.createRadialGradient(-20, -24, 8, 0, 0, 72);
  g.addColorStop(0, BEAR.furLight);
  g.addColorStop(1, BEAR.fur);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 63, 57, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawHeadband(ctx, fx);

  // 口のまわり
  ctx.fillStyle = BEAR.muzzle;
  ctx.beginPath();
  ctx.ellipse(fx, 21 + fy, 26, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  // 鼻
  ctx.fillStyle = BEAR.nose;
  ctx.beginPath();
  ctx.ellipse(fx, 11 + fy, 8, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(fx - 2.4, 9.4 + fy, 2.2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // ほっぺ
  if (face !== 'away') {
    ctx.fillStyle = BEAR.cheek;
    ctx.beginPath();
    ctx.ellipse(fx - 38, 14, 9, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(fx + 38, 14, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 目と口
  const eyeY = -4 + fy;
  ctx.strokeStyle = BEAR.ink;
  ctx.fillStyle = BEAR.ink;
  if (face === 'grin') {
    // ニヤッ：半目で横目、片方の口のはしを上げて、歯を見せる
    for (const side of [-1, 1]) {
      const ex = fx + side * 22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, eyeY, 7.4, 0, Math.PI, false);
      ctx.fill();
      ctx.fillStyle = BEAR.ink;
      ctx.beginPath();
      ctx.arc(ex + 3.4, eyeY + 2.2, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - 9, eyeY);
      ctx.lineTo(ex + 9, eyeY);
      ctx.stroke();
      // ぐっと下げたまゆ
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex - side * 9, eyeY - 14);
      ctx.lineTo(ex + side * 9, eyeY - 8 - side * 4 + 4);
      ctx.stroke();
    }
    ctx.lineWidth = 2.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(fx - 17, 26);
    ctx.quadraticCurveTo(fx + 2, 36, fx + 21, 18);
    ctx.quadraticCurveTo(fx + 6, 26, fx - 17, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (face === 'excited') {
    // のってきた：にっこり目で、大きく口を開ける
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const ex = fx + side * 22;
      ctx.moveTo(ex - 9, eyeY + 3);
      ctx.quadraticCurveTo(ex, eyeY - 11, ex + 9, eyeY + 3);
    }
    ctx.stroke();
    ctx.fillStyle = '#a93b45';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(fx - 15, 19);
    ctx.quadraticCurveTo(fx, 23, fx + 15, 19);
    ctx.quadraticCurveTo(fx + 13, 41, fx, 41);
    ctx.quadraticCurveTo(fx - 13, 41, fx - 15, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f08a8a';
    ctx.beginPath();
    ctx.ellipse(fx, 35, 7.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (face === 'shock') {
    // あっ：目を見開いて、小さく口を開ける
    for (const side of [-1, 1]) {
      const ex = fx + side * 22;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = BEAR.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, eyeY - 1, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = BEAR.ink;
      ctx.beginPath();
      ctx.arc(ex, eyeY - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#a93b45';
    ctx.strokeStyle = BEAR.ink;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(fx, 29, 6.4, 7.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (face === 'proud') {
    // まだまだ！：きりっとした目で、歯を見せて笑う
    for (const side of [-1, 1]) {
      const ex = fx + side * 22;
      ctx.fillStyle = BEAR.ink;
      ctx.beginPath();
      ctx.arc(ex, eyeY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.6, eyeY - 1.8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = BEAR.ink;
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(ex - side * 10, eyeY - 17);
      ctx.lineTo(ex + side * 9, eyeY - 10);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = BEAR.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(fx - 18, 21);
    ctx.quadraticCurveTo(fx, 27, fx + 18, 21);
    ctx.quadraticCurveTo(fx + 14, 37, fx, 37);
    ctx.quadraticCurveTo(fx - 14, 37, fx - 18, 21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fx - 16, 27);
    ctx.quadraticCurveTo(fx, 31, fx + 16, 27);
    ctx.stroke();
  } else if (face === 'away') {
    // よそ見：右上を見て、口ぶえ
    for (const side of [-1, 1]) {
      const ex = fx + side * 20;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = BEAR.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ex, eyeY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = BEAR.ink;
      ctx.beginPath();
      ctx.arc(ex + 3.4, eyeY - 2.4, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = BEAR.ink;
    ctx.lineWidth = 2.4;
    ctx.fillStyle = '#a93b45';
    ctx.beginPath();
    ctx.arc(fx + 6, 27 + fy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // ふつう：丸い目と、にこっとした口
    ctx.beginPath();
    ctx.arc(fx - 22, eyeY, 5, 0, Math.PI * 2);
    ctx.arc(fx + 22, eyeY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx - 23.6, eyeY - 1.8, 1.5, 0, Math.PI * 2);
    ctx.arc(fx + 20.4, eyeY - 1.8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(fx, 16);
    ctx.lineTo(fx, 23);
    ctx.moveTo(fx - 12, 22);
    ctx.quadraticCurveTo(fx - 6, 30, fx, 23);
    ctx.quadraticCurveTo(fx + 6, 30, fx + 12, 22);
    ctx.stroke();
  }

  if (sweat) {
    ctx.fillStyle = '#8fd0ff';
    ctx.strokeStyle = '#4c86b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(52, -30);
    ctx.quadraticCurveTo(43, -13, 52, -10);
    ctx.quadraticCurveTo(61, -13, 52, -30);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** クマ（と杵）を描く。 */
export function drawBear(ctx: CanvasRenderingContext2D, x: number, y: number, opts: BearOptions = {}): void {
  const { scale = 1, lift = 0, face = 'normal', bob = 0, sweat = false, layer = 'all', noKine = false, cheer = 0 } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (layer !== 'arms') {
    ctx.fillStyle = 'rgba(40,50,80,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 84, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(0, bob);
  if (layer !== 'arms') {
    drawBody(ctx);
    drawHead(ctx, face, sweat);
  }
  // 腕はいつも顔より手前。振り上げのとちゅうでは顔が隠れる
  if (layer !== 'body') {
    if (noKine) {
      // 杵なし：わきへ下ろす／バンザイ
      for (const side of [-1, 1]) {
        arm(
          ctx,
          side * 62,
          -158,
          side * lerp(94, 102, cheer),
          lerp(-118, -200, cheer),
          side * lerp(82, 88, cheer),
          lerp(-70, -290, cheer)
        );
      }
    } else {
      drawArmsAndKine(ctx, lift);
    }
  }
  ctx.restore();
}
