// デザイン確認用：場面ごとの画面と、動物・雪だるま・さくらちゃんの一覧を描く（開発時だけ使う）。
import {
  cellX,
  cellY,
  drawLandingMark,
  drawPiece,
  drawSteam,
  drawTiles,
  gridFrom,
  TILE,
  type Grid,
  type Piece
} from './game/board';
import { CELL, FIELD_W, FIELD_X, HEIGHT, HUD_H, WIDTH } from './game/constants';
import { drawDemo } from './game/demo';
import { ANIMAL_NAME, drawAnimal, type AnimalKind } from './game/guests';
import { drawSakura } from './game/sakura';
import {
  drawBackground,
  drawChain,
  drawFieldFrame,
  drawFooter,
  drawGyu,
  drawHud,
  drawPop,
  drawSide,
  type HudState,
  type SideState
} from './game/scene';
import { drawTitleScreen } from './game/title';
import { COLOR, FONT, outlinedText, rr, text } from './game/ui';

const L: Record<string, Piece> = {
  s: 'shimaenaga',
  r: 'risu',
  k: 'karasu',
  f: 'kitsune',
  y: 'yamagara',
  m: 'momonga',
  u: 'usagi',
  a: 'akagera',
  g: 'gojukara',
  o: 'snow',
  O: 'bigsnow'
};

interface Falling {
  /** 上・下の 2 匹。row は下の 1 匹の段（小数で落ちている途中）。 */
  top: Piece;
  bottom: Piece;
  col: number;
  row: number;
  /** 着地点（下の 1 匹の段）。 */
  land?: number;
}

interface Squeeze {
  cells: [number, number][];
  p: number;
}

interface Frame {
  caption: string;
  grid: Grid;
  hud: HudState;
  side: SideState;
  falling?: Falling;
  squeeze?: Squeeze;
  /** 溶けている途中の雪だるま。 */
  melting?: { cells: [number, number][]; p: number };
  /** 空中を落ちてくる雪だるま（col, 段）。 */
  dropping?: [number, number, Piece][];
  danger?: number;
  shake?: boolean;
  extra?: (ctx: CanvasRenderingContext2D) => void;
}

const g = (rows: string[]): Grid => gridFrom(rows, L);
const key = (r: number, c: number): string => `${r},${c}`;

function drawPlay(ctx: CanvasRenderingContext2D, f: Frame, t: number): void {
  drawBackground(ctx, t);
  drawFieldFrame(ctx, f.danger ?? 0);
  const sq = new Set((f.squeeze?.cells ?? []).map(([r, c]) => key(r, c)));
  const melt = new Set((f.melting?.cells ?? []).map(([r, c]) => key(r, c)));
  drawTiles(ctx, f.grid, (r, c) => sq.has(key(r, c)));
  // ぎゅっと寄る中心
  let mx = 0;
  let my = 0;
  for (const [r, c] of f.squeeze?.cells ?? []) {
    mx += cellX(c) + CELL / 2;
    my += cellY(r) + CELL / 2;
  }
  const n = f.squeeze?.cells.length ?? 1;
  mx /= n;
  my /= n;
  if (f.squeeze) {
    // 消える組の座布団は、寄せ集めた 1 枚の丸に
    const p = f.squeeze.p;
    const kind = f.grid[f.squeeze.cells[0][0]][f.squeeze.cells[0][1]];
    ctx.fillStyle = kind !== null && kind in TILE ? TILE[kind as AnimalKind] : '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(mx, my, CELL * (1.3 - p * 0.3), CELL * (1.1 - p * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (let r = 0; r < f.grid.length; r++) {
    for (let c = 0; c < f.grid[r].length; c++) {
      const p = f.grid[r][c];
      if (p === null) continue;
      const k = key(r, c);
      if (sq.has(k)) {
        drawPiece(ctx, p, cellX(c), cellY(r), { squeeze: f.squeeze?.p ?? 0, towardX: mx, towardY: my, mood: 'happy' });
      } else if (melt.has(k)) {
        drawPiece(ctx, p, cellX(c), cellY(r), { melt: f.melting?.p ?? 0 });
      } else {
        const shake = f.shake && r < 4 ? Math.sin(t * 40 + c) * 1.5 : 0;
        drawPiece(ctx, p, cellX(c), cellY(r), { shake });
      }
    }
  }
  if (f.squeeze) {
    drawSteam(ctx, mx, my, f.squeeze.p);
    drawGyu(ctx, mx, my - 30, f.squeeze.p);
  }
  if (f.falling) {
    const fl = f.falling;
    if (fl.land !== undefined) {
      drawLandingMark(ctx, fl.land, fl.col, fl.bottom);
      drawLandingMark(ctx, fl.land - 1, fl.col, fl.top);
    }
    drawPiece(ctx, fl.bottom, cellX(fl.col), cellY(0) + fl.row * CELL);
    drawPiece(ctx, fl.top, cellX(fl.col), cellY(0) + (fl.row - 1) * CELL);
  }
  for (const [c, row, p] of f.dropping ?? []) drawPiece(ctx, p, cellX(c), cellY(0) + row * CELL);
  drawSide(ctx, f.side, t);
  f.extra?.(ctx);
  drawHud(ctx, f.hud);
  drawFooter(ctx);
}

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fillRect(0, y, WIDTH, h);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(15,23,48,0.94)';
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

const HI = 12800;
const S1: SideState = { next: ['karasu', 'kitsune'], snowIn: 5, snowCount: 2, mood: 'idle' };

const base1 = [
  '......',
  '......',
  'f.r..k',
  'fsrrkk'
];

const FRAMES: Frame[] = [
  {
    caption: '② 1めん：2ひき 1くみで おちてくる',
    grid: g(base1),
    hud: { stage: 1, left: 40, score: 0, hiScore: HI },
    side: S1,
    falling: { top: 'shimaenaga', bottom: 'risu', col: 2, row: 2.4, land: 9 },
    extra: (ctx) => {
      banner(ctx, 300, 36);
      text(ctx, 'てんせん = おちるところ', FIELD_X + FIELD_W / 2, 318, 13, COLOR.ink, true);
    }
  },
  {
    caption: '③ 4ひき くっついて「ぎゅっ！」',
    grid: g(['..s...', '..r...', 'f.r..k', 'fsrrkk']),
    hud: { stage: 1, left: 40, score: 0, hiScore: HI },
    side: { ...S1, next: ['risu', 'risu'], snowIn: 4, mood: 'cheer', say: 'いいね！' },
    squeeze: {
      cells: [
        [9, 2],
        [10, 2],
        [11, 2],
        [11, 3]
      ],
      p: 0.6
    },
    extra: (ctx) => drawPop(ctx, '+40', cellX(3) + 10, cellY(8))
  },
  {
    caption: '④ つづけて消えると れんさ',
    grid: g(['......', '......', 'kfskk.', 'fskkff', 'fsfrrr', 'rrkfsr']),
    hud: { stage: 1, left: 28, score: 480, hiScore: HI },
    side: { ...S1, next: ['shimaenaga', 'kitsune'], snowIn: 2, mood: 'cheer', say: 'すごーい！' },
    squeeze: {
      cells: [
        [8, 3],
        [8, 4],
        [9, 2],
        [9, 3]
      ],
      p: 0.45
    },
    extra: (ctx) => {
      drawChain(ctx, 2, cellY(4));
      drawPop(ctx, '+80 ×2', cellX(4), cellY(6) + 10);
    }
  },
  {
    caption: '⑤ 2めん：ゆきだるまが ふってくる',
    grid: g(['......', '......', '......', 'y....u', 'ym..uu', 'smays.', 'aamysy']),
    hud: { stage: 2, left: 47, score: 2350, hiScore: HI },
    side: { next: ['usagi', 'momonga'], snowIn: 0, snowCount: 3, mood: 'idle', say: 'わっ！' },
    dropping: [
      [0, 2.6, 'snow'],
      [3, 1.4, 'snow'],
      [5, 3.1, 'snow']
    ]
  },
  {
    caption: '⑥ となりで消えると ゆきだるまが とける',
    grid: g(['......', '......', 'o..o..', 'y.uuo.', 'ymouuo', 'smays.', 'aamysy']),
    hud: { stage: 2, left: 43, score: 2600, hiScore: HI },
    side: { next: ['akagera', 'yamagara'], snowIn: 7, snowCount: 3, mood: 'cheer', say: 'とけた！' },
    squeeze: {
      cells: [
        [8, 2],
        [8, 3],
        [9, 3],
        [9, 4]
      ],
      p: 0.55
    },
    melting: {
      cells: [
        [7, 3],
        [8, 4],
        [9, 2],
        [9, 5]
      ],
      p: 0.55
    },
    extra: (ctx) => drawPop(ctx, '+40', cellX(3) + 20, cellY(6) + 20)
  },
  {
    caption: '⑦ 3めん：おおきい ゆきだるま・あぶない！',
    grid: g([
      '......',
      '..u...',
      '.ffg..',
      'oOkgu.',
      'kOskuu',
      'gfOkss',
      'uffkOg',
      'osgukk',
      'Ouggfs',
      'ksufuk',
      'kgsfug',
      'gskugs'
    ]),
    hud: { stage: 3, left: 21, score: 6740, hiScore: HI },
    side: { next: ['gojukara', 'kitsune'], snowIn: 3, snowCount: 4, mood: 'panic', say: 'あぶない！' },
    danger: 1,
    shake: true
  },
  {
    caption: '⑧ ゲームオーバー（1かいで おしまい）',
    grid: g([
      '..s...',
      '..u...',
      '.ffg..',
      'oOkgu.',
      'kOskuu',
      'gfOkss',
      'uffkOg',
      'osgukk',
      'Ouggfs',
      'ksufuk',
      'kgsfug',
      'gskugs'
    ]),
    hud: { stage: 3, left: 19, score: 7020, hiScore: HI },
    side: { next: ['gojukara', 'kitsune'], snowIn: 2, snowCount: 4, mood: 'sad' },
    danger: 1,
    extra: (ctx) => {
      ctx.fillStyle = 'rgba(8,12,26,0.6)';
      ctx.fillRect(0, HUD_H, WIDTH, HEIGHT - HUD_H);
      panel(ctx, 40, 170, 400, 260);
      outlinedText(ctx, 'あふれちゃった…', WIDTH / 2, 208, 26, '#ffffff', '#b8483e');
      text(ctx, 'でてくる ところが ふさがったよ', WIDTH / 2, 246, 14, COLOR.ink, true);
      text(ctx, '3めん ・ 101ひき けした ・ さいだい 3れんさ', WIDTH / 2, 278, 13, COLOR.muted, true);
      text(ctx, 'てんすう', WIDTH / 2, 306, 12, COLOR.muted, true);
      text(ctx, '7,020', WIDTH / 2, 336, 32, COLOR.ink, true);
      text(ctx, 'タップで タイトルへ', WIDTH / 2, 400, 14, COLOR.muted, true);
    }
  },
  {
    caption: '⑨ めんクリア（のこり 0ひき）',
    grid: g(['......', '......', '......', '.....k', 's...fk', 'sr.ffk', 'rrs.sr']),
    hud: { stage: 1, left: 0, score: 1830, hiScore: HI },
    side: { ...S1, mood: 'cheer', say: 'やったね！' },
    extra: (ctx) => {
      banner(ctx, 250, 110);
      outlinedText(ctx, '1めん クリア！', WIDTH / 2, 286, 28, '#fff4c2', '#5a3a1e');
      text(ctx, '40ひき ぎゅっと した ・ ボーナス 500てん', WIDTH / 2, 326, 15, COLOR.ink, true);
    }
  }
];

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
  { caption: '① タイトル', draw: (ctx, t) => drawTitleScreen(ctx, t, HI) },
  ...FRAMES.map((f) => ({ caption: f.caption, draw: (ctx: CanvasRenderingContext2D, t: number) => drawPlay(ctx, f, t) })),
  { caption: '⑩ 1めんのあと：おしくらまんじゅう', draw: (ctx, t) => drawDemo(ctx, 'break1', t + 2, false) },
  { caption: '⑪ 2めんのあと：おおきい ゆきだるま', draw: (ctx, t) => drawDemo(ctx, 'break2', t + 3, false) },
  { caption: '⑫ エンディング：はるが きた', draw: (ctx, t) => drawDemo(ctx, 'ending', t + 4, false) }
];
const rowsN = Math.ceil(panels.length / COLS);
const screens = setup('screens', fw * COLS + 16 * (COLS + 1), (fh + 16) * rowsN + 16);
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

// --- キャラクターの一覧 ---
const sheet = setup('sheet', 1440, 1120);
sheet.fillStyle = '#f6efe2';
sheet.fillRect(0, 0, 1440, 1120);
const label = (s: string, x: number, y: number, size = 16, color = '#4a3326'): void => {
  sheet.font = `bold ${size}px ${FONT}`;
  sheet.fillStyle = color;
  sheet.textAlign = 'center';
  sheet.textBaseline = 'middle';
  sheet.fillText(s, x, y);
};
/** 座布団つきで 1 マスを大きく描く。 */
const bigCell = (p: Piece, x: number, y: number, z: number, look = {}): void => {
  sheet.save();
  sheet.translate(x - (CELL * z) / 2, y - (CELL * z) / 2);
  sheet.scale(z, z);
  sheet.translate(-cellX(0), -cellY(0));
  if (p in TILE) {
    sheet.fillStyle = TILE[p as AnimalKind];
    sheet.globalAlpha = 0.85;
    sheet.beginPath();
    sheet.roundRect(cellX(0) + 3, cellY(0) + 3, CELL - 6, CELL - 6, 10);
    sheet.fill();
    sheet.globalAlpha = 1;
  }
  drawPiece(sheet, p, cellX(0), cellY(0), look);
  sheet.restore();
};

const STAGES: [string, AnimalKind[]][] = [
  ['1めん（4しゅ）', ['shimaenaga', 'risu', 'karasu', 'kitsune']],
  ['2めん（5しゅ）', ['shimaenaga', 'yamagara', 'momonga', 'usagi', 'akagera']],
  ['3めん（5しゅ）', ['shimaenaga', 'gojukara', 'kitsune', 'usagi', 'karasu']]
];
for (const [si, [name, kinds]] of STAGES.entries()) {
  const y = 90 + si * 150;
  label(name, 100, y, 20, '#3a6aa3');
  for (const [i, k] of kinds.entries()) {
    const x = 270 + i * 150;
    bigCell(k, x, y - 6, 2.3);
    label(ANIMAL_NAME[k], x, y + 66, 14);
  }
}
label('くっつくと 座布団が つながる', 1150, 40, 18, '#3a6aa3');
{
  // 小さなフィールドの見本（3×3）
  const mini = gridFrom(['......', '......', '......', '......', '......', '......', '......', '......', '......', 'rr....', 'rk....', 'skk...'], L);
  sheet.save();
  sheet.translate(1000, 70);
  sheet.scale(2, 2);
  sheet.translate(-cellX(0), -cellY(9));
  drawTiles(sheet, mini);
  for (let r = 9; r < 12; r++) for (let c = 0; c < 3; c++) {
    const p = mini[r][c];
    if (p !== null) drawPiece(sheet, p, cellX(c), cellY(r));
  }
  sheet.restore();
  label('同じなかまが 4ひき で「ぎゅっ」', 1150, 370, 15);
}

const yS = 600;
label('おじゃまの ゆきだるま', 170, yS - 70, 20, '#b8483e');
bigCell('snow', 110, yS, 2.3);
label('ゆきだるま', 110, yS + 70, 14);
bigCell('snow', 260, yS, 2.3, { melt: 0.55 });
label('とけるところ', 260, yS + 70, 14);
bigCell('bigsnow', 450, yS, 2.3);
label('おおきい ゆきだるま', 450, yS + 70, 14);
label('（3めん）', 450, yS + 90, 12);
label('→ 1かい とけると', 590, yS, 14);
bigCell('snow', 720, yS, 2.3);
label('ふつうの ゆきだるまに', 720, yS + 70, 14);

label('「ぎゅっ」の うごき', 1150, yS - 110, 20, '#d2577f');
for (const [i, p] of [0, 0.35, 0.7].entries()) {
  const x = 980 + i * 160;
  sheet.save();
  sheet.translate(x, yS - 10);
  sheet.scale(1.3, 1.3);
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ] as const) {
    const cx = dx * 23 * (1 - p * 0.32);
    const cy = dy * 23 * (1 - p * 0.32);
    sheet.save();
    sheet.translate(cx, cy + 19);
    sheet.scale(1 + p * 0.22, 1 - p * 0.16);
    drawAnimal(sheet, 0, 0, 'risu', { scale: 1.18, mood: p > 0 ? 'happy' : 'normal', shadow: false });
    sheet.restore();
  }
  if (p > 0.5) drawSteam(sheet, 0, 0, 0.3);
  sheet.restore();
  label(['くっついた', 'ぎゅー…', 'ぎゅっ！（ゆげが でて きえる）'][i], x, yS + 70, 13);
}

const yK = 900;
label('さくらちゃん（みぎの らんで おうえん）', 260, yK - 110, 20);
const moods: [string, (x: number) => void][] = [
  ['みまもる', (x) => drawSakura(sheet, x, yK, { scale: 3.4, gaze: -1 })],
  ['よろこぶ（れんさ）', (x) => drawSakura(sheet, x, yK - 10, { scale: 3.4, eyes: 'happy' })],
  ['あわてる（あぶない）', (x) => drawSakura(sheet, x, yK, { scale: 3.4, eyes: 'shock', gaze: -1 })],
  ['しょんぼり（おしまい）', (x) => drawSakura(sheet, x, yK + 4, { scale: 3.4, dead: true, squash: 0.12 })]
];
for (const [i, [name, draw]] of moods.entries()) {
  const x = 120 + i * 210;
  draw(x);
  label(name, x, yK + 100, 15);
}
label('いろの みわけ（座布団）', 1150, yK - 110, 20, '#3a6aa3');
for (const [i, k] of (Object.keys(TILE) as AnimalKind[]).entries()) {
  const x = 960 + (i % 3) * 130;
  const y = yK - 50 + Math.floor(i / 3) * 90;
  bigCell(k, x, y, 1.5);
  label(ANIMAL_NAME[k], x, y + 44, 12);
}

// 開発時：画像をファイルに書き出す（png-receiver が動いていれば）。
async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  await fetch(`http://localhost:5190/?name=${name}`, { method: 'POST', body: blob }).catch(() => undefined);
}
void post(screens.canvas, 'd007-screens.png');
void post(sheet.canvas, 'd007-sheet.png');
