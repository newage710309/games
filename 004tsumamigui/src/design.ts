// デザイン確認用：場面ごとの画面と、キャラクターの表情・ポーズの一覧を描く（開発時だけ使う）。
import { HEIGHT, WIDTH } from './game/constants';
import { drawAlert, drawOwl, drawPatrol, drawStudent, type WingPose } from './game/characters';
import { drawSakura } from './game/sakura';
import { drawHud, drawRoom, drawSeat, type RoomState, type SeatState } from './game/scene';
import { FONT } from './game/ui';

const LINES_1 = ['ふゆの ことば', 'ゆき・こおり・しも'];

interface Frame {
  caption: string;
  room: Partial<RoomState>;
  seat: Partial<SeatState>;
  score: number;
  timeLeft: number;
  period?: number;
  subject?: string;
}

const FRAMES: Frame[] = [
  {
    caption: '① 板書タイム：チョークを取る',
    room: { owlWing: 'reach', owlChalk: true, trayChalk: false, written: 0 },
    seat: { peck: 0 },
    score: 320,
    timeLeft: 38
  },
  {
    caption: '② 板書中：つまみ食い',
    room: { owlWing: 'write', owlChalk: true, trayChalk: false, written: 0.5 },
    seat: { peck: 1, puff: 0.5 },
    score: 540,
    timeLeft: 33
  },
  {
    caption: '③ 板書中：ほおばりモード',
    room: { owlWing: 'write', owlChalk: true, trayChalk: false, written: 0.85 },
    seat: { peck: 1, puff: 1, cram: true },
    score: 1260,
    timeLeft: 28
  },
  {
    caption: '④ 予兆：チョークを置く（コトッ）',
    room: { owlWing: 'reach', owlChalk: false, trayChalk: true, written: 1, owlSay: 'コトッ' },
    seat: { peck: 0 },
    score: 1340,
    timeLeft: 25
  },
  {
    caption: '⑤ 予兆：せき払い（板書以外）',
    room: { owlTurn: 0.08, written: 1, owlSay: 'ゴホン' },
    seat: { peck: 0 },
    score: 1480,
    timeLeft: 18
  },
  {
    caption: '⑥ 振り向き（まじめなふり）',
    room: { owlTurn: 1, written: 1 },
    seat: { peck: 0 },
    score: 1480,
    timeLeft: 17
  },
  {
    caption: '⑦ 見つかった！',
    room: { scold: true, written: 1 },
    seat: { peck: 0.6, puff: 0.8, caught: true },
    score: 1520,
    timeLeft: 12
  },
  {
    caption: '⑧ 3時間目：見回りの先生',
    room: {
      owlTurn: 0,
      owlWing: 'write',
      owlChalk: true,
      trayChalk: false,
      written: 0.4,
      lines: ['テスト', 'しずかに とくこと'],
      patrol: { x: 150, facing: 1, walk: 0.3, looking: true, warn: false }
    },
    seat: { peck: 0 },
    score: 3820,
    timeLeft: 41,
    period: 3,
    subject: 'テスト'
  }
];

function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, t: number): void {
  ctx.fillStyle = '#0b1428';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const room: RoomState = {
    time: t,
    written: 0,
    lines: LINES_1,
    owlTurn: 0,
    owlWing: 'rest',
    owlChalk: false,
    trayChalk: true,
    ...f.room
  };
  const seat: SeatState = { time: t, peck: 0, puff: 0, cram: false, caught: false, nuts: 0.8, chew: 0, eaten: 0, ...f.seat };
  drawRoom(ctx, room);
  drawSeat(ctx, seat);
  drawHud(ctx, {
    period: f.period ?? 1,
    subject: f.subject ?? 'こくご',
    timeLeft: f.timeLeft,
    score: f.score,
    eaten: Math.round(f.score / 10),
    hiScore: 5200
  });
}

function setup(id: string, w: number, h: number): CanvasRenderingContext2D {
  const c = document.getElementById(id) as HTMLCanvasElement;
  c.width = w;
  c.height = h;
  c.style.width = `${w / 2}px`;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no ctx');
  return ctx;
}

// --- 場面の一覧（4 列 × 2 段） ---
const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
const screens = setup('screens', fw * COLS + 16 * (COLS + 1), (fh + 16) * 2 + 16);
screens.fillStyle = '#1b1f2a';
screens.fillRect(0, 0, screens.canvas.width, screens.canvas.height);
for (const [i, f] of FRAMES.entries()) {
  const x = 16 + (i % COLS) * (fw + 16);
  const y = 16 + Math.floor(i / COLS) * (fh + 16);
  screens.save();
  screens.font = `bold 17px ${FONT}`;
  screens.fillStyle = '#e8ecf5';
  screens.textBaseline = 'middle';
  screens.fillText(f.caption, x + 4, y + CAP / 2);
  screens.translate(x, y + CAP);
  screens.scale(S, S);
  screens.beginPath();
  screens.rect(0, 0, WIDTH, HEIGHT);
  screens.clip();
  drawFrame(screens, f, 1.3 + i * 0.37);
  screens.restore();
}

// --- キャラクター一覧 ---
const sheet = setup('sheet', 1440, 900);
sheet.fillStyle = '#f6efe2';
sheet.fillRect(0, 0, 1440, 900);
const label = (s: string, x: number, y: number, size = 16): void => {
  sheet.font = `bold ${size}px ${FONT}`;
  sheet.fillStyle = '#4a3326';
  sheet.textAlign = 'center';
  sheet.textBaseline = 'middle';
  sheet.fillText(s, x, y);
};
label('フクロウ先生', 90, 30, 20);
const owlPoses: { name: string; turn?: number; wing?: WingPose; chalk?: boolean; angry?: boolean; front?: boolean }[] = [
  { name: '説明中（後ろ姿）' },
  { name: 'チョークを取る', wing: 'reach', chalk: true },
  { name: '板書', wing: 'write', chalk: true },
  { name: 'チョークを置く', wing: 'reach' },
  { name: 'ぴくっ（予兆）', turn: 0.1 },
  { name: 'フェイント（半分）', turn: 0.45 },
  { name: '振り向き', turn: 1 },
  { name: 'しかる', front: true, angry: true }
];
for (const [i, p] of owlPoses.entries()) {
  const x = 100 + i * 175;
  drawOwl(sheet, x, 250, {
    scale: 2.1,
    turn: p.turn ?? 0,
    turnSide: -1,
    wing: p.wing ?? 'rest',
    chalk: p.chalk ?? false,
    angry: p.angry ?? false,
    frontBody: p.front ?? false,
    time: 0.2
  });
  label(p.name, x, 285);
}
drawAlert(sheet, 100 + 4 * 175 + 40, 70, 1.6);

label('さくらちゃん', 90, 330, 20);
const faces: { name: string; puff?: number; eyes?: 'dot' | 'happy' | 'shock'; blush?: number; up?: boolean }[] = [
  { name: 'まじめなふり', up: true },
  { name: 'つまみ食い', eyes: 'happy', puff: 0.3 },
  { name: 'ほっぺ 半分', eyes: 'happy', puff: 0.6 },
  { name: 'ぱんぱん（ほおばり）', eyes: 'happy', puff: 1 },
  { name: '見つかった！', eyes: 'shock', puff: 0.8, blush: 1 }
];
for (const [i, f] of faces.entries()) {
  const x = 120 + i * 220;
  drawSakura(sheet, x, 470, { scale: 4, puff: f.puff ?? 0, eyes: f.eyes ?? 'dot', blush: f.blush ?? 0, up: f.up ?? false });
  label(f.name, x, 560);
}

label('見回りの先生（3時間目）', 1270, 330, 18);
drawPatrol(sheet, 1210, 500, { scale: 2.2, facing: 1, walk: 0.25 });
drawPatrol(sheet, 1340, 500, { scale: 2.2, looking: true });
label('見回り中', 1210, 540);
label('こちらを見る', 1340, 540);

label('クラスメイト（背景）', 120, 630, 20);
const kinds = [
  ['suzume', 'スズメ'],
  ['mejiro', 'メジロ'],
  ['yukimaru', 'ゆきまるくん'],
  ['hiyo', 'ヒヨドリ']
] as const;
for (const [i, [k, n]] of kinds.entries()) {
  const x = 140 + i * 200;
  drawStudent(sheet, x, 760, k, { scale: 3 });
  label(n, x, 840);
}
drawSakura(sheet, 960, 760, { view: 'back', scale: 3, shadow: false });
label('さくらちゃん（後ろ姿）', 960, 840);

// 開発時：画像をファイルに書き出す（png-receiver が動いていれば）。
async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  await fetch(`http://localhost:5190/?name=${name}`, { method: 'POST', body: blob }).catch(() => undefined);
}
void post(screens.canvas, 'd004-screens.png');
void post(sheet.canvas, 'd004-sheet.png');

// --- さくらちゃんの顔の拡大（ほっぺの膨らみの確認用） ---
const facesCtx = setup('faces', 1440, 420);
facesCtx.fillStyle = '#f6efe2';
facesCtx.fillRect(0, 0, 1440, 420);
for (const [i, f] of faces.entries()) {
  const x = 150 + i * 285;
  drawSakura(facesCtx, x, 200, { scale: 8, puff: f.puff ?? 0, eyes: f.eyes ?? 'dot', blush: f.blush ?? 0, up: f.up ?? false });
  facesCtx.font = `bold 20px ${FONT}`;
  facesCtx.fillStyle = '#4a3326';
  facesCtx.textAlign = 'center';
  facesCtx.fillText(f.name, x, 395);
}
void post(facesCtx.canvas, 'd004-faces.png');
