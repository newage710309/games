// デザイン確認用：場面ごとの画面と、さくらちゃん・鳥・枝・メーター・雪・雪玉・背景の一覧を描く（開発時だけ使う）。
import { BIRD_KINDS, BIRD_NAME, BIRD_WEIGHT, drawBird, type BirdKind, type Mood } from './game/birds';
import { BIRD_SCALE, HEIGHT, PIVOT_X, PIVOT_Y, WIDTH } from './game/constants';
import { drawSakura } from './game/sakura';
import {
  angleFor,
  drawBigWord,
  drawBranch,
  drawFeather,
  drawHud,
  drawMeter,
  drawOrderBubble,
  drawPanel,
  drawQueue,
  drawSnowPile,
  drawSnowball,
  drawStageBackground,
  drawStar,
  drawThrower,
  orderText,
  say,
  type BranchLook,
  type Order,
  type PanelState,
  type QueueItem,
  type SlotThing
} from './game/scene';
import { COLOR, FONT, outlinedText, text } from './game/ui';

const HI = 12800;

/** 場所 → もの の対応から、枝の slots 配列を作る。 */
function slots(perSide: number, m: Record<number, SlotThing>): (SlotThing | null)[] {
  const a: (SlotThing | null)[] = [];
  for (let p = -perSide; p <= perSide; p++) a.push(m[p] ?? null);
  return a;
}
const b = (bird: BirdKind, extra: Partial<Extract<SlotThing, { kind: 'bird' }>> = {}): SlotThing => ({ kind: 'bird', bird, ...extra });
const snow = (weight: number): SlotThing => ({ kind: 'snow', weight });

interface Frame {
  caption: string;
  stage: number;
  puzzle: number;
  puzzles: number;
  score: number;
  branch: Omit<BranchLook, 't' | 'stage'>;
  queue: QueueItem[];
  panel: Omit<PanelState, 't'>;
  extra?: (ctx: CanvasRenderingContext2D, t: number) => void;
}

const L1 = 8;
const L2 = 6;
const L3 = 4;

const FRAMES: Frame[] = [
  {
    caption: '② 1めん もんだい1：場所を えらぶ（薄く かたむきを 予告）',
    stage: 1,
    puzzle: 1,
    puzzles: 4,
    score: 0,
    branch: {
      perSide: 3,
      angle: angleFor(-2, L1),
      ghostAngle: angleFor(0, L1),
      slots: slots(3, { [-2]: b('enaga') }),
      cursor: 2,
      incoming: 'enaga',
      sakura: { state: 'none' }
    },
    queue: [{ kind: 'bird', bird: 'enaga' }, { kind: 'bird', bird: 'yamagara' }, { kind: 'bird', bird: 'gojukara' }],
    panel: { message: 'エナガ（おもさ 1）は どこに とまる？', tilt: -2, limit: L1, ghost: 0, canUndo: true }
  },
  {
    caption: '③ 1めん：注文（かなっていない 吹き出しが 赤く はずむ）',
    stage: 1,
    puzzle: 3,
    puzzles: 4,
    score: 1400,
    branch: {
      perSide: 3,
      angle: angleFor(2, L1),
      ghostAngle: angleFor(-2, L1),
      slots: slots(3, {
        [-3]: b('akagera', { order: { type: 'edge' }, ok: true, mood: 'happy' }),
        [1]: b('yamagara', { order: { type: 'near', who: 'gojukara' }, ok: false, mood: 'puzzled' }),
        [3]: b('enaga', { order: { type: 'avoid', who: 'karasu' }, ok: true })
      }),
      cursor: -1,
      incoming: 'enaga',
      sakura: { state: 'none' }
    },
    queue: [{ kind: 'bird', bird: 'enaga' }, { kind: 'bird', bird: 'gojukara', order: { type: 'near', who: 'yamagara' } }],
    panel: { message: 'ヤマガラ「ゴジュウカラの となりがいい」', messageColor: '#ffb4c4', tilt: 2, limit: L1, ghost: -2, canUndo: true }
  },
  {
    caption: '④ 2めん 雪の谷：積もった雪（とまれない・重さがある）',
    stage: 2,
    puzzle: 1,
    puzzles: 5,
    score: 4300,
    branch: {
      perSide: 4,
      angle: angleFor(-3, L2),
      ghostAngle: angleFor(1, L2),
      slots: slots(4, { [-3]: snow(1), [2]: snow(2), [-1]: b('yamagara'), [-4]: b('enaga') }),
      cursor: 4,
      incoming: 'enaga',
      sakura: { state: 'none' }
    },
    queue: [{ kind: 'bird', bird: 'enaga' }, { kind: 'bird', bird: 'karasu' }, { kind: 'bird', bird: 'enaga' }, { kind: 'bird', bird: 'akagera' }],
    panel: { message: 'エナガ（おもさ 1）は どこに とまる？', tilt: -3, limit: L2, ghost: 1, canUndo: true }
  },
  {
    caption: '⑤ 3めん 夕暮れ：雪だるまの 雪玉（来る場所を 予告）',
    stage: 3,
    puzzle: 2,
    puzzles: 5,
    score: 8900,
    branch: {
      perSide: 4,
      angle: angleFor(1, L3),
      slots: slots(4, { [-2]: b('gojukara'), [-1]: b('yamagara'), [1]: b('akagera'), [3]: snow(1) }),
      snowTargets: [-4],
      sakura: { state: 'none' }
    },
    queue: [
      { kind: 'snowball', pos: -4, weight: 2 },
      { kind: 'bird', bird: 'karasu', order: { type: 'edge' } },
      { kind: 'bird', bird: 'enaga' },
      { kind: 'snowball', pos: 2, weight: 2 },
      { kind: 'bird', bird: 'enaga' }
    ],
    panel: { message: '雪玉が 来るよ！（おもさ 2）', messageColor: '#bfe0ff', tilt: 1, limit: L3, ghost: -7, canUndo: true },
    extra: (ctx, t) => {
      drawThrower(ctx, 420, 250, t, 0.8);
      say(ctx, 'えいっ', 360, 160, 400, 190, 15);
    }
  },
  {
    caption: '⑥ 失敗：かたむきすぎて ばさばさっ',
    stage: 1,
    puzzle: 2,
    puzzles: 4,
    score: 700,
    branch: {
      perSide: 3,
      angle: 0.32,
      slots: slots(3, {}),
      sakura: { state: 'none' }
    },
    queue: [],
    panel: { message: 'もういちど やってみよう', messageColor: '#ffb4c4', tilt: 10, limit: L1, ghost: null, canUndo: false },
    extra: (ctx, t) => {
      const fly: [BirdKind, number, number][] = [
        ['karasu', 380, 250],
        ['enaga', 300, 220],
        ['yamagara', 150, 260],
        ['enaga', 90, 300]
      ];
      for (const [k, [kind, x, y]] of fly.entries()) {
        drawBird(ctx, x, y, kind, { scale: BIRD_SCALE, flap: 0.5 + 0.5 * Math.sin(t * 18 + k), mood: 'shock', rotate: (k - 1.5) * 0.2 });
      }
      for (let k = 0; k < 7; k++) drawFeather(ctx, 160 + k * 34, 330 + (k % 3) * 18, k * 0.9, k % 2 ? '#ffffff' : '#c9743a');
      drawBigWord(ctx, 'ばさばさっ！', 176, 40, '#ffffff', '#7a1f30');
    }
  },
  {
    caption: '⑦ さいごに さくらちゃんが 真ん中へ 飛びこむ',
    stage: 2,
    puzzle: 3,
    puzzles: 5,
    score: 5600,
    branch: {
      perSide: 4,
      angle: 0,
      slots: slots(4, { [-4]: snow(1), [-3]: b('yamagara'), [-1]: b('enaga'), [1]: b('enaga'), [2]: b('gojukara', { order: { type: 'near', who: 'yamagara' }, ok: false }), [4]: b('enaga') }),
      sakura: { state: 'jump', p: 0.6 }
    },
    queue: [],
    panel: { message: 'さくらちゃん、いくよ！', tilt: 0, limit: L2, ghost: null, canUndo: false }
  },
  {
    caption: '⑧ クリア ★★★：すき間なしの エナガだんご',
    stage: 1,
    puzzle: 4,
    puzzles: 4,
    score: 3200,
    branch: {
      perSide: 3,
      angle: 0,
      slots: slots(3, {
        [-2]: b('yamagara', { mood: 'happy' }),
        [-1]: b('enaga', { mood: 'happy' }),
        [1]: b('enaga', { mood: 'happy' }),
        [2]: b('gojukara', { mood: 'happy', order: { type: 'near', who: 'yamagara' }, ok: true }),
        [3]: b('enaga', { mood: 'happy' }),
        [-3]: b('enaga', { mood: 'happy' })
      }),
      sakura: { state: 'on', happy: true },
      dango: 1
    },
    queue: [],
    panel: { message: 'ぴったり つり合った！', messageColor: '#fff4a8', tilt: 0, limit: L1, ghost: null, canUndo: false },
    extra: (ctx) => {
      ctx.fillStyle = 'rgba(10,18,38,0.8)';
      ctx.fillRect(0, 126, WIDTH, 170);
      outlinedText(ctx, 'エナガだんご かんせい！', WIDTH / 2, 156, 26, '#fff4c2', '#5a3a1e');
      drawStar(ctx, WIDTH / 2 - 52, 202, 22, '#ffd84a', '#a8761a');
      drawStar(ctx, WIDTH / 2, 196, 26, '#ffd84a', '#a8761a');
      drawStar(ctx, WIDTH / 2 + 52, 202, 22, '#ffd84a', '#a8761a');
      text(ctx, 'クリア 300 ・ もどさず 200 ・ すき間なし 300', WIDTH / 2, 244, 13, COLOR.ink, true);
      text(ctx, 'タップで つぎの もんだいへ', WIDTH / 2, 274, 13, COLOR.pink, true);
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

function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, t: number): void {
  drawStageBackground(ctx, f.stage, t);
  drawBranch(ctx, { ...f.branch, stage: f.stage, t });
  f.extra?.(ctx, t);
  drawQueue(ctx, f.queue, f.branch.perSide, t);
  drawPanel(ctx, { ...f.panel, t });
  drawHud(ctx, { stage: f.stage, puzzle: f.puzzle, puzzles: f.puzzles, score: f.score, hiScore: HI });
}

function drawTitleMock(ctx: CanvasRenderingContext2D, t: number): void {
  drawStageBackground(ctx, 1, t);
  drawBranch(ctx, {
    stage: 1,
    perSide: 3,
    angle: 0,
    t,
    slots: slots(3, {
      [-3]: b('yamagara', { mood: 'happy' }),
      [-2]: b('enaga', { mood: 'happy' }),
      [-1]: b('enaga', { mood: 'happy' }),
      [1]: b('enaga', { mood: 'happy' }),
      [2]: b('enaga', { mood: 'happy' }),
      [3]: b('gojukara', { mood: 'happy' })
    }),
    sakura: { state: 'on', happy: true },
    dango: 1
  });
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.beginPath();
  ctx.roundRect(30, 72, 420, 124, 16);
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 106, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'エナガだんご', WIDTH / 2, 158, 44, '#f8c3d2', '#8a2f52');
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  text(ctx, 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 38, 18, COLOR.ink, true);
  text(ctx, `HI ${HI.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}

// --- 場面の一覧（4 列） ---
const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
const panels: { caption: string; draw: (ctx: CanvasRenderingContext2D, t: number) => void }[] = [
  { caption: '① タイトル', draw: drawTitleMock },
  ...FRAMES.map((f) => ({ caption: f.caption, draw: (ctx: CanvasRenderingContext2D, t: number) => drawFrame(ctx, f, t) }))
];
const rowsN = Math.ceil(panels.length / COLS);
const screens = setup('screens', fw * COLS + 16 * (COLS + 1), (fh + 16) * rowsN + 16);
screens.fillStyle = '#1b1f2a';
screens.fillRect(0, 0, screens.canvas.width, screens.canvas.height);
for (const [i, p] of panels.entries()) {
  const x = 16 + (i % COLS) * (fw + 16);
  const y = 16 + Math.floor(i / COLS) * (fh + 16);
  screens.save();
  screens.font = `bold 13px ${FONT}`;
  screens.fillStyle = '#e8ecf5';
  screens.textBaseline = 'middle';
  screens.textAlign = 'left';
  screens.fillText(p.caption, x + 4, y + CAP / 2);
  screens.translate(x, y + CAP);
  screens.scale(S, S);
  screens.beginPath();
  screens.rect(0, 0, WIDTH, HEIGHT);
  screens.clip();
  p.draw(screens, 1.3 + i * 0.37);
  screens.restore();
}

// --- 一覧 ---
const SW = 1440;
const SH = 2000;
const sheet = setup('sheet', SW, SH);
sheet.fillStyle = '#eef4fa';
sheet.fillRect(0, 0, SW, SH);
const label = (s: string, x: number, y: number, size = 16, color = '#4a3326'): void => {
  sheet.font = `bold ${size}px ${FONT}`;
  sheet.fillStyle = color;
  sheet.textAlign = 'center';
  sheet.textBaseline = 'middle';
  sheet.fillText(s, x, y);
};

// さくらちゃん
label('さくらちゃん', 330, 30, 20, '#d2577f');
const poses: [string, (x: number, y: number) => void][] = [
  ['ふつう', (x, y) => drawSakura(sheet, x, y, { scale: 3, gaze: 1 })],
  ['飛びこむ', (x, y) => drawSakura(sheet, x, y, { scale: 3, view: 'right', flap: 1, rotate: 0.2 })],
  ['だんご かんせい', (x, y) => drawSakura(sheet, x, y, { scale: 3, eyes: 'happy' })],
  ['あわてる', (x, y) => drawSakura(sheet, x, y, { scale: 3, eyes: 'shock', gaze: -1 })]
];
for (const [i, [name, draw]] of poses.entries()) {
  const x = 90 + i * 160;
  draw(x, 110);
  label(name, x, 180, 14);
}

// 鳥
label('5 しゅるいの 鳥（体の横の「・」が おもさ）', 720, 222, 20, '#3a6aa3');
const moods: [string, Mood, number][] = [
  ['ふつう', 'normal', 0],
  ['にっこり', 'happy', 0],
  ['注文が ちがう', 'puzzled', 0],
  ['飛び立つ', 'shock', 1],
  ['だんご（ふくらむ）', 'happy', 0]
];
for (const [i, kind] of BIRD_KINDS.entries()) {
  const y = 330 + i * 120;
  label(`${BIRD_NAME[kind]}（おもさ ${BIRD_WEIGHT[kind]}）`, 120, y - 30, 16);
  for (const [j, [mname, mood, flap]] of moods.entries()) {
    const x = 300 + j * 150;
    drawBird(sheet, x, y + 12, kind, { scale: 2.2, mood, flap, dots: j !== 4, puff: j === 4 ? 0.2 : 0 });
    if (i === 0) label(mname, x, 262, 13, '#6a5a52');
  }
}

// 注文の吹き出し
const yO = 980;
label('注文の 吹き出し（上：かなっている ✓ ／ 下：かなっていない＝赤く はずむ）', 720, yO - 100, 20, '#3a6aa3');
const orders: Order[] = [
  { type: 'near', who: 'gojukara' },
  { type: 'near', who: 'yamagara' },
  { type: 'avoid', who: 'karasu' },
  { type: 'edge' }
];
for (const [i, o] of orders.entries()) {
  const x = 260 + i * 300;
  sheet.save();
  sheet.translate(x, yO);
  sheet.scale(2, 2);
  drawOrderBubble(sheet, 0, 0, o, true, 0);
  drawOrderBubble(sheet, 0, 46, o, false, 0.3);
  sheet.restore();
  label(`「${orderText(o)}」`, x, yO + 112, 14);
}

// 枝のかたむき
const yB = 1180;
label('支点つきの 枝と かたむき（かたむき ＝ 右の 重さ×きょり − 左の 重さ×きょり）', 720, yB - 60, 20, '#8c5c31');
const tilts: [string, number][] = [
  ['つり合い（0）', 0],
  ['みぎに 4（余裕 8）', 4],
  ['ひだりに 8（ぎりぎり）', -8],
  ['みぎに 11（落ちる）', 11]
];
for (const [i, [name, tilt]] of tilts.entries()) {
  const x = 30 + i * 352;
  const w = 340;
  const h = 260;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x, yB - 30, w, h);
  sheet.clip();
  sheet.fillStyle = '#b9d6ea';
  sheet.fillRect(x, yB - 30, w, h);
  sheet.translate(x + w / 2, yB + 120);
  sheet.scale(0.62, 0.62);
  sheet.translate(-PIVOT_X, -PIVOT_Y);
  const things: Record<number, SlotThing> =
    tilt === 0
      ? { [-1]: b('yamagara'), [2]: b('enaga') }
      : tilt === 4
        ? { [-1]: b('yamagara'), [2]: b('akagera') }
        : tilt === -8
          ? { [-2]: b('karasu'), [1]: b('enaga'), [-3]: b('enaga'), [3]: b('enaga') }
          : { [3]: b('karasu'), [-1]: b('enaga') };
  drawBranch(sheet, { stage: 1, perSide: 3, angle: angleFor(tilt, 8), slots: slots(3, things), sakura: { state: 'none' }, t: 0.4 });
  sheet.restore();
  label(name, x + w / 2, yB + h - 14, 14);
}

// メーター
const yM = 1520;
label('かたむきメーター（赤に 入ると 落ちる。薄い 針は 予告）', 400, yM - 50, 20, '#8c5c31');
for (const [i, [tilt, ghost, name]] of (
  [
    [0, 3, 'つり合い → みぎに 3 の 予告'],
    [-5, -9, 'ひだりに 5 → 予告が 赤（ここは だめ）'],
    [9, null, 'みぎに 9（落ちる）']
  ] as [number, number | null, string][]
).entries()) {
  const y = yM + i * 74;
  sheet.save();
  sheet.fillStyle = '#16203a';
  sheet.fillRect(30, y - 30, 600, 66);
  sheet.translate(30 + 300 - WIDTH / 2, y - 540 - 6);
  drawMeter(sheet, tilt, 8, ghost, 0.2);
  sheet.restore();
  label(name, 780 + 120, y, 13);
}

// 雪と雪玉
label('積もった 雪（とまれない。・が おもさ）と 雪玉', 1200, yM - 50, 20, '#3a6aa3');
for (const [i, w] of [1, 2, 3].entries()) {
  sheet.save();
  sheet.translate(1000 + i * 90, yM + 60);
  sheet.fillStyle = '#8d6340';
  sheet.fillRect(-40, 0, 80, 12);
  sheet.scale(1.6, 1.6);
  drawSnowPile(sheet, 0, w);
  sheet.restore();
  label(`雪 ${w}`, 1000 + i * 90, yM + 96, 13);
}
drawSnowball(sheet, 1300, yM + 20, 20, 0.3);
label('雪玉', 1300, yM + 56, 13);
// 雪玉が来たあと：A 鳥の頭にのる / B 空いた場所に積もる
sheet.save();
sheet.translate(1040, yM + 210);
sheet.fillStyle = '#8d6340';
sheet.fillRect(-50, 0, 100, 12);
drawBird(sheet, 0, 0, 'enaga', { scale: 1.8, dots: true, mood: 'shock' });
drawSnowball(sheet, 0, -66, 12);
sheet.restore();
label('A：鳥の 頭に のる', 1040, yM + 240, 13);
sheet.save();
sheet.translate(1250, yM + 210);
sheet.fillStyle = '#8d6340';
sheet.fillRect(-50, 0, 100, 12);
sheet.scale(1.6, 1.6);
drawSnowPile(sheet, 0, 2);
sheet.restore();
label('B：空いた 場所に 積もる', 1250, yM + 240, 13);
drawThrower(sheet, 1380, yM + 210, 0.6, 0.8);
label('投げる 雪だるま', 1380, yM + 240, 13);

// 背景
const yG = 1780;
label('面の 背景', 720, yG - 20, 20, '#3a6aa3');
for (const [i, name] of ['1めん 森の入り口', '2めん 雪の谷', '3めん 夕暮れの森'].entries()) {
  const stage = i + 1;
  const x = 40 + i * 460;
  const w = 440;
  const h = 170;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x, yG, w, h);
  sheet.clip();
  sheet.translate(x, yG - 210 * (w / WIDTH));
  sheet.scale(w / WIDTH, w / WIDTH);
  drawStageBackground(sheet, stage, 1.4);
  sheet.restore();
  label(name, x + w / 2, yG + h + 18, 15);
}
