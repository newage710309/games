// 先生と生徒を Canvas2D で描く。画像ファイルは使わない。

const LINE = '#4a3326';

// --- フクロウ先生 --------------------------------------------------------
// 黒板に向かって書いているときは後ろ姿。振り向くときは、体はそのままで首だけがくるっと回る（フクロウなので）。

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
export type WingPose = 'rest' | 'write' | 'reach';

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
  /** 体ごと正面を向く（しかるとき）。true なら turn は無視して正面の体を描く。 */
  frontBody?: boolean;
}

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
    frontBody = false
  } = opts;

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
  drawOwlWing(ctx, 1, frontBody ? 'rest' : wing, chalk, time);

  // 頭
  drawOwlHead(ctx, frontBody ? 1 : turn, turnSide, angry);

  ctx.restore();
}

function drawOwlWing(ctx: CanvasRenderingContext2D, side: number, pose: WingPose, chalk: boolean, time: number): void {
  ctx.save();
  ctx.scale(side, 1);
  ctx.translate(17, -30);
  let angle = 0.25;
  if (pose === 'write') angle = -2.75 + Math.sin(time * 18) * 0.12;
  if (pose === 'reach') angle = -2.2;
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

// --- 見回りの先生（ヤマガラ） ------------------------------------------------
// 3 時間目（テスト）だけ、教室の通路を行き来する。横向きで歩き、こちらを見るときは正面を向く（どこに立っていても、正面を向いている間は見つかる）。

const YAMA = {
  cap: '#26201e',
  cheek: '#f4ead2',
  belly: '#c9723c',
  back: '#8b939c',
  wing: '#6c747e',
  beak: '#2d2622',
  stick: '#a87848'
} as const;

export interface PatrolOptions {
  scale?: number;
  /** 向き（-1 = 左、1 = 右）。 */
  facing?: number;
  /** 歩いた量（体を上下にゆらす）。 */
  walk?: number;
  /** こちら（さくらちゃん）のほうを見ている。 */
  looking?: boolean;
  /** 見回っていてこちらを見る直前（予兆）。 */
  warn?: boolean;
}

/** 見回りの先生を (cx, cy) = 足元の中心 に描く。scale 1 で高さ 約 44px。 */
export function drawPatrol(ctx: CanvasRenderingContext2D, cx: number, cy: number, opts: PatrolOptions = {}): void {
  const { scale = 1, facing = 1, walk = 0, looking = false, warn = false } = opts;
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * -2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bob);
  ctx.scale(looking ? 1 : facing, 1);

  // 足
  ctx.strokeStyle = '#6b5a50';
  ctx.lineWidth = 1.6;
  const step = Math.sin(walk * Math.PI * 2) * 3;
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.lineTo(-2 + step, 0);
  ctx.moveTo(3, -6);
  ctx.lineTo(3 - step, 0);
  ctx.stroke();

  if (looking) {
    // 正面（こちらを見る）
    ctx.fillStyle = YAMA.belly;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -18, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 頭：黒い帽子とクリーム色のほお
    ctx.fillStyle = YAMA.cap;
    ctx.beginPath();
    ctx.ellipse(0, -34, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = YAMA.cheek;
    ctx.beginPath();
    ctx.ellipse(-5, -32, 4.6, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -32, 4.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = YAMA.cap;
    ctx.beginPath();
    ctx.arc(-4.6, -33.5, 1.4, 0, Math.PI * 2);
    ctx.arc(4.6, -33.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    // めがね（四角）
    ctx.strokeStyle = '#c9a54a';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-7.6, -36, 6, 5);
    ctx.strokeRect(1.6, -36, 6, 5);
    ctx.beginPath();
    ctx.moveTo(-1.6, -34);
    ctx.lineTo(1.6, -34);
    ctx.stroke();
    ctx.fillStyle = YAMA.beak;
    ctx.beginPath();
    ctx.moveTo(-1.6, -30);
    ctx.lineTo(1.6, -30);
    ctx.lineTo(0, -27);
    ctx.closePath();
    ctx.fill();
  } else {
    // 横向き：指し棒を持って歩く
    ctx.strokeStyle = YAMA.stick;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(4, -16);
    ctx.lineTo(16, -4);
    ctx.stroke();

    ctx.fillStyle = YAMA.back;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -18, 13, 12.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // おなか
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -18, 13, 12.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = YAMA.belly;
    ctx.beginPath();
    ctx.ellipse(8, -14, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 尾
    ctx.fillStyle = YAMA.wing;
    ctx.beginPath();
    ctx.moveTo(-11, -16);
    ctx.lineTo(-21, -22);
    ctx.lineTo(-19, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 翼
    ctx.beginPath();
    ctx.moveTo(-8, -22);
    ctx.quadraticCurveTo(2, -20, 4, -12);
    ctx.quadraticCurveTo(-6, -10, -8, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 頭
    ctx.fillStyle = YAMA.cap;
    ctx.beginPath();
    ctx.ellipse(5, -33, 10, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = YAMA.cheek;
    ctx.beginPath();
    ctx.ellipse(8, -31, 5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = YAMA.cap;
    ctx.beginPath();
    ctx.arc(9.4, -33.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a54a';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(7, -36, 5.4, 4.6);
    ctx.fillStyle = YAMA.beak;
    ctx.beginPath();
    ctx.moveTo(14, -34);
    ctx.lineTo(18.5, -32.5);
    ctx.lineTo(14, -31);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (warn) drawAlert(ctx, cx + 14 * scale, cy - 50 * scale, scale);
}

/** 「！」の吹き出し（予兆）。 */
export function drawAlert(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fff7c2';
  ctx.strokeStyle = '#c47a12';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-8, -9);
  ctx.lineTo(8, -9);
  ctx.quadraticCurveTo(11, -9, 11, -6);
  ctx.lineTo(11, 5);
  ctx.quadraticCurveTo(11, 8, 8, 8);
  ctx.lineTo(0, 8);
  ctx.lineTo(-5, 13);
  ctx.lineTo(-4, 8);
  ctx.lineTo(-8, 8);
  ctx.quadraticCurveTo(-11, 8, -11, 5);
  ctx.lineTo(-11, -6);
  ctx.quadraticCurveTo(-11, -9, -8, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d0451b';
  ctx.fillRect(-1.6, -6, 3.2, 8);
  ctx.beginPath();
  ctx.arc(0, 5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- 生徒（後ろ姿） ------------------------------------------------------

export type StudentKind = 'suzume' | 'mejiro' | 'yukimaru' | 'hiyo';

const STUDENT: Record<StudentKind, { body: string; head: string; wing: string; tail: string }> = {
  // スズメ：茶色い頭、ベージュの体
  suzume: { body: '#d9c3a0', head: '#8a5a3a', wing: '#8a6446', tail: '#6e4c34' },
  // メジロ：うぐいす色
  mejiro: { body: '#b8c46a', head: '#98a84a', wing: '#7f8f3a', tail: '#6b7a30' },
  // ゆきまるくん：白いシマエナガ（さくらちゃんと同じ形、黒い翼と尾）
  yukimaru: { body: '#fafcff', head: '#fafcff', wing: '#262024', tail: '#262024' },
  // ヒヨドリ：灰色
  hiyo: { body: '#a9adb8', head: '#8d929e', wing: '#767b87', tail: '#61656f' }
};

export interface StudentOptions {
  scale?: number;
  /** 書き物をしている動き（頭を少し上下）。 */
  time?: number;
  /** 動きの位相（生徒ごとにずらす）。 */
  phase?: number;
  /** 正面を向く（デモ用）。 */
  front?: boolean;
  /** にっこり閉じた目（正面のみ）。 */
  happy?: boolean;
}

/** 生徒の後ろ姿を (cx, cy) = 体の中心 に描く。scale 1 で幅 約 28px。 */
export function drawStudent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: StudentKind,
  opts: StudentOptions = {}
): void {
  const { scale = 1, time = 0, phase = 0, front = false, happy = false } = opts;
  const c = STUDENT[kind];
  const nod = front ? 0 : Math.max(0, Math.sin(time * 2.2 + phase)) * 1.2;
  if (front) {
    drawStudentFront(ctx, cx, cy, kind, scale, happy);
    return;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 尾（シマエナガのゆきまるくんは、さくらちゃんと同じく背中の上に立てるので体のあとで描く）
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  if (kind !== 'yukimaru') {
    ctx.fillStyle = c.tail;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-5, 19);
    ctx.lineTo(5, 19);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 体
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.moveTo(0, -12 + nod);
  ctx.bezierCurveTo(8, -12 + nod, 12, -7, 12.5, -2);
  ctx.bezierCurveTo(13.5, 4, 14, 7, 13, 10);
  ctx.bezierCurveTo(11, 15, 5, 16, 0, 16);
  ctx.bezierCurveTo(-5, 16, -11, 15, -13, 10);
  ctx.bezierCurveTo(-14, 7, -13.5, 4, -12.5, -2);
  ctx.bezierCurveTo(-12, -7, -8, -12 + nod, 0, -12 + nod);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 頭の色（後頭部）
  if (c.head !== c.body) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.head;
    ctx.beginPath();
    ctx.ellipse(0, -8 + nod, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 翼
  ctx.fillStyle = c.wing;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.quadraticCurveTo(12.5, 3, 12, 11);
    ctx.quadraticCurveTo(7, 9.5, 6, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (kind === 'yukimaru') {
    // 上向きに立てた黒い尾（さくらちゃんの後ろ姿と同じ形）
    ctx.beginPath();
    ctx.moveTo(-2.4, 14);
    ctx.quadraticCurveTo(-3.2, 5, -1.2, -3.5);
    ctx.quadraticCurveTo(0, -5.2, 1.2, -3.5);
    ctx.quadraticCurveTo(3.2, 5, 2.4, 14);
    ctx.closePath();
    ctx.fillStyle = c.tail;
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(0, -0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** 生徒の正面（デモ用）。形は後ろ姿と同じで、顔とおなかを描く。 */
function drawStudentFront(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: StudentKind,
  scale: number,
  happy: boolean
): void {
  const c = STUDENT[kind];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;

  const body = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(8, -12, 12, -7, 12.5, -2);
    ctx.bezierCurveTo(13.5, 4, 14, 7, 13, 10);
    ctx.bezierCurveTo(11, 15, 5, 16, 0, 16);
    ctx.bezierCurveTo(-5, 16, -11, 15, -13, 10);
    ctx.bezierCurveTo(-14, 7, -13.5, 4, -12.5, -2);
    ctx.bezierCurveTo(-12, -7, -8, -12, 0, -12);
    ctx.closePath();
  };
  ctx.fillStyle = c.body;
  body();
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (c.head !== c.body) {
    // 頭の色（帽子のように上だけ）
    ctx.fillStyle = c.head;
    ctx.beginPath();
    ctx.ellipse(0, -12, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // おなか（明るく）
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  body();
  ctx.stroke();

  // 翼（体の横）
  ctx.fillStyle = c.wing;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(9.5, 3);
    ctx.quadraticCurveTo(13.8, 6, 12.4, 11.5);
    ctx.quadraticCurveTo(10, 9.5, 9.5, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 目とくちばし
  ctx.fillStyle = '#1c1418';
  ctx.strokeStyle = '#1c1418';
  if (happy) {
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const ex of [-5, 5]) {
      ctx.moveTo(ex - 1.7, -2);
      ctx.quadraticCurveTo(ex, -4.3, ex + 1.7, -2);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-5, -2.6, 1.35, 0, Math.PI * 2);
    ctx.arc(5, -2.6, 1.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = kind === 'mejiro' ? '#3a3a30' : kind === 'suzume' ? '#3a2a20' : '#3a2a30';
  ctx.beginPath();
  ctx.moveTo(-1.4, -0.4);
  ctx.lineTo(1.4, -0.4);
  ctx.lineTo(0, 1.6);
  ctx.closePath();
  ctx.fill();
  if (kind === 'mejiro') {
    // メジロの白いアイリング
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(-5, -2.6, 2.4, 0, Math.PI * 2);
    ctx.moveTo(7.4, -2.6);
    ctx.arc(5, -2.6, 2.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // ほっぺ
  ctx.fillStyle = 'rgba(242,120,150,0.45)';
  ctx.beginPath();
  ctx.ellipse(-8, 1.6, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(8, 1.6, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
