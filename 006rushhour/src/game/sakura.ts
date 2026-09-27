// さくらちゃん（主人公）を Canvas2D で描く。画像ファイルは使わない。
// 雪だるま退治（003）と同じデザインに、つまみ食い用の表情（ほっぺの膨らみ・目の形・赤面）を足したもの。

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
};

type Palette = typeof SAKURA;

/** ゆきまるくん（白いシマエナガの男の子）。形はさくらちゃんと同じで、色だけ変える。花飾りはなし。 */
const YUKIMARU: Palette = {
  ...SAKURA,
  bodyLight: '#ffffff',
  body: '#eef3f8',
  line: '#4a4f5e',
  cheek: 'rgba(150,180,220,0.45)'
};

/** 今描いている鳥の色（drawSakura の呼び出しごとに切りかえる）。 */
let C: Palette = SAKURA;
let showFlower = true;

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
  /** 目の形（正面のみ）。dot = ふつう、happy = にっこり閉じた目、shock = 見つかってびっくり。 */
  eyes?: 'dot' | 'happy' | 'shock';
  /** ほっぺの膨らみ 0..1（正面のみ）。1 でぱんぱん。 */
  puff?: number;
  /** 赤面 0..1（正面のみ、しかられたとき）。 */
  blush?: number;
  /** くちばしを開く（正面のみ、ついばむ瞬間）。 */
  beakOpen?: boolean;
  /** どの鳥を描くか。yukimaru は白い体で花飾りなし（幕間デモ用）。 */
  bird?: 'sakura' | 'yukimaru';
  /** 羽ばたき 0..1（真横のみ）。1 で翼を上に大きく広げる。 */
  flap?: number;
  /** 影を描くか。 */
  shadow?: boolean;
  /** 回転（ラジアン）。 */
  rotate?: number;
}

/** 体の輪郭。頭は丸く、下半分がふっくら広がる「おもち」形。 */
function bodyPath(ctx: CanvasRenderingContext2D, begin = true): void {
  const a = 14.3;
  const cy = 7;
  const b = 9;
  if (begin) ctx.beginPath();
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
  const {
    view = 'front',
    gaze = 0,
    up = false,
    scale = 1,
    squash = 0,
    dead = false,
    shadow = true,
    rotate = 0,
    eyes = 'dot',
    puff = 0,
    blush = 0,
    beakOpen = false,
    bird = 'sakura',
    flap = 0
  } = opts;
  const fx = gaze * 1.6;
  const fy = up ? -1.6 : 0;
  C = bird === 'yukimaru' ? YUKIMARU : SAKURA;
  showFlower = bird === 'sakura';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shadow) {
    ctx.fillStyle = C.shadow;
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
    drawSakuraSide(ctx, view === 'right' ? 1 : -1, flap);
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
    ctx.fillStyle = C.wing;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.strokeStyle = C.wingFeather;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(10.7, 7.4);
    ctx.lineTo(12.1, 8.3);
    ctx.stroke();
    ctx.restore();
  }

  // 赤面（顔全体をうっすら赤く）
  if (blush > 0) {
    ctx.save();
    bodyPath(ctx);
    ctx.clip();
    ctx.fillStyle = `rgba(240,90,110,${0.35 * blush})`;
    ctx.beginPath();
    ctx.ellipse(fx, 0.5 + fy, 12.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ほっぺ（木の実を詰めこむと、くちばしの両横が丸く膨らむ）
  if (puff > 0) drawPuffCheeks(ctx, puff, fx, fy);
  const pc = puffCheek(puff);
  const cheekX = puff > 0 ? pc.x + pc.rx * 0.1 : 8.4;
  const cheekY = puff > 0 ? pc.y + 0.6 : 2.4;
  const cheekW = 2.4 + puff * 2.2 + blush;
  const cheekH = 1.5 + puff * 1 + blush * 0.6;
  ctx.fillStyle = C.cheek;
  ctx.beginPath();
  ctx.ellipse(-cheekX + fx, cheekY + fy, cheekW, cheekH, 0, 0, Math.PI * 2);
  ctx.ellipse(cheekX + fx, cheekY + fy, cheekW, cheekH, 0, 0, Math.PI * 2);
  ctx.fill();
  if (blush > 0.5) {
    // 照れ線
    ctx.strokeStyle = 'rgba(200,60,90,0.7)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const x = side * cheekX + fx - 1.6 + k * 1.4;
        ctx.moveTo(x, 1.2 + fy);
        ctx.lineTo(x - 0.9, 3.4 + fy);
      }
    }
    ctx.stroke();
  }

  if (dead) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const ex of [-5.8, 5.8]) {
      ctx.moveTo(ex - 1.7, -4.1);
      ctx.lineTo(ex + 1.7, -0.7);
      ctx.moveTo(ex + 1.7, -4.1);
      ctx.lineTo(ex - 1.7, -0.7);
    }
    ctx.stroke();
  } else if (eyes === 'happy') {
    // にっこり閉じた目（^ ^）
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const ex of [-5.8, 5.8]) {
      ctx.moveTo(ex + fx - 1.8, -1.8 + fy);
      ctx.quadraticCurveTo(ex + fx, -4.2 + fy, ex + fx + 1.8, -1.8 + fy);
    }
    ctx.stroke();
  } else if (eyes === 'shock') {
    // 見開いた目（白目つき）
    for (const ex of [-5.8, 5.8]) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(ex + fx, -2.8 + fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex + fx, -2.8 + fy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-5.8 + fx, -2.4 + fy, 1.35, 0, Math.PI * 2);
    ctx.arc(5.8 + fx, -2.4 + fy, 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // くちばし（ほおばっているときは口いっぱいで小さく見える）
  const bw = 1.3 * (1 - puff * 0.35);
  ctx.fillStyle = C.beak;
  if (beakOpen) {
    // 開いたくちばし：上下に分けて、あいだに口の中を見せる
    ctx.fillStyle = '#b8485e';
    ctx.beginPath();
    ctx.ellipse(fx, 0.9 + fy, 1.1, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.beak;
    ctx.beginPath();
    ctx.moveTo(-1.5 + fx, -0.6 + fy);
    ctx.lineTo(1.5 + fx, -0.6 + fy);
    ctx.lineTo(fx, 0.5 + fy);
    ctx.closePath();
    ctx.moveTo(-1.1 + fx, 1.4 + fy);
    ctx.lineTo(1.1 + fx, 1.4 + fy);
    ctx.lineTo(fx, 2.6 + fy);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-bw + fx, -0.2 + fy);
    ctx.lineTo(bw + fx, -0.2 + fy);
    ctx.lineTo(fx, 1.6 * (1 - puff * 0.3) + fy);
    ctx.closePath();
    ctx.fill();
  }

  if (showFlower) drawSakuraFlower(ctx, 6.4, -9.6, 4.6);

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
  ctx.fillStyle = C.wing;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // 羽の縁取り
  ctx.strokeStyle = C.wingFeather;
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
  grad.addColorStop(0, C.bodyLight);
  grad.addColorStop(1, C.body);
  ctx.fillStyle = grad;
  path(ctx);
  ctx.fill();
  ctx.strokeStyle = C.line;
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

/** 膨らんだほっぺの中心と大きさ（右側。左は x を反転）。 */
function puffCheek(puff: number): { x: number; y: number; rx: number; ry: number } {
  // 横長の楕円をくちばしと同じ高さに置き、下へはあまり広げない（顔の横がふくらんで見えるように）
  return { x: 8.2 + puff * 1.4, y: 0.6, rx: 2.8 + puff * 3.4, ry: 2 + puff * 1.7 };
}

/**
 * くちばしの両横（赤いほっぺのところ）を丸く膨らませる。木の実を詰めこんだハムスターのほっぺのように、
 * 顔の中に丸いふくらみを描き、下側に輪郭線を引く。ぱんぱんになると体の輪郭から少しはみ出す。
 */
function drawPuffCheeks(ctx: CanvasRenderingContext2D, puff: number, fx: number, fy: number): void {
  const c = puffCheek(puff);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(side, 1);
    const grad = ctx.createRadialGradient(c.x - 1, c.y - c.ry * 0.5, 0.5, c.x, c.y, c.rx * 1.1);
    grad.addColorStop(0, C.bodyLight);
    grad.addColorStop(1, C.body);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = C.line;
    // 体の輪郭からはみ出した部分は、体と同じ太さの線で縁取る
    ctx.save();
    ctx.beginPath();
    ctx.rect(-60, -60, 120, 120);
    ctx.translate(-fx * side, -fy);
    bodyPath(ctx, false);
    ctx.clip('evenodd');
    ctx.translate(fx * side, fy);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // 顔の中は、くちばし側だけ細い線でふくらみの境目を見せる
    ctx.lineWidth = 0.7;
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, Math.PI * 0.62, Math.PI * 1.25);
    ctx.stroke();
    ctx.globalAlpha /= 0.6;
    ctx.restore();
  }
}

/**
 * 後ろ姿（上へ進むとき）。顔は見えず、背中に黒い翼をたたんでいる。
 * 花飾りは頭の右側（正面から見て向かって右）なので、後ろからは向かって左に見える。
 */
function drawSakuraBack(ctx: CanvasRenderingContext2D): void {
  fillBody(ctx, bodyPath, 4);

  // 後頭部の羽毛の線
  ctx.strokeStyle = C.line;
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
    ctx.fillStyle = C.wing;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // 羽の縁取り
    ctx.strokeStyle = C.wingFeather;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(8.6, 7.2);
    ctx.lineTo(11, 8.4);
    ctx.stroke();
    ctx.restore();
  }

  if (showFlower) drawSakuraFlower(ctx, -6.4, -9.6, 4.6, 0.25);
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
function drawSakuraSide(ctx: CanvasRenderingContext2D, dir: number, flap: number): void {
  ctx.save();
  ctx.scale(dir, 1);

  // 左向きのときの花飾り：体より先に描いて、頭のうしろに隠す
  if (showFlower && dir < 0) drawSakuraFlower(ctx, -1.5, -11.6, 4.4, 0.4);

  drawTail(ctx, -10.5, 5, -0.55);

  fillBody(ctx, sidePath, 2);

  // 翼：体の横に、うしろ下へ向けてたたむ（羽ばたくときは付け根を支点に上へ振り上げる）
  ctx.save();
  ctx.translate(-1.6, 4.2);
  ctx.rotate(flap * 1.9);
  ctx.translate(1.6, -4.2);
  ctx.beginPath();
  ctx.moveTo(-1.6, 4.2);
  ctx.quadraticCurveTo(-8.6, 2.6, -13.4, 9.6);
  ctx.quadraticCurveTo(-7.4, 12, -1.6, 4.2);
  ctx.closePath();
  ctx.fillStyle = C.wing;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = C.wingFeather;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, 6.4);
  ctx.lineTo(-10.4, 8.6);
  ctx.stroke();
  ctx.restore();

  // ほっぺ・目・くちばし（顔は進む向きの端に寄せる）
  ctx.fillStyle = C.cheek;
  ctx.beginPath();
  ctx.ellipse(8, 2.4, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(8.4, -2.4, 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.beak;
  ctx.beginPath();
  ctx.moveTo(12.8, -1.8);
  ctx.lineTo(15.8, -0.5);
  ctx.lineTo(12.9, 0.8);
  ctx.closePath();
  ctx.fill();

  // 右向きのときの花飾り：手前（頭の横、目のうしろ上）
  if (showFlower && dir > 0) drawSakuraFlower(ctx, 2.2, -9.6, 4.6);

  ctx.restore();
}
