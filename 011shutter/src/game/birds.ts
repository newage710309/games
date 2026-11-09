// 鳥（エナガ・ヤマガラ・ゴジュウカラ・アカゲラ・カラス）を Canvas2D で描く。画像ファイルは使わない。
// 007 の guests.ts の鳥の描画をコピーし、羽ばたき（飛び立つ・飛んでくる）と重さの「・」を描き足したもの。
// どれも正面向きで、(cx, cy) = 足元の中心（枝の上面）。scale 1 で高さ 約 34px。

import { drawSakura } from './sakura';

const LINE = '#4a3326';

export type BirdKind = 'enaga' | 'yamagara' | 'gojukara' | 'akagera' | 'karasu';

export const BIRD_KINDS: readonly BirdKind[] = ['enaga', 'yamagara', 'gojukara', 'akagera', 'karasu'];

export const BIRD_NAME: Record<BirdKind, string> = {
  enaga: 'エナガ',
  yamagara: 'ヤマガラ',
  gojukara: 'ゴジュウカラ',
  akagera: 'アカゲラ',
  karasu: 'カラス'
};

/** 鳥の重さ（「・」の数）。 */
export const BIRD_WEIGHT: Record<BirdKind, number> = {
  enaga: 1,
  yamagara: 2,
  gojukara: 2,
  akagera: 3,
  karasu: 4
};

/** 体の半分の幅（scale 1）。「・」の位置に使う。 */
export const BIRD_HALF_W: Record<BirdKind, number> = {
  enaga: 16,
  yamagara: 12.5,
  gojukara: 12.5,
  akagera: 12.5,
  karasu: 13
};

/** 体の高さ（scale 1）。吹き出しの位置に使う。 */
export const BIRD_H: Record<BirdKind, number> = {
  enaga: 33,
  yamagara: 31,
  gojukara: 31,
  akagera: 33,
  karasu: 34
};

/** 顔つき。happy = 注文どおりでにっこり、puzzled = 注文がかなわず「？」、shock = 枝が落ちて飛び立つとき。 */
export type Mood = 'normal' | 'happy' | 'puzzled' | 'shock';

export interface BirdOptions {
  scale?: number;
  mood?: Mood;
  /** 羽ばたき 0..1。1 で翼を大きく広げる（飛んでいるとき）。 */
  flap?: number;
  /** 横にふくらむ量（だんごで押し合うとき）。0.2 で 2 割広がる。 */
  puff?: number;
  /** 回転（ラジアン、足元を中心に）。 */
  rotate?: number;
  /** 重さの「・」を描くか。 */
  dots?: boolean;
  alpha?: number;
}

/** 今描いている鳥の翼の持ち上げ量（drawBird ごとに切りかえる）。 */
let wingLift = 0;

/** 下ぶくれの体（鳥用）。底が y = 0、てっぺんが y = -h。 */
function blobPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w * 0.62, -h, w, -h * 0.58, w, -h * 0.3);
  ctx.bezierCurveTo(w, -h * 0.04, w * 0.6, 0, 0, 0);
  ctx.bezierCurveTo(-w * 0.6, 0, -w, -h * 0.04, -w, -h * 0.3);
  ctx.bezierCurveTo(-w, -h * 0.58, -w * 0.62, -h, 0, -h);
  ctx.closePath();
}

function stroke(ctx: CanvasRenderingContext2D, w = 1.1, color = LINE): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** 目。黒い体の上でも見えるように、ring を指定すると白いふちを付ける。 */
function eyes(ctx: CanvasRenderingContext2D, dx: number, y: number, r: number, mood: Mood, ring = false): void {
  for (const s of [-1, 1]) {
    const x = s * dx;
    if (mood === 'shock') {
      if (ring) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#1c1418';
      ctx.lineWidth = Math.max(0.7, r * 0.5);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1c1418';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (mood === 'happy') {
      ctx.strokeStyle = ring ? '#ffffff' : '#1c1418';
      ctx.lineWidth = Math.max(0.9, r * 0.7);
      ctx.beginPath();
      ctx.moveTo(x - r * 1.2, y + r * 0.3);
      ctx.quadraticCurveTo(x, y - r * 1.5, x + r * 1.2, y + r * 0.3);
      ctx.stroke();
      continue;
    }
    if (ring) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r + 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1c1418';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 鳥の足（2 本）。 */
function birdFeet(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 4, -2);
    ctx.lineTo(s * 4, 1);
    ctx.moveTo(s * 4, 1);
    ctx.lineTo(s * 6, 1.6);
    ctx.moveTo(s * 4, 1);
    ctx.lineTo(s * 2.2, 1.6);
  }
  ctx.stroke();
}

/** 体の横の翼（鳥用）。 */
function sideWings(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, patch?: string): void {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    // 羽ばたき：翼のつけ根を中心に、外へ持ち上げる
    if (wingLift > 0) {
      ctx.translate(w - 3.2, -h * 0.62);
      ctx.rotate(-wingLift * 1.9);
      ctx.scale(1 + wingLift * 0.5, 1 + wingLift * 0.3);
      ctx.translate(-(w - 3.2), h * 0.62);
    }
    ctx.beginPath();
    ctx.moveTo(w - 3.2, -h * 0.62);
    ctx.quadraticCurveTo(w + 3.6, -h * 0.4, w + 1.4, -h * 0.08);
    ctx.quadraticCurveTo(w - 2.6, -h * 0.2, w - 3.2, -h * 0.62);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    stroke(ctx, 0.9);
    if (patch) {
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.ellipse(w - 0.2, -h * 0.46, 1.5, 2.8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** 体の中だけを塗る（模様用）。 */
function clipped(ctx: CanvasRenderingContext2D, path: () => void, paint: () => void): void {
  ctx.save();
  path();
  ctx.clip();
  paint();
  ctx.restore();
}

function puzzledMark(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('？', x, y);
  ctx.fillStyle = '#d94d78';
  ctx.fillText('？', x, y);
}

// --- 鳥 --------------------------------------------------------------------

function drawKarasu(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const w = 13;
  const h = 34;
  birdFeet(ctx, '#3a3a44');
  const g = ctx.createLinearGradient(-10, -34, 10, 0);
  g.addColorStop(0, '#4a4958');
  g.addColorStop(1, '#23222b');
  ctx.fillStyle = g;
  blobPath(ctx, w, h);
  ctx.fill();
  stroke(ctx, 1.1, '#15141a');
  // 羽のつや
  ctx.strokeStyle = 'rgba(140,150,220,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -14, 8, Math.PI * 1.15, Math.PI * 1.55);
  ctx.stroke();
  sideWings(ctx, w, h, '#1b1a21');
  eyes(ctx, 5, -25, 1.3, mood, true);
  // 太いくちばし
  ctx.fillStyle = '#3d3d47';
  ctx.beginPath();
  ctx.moveTo(-3.4, -23);
  ctx.quadraticCurveTo(0, -25.5, 3.4, -23);
  ctx.lineTo(0, -15.5);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 0.8, '#101015');
}

function drawYamagara(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const w = 12.5;
  const h = 31;
  birdFeet(ctx, '#6a5a52');
  const path = (): void => blobPath(ctx, w, h);
  ctx.fillStyle = '#c9743a';
  path();
  ctx.fill();
  clipped(ctx, path, () => {
    // 白っぽい顔、黒い頭、黒いのど
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath();
    ctx.ellipse(0, -21.5, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#23201f';
    ctx.beginPath();
    ctx.ellipse(0, -33, 15, 8.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath();
    ctx.ellipse(0, -26.4, 2.8, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#23201f';
    ctx.beginPath();
    ctx.ellipse(0, -15.2, 2.6, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  path();
  stroke(ctx);
  sideWings(ctx, w, h, '#6d7684');
  eyes(ctx, 4.2, -24.2, 1.2, mood, true);
  ctx.fillStyle = '#2a2224';
  ctx.beginPath();
  ctx.moveTo(-1.4, -22.2);
  ctx.lineTo(1.4, -22.2);
  ctx.lineTo(0, -19.4);
  ctx.closePath();
  ctx.fill();
}

function drawGojukara(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const w = 12.5;
  const h = 31;
  birdFeet(ctx, '#7a6a60');
  const path = (): void => blobPath(ctx, w, h);
  ctx.fillStyle = '#f3f5f7';
  path();
  ctx.fill();
  clipped(ctx, path, () => {
    // 青灰色の頭（てっぺん）と、脇腹のだいだい
    ctx.fillStyle = '#7d93ad';
    ctx.beginPath();
    ctx.ellipse(0, -33, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0a47a';
    ctx.beginPath();
    ctx.ellipse(-11, -6, 5, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(11, -6, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 目を通る黒いすじ
    ctx.strokeStyle = '#1e1d22';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-14, -21.5);
    ctx.quadraticCurveTo(-6, -25, -2.2, -24);
    ctx.moveTo(14, -21.5);
    ctx.quadraticCurveTo(6, -25, 2.2, -24);
    ctx.stroke();
  });
  path();
  stroke(ctx);
  sideWings(ctx, w, h, '#7d93ad');
  eyes(ctx, 4.8, -24.2, 1.25, mood);
  // とがったくちばし
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath();
  ctx.moveTo(-1.3, -22.6);
  ctx.lineTo(1.3, -22.6);
  ctx.lineTo(0, -17.8);
  ctx.closePath();
  ctx.fill();
}

function drawAkagera(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const w = 12.5;
  const h = 33;
  birdFeet(ctx, '#5a5a62');
  const path = (): void => blobPath(ctx, w, h);
  ctx.fillStyle = '#fbfaf6';
  path();
  ctx.fill();
  clipped(ctx, path, () => {
    // 黒い頭、黒いひげ線、赤いおなか
    ctx.fillStyle = '#1f1e24';
    ctx.beginPath();
    ctx.ellipse(0, -35, 13, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f1e24';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-1.6, -19.5);
    ctx.quadraticCurveTo(-7, -18, -14, -21);
    ctx.moveTo(1.6, -19.5);
    ctx.quadraticCurveTo(7, -18, 14, -21);
    ctx.stroke();
    ctx.fillStyle = '#d63a3e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  path();
  stroke(ctx);
  sideWings(ctx, w, h, '#1f1e24', '#ffffff');
  eyes(ctx, 4.6, -24.5, 1.25, mood);
  // まっすぐなくちばし
  ctx.fillStyle = '#3d3d47';
  ctx.beginPath();
  ctx.moveTo(-1.4, -22.8);
  ctx.lineTo(1.4, -22.8);
  ctx.lineTo(0, -17);
  ctx.closePath();
  ctx.fill();
}

// --- まとめ ---------------------------------------------------------------

const DRAW: Record<Exclude<BirdKind, 'enaga'>, (ctx: CanvasRenderingContext2D, mood: Mood) => void> = {
  karasu: drawKarasu,
  yamagara: drawYamagara,
  gojukara: drawGojukara,
  akagera: drawAkagera
};

/** 重さの「・」。(x, y) から上へ縦に並べる。黒い体の上でも見えるよう白いふちをつける。 */
export function drawWeightDots(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, r = 1.6, gap = 4.4): void {
  for (let k = 0; k < n; k++) {
    const yy = y - k * gap;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, yy, r + 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b2a30';
    ctx.beginPath();
    ctx.arc(x, yy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** エナガ（さくらちゃん形）の羽ばたき。正面の絵の上に、広げた黒い翼を重ねる。 */
function flapWingsEnaga(ctx: CanvasRenderingContext2D, flap: number): void {
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.translate(11, -12);
    ctx.rotate(-0.1 - flap * 0.75);
    ctx.fillStyle = '#262024';
    ctx.strokeStyle = '#4a4f5e';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(12, -7, 24, -1);
    ctx.quadraticCurveTo(13, 7, 0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/** 鳥を (cx, cy) = 足元 に描く。 */
export function drawBird(ctx: CanvasRenderingContext2D, cx: number, cy: number, kind: BirdKind, opts: BirdOptions = {}): void {
  const { scale = 1, mood = 'normal', flap = 0, puff = 0, rotate = 0, dots = false, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.save();
  ctx.scale(1 + puff, 1 - puff * 0.3);
  if (kind === 'enaga') {
    // エナガはさくらちゃんと同じ形（白い体・花飾りなし）。
    if (flap > 0) flapWingsEnaga(ctx, flap);
    drawSakura(ctx, 0, -14.5 * 1.15, {
      scale: 1.15,
      bird: 'yukimaru',
      eyes: mood === 'happy' ? 'happy' : mood === 'shock' ? 'shock' : 'dot',
      shadow: false
    });
  } else {
    wingLift = flap;
    DRAW[kind](ctx, mood);
    wingLift = 0;
  }
  ctx.restore();
  if (dots) drawWeightDots(ctx, BIRD_HALF_W[kind] * (1 + puff) + 2.2, -3, BIRD_WEIGHT[kind]);
  if (mood === 'puzzled') puzzledMark(ctx, BIRD_HALF_W[kind] + 3, -BIRD_H[kind] - 2);
  ctx.restore();
}
