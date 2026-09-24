// デザイン確認用：場面ごとの画面と、お客さん・変装ゆきだるまの一覧を描く（開発時だけ使う）。
import { HEIGHT, HUD_H, LINE_Y, SAKURA_Y, WIDTH } from './game/constants';
import { ANIMAL_NAME, BEASTS, BIRDS, drawAnimal, type AnimalKind, type Mood } from './game/guests';
import { drawSakura } from './game/sakura';
import {
  drawCounter,
  drawField,
  drawFooter,
  drawGuide,
  drawHud,
  drawPop,
  drawSwipeTrail,
  pathScale,
  type GuidePose,
  type HudState
} from './game/scene';
import { DISGUISE_NAME, DISGUISE_TELL, drawSnowGuest, type Disguise } from './game/snowman';
import { drawDemo } from './game/demo';
import { drawTitleScreen } from './game/render';
import { COLOR, FONT, outlinedText, rr, text } from './game/ui';

type Guest =
  | { kind: AnimalKind; y: number; x?: number; mood?: Mood; hop?: number }
  | { snow: Disguise; y: number; x?: number; unmasked?: boolean; sweat?: boolean; rotate?: number; scale?: number };

interface Frame {
  caption: string;
  hud: HudState;
  guests: Guest[];
  guide: { x: number; pose: GuidePose };
  extra?: (ctx: CanvasRenderingContext2D, t: number) => void;
}

type QItem = { kind: AnimalKind } | { snow: Disguise };

/**
 * 「ウシは左へトラ右へ」のように、ぎっしり並んだ列を作る。先頭の足元が frontY。
 * うしろのお客さんは、前のお客さんの頭の上から少しだけ見える。
 */
function queue(items: QItem[], frontY: number, hop = 0): Guest[] {
  const out: Guest[] = [];
  let y = frontY;
  for (const [i, it] of items.entries()) {
    if (y < 150) break;
    const x = WIDTH / 2 + (i === 0 ? 0 : (i % 2 ? -1 : 1) * 3 * pathScale(y));
    out.push({ ...it, x, y, hop: (hop + i * 0.37) % 1 } as Guest);
    y -= 13 * pathScale(y);
  }
  return out.reverse();
}

const a = (kind: AnimalKind): QItem => ({ kind });
const s = (snow: Disguise): QItem => ({ snow });

const FRAMES: Frame[] = [
  {
    caption: '① 1めん：先頭だけがよく見える',
    hud: { stage: 1, timeLeft: 31, score: 180, hiScore: 2400 },
    guests: queue(
      [a('karasu'), a('risu'), a('shimaenaga'), s('none'), a('risu'), a('karasu'), s('none'), a('shimaenaga'), a('risu'), a('karasu'), a('risu'), s('none'), a('karasu'), a('shimaenaga')],
      445
    ),
    guide: { x: 190, pose: 'idle' }
  },
  {
    caption: '② ← スワイプ：カラスは空の会場へ',
    hud: { stage: 1, timeLeft: 30, score: 198, hiScore: 2400 },
    guests: [
      ...queue(
        [a('risu'), a('shimaenaga'), s('none'), a('risu'), a('karasu'), s('none'), a('shimaenaga'), a('risu'), a('karasu'), a('risu'), s('none'), a('karasu'), a('shimaenaga')],
        425,
        0.3
      ),
      { kind: 'karasu', x: 120, y: 440, mood: 'happy' }
    ],
    guide: { x: 170, pose: 'left' },
    extra: (ctx) => {
      drawSwipeTrail(ctx, 120, 410, -1, 0);
      drawPop(ctx, '+18', 120, 340);
    }
  },
  {
    caption: '③ ↑ スワイプ：雪だるまはおことわり',
    hud: { stage: 1, timeLeft: 22, score: 450, hiScore: 2400 },
    guests: [
      ...queue(
        [a('shimaenaga'), a('risu'), a('karasu'), s('none'), a('shimaenaga'), a('risu'), a('karasu'), a('risu'), s('none'), a('karasu'), a('shimaenaga'), a('risu')],
        430,
        0.6
      ),
      { snow: 'none', x: 330, y: 250, sweat: true, rotate: 0.5, scale: 1.8 }
    ],
    guide: { x: 280, pose: 'no' },
    extra: (ctx) => {
      drawSwipeTrail(ctx, 330, 250, 0, -1);
      outlinedText(ctx, 'おことわり！', 350, 300, 20, '#ffffff', '#b8483e');
      drawPop(ctx, '+15', 390, 190);
    }
  },
  {
    caption: '④ 2めん：うしろの変装は見分けにくい',
    hud: { stage: 2, timeLeft: 38, score: 1120, hiScore: 2400 },
    guests: queue(
      [s('risu'), a('kitsune'), s('usagi'), a('yamagara'), a('usagi'), s('karasu'), a('risu'), a('karasu'), s('kitsune'), a('yamagara'), a('kitsune'), s('none'), a('usagi'), a('karasu')],
      448,
      0.2
    ),
    guide: { x: 300, pose: 'idle' }
  },
  {
    caption: '⑤ 3めん：のこり人数で終わり',
    hud: { stage: 3, guestsLeft: 18, score: 2380, hiScore: 2400 },
    guests: queue(
      [s('sumi'), a('akagera'), a('momonga'), s('kigurumi'), a('gojukara'), s('shimaenaga'), a('shimaenaga'), a('kitsune'), s('doro'), a('risu'), a('karasu'), s('usagi'), a('momonga'), a('akagera')],
      450,
      0.5
    ),
    guide: { x: 140, pose: 'idle' }
  },
  {
    caption: '⑥ まちがえた！（ゲームオーバー）',
    hud: { stage: 2, timeLeft: 12, score: 1560, hiScore: 2400 },
    guests: [
      { kind: 'usagi', y: 300, mood: 'puzzled' },
      { snow: 'kitsune', x: 95, y: 405, unmasked: true, sweat: true }
    ],
    guide: { x: 240, pose: 'shock' },
    extra: (ctx) => {
      // はがれたお面
      ctx.save();
      ctx.translate(150, 380);
      ctx.rotate(0.6);
      ctx.fillStyle = '#e08a3c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(10,18,38,0.55)';
      ctx.fillRect(0, HUD_H, WIDTH, HEIGHT - HUD_H);
      rr(ctx, 60, 190, 360, 150, 14);
      ctx.fillStyle = COLOR.panel;
      ctx.fill();
      ctx.strokeStyle = COLOR.panelBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
      outlinedText(ctx, 'ゆきだるま だった！', 240, 228, 26, '#ffffff', '#b8483e');
      text(ctx, 'キツネのお面に だまされちゃった…', 240, 268, 14, COLOR.ink);
      text(ctx, 'スコア 1560 てん', 240, 304, 18, '#ffe38a', true);
    }
  }
];

function drawGuest(ctx: CanvasRenderingContext2D, g: Guest): void {
  const x = g.x ?? WIDTH / 2;
  if ('kind' in g) {
    drawAnimal(ctx, x, g.y, g.kind, { scale: pathScale(g.y), hop: g.hop ?? 0, mood: g.mood ?? 'normal' });
  } else {
    drawSnowGuest(ctx, x, g.y, g.snow, {
      scale: g.scale ?? pathScale(g.y),
      unmasked: g.unmasked ?? false,
      sweat: g.sweat ?? false,
      rotate: g.rotate ?? 0
    });
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, t: number): void {
  drawField(ctx, t);
  for (const g of f.guests) drawGuest(ctx, g);
  const front = Math.max(...f.guests.map((g) => g.y));
  drawCounter(ctx, front > LINE_Y - 60 ? 1 : 0);
  drawGuide(ctx, f.guide.x, SAKURA_Y, f.guide.pose, t);
  f.extra?.(ctx, t);
  drawHud(ctx, f.hud);
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

// --- 場面の一覧（4 列 × 2 段） ---
const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
const screens = setup('screens', fw * COLS + 16 * (COLS + 1), (fh + 16) * 2 + 16);
screens.fillStyle = '#1b1f2a';
screens.fillRect(0, 0, screens.canvas.width, screens.canvas.height);
const panels: { caption: string; draw: (ctx: CanvasRenderingContext2D, t: number) => void }[] = [
  ...FRAMES.map((f) => ({ caption: f.caption, draw: (ctx: CanvasRenderingContext2D, t: number) => drawFrame(ctx, f, t) })),
  { caption: '⑦ エンディング', draw: (ctx, t) => drawDemo(ctx, 'ending', t + 4, false) },
  { caption: '⑧ タイトル', draw: (ctx, t) => drawTitleScreen(ctx, t, 2400) }
];
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

// --- お客さんの一覧 ---
const sheet = setup('sheet', 1440, 1000);
sheet.fillStyle = '#f6efe2';
sheet.fillRect(0, 0, 1440, 1000);
const label = (s: string, x: number, y: number, size = 16, color = '#4a3326'): void => {
  sheet.font = `bold ${size}px ${FONT}`;
  sheet.fillStyle = color;
  sheet.textAlign = 'center';
  sheet.textBaseline = 'middle';
  sheet.fillText(s, x, y);
};
label('← とり（空の会場）', 140, 30, 20, '#3a6aa3');
for (const [i, k] of BIRDS.entries()) {
  const x = 110 + i * 150;
  drawAnimal(sheet, x, 190, k, { scale: 3.4 });
  label(ANIMAL_NAME[k], x, 215);
}
label('けもの（森の会場）→', 900, 30, 20, '#4a8a3a');
for (const [i, k] of BEASTS.entries()) {
  const x = 870 + i * 150;
  drawAnimal(sheet, x, 190, k, { scale: 3.4 });
  label(ANIMAL_NAME[k], x, 215);
}
label('↑ 雪だるま（入場おことわり）と変装', 220, 270, 20, '#b8483e');
const disguises: Disguise[] = ['none', 'karasu', 'risu', 'kitsune', 'usagi', 'sumi', 'doro', 'kigurumi', 'shimaenaga'];
for (const [i, d] of disguises.entries()) {
  const x = 90 + i * 155;
  drawSnowGuest(sheet, x, 470, d, { scale: 3.4 });
  label(DISGUISE_NAME[d], x, 500);
  label(`手がかり：${DISGUISE_TELL[d]}`, x, 522, 12, '#8a5a3a');
}
label('案内係のさくらちゃん', 140, 580, 20);
const poses: [GuidePose, string][] = [
  ['idle', 'うろうろ'],
  ['left', '← 案内'],
  ['right', '案内 →'],
  ['no', 'おことわり（✕）'],
  ['shock', 'まちがえた！'],
  ['happy', 'だいせいこう']
];
for (const [i, [p, n]] of poses.entries()) {
  const x = 120 + i * 200;
  drawGuide(sheet, x, 720, p, 0, 4);
  label(n, x, 820);
}
label('（くらべる）', 1330, 600, 14);
drawSakura(sheet, 1330, 720, { scale: 4 });
label('帽子なし', 1330, 820);
// お面の見やぶり比較
label('見くらべ：本物と変装', 220, 870, 18);
const pairs: [AnimalKind, Disguise][] = [
  ['karasu', 'karasu'],
  ['risu', 'risu'],
  ['kitsune', 'kigurumi'],
  ['shimaenaga', 'shimaenaga']
];
for (const [i, [a, d]] of pairs.entries()) {
  const x = 520 + i * 230;
  drawAnimal(sheet, x - 45, 980, a, { scale: 2.4 });
  drawSnowGuest(sheet, x + 45, 980, d, { scale: 2.4 });
}

// 開発時：画像をファイルに書き出す（png-receiver が動いていれば）。
async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  await fetch(`http://localhost:5190/?name=${name}`, { method: 'POST', body: blob }).catch(() => undefined);
}
void post(screens.canvas, 'd005-screens.png');
void post(sheet.canvas, 'd005-sheet.png');
