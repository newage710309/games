// 雪だるま（入場お断りのお客さん）と、その変装を Canvas2D で描く。
// 雪だるま退治（003）の雪だるまと同じデザイン。(cx, cy) = 足元の中心。scale 1 で高さ 約 36px。
// どの変装でも「にんじんの鼻」「小枝の腕」「下の段の雪玉のまるい形」のどれかが必ず見えるようにする。

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

const LINE = '#4a3326';

export type Disguise =
  | 'none'
  | 'karasu'
  | 'risu'
  | 'kitsune'
  | 'usagi'
  | 'sumi'
  | 'doro'
  | 'kigurumi'
  | 'shimaenaga';

export const DISGUISE_NAME: Record<Disguise, string> = {
  none: 'ふつうの雪だるま',
  karasu: 'カラスのお面',
  risu: 'リスの耳としっぽ',
  kitsune: 'キツネのお面',
  usagi: 'ウサギの耳',
  sumi: '炭で黒くぬる',
  doro: 'どろで茶色くぬる',
  kigurumi: 'キツネの着ぐるみ',
  shimaenaga: 'シマエナガのお面'
};

/** 見やぶる手がかり（デザイン確認用の説明）。 */
export const DISGUISE_TELL: Record<Disguise, string> = {
  none: 'ぜんぶ',
  karasu: '枝の腕・下の雪玉',
  risu: 'にんじん・枝の腕',
  kitsune: 'にんじん・枝の腕',
  usagi: 'にんじん・枝の腕',
  sumi: 'にんじん・雪玉の形',
  doro: 'にんじん・枝の腕',
  kigurumi: 'にんじん',
  shimaenaga: '枝の腕・下の雪玉'
};

export interface SnowGuestOptions {
  scale?: number;
  hop?: number;
  /** 変装がはがれている（まちがえて入れてしまったとき）。 */
  unmasked?: boolean;
  /** あせっている（お断りされて飛ばされるとき）。 */
  sweat?: boolean;
  rotate?: number;
  shadow?: boolean;
  alpha?: number;
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

function carrot(ctx: CanvasRenderingContext2D, y = -23.8): void {
  // 正面向きなので、こちらへ突き出た鼻を短い三角＋先の丸で表す
  ctx.fillStyle = SNOW.carrot;
  ctx.strokeStyle = '#b85d1c';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-1.6, y - 1.2);
  ctx.lineTo(1.6, y - 1.2);
  ctx.lineTo(0.5, y + 4.2);
  ctx.lineTo(-0.5, y + 4.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function coalFace(ctx: CanvasRenderingContext2D, eyeY = -26, mouth = true): void {
  ctx.fillStyle = SNOW.coal;
  ctx.beginPath();
  ctx.arc(-2.9, eyeY, 1.2, 0, Math.PI * 2);
  ctx.arc(2.9, eyeY, 1.2, 0, Math.PI * 2);
  ctx.fill();
  if (mouth) {
    for (const mx of [-2, -0.7, 0.7, 2]) {
      ctx.beginPath();
      ctx.arc(mx, -18.6 + Math.abs(mx) * -0.3, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
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

/** 頭にかぶるひも（お面・カチューシャを留めている輪ゴム）。 */
function band(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.strokeStyle = 'rgba(90,70,60,0.8)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-7.4, y);
  ctx.quadraticCurveTo(0, y - 1.6, 7.4, y);
  ctx.stroke();
}

/** 雪だるまの基本の形（体・頭）。色を変えると「ぬった」雪だるまになる。 */
function snowBody(ctx: CanvasRenderingContext2D, light: string, dark: string, line: string): void {
  ball(ctx, -10, 10.5, light, dark, line);
  ball(ctx, -24, 7.6, light, dark, line);
}

function buttons(ctx: CanvasRenderingContext2D, color: string = SNOW.coal): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -12.5, 1.1, 0, Math.PI * 2);
  ctx.arc(0, -8, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

function cheeks(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SNOW.cheek;
  ctx.beginPath();
  ctx.ellipse(-4.6, -21.6, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(4.6, -21.6, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function plainSnowman(ctx: CanvasRenderingContext2D, hat = true): void {
  twigArms(ctx);
  snowBody(ctx, SNOW.body, SNOW.shade, SNOW.line);
  buttons(ctx);
  if (hat) bucket(ctx);
  cheeks(ctx);
  coalFace(ctx);
  carrot(ctx);
}

// --- 変装 ------------------------------------------------------------------

function disguiseKarasu(ctx: CanvasRenderingContext2D): void {
  twigArms(ctx, 2);
  snowBody(ctx, SNOW.body, SNOW.shade, SNOW.line);
  buttons(ctx);
  // 黒い羽のマント（肩にかける。下の雪玉の下半分は見えたまま）
  ctx.fillStyle = '#23222b';
  ctx.beginPath();
  ctx.moveTo(-6, -19);
  ctx.quadraticCurveTo(-13, -16, -12.5, -8);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-8.5, -6.5);
  ctx.lineTo(-6, -9.5);
  ctx.quadraticCurveTo(0, -11, 6, -9.5);
  ctx.lineTo(8.5, -6.5);
  ctx.lineTo(10, -10);
  ctx.lineTo(12.5, -8);
  ctx.quadraticCurveTo(13, -16, 6, -19);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#15141a';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // 頭をすっぽり包むカラスのお面（大きなくちばしで鼻をかくす）
  ctx.fillStyle = '#2d2c36';
  ctx.beginPath();
  ctx.ellipse(0, -25, 8.8, 8.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#15141a';
  ctx.stroke();
  // 紙の目（ちょっとずれている）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-3.4, -27, 1.9, 0, Math.PI * 2);
  ctx.arc(3.8, -26.6, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1418';
  ctx.beginPath();
  ctx.arc(-3.2, -26.8, 1.1, 0, Math.PI * 2);
  ctx.arc(3.6, -26.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a4a55';
  ctx.beginPath();
  ctx.moveTo(-3.6, -24.5);
  ctx.quadraticCurveTo(0, -26.5, 3.6, -24.5);
  ctx.lineTo(0, -16.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#15141a';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // 頭の羽かざり
  ctx.fillStyle = '#23222b';
  for (const a of [-0.35, 0, 0.35]) {
    ctx.save();
    ctx.translate(0, -33);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -3.4, 1.4, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function disguiseRisu(ctx: CanvasRenderingContext2D): void {
  // ふさふさのしっぽ（ひもで腰に付けている）
  ctx.fillStyle = '#6e5d55';
  ctx.beginPath();
  ctx.moveTo(7, -6);
  ctx.bezierCurveTo(20, -6, 22, -22, 15, -30);
  ctx.bezierCurveTo(11, -36, 17, -42, 22, -38);
  ctx.bezierCurveTo(28, -32, 26, -12, 19, -4);
  ctx.bezierCurveTo(15, 0, 9, -1, 7, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  plainSnowman(ctx, false);
  // 耳の房毛つきカチューシャ
  ctx.strokeStyle = '#54463f';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -24, 8, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#6e5d55';
    ctx.beginPath();
    ctx.moveTo(s * 3, -30.5);
    ctx.quadraticCurveTo(s * 4.5, -40, s * 8, -41);
    ctx.quadraticCurveTo(s * 9.5, -34, s * 8.5, -28.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.strokeStyle = '#54463f';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(s * 7.8, -40.5);
    ctx.lineTo(s * 7, -44);
    ctx.moveTo(s * 8.2, -40.5);
    ctx.lineTo(s * 9.6, -43.4);
    ctx.stroke();
  }
}

function disguiseKitsune(ctx: CanvasRenderingContext2D): void {
  // キツネのしっぽ（白い先）
  ctx.fillStyle = '#e08a3c';
  ctx.beginPath();
  ctx.moveTo(6, -4);
  ctx.bezierCurveTo(17, -3, 24, -9, 22, -21);
  ctx.bezierCurveTo(18, -15, 12, -11, 6, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.moveTo(22, -21);
  ctx.quadraticCurveTo(24, -15, 20.5, -11.5);
  ctx.quadraticCurveTo(19, -16, 22, -21);
  ctx.fill();
  plainSnowman(ctx, false);
  // 目のところだけのキツネのお面（にんじんの鼻は下から出ている）
  band(ctx, -27);
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#2e2422';
    ctx.beginPath();
    ctx.moveTo(s * 2.5, -30);
    ctx.lineTo(s * 8.5, -38.5);
    ctx.lineTo(s * 9.5, -27);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#e08a3c';
  ctx.beginPath();
  ctx.moveTo(-9.8, -29);
  ctx.quadraticCurveTo(-8, -32.5, 0, -32.5);
  ctx.quadraticCurveTo(8, -32.5, 9.8, -29);
  ctx.quadraticCurveTo(8, -23.5, 2.2, -24.2);
  ctx.lineTo(-2.2, -24.2);
  ctx.quadraticCurveTo(-8, -23.5, -9.8, -29);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.ellipse(-5.8, -26.2, 2.6, 1.4, 0.3, 0, Math.PI * 2);
  ctx.ellipse(5.8, -26.2, 2.6, 1.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // お面の目の穴（中に炭の目）
  ctx.strokeStyle = '#2e2422';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-5, -28.8);
  ctx.lineTo(-2, -28.2);
  ctx.moveTo(5, -28.8);
  ctx.lineTo(2, -28.2);
  ctx.stroke();
}

function disguiseUsagi(ctx: CanvasRenderingContext2D): void {
  plainSnowman(ctx, false);
  band(ctx, -29);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 4, -30);
    ctx.rotate(s * 0.18);
    ctx.fillStyle = '#fbfcff';
    ctx.beginPath();
    ctx.ellipse(0, -8.5, 3.2, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = '#f2c4cf';
    ctx.beginPath();
    ctx.ellipse(0, -7.5, 1.4, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 先の黒は、マジックでぬったのでちょっとはみ出している
    ctx.fillStyle = '#2a2428';
    ctx.beginPath();
    ctx.ellipse(0.4, -16.5, 2.8, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function disguiseSumi(ctx: CanvasRenderingContext2D): void {
  twigArms(ctx);
  snowBody(ctx, '#5a5a66', '#2c2c35', '#15141a');
  buttons(ctx, '#8a8a96');
  // 炭のぬりむら（白いところが少し残る）
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-6, -3.5, 2.2, 1.2, 0.4, 0, Math.PI * 2);
  ctx.ellipse(4.5, -29.5, 1.6, 0.9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // 白い目（炭の目のまわりをぬり残した）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-2.9, -26, 2, 0, Math.PI * 2);
  ctx.arc(2.9, -26, 2, 0, Math.PI * 2);
  ctx.fill();
  coalFace(ctx, -26, false);
  carrot(ctx);
  // 頭に黒い羽を 1 本
  ctx.fillStyle = '#1b1a21';
  ctx.save();
  ctx.translate(2, -31);
  ctx.rotate(0.3);
  ctx.beginPath();
  ctx.ellipse(0, -3.5, 1.4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function disguiseDoro(ctx: CanvasRenderingContext2D): void {
  twigArms(ctx);
  snowBody(ctx, '#a4876c', '#6f5540', '#4a3326');
  buttons(ctx, '#3a2a20');
  // どろのはね
  ctx.fillStyle = 'rgba(80,55,35,0.6)';
  for (const [x, y, r] of [
    [-5, -6, 1.6],
    [6, -13, 1.2],
    [3, -3, 1],
    [-4.5, -29, 1]
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#efe6d6';
  ctx.beginPath();
  ctx.ellipse(0, -9, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  coalFace(ctx);
  carrot(ctx);
  // 頭に葉っぱ
  ctx.fillStyle = '#6e9a4a';
  ctx.save();
  ctx.translate(-2, -32);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, -2.5, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function disguiseKigurumi(ctx: CanvasRenderingContext2D): void {
  // 雪だるま全体を包むキツネの着ぐるみ。顔の穴から雪だるまの顔がのぞく。
  const fur = '#e08a3c';
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(6, -4);
  ctx.bezierCurveTo(17, -3, 24, -9, 22, -21);
  ctx.bezierCurveTo(18, -15, 12, -11, 6, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 体（だぼっとした袋形）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.quadraticCurveTo(-13, -18, -12, 0);
  ctx.lineTo(12, 0);
  ctx.quadraticCurveTo(13, -18, 8, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.ellipse(0, -9, 6, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // チャック
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -15.5);
  ctx.lineTo(0, -2);
  ctx.stroke();
  // フード
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#2e2422';
    ctx.beginPath();
    ctx.moveTo(s * 3, -35);
    ctx.lineTo(s * 9.5, -43);
    ctx.lineTo(s * 11, -30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -26, 10.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 顔の穴（雪だるまの白い顔）
  ctx.fillStyle = SNOW.body;
  ctx.beginPath();
  ctx.ellipse(0, -24.5, 6.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b86a2a';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  cheeks(ctx);
  coalFace(ctx, -26, false);
  carrot(ctx);
  // 着ぐるみの黒い手
  ctx.fillStyle = '#2e2422';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 11.5, -11, 2.2, 2.8, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function disguiseShimaenaga(ctx: CanvasRenderingContext2D): void {
  twigArms(ctx);
  snowBody(ctx, SNOW.body, SNOW.shade, SNOW.line);
  buttons(ctx);
  // 紙の黒い翼（体の横にはりつけている）
  ctx.fillStyle = '#262024';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(8.5, -15);
    ctx.quadraticCurveTo(13, -11, 11.5, -5.5);
    ctx.quadraticCurveTo(9, -8, 8.5, -15);
    ctx.fill();
    ctx.restore();
  }
  // シマエナガの白いお面（頭をすっぽり。にんじんはお面の中）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -25, 9.4, 8.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a4f5e';
  ctx.lineWidth = 1;
  ctx.stroke();
  // お面の顔（点の目・小さなくちばし）
  ctx.fillStyle = '#1c1418';
  ctx.beginPath();
  ctx.arc(-4.4, -25.8, 1.1, 0, Math.PI * 2);
  ctx.arc(4.4, -25.8, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1, -24.4);
  ctx.lineTo(1, -24.4);
  ctx.lineTo(0, -23);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(150,180,220,0.45)';
  ctx.beginPath();
  ctx.ellipse(-6.4, -23.4, 1.8, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(6.4, -23.4, 1.8, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  band(ctx, -27.5);
}

const DRAW: Record<Disguise, (ctx: CanvasRenderingContext2D) => void> = {
  none: (ctx) => plainSnowman(ctx),
  karasu: disguiseKarasu,
  risu: disguiseRisu,
  kitsune: disguiseKitsune,
  usagi: disguiseUsagi,
  sumi: disguiseSumi,
  doro: disguiseDoro,
  kigurumi: disguiseKigurumi,
  shimaenaga: disguiseShimaenaga
};

/** 雪だるまのお客さんを (cx, cy) = 足元 に描く。 */
export function drawSnowGuest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  disguise: Disguise,
  opts: SnowGuestOptions = {}
): void {
  const { scale = 1, hop = 0, unmasked = false, sweat = false, rotate = 0, shadow = true, alpha = 1 } = opts;
  // 雪だるまは跳ねずに、左右にゆれながらすべってくる
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
  ctx.rotate(sway + rotate);
  DRAW[unmasked ? 'none' : disguise](ctx);
  if (sweat) {
    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath();
    ctx.moveTo(-9, -32);
    ctx.quadraticCurveTo(-11, -28.5, -9, -27.5);
    ctx.quadraticCurveTo(-7, -28.5, -9, -32);
    ctx.fill();
  }
  ctx.restore();
}

const MASK_COLOR: Partial<Record<Disguise, string>> = {
  karasu: '#2d2c36',
  risu: '#6e5d55',
  kitsune: '#e08a3c',
  usagi: '#fbfcff',
  kigurumi: '#e08a3c',
  shimaenaga: '#ffffff'
};

/** はがれ落ちたお面（まちがえて入れてしまったとき）。ぬった変装はお面がないので何も描かない。 */
export function drawDroppedMask(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  disguise: Disguise,
  scale: number,
  rotate: number
): void {
  const color = MASK_COLOR[disguise];
  if (color === undefined) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,30,30,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3.2, -1, 1.5, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(3.2, -1, 1.5, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
