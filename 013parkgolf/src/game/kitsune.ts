// キツネ（いっしょに回る仲間）を Canvas2D で描く。(cx, cy) = 足元の中心。scale 1 で高さ 約 42px。
// 森の案内係（005）の guests.ts から drawKitsune と、そのための目・線の関数をコピーし、
// 拍手・顔をおおう・大はしゃぎ・ないしょ話（ヒント）の前足を描き足したもの。

const LINE = '#4a3326';
const FUR = '#e08a3c';

export type Mood = 'normal' | 'happy' | 'puzzled';

/** 前足の形。watch = 見ている、clap = 拍手、cover = 顔をおおう、hooray = 大はしゃぎ、whisper = 口に手を当てて小声。 */
export type KitsunePose = 'watch' | 'clap' | 'cover' | 'hooray' | 'whisper';

export interface KitsuneOptions {
  scale?: number;
  pose?: KitsunePose;
  mood?: Mood;
  /** アニメーションの時間（拍手・はしゃぐ動き）。 */
  t?: number;
  shadow?: boolean;
  alpha?: number;
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

function kitsuneBody(ctx: CanvasRenderingContext2D, mood: Mood, socks: boolean): void {
  const fur = FUR;
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
  // 黒い靴下（前足）。前足を上げているときは、足先だけ見せる
  ctx.fillStyle = '#2e2422';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    if (socks) ctx.roundRect(s * 4.2 - 1.8, -6, 3.6, 6.4, 1.4);
    else ctx.ellipse(s * 4.4, -0.6, 2.4, 1.3, 0, 0, Math.PI * 2);
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
  eyes(ctx, 4.6, -29.5, 1.35, mood);
  ctx.fillStyle = '#2a1c18';
  ctx.beginPath();
  ctx.ellipse(0, -20.4, 1.5, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 前足 1 本（付け根 (x0, y0) から先 (x1, y1) へ。先は黒い靴下）。 */
function paw(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.fillStyle = '#2e2422';
  ctx.beginPath();
  ctx.arc(x1, y1, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/** キツネを (cx, cy) = 足元 に描く。 */
export function drawKitsune(ctx: CanvasRenderingContext2D, cx: number, cy: number, opts: KitsuneOptions = {}): void {
  const { scale = 1, pose = 'watch', mood = 'normal', t = 0, shadow = true, alpha = 1 } = opts;
  const hop = pose === 'hooray' ? Math.abs(Math.sin(t * 8)) * 5 : 0;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.fillStyle = 'rgba(40,70,110,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 12 - hop * 0.6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(0, -hop);
  const raised = pose !== 'watch';
  kitsuneBody(ctx, pose === 'cover' ? 'normal' : mood, !raised);
  if (pose === 'clap') {
    // 胸の前で前足を合わせる
    const open = (Math.sin(t * 14) * 0.5 + 0.5) * 3.2;
    paw(ctx, -5, -15, -1.4 - open, -19);
    paw(ctx, 5, -15, 1.4 + open, -19);
  } else if (pose === 'cover') {
    // 両方の前足で目をかくす
    paw(ctx, -6, -16, -4.6, -29.5);
    paw(ctx, 6, -16, 4.6, -29.5);
  } else if (pose === 'hooray') {
    const w = Math.sin(t * 8) * 1.5;
    paw(ctx, -6, -16, -13, -33 + w);
    paw(ctx, 6, -16, 13, -33 - w);
  } else if (pose === 'whisper') {
    // 片方の前足を口もとに当てて、こっそり
    paw(ctx, 6, -15, 8.6, -22.5);
    paw(ctx, -5, -14, -4.4, -6);
  }
  ctx.restore();
}
