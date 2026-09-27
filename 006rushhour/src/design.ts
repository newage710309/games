// デザイン確認用：場面ごとの画面と、キャラクターの一覧を描く（開発時だけ使う）。
import { ANIMAL_NAME, drawAnimal, type AnimalKind } from './game/guests';
import {
  GRANNY_X,
  HEIGHT,
  SLOT_Y,
  WIDTH,
  drawBench,
  drawFooter,
  drawGranny,
  drawHud,
  drawStaff,
  drawStation,
  drawTrain,
  proj,
  slotPos,
  type GrannyOptions,
  type StaffPose
} from './game/station';
import { drawAnimalBack } from './game/guestsBack';
import { drawClearScreen, drawLuggage, drawTitleScreen } from './game/render';
import { drawSakura } from './game/sakura';
import { drawSnowGuest } from './game/snowman';
import { FONT, outlinedText } from './game/ui';

/** さくらちゃんの居場所。door = その列の最後尾（空ならドアの前）、granny = おばあちゃんの前、move = 移動中。 */
type Staff =
  | { at: 'door'; door: number; pose: StaffPose }
  | { at: 'granny'; pose: StaffPose }
  | { at: 'move'; from: number; to: number; k: number };

interface Frame {
  caption: string;
  /** ドアごとの、あふれている乗客（ドアに近い順）。 */
  cols: AnimalKind[][];
  staff: Staff;
  granny?: GrannyOptions | null;
  /** おばあちゃんの代わりに、おばあちゃんに化けた雪だるま。 */
  fakeGranny?: boolean;
  /** 大荷物のお客さん [ドア, 何番目]。 */
  luggage?: [number, number];
  open?: number;
  trainDx?: number;
  score: number;
  train: number;
  depart: number;
  extra?: (ctx: CanvasRenderingContext2D) => void;
}

const GRANNY_POS = proj(GRANNY_X, 420);

const FRAMES: Frame[] = [
  {
    caption: '① 手前のホームの端まで並べる',
    cols: [['risu', 'karasu'], ['usagi'], []],
    staff: { at: 'door', door: 0, pose: 'push' },
    score: 120,
    train: 1,
    depart: 0.15,
    extra: (ctx) => {
      const p = slotPos(0, 0);
      drawAnimalBack(ctx, p.x, p.y - 44, 'kitsune', { scale: 1.8, alpha: 0.5 });
      outlinedText(ctx, '+10', p.x + 44, p.y - 40, 18, '#ffe38a', '#6a3a20');
    }
  },
  {
    caption: '② 3人並んだら あぶない！',
    cols: [['risu', 'momonga'], ['karasu', 'kitsune', 'yamagara'], ['usagi']],
    staff: { at: 'door', door: 0, pose: 'push' },
    score: 680,
    train: 2,
    depart: 0.45,
    extra: (ctx) => {
      const p = slotPos(1, 3);
      outlinedText(ctx, 'あぶない！', p.x, p.y - 20, 16, '#ffffff', '#d63a3e');
    }
  },
  {
    caption: '③ 4人目がホームの端に着いたら アウト',
    cols: [['risu'], ['karasu', 'kitsune', 'yamagara', 'usagi'], ['momonga', 'risu']],
    staff: { at: 'door', door: 2, pose: 'shock' },
    score: 2360,
    train: 3,
    depart: 0.3,
    extra: (ctx) => {
      outlinedText(ctx, 'ホームの はしまで', WIDTH / 2, 190, 22, '#ffffff', '#b8483e');
      outlinedText(ctx, 'きちゃった！', WIDTH / 2, 222, 26, '#ffffff', '#b8483e');
    }
  },
  {
    caption: '④ おばあちゃんを たすける（+100）',
    cols: [['risu'], ['karasu'], []],
    staff: { at: 'granny', pose: 'help' },
    granny: { wobble: 0, happy: true },
    score: 900,
    train: 2,
    depart: 0.7,
    extra: (ctx) => {
      outlinedText(ctx, '+100', GRANNY_POS.x + 36, GRANNY_POS.y - 110, 20, '#ffe38a', '#6a3a20');
      outlinedText(ctx, 'ありがとうね', GRANNY_POS.x + 46, GRANNY_POS.y - 136, 13, '#ffffff', '#6a4a80');
    }
  },
  {
    caption: '⑤ 追加案：へんそう おばあちゃん（たすけたらアウト）',
    cols: [['risu'], ['karasu', 'usagi'], ['kitsune']],
    staff: { at: 'door', door: 1, pose: 'push' },
    fakeGranny: true,
    score: 1320,
    train: 2,
    depart: 0.3,
    extra: (ctx) => {
      outlinedText(ctx, 'ふらふら…', GRANNY_POS.x + 4, GRANNY_POS.y - 96, 12, '#ffffff', '#6a4a80');
      outlinedText(ctx, 'にんじん…？', GRANNY_POS.x + 40, GRANNY_POS.y - 118, 13, '#ffffff', '#b8483e');
    }
  },
  {
    caption: '⑥ 追加案：大荷物のお客さん（2回押す）',
    cols: [['kitsune', 'risu'], ['usagi'], ['karasu']],
    staff: { at: 'door', door: 0, pose: 'push' },
    luggage: [0, 0],
    score: 1540,
    train: 2,
    depart: 0.5,
    extra: (ctx) => {
      const p = slotPos(0, 0);
      outlinedText(ctx, 'うーん、はいらない！', p.x + 40, p.y - 104, 13, '#ffffff', '#6a3a20');
    }
  },
  {
    caption: '⑦ 追加案：ねぼうの ゆきまるくん（かけこみ）',
    cols: [['risu'], ['usagi'], []],
    staff: { at: 'door', door: 1, pose: 'wait' },
    score: 1980,
    train: 3,
    depart: 0.92,
    extra: (ctx) => {
      const p = proj(420, 450);
      drawSakura(ctx, p.x, p.y - 20, { view: 'left', bird: 'yukimaru', scale: 2.2, flap: 0.5 });
      ctx.strokeStyle = 'rgba(120,140,170,0.8)';
      ctx.lineWidth = 2;
      for (const dy of [-26, -14, -2]) {
        ctx.beginPath();
        ctx.moveTo(p.x + 40, p.y + dy);
        ctx.lineTo(p.x + 62, p.y + dy);
        ctx.stroke();
      }
      outlinedText(ctx, 'まって〜！', p.x - 4, p.y - 70, 15, '#ffffff', '#3a6aa3');
      outlinedText(ctx, 'タップで のせると +200', p.x - 40, p.y + 30, 12, '#ffe38a', '#6a3a20');
    }
  }
];

function staffPos(f: Frame): { x: number; y: number; pose: StaffPose } {
  const s = f.staff;
  if (s.at === 'granny') return { x: GRANNY_POS.x + 44, y: GRANNY_POS.y + 8, pose: s.pose };
  if (s.at === 'door') {
    const p = slotPos(s.door, f.cols[s.door]!.length);
    // 押しているときは、前の人にくっついて少し前のめり
    return { x: p.x, y: p.y + 14, pose: s.pose };
  }
  const a = slotPos(s.from, f.cols[s.from]!.length);
  const b = slotPos(s.to, f.cols[s.to]!.length);
  return { x: a.x + (b.x - a.x) * s.k, y: a.y + (b.y - a.y) * s.k + 14, pose: 'wait' };
}

function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, t: number): void {
  drawStation(ctx, t);
  drawTrain(ctx, f.open ?? 1, f.trainDx ?? 0);
  drawBench(ctx, GRANNY_POS.x, GRANNY_POS.y + 2);
  if (f.fakeGranny) drawSnowGuest(ctx, GRANNY_POS.x, GRANNY_POS.y, 'granny', { scale: 2.1, hop: t % 1 });
  else if (f.granny !== null) drawGranny(ctx, GRANNY_POS.x, GRANNY_POS.y, { time: t, wobble: 0.8, ...f.granny });
  const sp = staffPos(f);
  // 奥（上）から順に描く：列の人たちと、さくらちゃんを足元の y でならべる
  const items: { y: number; draw: () => void }[] = [];
  for (const [i, col] of f.cols.entries()) {
    for (const [j, k] of col.entries()) {
      const p = slotPos(i, j);
      const bag = f.luggage !== undefined && f.luggage[0] === i && f.luggage[1] === j;
      items.push({
        y: p.y,
        draw: () => {
          drawAnimalBack(ctx, p.x, p.y, k, { scale: 1.8, hop: (t + j * 0.3) % 1 });
          if (bag) drawLuggage(ctx, p.x, p.y, 1.8);
        }
      });
    }
  }
  items.push({ y: sp.y + 16, draw: () => drawStaff(ctx, sp.x, sp.y - 20, sp.pose) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  f.extra?.(ctx);
  drawHud(ctx, { score: f.score, hiScore: 4200, train: f.train, depart: f.depart, timeLeft: Math.round((1 - f.depart) * 30) });
  drawFooter(ctx);
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

// --- 場面の一覧（4 列 × 3 段） ---
const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
const panels: { caption: string; draw: (ctx: CanvasRenderingContext2D, t: number) => void }[] = [
  ...FRAMES.map((f) => ({ caption: f.caption, draw: (ctx: CanvasRenderingContext2D, t: number) => drawFrame(ctx, f, t) })),
  { caption: '⑧ 3本発車でクリア', draw: (ctx, t) => drawClearScreen(ctx, t + 3) },
  { caption: '⑨ タイトル', draw: (ctx, t) => drawTitleScreen(ctx, t, 4200) }

];
const rows = Math.ceil(panels.length / COLS);
const screens = setup('screens', fw * COLS + 16 * (COLS + 1), (fh + 16) * rows + 16);
screens.fillStyle = '#1b1f2a';
screens.fillRect(0, 0, screens.canvas.width, screens.canvas.height);
for (const [i, p] of panels.entries()) {
  const x = 16 + (i % COLS) * (fw + 16);
  const y = 16 + Math.floor(i / COLS) * (fh + 16);
  screens.save();
  screens.font = `bold 17px ${FONT}`;
  screens.fillStyle = '#e8ecf5';
  screens.textBaseline = 'middle';
  screens.fillText(p.caption, x + 4, y + CAP / 2);
  screens.translate(x, y + CAP);
  screens.scale(S, S);
  screens.beginPath();
  screens.rect(0, 0, WIDTH, HEIGHT);
  screens.clip();
  p.draw(screens, 1.3 + i * 0.37);
  screens.restore();
}
void SLOT_Y;

// --- キャラクター一覧 ---
const sheet = setup('sheet', 1440, 820);
sheet.fillStyle = '#f6efe2';
sheet.fillRect(0, 0, 1440, 820);
const label = (s: string, x: number, y: number, size = 16): void => {
  sheet.font = `bold ${size}px ${FONT}`;
  sheet.fillStyle = '#4a3326';
  sheet.textAlign = 'center';
  sheet.textBaseline = 'middle';
  sheet.fillText(s, x, y);
};
label('駅員のさくらちゃん', 150, 30, 20);
const poses: [StaffPose, string][] = [
  ['wait', 'まつ・移動（後ろ姿）'],
  ['push', 'ぎゅっと押す'],
  ['help', 'たすける'],
  ['happy', 'はっしゃ！'],
  ['shock', 'あふれた！']
];
for (const [i, [p, n]] of poses.entries()) {
  const x = 120 + i * 190;
  drawStaff(sheet, x, 200, p, 4);
  label(n, x, 290);
}
label('フクロウのおばあちゃん', 1200, 30, 20);
drawGranny(sheet, 1110, 250, { scale: 3.4, wobble: 0 });
drawGranny(sheet, 1300, 250, { scale: 3.4, away: true });
label('こっちを向いた（たすけられる）', 1110, 290, 13);
label('向こうを向いた（たすけられない）', 1300, 290, 13);
label('乗客（正面・後ろ姿）', 170, 350, 20);
const kinds: AnimalKind[] = ['karasu', 'yamagara', 'gojukara', 'akagera', 'shimaenaga', 'risu', 'momonga', 'kitsune', 'usagi'];
for (const [i, k] of kinds.entries()) {
  const x = 90 + i * 150;
  drawAnimal(sheet, x, 540, k, { scale: 3.4 });
  drawAnimalBack(sheet, x, 750, k, { scale: 3.4 });
  label(ANIMAL_NAME[k], x, 785);
}

async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  await fetch(`http://localhost:5190/?name=${name}`, { method: 'POST', body: blob }).catch(() => undefined);
}
void post(screens.canvas, 'd006-screens.png');
void post(sheet.canvas, 'd006-sheet.png');
