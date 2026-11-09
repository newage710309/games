// 編集長のフクロウを Canvas2D で描く。画像ファイルは使わない。
// つまみ食い（004）のフクロウ先生の描画をコピーし、編集長らしいハンチング帽・赤えんぴつ・にっこり顔・指さす羽を描き足したもの。

const LINE = '#4a3326';

// --- 編集長のフクロウ ------------------------------------------------------
// ふだんは正面を向いている（frontBody）。004 と同じく、首だけをくるっと回すこともできる。

const OWL = {
  body: '#9a7152',
  bodyDark: '#7b573c',
  belly: '#ecd9b8',
  face: '#f3e6cc',
  faceRim: '#b98d63',
  beak: '#e0a53c',
  eye: '#2a1c14',
  glass: '#3b2a20',
  tie: '#4f86c6',
  chalk: '#fbfbf4'
} as const;

/** 羽（腕）のかまえ。rest = 下ろす、write = 黒板に書く、reach = チョーク置き場に手をのばす。 */
export type WingPose = 'rest' | 'write' | 'reach' | 'point';

export interface OwlOptions {
  scale?: number;
  /** 首の向き 0..1。0 = 真後ろ（黒板を向く）、1 = 真正面（こちらを見る）。 */
  turn?: number;
  /** 首を回す側（-1 = 向かって左から、1 = 右から）。 */
  turnSide?: number;
  /** 右の羽（向かって右）のかまえ。 */
  wing?: WingPose;
  /** 羽の先にチョークを持っているか。 */
  chalk?: boolean;
  /** 書く動きの経過時間（羽を小刻みに動かす）。 */
  time?: number;
  /** 怒り顔（見つけたとき）。 */
  angry?: boolean;
  /** 体ごと正面を向く。true なら turn は無視して正面の体を描く。 */
  frontBody?: boolean;
  /** 編集長のハンチング帽と、耳にはさんだ赤えんぴつ。 */
  cap?: boolean;
  /** にっこり閉じた目（いい写真を見たとき）。 */
  happy?: boolean;
  /** 向かって右の羽のかまえ（frontBody のとき）。point = 上へ指さす。 */
  frontWing?: WingPose;
}

let owlHappy = false;

/**
 * フクロウ先生を (cx, cy) = 足元の中心 に描く。scale 1 で高さ 約 64px。
 */
export function drawOwl(ctx: CanvasRenderingContext2D, cx: number, cy: number, opts: OwlOptions = {}): void {
  const {
    scale = 1,
    turn = 0,
    turnSide = 1,
    wing = 'rest',
    chalk = false,
    time = 0,
    angry = false,
    frontBody = false,
    cap = false,
    happy = false,
    frontWing = 'rest'
  } = opts;
  owlHappy = happy;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 影
  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 足
  ctx.strokeStyle = OWL.beak;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 6, -4);
    ctx.lineTo(s * 6, 0);
    ctx.moveTo(s * 6, 0);
    ctx.lineTo(s * 8.5, 0.5);
    ctx.moveTo(s * 6, 0);
    ctx.lineTo(s * 3.5, 0.5);
  }
  ctx.stroke();

  // 体（たまご形）
  const bodyPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.bezierCurveTo(17, -46, 22, -26, 21, -14);
    ctx.bezierCurveTo(20, -4, 11, -2, 0, -2);
    ctx.bezierCurveTo(-11, -2, -20, -4, -21, -14);
    ctx.bezierCurveTo(-22, -26, -17, -46, 0, -46);
    ctx.closePath();
  };
  const grad = ctx.createLinearGradient(-20, -40, 20, -4);
  grad.addColorStop(0, OWL.body);
  grad.addColorStop(1, OWL.bodyDark);
  ctx.fillStyle = grad;
  bodyPath();
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  if (frontBody) {
    // おなか（正面）と、ネクタイ
    ctx.fillStyle = OWL.belly;
    ctx.beginPath();
    ctx.ellipse(0, -16, 13, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OWL.faceRim;
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      for (let j = -1; j <= 1; j++) {
        const x = j * 5 + (k % 2) * 2.5;
        const y = -24 + k * 5;
        ctx.beginPath();
        ctx.moveTo(x - 1.6, y);
        ctx.quadraticCurveTo(x, y + 1.6, x + 1.6, y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = OWL.tie;
    ctx.beginPath();
    ctx.moveTo(-2.4, -30);
    ctx.lineTo(2.4, -30);
    ctx.lineTo(3.2, -18);
    ctx.lineTo(0, -15);
    ctx.lineTo(-3.2, -18);
    ctx.closePath();
    ctx.fill();
  } else {
    // 背中の羽の模様
    ctx.strokeStyle = 'rgba(60,40,25,0.45)';
    ctx.lineWidth = 0.9;
    for (let k = 0; k < 3; k++) {
      for (let j = -1; j <= 1; j++) {
        const x = j * 6 + (k % 2) * 3;
        const y = -26 + k * 6;
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.quadraticCurveTo(x, y + 2, x + 2, y);
        ctx.stroke();
      }
    }
  }

  // 羽（腕）
  drawOwlWing(ctx, -1, 'rest', false, time);
  drawOwlWing(ctx, 1, frontBody ? frontWing : wing, chalk, time);

  // 頭
  drawOwlHead(ctx, frontBody ? 1 : turn, turnSide, angry);
  if (cap) drawEditorCap(ctx);

  ctx.restore();
}

function drawOwlWing(ctx: CanvasRenderingContext2D, side: number, pose: WingPose, chalk: boolean, time: number): void {
  ctx.save();
  ctx.scale(side, 1);
  ctx.translate(17, -30);
  let angle = 0.25;
  if (pose === 'write') angle = -2.75 + Math.sin(time * 18) * 0.12;
  if (pose === 'reach') angle = -2.2;
  if (pose === 'point') angle = -2.3 + Math.sin(time * 6) * 0.08;
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.quadraticCurveTo(9, 2, 5, 20);
  ctx.quadraticCurveTo(-1, 14, -3, 2);
  ctx.closePath();
  ctx.fillStyle = OWL.bodyDark;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,220,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1.5, 6);
  ctx.lineTo(4, 14);
  ctx.stroke();
  if (chalk) {
    ctx.fillStyle = OWL.chalk;
    ctx.strokeStyle = '#b8b8a8';
    ctx.lineWidth = 0.6;
    ctx.save();
    ctx.translate(5, 20);
    ctx.rotate(0.5);
    ctx.fillRect(-1.3, -1, 2.6, 7);
    ctx.strokeRect(-1.3, -1, 2.6, 7);
    ctx.restore();
  }
  ctx.restore();
}

/** 頭。turn = 0 で後頭部、1 で顔。途中は顔の円盤を横へずらし、横幅を縮めて回っているように見せる。 */
function drawOwlHead(ctx: CanvasRenderingContext2D, turn: number, side: number, angry: boolean): void {
  const hx = 0;
  const hy = -50;
  const R = 17;

  // 耳のような羽角（小さめ）
  ctx.fillStyle = OWL.body;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * 9, hy - 13);
    ctx.lineTo(hx + s * 14, hy - 21);
    ctx.lineTo(hx + s * 15, hy - 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = OWL.body;
  ctx.beginPath();
  ctx.ellipse(hx, hy, R + 2, R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (turn < 0.12) {
    // 後頭部の模様
    ctx.strokeStyle = 'rgba(60,40,25,0.45)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 4);
    ctx.quadraticCurveTo(hx, hy - 1, hx + 6, hy - 4);
    ctx.moveTo(hx - 4, hy + 3);
    ctx.quadraticCurveTo(hx, hy + 5, hx + 4, hy + 3);
    ctx.stroke();
    if (turn > 0.02) {
      // 首がぴくっと動いた印（振り向く予兆）
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const s of [-1, 1]) {
        for (const k of [0, 1]) {
          const r = R + 5 + k * 4;
          ctx.moveTo(hx + s * r * Math.cos(0.5), hy - r * Math.sin(0.5));
          ctx.arc(hx, hy, r, s < 0 ? Math.PI + 0.5 : -0.5, s < 0 ? Math.PI - 0.1 : 0.1, s < 0);
        }
      }
      ctx.stroke();
    }
    return;
  }

  // 顔（頭の円の中だけに描く）
  const t = Math.min(1, turn);
  const offset = (1 - t) * R * 1.05 * side;
  const squeeze = 0.35 + 0.65 * t;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hx, hy, R + 2, R, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(hx + offset, hy);
  ctx.scale(squeeze, 1);

  // 顔の円盤（ハート形に近い、左右 2 つの丸）
  ctx.fillStyle = OWL.face;
  ctx.strokeStyle = OWL.faceRim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(-6.5, 0, 8.5, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(6.5, 0, 8.5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // めがね
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * 6.5, -1, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OWL.glass;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 目
    if (owlHappy) {
      ctx.strokeStyle = OWL.eye;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s * 6.5 - 2.8, 0);
      ctx.quadraticCurveTo(s * 6.5, -3.4, s * 6.5 + 2.8, 0);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = OWL.eye;
    ctx.beginPath();
    ctx.arc(s * 6.5, -0.5, angry ? 2.2 : 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * 6.5 - 0.9, -1.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = OWL.glass;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1.1, -1.5);
  ctx.lineTo(1.1, -1.5);
  ctx.stroke();

  if (angry) {
    // つり上がったまゆ
    ctx.strokeStyle = OWL.eye;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(-3, -6.5);
    ctx.moveTo(12, -10);
    ctx.lineTo(3, -6.5);
    ctx.stroke();
  }

  // くちばし
  ctx.fillStyle = OWL.beak;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2.2, 4);
  ctx.lineTo(2.2, 4);
  ctx.lineTo(0, angry ? 10 : 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (angry) {
    // 開いた口
    ctx.fillStyle = '#8a3b2a';
    ctx.beginPath();
    ctx.moveTo(-1.6, 6);
    ctx.lineTo(1.6, 6);
    ctx.lineTo(0, 8.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** 編集長のハンチング帽（頭のてっぺん）と、羽角にはさんだ赤えんぴつ。 */
function drawEditorCap(ctx: CanvasRenderingContext2D): void {
  // 赤えんぴつ（帽子のうしろ、向かって左の羽角のあたり）
  ctx.save();
  ctx.translate(-15, -64);
  ctx.rotate(-0.9);
  ctx.fillStyle = '#d6423c';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 0.8;
  ctx.fillRect(-1.8, -9, 3.6, 16);
  ctx.strokeRect(-1.8, -9, 3.6, 16);
  ctx.fillStyle = '#f2d2a0';
  ctx.beginPath();
  ctx.moveTo(-1.8, 7);
  ctx.lineTo(1.8, 7);
  ctx.lineTo(0, 11.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // ハンチング帽
  ctx.fillStyle = '#6b6f86';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-16, -62);
  ctx.quadraticCurveTo(-14, -75, 2, -75);
  ctx.quadraticCurveTo(16, -74, 17, -63);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // つば
  ctx.fillStyle = '#585b70';
  ctx.beginPath();
  ctx.moveTo(-14, -62.5);
  ctx.quadraticCurveTo(2, -58, 20, -61.5);
  ctx.quadraticCurveTo(22, -63.5, 17, -64.5);
  ctx.quadraticCurveTo(0, -63, -14, -62.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ボタンとチェックの線
  ctx.fillStyle = '#585b70';
  ctx.beginPath();
  ctx.arc(1, -75, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const x of [-8, -2, 4, 10]) {
    ctx.moveTo(x, -73);
    ctx.lineTo(x + 1, -63.5);
  }
  ctx.stroke();
}
