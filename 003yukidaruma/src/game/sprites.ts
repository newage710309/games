// キャラクターと氷のブロックを Canvas2D で描く。画像ファイルは使わない。

const KAPPA = 0.5523;

// --- さくらちゃん（桜色のシマエナガ） ------------------------------------
// 「さくらちゃんの大横断」と同じデザイン（手描き風の輪郭、下ぶくれで底の丸い体、
// 離れた点の目、黒い翼、向かって右の頭に桜の花飾り。足はなし）。
// 進む向きで描き分ける：下 = 正面、上 = 後ろ姿、左右 = 真横。後ろ姿と真横には上向きの尻尾が見える。

const SAKURA = {
  bodyLight: '#fff6f8',
  body: '#fbe1e8',
  line: '#5e3448',
  wing: '#262024',
  wingFeather: 'rgba(255,255,255,0.6)',
  ink: '#1c1418',
  beak: '#3a2a30',
  cheek: 'rgba(242,120,150,0.6)',
  petal: '#f283a8',
  flowerCenter: '#d94d78',
  stamen: '#ffe38a',
  shadow: 'rgba(40,70,110,0.2)'
} as const;

/** 見た目の向き。front = 正面（下向き）、back = 後ろ姿（上向き）、left / right = 真横。 */
export type SakuraView = 'front' | 'back' | 'left' | 'right';

export interface SakuraOptions {
  view?: SakuraView;
  /** 正面のときの目線。-1 = 左、0 = 正面、1 = 右。顔のパーツを寄せて向きを表す。 */
  gaze?: number;
  /** 上を向いている（顔のパーツを少し上へ）。 */
  up?: boolean;
  /** 大きさ。1 で幅 約 29px。 */
  scale?: number;
  /** 横につぶす量（押すしぐさ・着地）。正で横に広がり縦に縮む。 */
  squash?: number;
  /** × の目。 */
  dead?: boolean;
  /** 影を描くか。 */
  shadow?: boolean;
  /** 回転（ラジアン）。 */
  rotate?: number;
}

/** 体の輪郭。頭は丸く、下半分がふっくら広がる「おもち」形。 */
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

/** 桜の花。5 枚の花びらを中心から放射状に並べる。 */
export function drawSakuraFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rotate = -0.25,
  outline = true
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotate);
  for (let k = 0; k < 5; k++) {
    ctx.save();
    ctx.rotate((k / 5) * Math.PI * 2 - Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = SAKURA.petal;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = SAKURA.line;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = SAKURA.flowerCenter;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SAKURA.stamen;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** さくらちゃんを (cx, cy) を中心に描く。 */
export function drawSakura(ctx: CanvasRenderingContext2D, cx: number, cy: number, opts: SakuraOptions = {}): void {
  const { view = 'front', gaze = 0, up = false, scale = 1, squash = 0, dead = false, shadow = true, rotate = 0 } = opts;
  const fx = gaze * 1.6;
  const fy = up ? -1.6 : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shadow) {
    ctx.fillStyle = SAKURA.shadow;
    ctx.beginPath();
    ctx.ellipse(0, 15.4, 12 * (1 + squash * 0.6), 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // つぶれるときは足元（y = 16）を支点にする
  ctx.translate(0, 16);
  ctx.scale(1 + squash, 1 - squash);
  ctx.rotate(rotate);
  ctx.translate(0, -17.5);

  if (view === 'back') {
    drawSakuraBack(ctx);
    ctx.restore();
    return;
  }
  if (view === 'left' || view === 'right') {
    drawSakuraSide(ctx, view === 'right' ? 1 : -1);
    ctx.restore();
    return;
  }

  fillBody(ctx, bodyPath, -4);

  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-12.4, 0.6);
  ctx.lineTo(-10.9, 1.9);
  ctx.lineTo(-12.7, 3.0);
  ctx.moveTo(12.3, -0.4);
  ctx.lineTo(10.8, 0.9);
  ctx.lineTo(12.6, 2.0);
  ctx.stroke();

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(9.6, 4.4);
    ctx.quadraticCurveTo(13.4, 7.2, 12.0, 11.4);
    ctx.quadraticCurveTo(9.9, 9.6, 9.6, 4.4);
    ctx.closePath();
    ctx.fillStyle = SAKURA.wing;
    ctx.fill();
    ctx.strokeStyle = SAKURA.line;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.strokeStyle = SAKURA.wingFeather;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(10.7, 7.4);
    ctx.lineTo(12.1, 8.3);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = SAKURA.cheek;
  ctx.beginPath();
  ctx.ellipse(-8.4 + fx, 2.4 + fy, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.ellipse(8.4 + fx, 2.4 + fy, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dead) {
    ctx.strokeStyle = SAKURA.ink;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const ex of [-5.8, 5.8]) {
      ctx.moveTo(ex - 1.7, -4.1);
      ctx.lineTo(ex + 1.7, -0.7);
      ctx.moveTo(ex + 1.7, -4.1);
      ctx.lineTo(ex - 1.7, -0.7);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = SAKURA.ink;
    ctx.beginPath();
    ctx.arc(-5.8 + fx, -2.4 + fy, 1.35, 0, Math.PI * 2);
    ctx.arc(5.8 + fx, -2.4 + fy, 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = SAKURA.beak;
  ctx.beginPath();
  ctx.moveTo(-1.3 + fx, -0.2 + fy);
  ctx.lineTo(1.3 + fx, -0.2 + fy);
  ctx.lineTo(fx, 1.6 + fy);
  ctx.closePath();
  ctx.fill();

  drawSakuraFlower(ctx, 6.4, -9.6, 4.6);

  ctx.restore();
}

/**
 * 上向きに立てた黒い尻尾。(x, y) が付け根、tilt は傾き（ラジアン、0 で真上、負で左＝うしろへ）。
 * 正面からは体に隠れて見えないので、後ろ姿と横向きだけで描く。
 */
function drawTail(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(-2.4, 0);
  ctx.quadraticCurveTo(-3.2, -9, -1.2, -17.5);
  ctx.quadraticCurveTo(0, -19.2, 1.2, -17.5);
  ctx.quadraticCurveTo(3.2, -9, 2.4, 0);
  ctx.closePath();
  ctx.fillStyle = SAKURA.wing;
  ctx.fill();
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // 羽の縁取り
  ctx.strokeStyle = SAKURA.wingFeather;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, -14.5);
  ctx.stroke();
  ctx.restore();
}

/** 体を塗って、手描き風の輪郭（本線＋少しずらした途切れ線）を引く。 */
function fillBody(ctx: CanvasRenderingContext2D, path: (ctx: CanvasRenderingContext2D) => void, lightX: number): void {
  const grad = ctx.createRadialGradient(lightX, -6, 1, 0, 2, 16);
  grad.addColorStop(0, SAKURA.bodyLight);
  grad.addColorStop(1, SAKURA.body);
  ctx.fillStyle = grad;
  path(ctx);
  ctx.fill();
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 1.2;
  path(ctx);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha *= 0.45;
  ctx.translate(0.5, -0.3);
  ctx.setLineDash([26, 7]);
  path(ctx);
  ctx.stroke();
  ctx.restore();
}

/**
 * 後ろ姿（上へ進むとき）。顔は見えず、背中に黒い翼をたたんでいる。
 * 花飾りは頭の右側（正面から見て向かって右）なので、後ろからは向かって左に見える。
 */
function drawSakuraBack(ctx: CanvasRenderingContext2D): void {
  fillBody(ctx, bodyPath, 4);

  // 後頭部の羽毛の線
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha *= 0.6;
  ctx.beginPath();
  ctx.moveTo(-2.6, -6.4);
  ctx.quadraticCurveTo(0, -4.8, 2.6, -6.4);
  ctx.moveTo(-1.6, -3.4);
  ctx.quadraticCurveTo(0, -2.4, 1.6, -3.4);
  ctx.stroke();
  ctx.globalAlpha /= 0.6;

  drawTail(ctx, 0, 13.5, 0);

  // 背中にたたんだ翼（左右から背中の下のほうへ）
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(6.8, 3.6);
    ctx.quadraticCurveTo(12.6, 5.8, 12.2, 11.8);
    ctx.quadraticCurveTo(7.6, 10.8, 6.8, 3.6);
    ctx.closePath();
    ctx.fillStyle = SAKURA.wing;
    ctx.fill();
    ctx.strokeStyle = SAKURA.line;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // 羽の縁取り
    ctx.strokeStyle = SAKURA.wingFeather;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(8.6, 7.2);
    ctx.lineTo(11, 8.4);
    ctx.stroke();
    ctx.restore();
  }

  drawSakuraFlower(ctx, -6.4, -9.6, 4.6, 0.25);
}

/** 横顔の体の輪郭（右向き）。正面と同じ下ぶくれの「おもち」形で、頭だけ進む向きへ少し出す。 */
function sidePath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  const a = 14.3;
  const cy = 7;
  const b = 9;
  ctx.moveTo(1.5, -12.8);
  ctx.bezierCurveTo(8.8, -12.8, 12.5, -8.2, 13, -3.0);
  ctx.bezierCurveTo(13.4, 1.8, a, 4.2, a, cy);
  ctx.bezierCurveTo(a, cy + KAPPA * b, KAPPA * a, cy + b, 0, cy + b);
  ctx.bezierCurveTo(-KAPPA * a, cy + b, -a, cy + KAPPA * b, -a, cy);
  ctx.bezierCurveTo(-a, 3.6, -13.4, 0.4, -12, -2.8);
  ctx.bezierCurveTo(-10, -8.6, -5.6, -12.8, 1.5, -12.8);
  ctx.closePath();
}

/**
 * 真横の姿（左右へ進むとき）。dir = 1 で右向き、-1 で左向き（左右反転）。
 * 花飾りは頭の右側に付いているので、右向きなら手前に見え、左向きなら頭の向こう側から少しのぞく。
 */
function drawSakuraSide(ctx: CanvasRenderingContext2D, dir: number): void {
  ctx.save();
  ctx.scale(dir, 1);

  // 左向きのときの花飾り：体より先に描いて、頭のうしろに隠す
  if (dir < 0) drawSakuraFlower(ctx, -1.5, -11.6, 4.4, 0.4);

  drawTail(ctx, -10.5, 5, -0.55);

  fillBody(ctx, sidePath, 2);

  // 翼：体の横に、うしろ下へ向けてたたむ
  ctx.beginPath();
  ctx.moveTo(-1.6, 4.2);
  ctx.quadraticCurveTo(-8.6, 2.6, -13.4, 9.6);
  ctx.quadraticCurveTo(-7.4, 12, -1.6, 4.2);
  ctx.closePath();
  ctx.fillStyle = SAKURA.wing;
  ctx.fill();
  ctx.strokeStyle = SAKURA.line;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = SAKURA.wingFeather;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, 6.4);
  ctx.lineTo(-10.4, 8.6);
  ctx.stroke();

  // ほっぺ・目・くちばし（顔は進む向きの端に寄せる）
  ctx.fillStyle = SAKURA.cheek;
  ctx.beginPath();
  ctx.ellipse(8, 2.4, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SAKURA.ink;
  ctx.beginPath();
  ctx.arc(8.4, -2.4, 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SAKURA.beak;
  ctx.beginPath();
  ctx.moveTo(12.8, -1.8);
  ctx.lineTo(15.8, -0.5);
  ctx.lineTo(12.9, 0.8);
  ctx.closePath();
  ctx.fill();

  // 右向きのときの花飾り：手前（頭の横、目のうしろ上）
  if (dir > 0) drawSakuraFlower(ctx, 2.2, -9.6, 4.6);

  ctx.restore();
}

// --- 雪だるま（敵） ------------------------------------------------------

const SNOW = {
  body: '#ffffff',
  shade: '#d5e4f2',
  line: '#5b7390',
  coal: '#26303c',
  carrot: '#f08a34',
  bucket: '#4f86c6',
  bucketDark: '#3a6aa3',
  twig: '#7a5536',
  shadow: 'rgba(40,70,110,0.22)',
  cheek: 'rgba(255,150,170,0.55)',
  star: '#ffd84a'
} as const;

export interface SnowmanOptions {
  /** 左右の向き（-1 / 1）。にんじんの鼻の向き。 */
  facing?: number;
  scale?: number;
  /** 経過時間（ゆれ・星の回転に使う）。 */
  time?: number;
  /** 歩いた量。体を左右にゆらす。 */
  walk?: number;
  /** 気絶中（目がぐるぐる、頭の上に星）。 */
  stun?: boolean;
  /** 急いでいる（時間がたって速くなった）。まゆ毛がつり上がる。 */
  angry?: boolean;
  /** 氷を壊している（手を上げて、体をこきざみにゆらす）。 */
  breaking?: boolean;
  /** つぶれ具合 0..1。 */
  flat?: number;
  /** 押された向きの横成分。0 以外なら横から押されて縦長に、0 なら上下から押されて横長につぶれる。 */
  flatDx?: number;
  /** 回転（飛んでいくとき）。 */
  rotate?: number;
  alpha?: number;
  shadow?: boolean;
  /** にっこり顔（幕間デモ用）。 */
  smile?: boolean;
  /** あせ（幕間デモで逃げるとき）。 */
  sweat?: boolean;
  /** とける量 0..1（エンディング用）。 */
  melt?: number;
}

/** 雪だるまを (cx, cy) を中心に描く。scale 1 で高さ 約 36px。 */
export function drawSnowman(ctx: CanvasRenderingContext2D, cx: number, cy: number, opts: SnowmanOptions = {}): void {
  const {
    facing = 1,
    scale = 1,
    time = 0,
    walk = 0,
    stun = false,
    angry = false,
    breaking = false,
    flat = 0,
    flatDx = 0,
    rotate = 0,
    alpha = 1,
    shadow = true,
    smile = false,
    sweat = false,
    melt = 0
  } = opts;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shadow) {
    ctx.fillStyle = SNOW.shadow;
    ctx.beginPath();
    ctx.ellipse(0, 16, 12 + melt * 6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // とけた水たまり
  if (melt > 0) {
    ctx.fillStyle = `rgba(170,215,245,${0.35 + melt * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(0, 15.5, 8 + melt * 13, 2 + melt * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // つぶれる：押された向きに薄く、垂直方向に広がる
  if (flat > 0) {
    const thin = 1 - flat * 0.55;
    const wide = 1 + flat * 0.2;
    if (flatDx !== 0) ctx.scale(thin, wide);
    else ctx.scale(wide, thin);
  }

  ctx.translate(0, 16);
  let sway = Math.sin(walk * Math.PI * 2) * 0.07;
  if (breaking) sway = Math.sin(time * 40) * 0.06;
  if (stun) sway = Math.sin(time * 6) * 0.12;
  ctx.rotate(sway + rotate);
  ctx.scale(1 + melt * 0.25, 1 - melt * 0.72);
  ctx.translate(0, -16);

  // 腕（小枝）。壊しているときは上げる
  ctx.strokeStyle = SNOW.twig;
  ctx.lineWidth = 1.6;
  for (const side of [-1, 1]) {
    const lift = breaking ? -7 + Math.sin(time * 40 + side) * 2 : 0;
    ctx.beginPath();
    ctx.moveTo(side * 8, 3);
    ctx.lineTo(side * 16, -1 + lift);
    ctx.moveTo(side * 13.2, 0 + lift * 0.7);
    ctx.lineTo(side * 15, -4 + lift * 0.8);
    ctx.stroke();
  }

  // 体（下の玉）
  const bodyGrad = ctx.createRadialGradient(-3, 2, 1, 0, 6, 12);
  bodyGrad.addColorStop(0, SNOW.body);
  bodyGrad.addColorStop(1, SNOW.shade);
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = SNOW.line;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 6, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // ボタン
  ctx.fillStyle = SNOW.coal;
  ctx.beginPath();
  ctx.arc(0, 3.5, 1.1, 0, Math.PI * 2);
  ctx.arc(0, 8, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // 頭（上の玉）
  const headGrad = ctx.createRadialGradient(-2.5, -11, 1, 0, -8, 9);
  headGrad.addColorStop(0, SNOW.body);
  headGrad.addColorStop(1, SNOW.shade);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -8, 7.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // バケツの帽子（少し傾ける）
  ctx.save();
  ctx.translate(0, -14.2);
  ctx.rotate(-0.12 * facing);
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

  const fx = facing * 1.2;

  // ほっぺ
  ctx.fillStyle = SNOW.cheek;
  ctx.beginPath();
  ctx.ellipse(-4.4 + fx, -5.6, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(4.4 + fx, -5.6, 1.7, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 目
  if (stun) {
    ctx.strokeStyle = SNOW.coal;
    ctx.lineWidth = 0.9;
    for (const ex of [-2.8, 2.8]) {
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 3.2 + time * 8;
        const r = 0.3 + (k / 16) * 1.7;
        const x = ex + fx + Math.cos(a) * r;
        const y = -9 + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (smile) {
    ctx.strokeStyle = SNOW.coal;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const ex of [-2.8, 2.8]) {
      ctx.moveTo(ex + fx - 1.3, -8.6);
      ctx.quadraticCurveTo(ex + fx, -10.4, ex + fx + 1.3, -8.6);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = SNOW.coal;
    ctx.beginPath();
    ctx.arc(-2.8 + fx, -9, 1.2, 0, Math.PI * 2);
    ctx.arc(2.8 + fx, -9, 1.2, 0, Math.PI * 2);
    ctx.fill();
    if (angry) {
      ctx.strokeStyle = SNOW.coal;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-4.6 + fx, -12.2);
      ctx.lineTo(-1.4 + fx, -11);
      ctx.moveTo(4.6 + fx, -12.2);
      ctx.lineTo(1.4 + fx, -11);
      ctx.stroke();
    }
  }

  // にんじんの鼻（向いているほうへ）
  ctx.fillStyle = SNOW.carrot;
  ctx.beginPath();
  ctx.moveTo(fx, -7.9);
  ctx.lineTo(fx + facing * 6.5, -6.6);
  ctx.lineTo(fx, -5.6);
  ctx.closePath();
  ctx.fill();

  // 口（炭の点）
  ctx.fillStyle = SNOW.coal;
  const mouth = smile ? [-2.2, -1.1, 0, 1.1, 2.2] : [-1.6, 0, 1.6];
  for (const [k, mx] of mouth.entries()) {
    const my = smile ? -3.6 + Math.abs(k - (mouth.length - 1) / 2) * -0.45 : -3.4;
    ctx.beginPath();
    ctx.arc(mx + fx, my, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (sweat) {
    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath();
    ctx.moveTo(-8.5, -13);
    ctx.quadraticCurveTo(-10.5, -9.5, -8.5, -8.5);
    ctx.quadraticCurveTo(-6.5, -9.5, -8.5, -13);
    ctx.fill();
  }

  ctx.restore();

  // 気絶の星（回転に巻きこまれないよう、体とは別に描く）
  if (stun) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy - 22 * scale);
    for (let k = 0; k < 3; k++) {
      const a = time * 4 + (k / 3) * Math.PI * 2;
      drawStar(ctx, Math.cos(a) * 9 * scale, Math.sin(a) * 3 * scale, 2.6 * scale, SNOW.star);
    }
    ctx.restore();
  }
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
    const rr = k % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// --- 氷のブロック --------------------------------------------------------

export interface IceOptions {
  /** 卵を見せる（面の始めの点滅）。 */
  showEgg?: boolean;
  /** ひび 0..1（雪だるまが壊しているところ）。 */
  crack?: number;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 氷のブロック。(x, y) は左上、size は 1 辺。 */
export function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opts: IceOptions = {}): void {
  const { showEgg = false, crack = 0 } = opts;
  const m = size * 0.04;
  const s = size - m * 2;
  const x0 = x + m;
  const y0 = y + m;

  const grad = ctx.createLinearGradient(x0, y0, x0 + s, y0 + s);
  if (showEgg) {
    grad.addColorStop(0, '#fff3f7');
    grad.addColorStop(1, '#f6b8cc');
  } else {
    grad.addColorStop(0, '#d8f3ff');
    grad.addColorStop(0.55, '#a6dcf4');
    grad.addColorStop(1, '#7cc1e4');
  }
  ctx.fillStyle = grad;
  roundRect(ctx, x0, y0, s, s, size * 0.12);
  ctx.fill();
  ctx.strokeStyle = showEgg ? '#d9789a' : '#4f98c2';
  ctx.lineWidth = Math.max(1, size * 0.035);
  ctx.stroke();

  // つや（左上の光と、斜めの筋）
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  roundRect(ctx, x0 + s * 0.12, y0 + s * 0.1, s * 0.46, s * 0.12, s * 0.06);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  ctx.moveTo(x0 + s * 0.62, y0 + s * 0.78);
  ctx.lineTo(x0 + s * 0.82, y0 + s * 0.58);
  ctx.stroke();

  if (showEgg) {
    // 中の卵（小さな雪だるまの頭）
    drawSnowman(ctx, x + size / 2, y + size * 0.62, { scale: size / 80, shadow: false });
  }

  if (crack > 0) {
    ctx.strokeStyle = `rgba(40,90,130,${0.4 + crack * 0.5})`;
    ctx.lineWidth = Math.max(1, size * 0.03);
    const cxm = x + size / 2;
    const cym = y + size / 2;
    const len = crack * s * 0.5;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + 0.4;
      ctx.moveTo(cxm, cym);
      ctx.lineTo(cxm + Math.cos(a) * len, cym + Math.sin(a) * len);
      ctx.lineTo(cxm + Math.cos(a + 0.4) * len * 1.2, cym + Math.sin(a + 0.4) * len * 1.2);
    }
    ctx.stroke();
  }
}
