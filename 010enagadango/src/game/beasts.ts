// 森の動物（エゾリス・エゾモモンガ・キタキツネ・ユキウサギ）を Canvas2D で描く。面のあいだのデモで見物に来る。
// 007 の guests.ts のけものの描画をそのままコピーしたもの。(cx, cy) = 足元の中心。scale 1 で高さ 約 34px。

const LINE = '#4a3326';

export type BeastKind = 'risu' | 'momonga' | 'kitsune' | 'usagi';

type Mood = 'normal' | 'happy';

function stroke(ctx: CanvasRenderingContext2D, w = 1.1, color = LINE): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** 目。黒い体の上でも見えるように、ring を指定すると白いふちを付ける。 */
function eyes(ctx: CanvasRenderingContext2D, dx: number, y: number, r: number, mood: Mood | 'puzzled', ring = false): void {
  for (const s of [-1, 1]) {
    const x = s * dx;
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

function mammalEyes(ctx: CanvasRenderingContext2D, dx: number, y: number, r: number, mood: Mood): void {
  eyes(ctx, dx, y, r, mood);
}

function drawRisu(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const fur = '#6e5d55';
  const furDark = '#54463f';
  // ふさふさの尻尾（向かって右うしろ、頭より高く）
  ctx.fillStyle = furDark;
  ctx.beginPath();
  ctx.moveTo(6, -3);
  ctx.bezierCurveTo(20, -4, 22, -20, 15, -30);
  ctx.bezierCurveTo(10, -38, 16, -44, 22, -40);
  ctx.bezierCurveTo(28, -34, 27, -14, 20, -4);
  ctx.bezierCurveTo(16, 1, 9, 1, 6, -3);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(18, -8);
  ctx.quadraticCurveTo(23, -22, 18, -34);
  ctx.stroke();
  // 体
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -9, 9.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#efe6d6';
  ctx.beginPath();
  ctx.ellipse(0, -7.5, 5.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 耳（先に房毛）
  for (const s of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(s * 3.5, -30);
    ctx.quadraticCurveTo(s * 5, -40, s * 8.5, -41);
    ctx.quadraticCurveTo(s * 10, -34, s * 9.5, -28);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 0.9);
    ctx.strokeStyle = furDark;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(s * 8.2, -40.5);
    ctx.lineTo(s * 7.5, -44);
    ctx.moveTo(s * 8.6, -40.5);
    ctx.lineTo(s * 10, -43.4);
    ctx.stroke();
  }
  // 頭
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -25, 9.5, 8.6, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#efe6d6';
  ctx.beginPath();
  ctx.ellipse(0, -21.5, 4.4, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  mammalEyes(ctx, 4.4, -26, 1.6, mood);
  ctx.fillStyle = '#3a2a24';
  ctx.beginPath();
  ctx.ellipse(0, -22.6, 1.1, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 手にどんぐり
  ctx.fillStyle = '#b47a3c';
  ctx.beginPath();
  ctx.ellipse(0, -12.5, 2.6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6e4a2a';
  ctx.beginPath();
  ctx.ellipse(0, -15, 3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 3, -12.5, 1.8, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 足
  ctx.fillStyle = furDark;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 4.5, -0.6, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMomonga(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const fur = '#b9b2a6';
  // 平たい尻尾
  ctx.fillStyle = '#a39b8f';
  ctx.beginPath();
  ctx.ellipse(10, -2, 7.5, 3.2, -0.35, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, 0.9);
  // 体と飛膜（手足のあいだの膜を広げている）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(-15, -18, -15.5, -9);
  ctx.quadraticCurveTo(-12, -6, -13, -1.5);
  ctx.quadraticCurveTo(0, 1.5, 13, -1.5);
  ctx.quadraticCurveTo(12, -6, 15.5, -9);
  ctx.quadraticCurveTo(15, -18, 6, -20);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#fbf9f4';
  ctx.beginPath();
  ctx.ellipse(0, -9, 6.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 手足の先
  ctx.fillStyle = '#8f877c';
  for (const [x, y] of [
    [-15, -9],
    [15, -9],
    [-12.5, -1.5],
    [12.5, -1.5]
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // 小さな丸い耳
  for (const s of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(s * 7.8, -33, 3.2, 0, Math.PI * 2);
    ctx.fill();
    stroke(ctx, 0.9);
    ctx.fillStyle = '#e8c9c0';
    ctx.beginPath();
    ctx.arc(s * 7.8, -32.6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // 大きな頭
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -25, 10.5, 9.2, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#fbf9f4';
  ctx.beginPath();
  ctx.ellipse(0, -21, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 大きな黒い目（黒いふち取り）
  if (mood === 'happy') {
    eyes(ctx, 4.8, -26, 2.2, mood);
  } else {
    ctx.fillStyle = '#4a3f38';
    ctx.beginPath();
    ctx.ellipse(-4.8, -26, 3.8, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(4.8, -26, 3.8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, 4.8, -26, 2.9, mood);
  }
  ctx.fillStyle = '#e59aa6';
  ctx.beginPath();
  ctx.ellipse(0, -21.6, 1, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawKitsune(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const fur = '#e08a3c';
  // 尻尾（向かって右、白い先）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(5, -3);
  ctx.bezierCurveTo(16, -2, 24, -8, 22, -20);
  ctx.bezierCurveTo(18, -14, 12, -10, 5, -9);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.moveTo(22, -20);
  ctx.quadraticCurveTo(24, -14, 20.5, -10.5);
  ctx.quadraticCurveTo(19, -15, 22, -20);
  ctx.fill();
  // 体（おすわり）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(-11, -8, -9, 0);
  ctx.lineTo(9, 0);
  ctx.quadraticCurveTo(11, -8, 6, -20);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.moveTo(-4, -19);
  ctx.quadraticCurveTo(0, -4, 4, -19);
  ctx.closePath();
  ctx.fill();
  // 黒い靴下（前足）
  ctx.fillStyle = '#2e2422';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(s * 4.2 - 1.8, -6, 3.6, 6.4, 1.4);
    ctx.fill();
  }
  // 三角の耳（裏が黒）
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#2e2422';
    ctx.beginPath();
    ctx.moveTo(s * 3, -33);
    ctx.lineTo(s * 9.5, -42);
    ctx.lineTo(s * 11, -29);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(s * 4.5, -32.5);
    ctx.lineTo(s * 9.3, -39);
    ctx.lineTo(s * 10.2, -30);
    ctx.closePath();
    ctx.fill();
  }
  // 頭（下へとがった顔）
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-11.5, -30);
  ctx.quadraticCurveTo(-10, -37, 0, -37);
  ctx.quadraticCurveTo(10, -37, 11.5, -30);
  ctx.quadraticCurveTo(8, -21, 0, -18.5);
  ctx.quadraticCurveTo(-8, -21, -11.5, -30);
  ctx.closePath();
  ctx.fill();
  stroke(ctx);
  ctx.fillStyle = '#fbf6ee';
  ctx.beginPath();
  ctx.moveTo(-10.5, -28);
  ctx.quadraticCurveTo(-4, -27, 0, -24);
  ctx.quadraticCurveTo(4, -27, 10.5, -28);
  ctx.quadraticCurveTo(7, -21, 0, -19);
  ctx.quadraticCurveTo(-7, -21, -10.5, -28);
  ctx.fill();
  mammalEyes(ctx, 4.6, -29.5, 1.35, mood);
  ctx.fillStyle = '#2a1c18';
  ctx.beginPath();
  ctx.ellipse(0, -20.4, 1.5, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawUsagi(ctx: CanvasRenderingContext2D, mood: Mood): void {
  const fur = '#fbfcff';
  const shade = '#dfe6ef';
  // 長い耳（先が黒）
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 4.5, -30);
    ctx.rotate(s * 0.14);
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, -9, 3.4, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    stroke(ctx, 0.9);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -9, 3.4, 10, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#2a2428';
    ctx.fillRect(-5, -21, 10, 5);
    ctx.restore();
    ctx.fillStyle = '#f2c4cf';
    ctx.beginPath();
    ctx.ellipse(0, -8, 1.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 体（まんまる）
  const g = ctx.createRadialGradient(-3, -14, 2, 0, -10, 14);
  g.addColorStop(0, fur);
  g.addColorStop(1, shade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -10, 11.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx);
  ctx.beginPath();
  ctx.ellipse(0, -25, 9.5, 8.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx);
  mammalEyes(ctx, 4.3, -26, 1.45, mood);
  ctx.fillStyle = '#e88fa2';
  ctx.beginPath();
  ctx.moveTo(-1.3, -23);
  ctx.lineTo(1.3, -23);
  ctx.lineTo(0, -21.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(242,140,165,0.45)';
  ctx.beginPath();
  ctx.ellipse(-6.4, -22.4, 2, 1.3, 0, 0, Math.PI * 2);
  ctx.ellipse(6.4, -22.4, 2, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 前足
  ctx.fillStyle = fur;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 4, -1.2, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    stroke(ctx, 0.8);
  }
}

const DRAW: Record<BeastKind, (ctx: CanvasRenderingContext2D, mood: Mood) => void> = {
  risu: drawRisu,
  momonga: drawMomonga,
  kitsune: drawKitsune,
  usagi: drawUsagi
};

export function drawBeast(ctx: CanvasRenderingContext2D, cx: number, cy: number, kind: BeastKind, opts: { scale?: number; mood?: Mood; hop?: number; flip?: boolean } = {}): void {
  const { scale = 1, mood = 'normal', hop = 0, flip = false } = opts;
  const lift = Math.abs(Math.sin(hop * Math.PI)) * 3;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flip ? -scale : scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(40,70,110,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 12 - lift, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -lift);
  DRAW[kind](ctx, mood);
  ctx.restore();
}
