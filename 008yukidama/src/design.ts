// デザイン確認用：場面ごとの画面と、雪玉・障害物・とりで・背景の一覧を描く（開発時だけ使う）。
import { BALL_SCREEN_Y, HEIGHT, HUD_H, WIDTH } from './game/constants';
import { drawDemo } from './game/demo';
import { drawFort } from './game/fort';
import { drawGate, drawPatch, drawProp, type GateLook, type PatchLook, type PropKind, type PropLook } from './game/props';
import { drawSakura } from './game/sakura';
import { drawHud, drawStar, drawWorld, type HudState, type RoadAt, type Scene } from './game/scene';
import { drawRider, drawShards, drawSnowball, type Stuck, type StuckKind } from './game/snowball';
import { drawTitleScreen, stuckOf } from './game/title';
import { radiusOf, zoomOf, type Theme } from './game/stages';
import { COLOR, FONT, outlinedText, rr, text } from './game/ui';

const straight =
  (l: number, r: number): RoadAt =>
  () =>
    [l, r];

const prop = (kind: PropKind, x: number, y: number, edible?: boolean, seed = x + y): PropLook => ({ kind, x, y, seed, edible });

interface Frame {
  caption: string;
  theme: Theme;
  cm: number;
  /** 雪玉の x（y は 0 を基準にして、y がふえる向きが下り）。 */
  x: number;
  steer?: number;
  eyes?: 'dot' | 'happy' | 'shock';
  stuck?: Stuck[];
  road: RoadAt;
  props?: PropLook[];
  patches?: PatchLook[];
  ridges?: Scene['ridges'];
  gates?: GateLook[];
  fort?: Scene['fort'];
  flash?: number;
  shards?: number;
  ballY?: number;
  camY?: number;
  camX?: number;
  noRider?: boolean;
  blizzard?: number;
  hud: Partial<HudState> & { stage: number; goal: number };
  extra?: (ctx: CanvasRenderingContext2D, t: number) => void;
}

const HI = 18400;

function drawPlay(ctx: CanvasRenderingContext2D, f: Frame, t: number): void {
  const r = radiusOf(f.cm);
  const ballY = f.ballY ?? 0;
  drawWorld(ctx, {
    theme: f.theme,
    view: { camX: f.camX ?? 240 + (f.x - 240) * 0.55, camY: f.camY ?? 0, zoom: zoomOf(f.cm) },
    road: f.road,
    t,
    patches: f.patches,
    ridges: f.ridges,
    gates: f.gates,
    fort: f.fort,
    props: f.props,
    trail: [
      { x: f.x - (f.steer ?? 0) * 90, y: ballY - 400, r },
      { x: f.x - (f.steer ?? 0) * 30, y: ballY - 120, r },
      { x: f.x, y: ballY, r }
    ],
    ball: {
      x: f.x,
      y: ballY,
      r,
      roll: t * 3,
      stuck: f.stuck,
      flash: f.flash,
      shards: f.shards,
      rider: f.noRider ? null : { steer: f.steer ?? 0, eyes: f.eyes ?? 'dot' }
    },
    blizzard: f.blizzard
  });
  drawHud(ctx, { left: 320, score: 1240, hiScore: HI, cm: f.cm, ...f.hud });
  f.extra?.(ctx, t);
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

const R1: RoadAt = (y) => [30 + Math.sin(y * 0.006) * 14, 450 + Math.sin(y * 0.005 + 1) * 14];
const R2: RoadAt = straight(52, 428);
const R3: RoadAt = (y) => [20 + Math.sin(y * 0.004) * 18, 460 + Math.cos(y * 0.005) * 18];

const FRAMES: Frame[] = [
  {
    caption: '② 1めん：はじめは 30cm',
    theme: 'forest',
    cm: 30,
    x: 240,
    road: R1,
    hud: { stage: 1, goal: 100, left: 480, score: 0 },
    patches: [{ kind: 'drift', x: 320, y: 150, w: 110, h: 80, seed: 3 }],
    props: [
      prop('berry', 180, 110),
      prop('berry', 208, 150),
      prop('pebble', 280, 80, true),
      prop('twig', 120, 210, true),
      prop('tree', 110, 330, false),
      prop('rock', 330, 300),
      prop('berry', 230, 280)
    ]
  },
  {
    caption: '③ 1めん：巻きこむと 刺さったまま 回る',
    theme: 'forest',
    cm: 92,
    x: 200,
    steer: -0.35,
    eyes: 'happy',
    stuck: stuckOf(['twig', 'twig', 'pebble', 'berry', 'twig', 'pebble', 'berry', 'twig', 'pebble', 'twig'], 4),
    road: R1,
    hud: { stage: 1, goal: 100, left: 165, score: 1680 },
    patches: [{ kind: 'drift', x: 300, y: 320, w: 170, h: 130, seed: 8 }],
    props: [prop('tree', 110, 160, false), prop('twig', 240, 180, true), prop('rock', 380, 170), prop('berry', 180, 300), prop('tree', 160, 470, false), prop('pebble', 300, 150, true)]
  },
  {
    caption: '④ 2めん：分かれ道（広い道か 門の近道か）',
    theme: 'valley',
    cm: 68,
    x: 225,
    steer: 0.2,
    stuck: stuckOf(['twig', 'pebble', 'berry', 'twig'], 2),
    road: R2,
    hud: { stage: 2, goal: 200, left: 410, score: 2100 },
    ridges: [{ x: 276, w: 66, y1: 210, y2: 900 }],
    gates: [{ x: 372, y: 250, gap: 2 * radiusOf(60) + 10, cm: 60, left: 312, right: 428, fits: false }],
    patches: [
      { kind: 'sun', x: 350, y: 66, w: 130, h: 96, seed: 2 },
      { kind: 'drift', x: 130, y: 340, w: 130, h: 110, seed: 5 },
      { kind: 'drift', x: 190, y: 560, w: 100, h: 90, seed: 7 }
    ],
    props: [prop('rock', 100, 500), prop('rock', 195, 400), prop('berry', 372, 340), prop('berry', 372, 400), prop('berry', 372, 460), prop('soldier', 115, 165, true)]
  },
  {
    caption: '⑤ 2めん：日なたで とかして 門をぬける',
    theme: 'valley',
    cm: 58,
    x: 372,
    eyes: 'happy',
    stuck: stuckOf(['twig', 'pebble', 'berry', 'pebble', 'twig'], 7),
    road: R2,
    hud: { stage: 2, goal: 200, left: 280, score: 2720, shrink: true },
    ridges: [{ x: 276, w: 66, y1: -340, y2: 360 }],
    camX: 330,
    gates: [{ x: 372, y: 130, gap: 2 * radiusOf(60) + 10, cm: 60, left: 312, right: 428, fits: true }],
    patches: [{ kind: 'sun', x: 372, y: -10, w: 110, h: 110, seed: 4 }],
    props: [prop('berry', 372, 210), prop('berry', 345, 270), prop('soldier', 150, 90, false), prop('rock', 165, 260), prop('berry', 395, 330)]
  },
  {
    caption: '⑥ 3めん：ふぶき（さきが みえにくい）・氷の地面',
    theme: 'blizzard',
    cm: 170,
    x: 260,
    steer: 0.8,
    stuck: stuckOf(['twig', 'twig', 'pebble', 'soldier', 'berry', 'twig', 'tree', 'pebble', 'soldier', 'twig', 'pebble', 'berry'], 5),
    road: R3,
    hud: { stage: 3, goal: 300, left: 420, score: 7350 },
    blizzard: 0.85,
    patches: [
      { kind: 'ice', x: 200, y: 110, w: 280, h: 200, seed: 6 },
      { kind: 'drift', x: 390, y: 290, w: 120, h: 110, seed: 2 }
    ],
    props: [prop('rock', 120, 330), prop('soldier', 300, 240, true), prop('tree', 380, 80, true), prop('rock', 280, 500), prop('berry', 180, 260)]
  },
  {
    caption: '⑦ 岩に ぶつかると 2わり 欠ける',
    theme: 'forest',
    cm: 74,
    x: 300,
    eyes: 'shock',
    flash: 0.5,
    shards: 0.42,
    stuck: stuckOf(['twig', 'pebble', 'berry', 'twig', 'pebble'], 9),
    road: R1,
    hud: { stage: 1, goal: 100, left: 240, score: 980, shrink: true },
    props: [prop('rock', 356, 62, undefined, 21), prop('twig', 180, 190, true), prop('berry', 340, 230)],
    extra: (ctx) => outlinedText(ctx, 'かけた！ −2わり', WIDTH / 2, BALL_SCREEN_Y + 120, 22, '#ffd9d6', '#b8483e')
  },
  {
    caption: '⑧ ゲームオーバー（10cm より 小さく）',
    theme: 'valley',
    cm: 9,
    x: 240,
    noRider: true,
    road: R2,
    hud: { stage: 2, goal: 200, left: 180, score: 3020, shrink: true },
    props: [prop('rock', 280, -60, undefined, 12)],
    extra: (ctx, t) => {
      drawSakura(ctx, 170, BALL_SCREEN_Y + 30, { scale: 1.5, dead: true, rotate: 2.2 + t, shadow: false });
      ctx.fillStyle = 'rgba(8,12,26,0.6)';
      ctx.fillRect(0, HUD_H, WIDTH, HEIGHT - HUD_H);
      panel(ctx, 40, 290, 400, 240);
      outlinedText(ctx, 'ころげおちちゃった…', WIDTH / 2, 324, 26, '#ffffff', '#b8483e');
      text(ctx, '2めん ・ とりでまで あと 180m', WIDTH / 2, 364, 14, COLOR.ink, true);
      text(ctx, 'てんすう', WIDTH / 2, 396, 12, COLOR.muted, true);
      text(ctx, '3,020', WIDTH / 2, 428, 32, COLOR.ink, true);
      text(ctx, 'タップで タイトルへ', WIDTH / 2, 494, 14, COLOR.muted, true);
    }
  },
  {
    caption: '⑨ とりでに 体当たり！',
    theme: 'forest',
    cm: 165,
    x: 240,
    eyes: 'shock',
    stuck: stuckOf(['twig', 'twig', 'pebble', 'tree', 'berry', 'twig', 'tree', 'pebble', 'twig', 'pebble'], 6),
    road: R1,
    hud: { stage: 1, goal: 100, left: 0, score: 3180 },
    camY: 60,
    fort: { x: 240, y: 190, damage: 0, flyT: 0, t: 1, goal: 100 }
  },
  {
    caption: '⑩ 派手に くずれる（★★ 1.5ばい いじょう）',
    theme: 'forest',
    cm: 165,
    x: 240,
    eyes: 'happy',
    ballY: 200,
    stuck: stuckOf(['twig', 'twig', 'pebble', 'tree', 'berry', 'twig', 'tree', 'pebble', 'twig', 'pebble'], 6),
    road: R1,
    hud: { stage: 1, goal: 100, left: 0, score: 3180 },
    camY: 80,
    fort: { x: 240, y: 190, damage: 0.72, flyT: 0.55, t: 1, goal: 100 },
    shards: 0.3
  },
  {
    caption: '⑪ めんクリア',
    theme: 'forest',
    cm: 165,
    x: 240,
    eyes: 'happy',
    ballY: 300,
    stuck: stuckOf(['twig', 'twig', 'pebble', 'tree', 'berry', 'twig', 'tree', 'pebble', 'twig', 'pebble'], 6),
    road: R1,
    hud: { stage: 1, goal: 100, left: 0, score: 5330 },
    camY: 110,
    fort: { x: 240, y: 190, damage: 0.72, flyT: 0, t: 1, goal: 100 },
    extra: (ctx) => {
      banner(ctx, 96, 200);
      outlinedText(ctx, '1めん クリア！', WIDTH / 2, 130, 28, '#fff4c2', '#5a3a1e');
      drawStar(ctx, WIDTH / 2 - 52, 176, 22, '#ffd84a', '#a8761a');
      drawStar(ctx, WIDTH / 2, 170, 26, '#ffd84a', '#a8761a');
      drawStar(ctx, WIDTH / 2 + 52, 176, 22, 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.5)');
      text(ctx, 'とりでに ついた大きさ 165cm … 1,650てん', WIDTH / 2, 216, 13, COLOR.ink, true);
      text(ctx, 'めんクリア 500てん ・ ノーミス 1,000てん', WIDTH / 2, 240, 13, COLOR.ink, true);
      text(ctx, 'つぎの ★★★ は 200cm', WIDTH / 2, 270, 13, COLOR.pink, true);
    }
  },
  {
    caption: '⑫ もくひょうに とどかず はじかれた',
    theme: 'blizzard',
    cm: 240,
    x: 240,
    eyes: 'shock',
    ballY: 40,
    stuck: stuckOf(['twig', 'twig', 'pebble', 'soldier', 'berry', 'twig', 'tree', 'pebble', 'soldier', 'twig'], 3),
    road: R3,
    hud: { stage: 3, goal: 300, left: 0, score: 9120 },
    camY: 90,
    fort: { x: 240, y: 290, damage: 0.16, flyT: 0.3, t: 1, goal: 300 },
    blizzard: 0.25,
    extra: (ctx) => outlinedText(ctx, 'びくともしない…！', WIDTH / 2, 112, 26, '#ffffff', '#b8483e')
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

// --- 場面の一覧（4 列） ---
const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
const panels: { caption: string; draw: (ctx: CanvasRenderingContext2D, t: number) => void }[] = [
  { caption: '① タイトル', draw: (ctx, t) => drawTitleScreen(ctx, t, HI) },
  ...FRAMES.map((f) => ({ caption: f.caption, draw: (ctx: CanvasRenderingContext2D, t: number) => drawPlay(ctx, f, t) })),
  { caption: '⑬ 1めんのあと：さくせんかいぎ', draw: (ctx) => drawDemo(ctx, 'break1', 5.2, false) },
  { caption: '⑭ 2めんのあと：たいしょう', draw: (ctx) => drawDemo(ctx, 'break2', 6, false) },
  { caption: '⑮ エンディング：もうしません', draw: (ctx) => drawDemo(ctx, 'ending', 2.6, false) },
  { caption: '⑯ エンディング：しじょうさいだい', draw: (ctx) => drawDemo(ctx, 'ending', 11, false) }
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
const SH = 1660;
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
const zoomed = (x: number, y: number, z: number, draw: () => void): void => {
  sheet.save();
  sheet.translate(x, y);
  sheet.scale(z, z);
  sheet.translate(-x, -y);
  draw();
  sheet.restore();
};

// 雪玉とさくらちゃん
label('雪玉と さくらちゃん（大きさごと）', 420, 34, 20, '#3a6aa3');
const SIZES: [number, StuckKind[], number][] = [
  [10, [], 80],
  [30, [], 200],
  [60, ['twig', 'pebble', 'berry'], 340],
  [100, ['twig', 'pebble', 'berry', 'twig', 'pebble', 'twig'], 500],
  [200, ['twig', 'pebble', 'soldier', 'twig', 'berry', 'tree', 'pebble', 'twig', 'soldier'], 700],
  [400, ['twig', 'tree', 'soldier', 'twig', 'pebble', 'tree', 'berry', 'soldier', 'tree', 'twig', 'pebble', 'soldier', 'tree', 'twig', 'berry'], 960]
];
for (const [cm, kinds, x] of SIZES) {
  const r = radiusOf(cm);
  drawSnowball(sheet, x, 250 - r, r, { roll: cm * 0.07, stuck: stuckOf(kinds, cm) });
  drawRider(sheet, x, 250 - r, r, 0.3, {});
  label(`${cm}cm`, x, 304);
}

label('玉の回りかた（同じものが ぐるっと 回る）', 420, 346, 20, '#3a6aa3');
const ST = stuckOf(['twig', 'soldier', 'pebble', 'tree', 'berry', 'twig', 'pebble'], 12);
for (let i = 0; i < 6; i++) {
  drawSnowball(sheet, 110 + i * 170, 444, 62, { roll: i * 0.7, stuck: ST });
}

label('さくらちゃんの うごき', 1200, 34, 20, '#d2577f');
const riders: [string, Parameters<typeof drawRider>[5]][] = [
  ['まっすぐ', {}],
  ['よろこぶ', { eyes: 'happy' }],
  ['あぶない', { eyes: 'shock' }],
  ['みぎへ', { steer: 0.9 }],
  ['ひだりへ', { steer: -0.9 }]
];
for (const [i, [name, opts]] of riders.entries()) {
  const x = 1110 + (i % 3) * 110;
  const y = 170 + Math.floor(i / 3) * 170;
  zoomed(x, y, 1.6, () => {
    drawSnowball(sheet, x, y, 30, { roll: 0.4, shadow: false });
    drawRider(sheet, x, y, 30, 0.42, opts);
  });
  label(name, x, y + 62, 13);
}
zoomed(1330, 340, 1.6, () => drawSakura(sheet, 1330, 340, { dead: true, rotate: 2.2, shadow: false }));
label('ころげおちる', 1330, 412, 13);

// 欠ける
const yS = 590;
label('欠ける（かけらが とび散る）', 420, yS - 34, 20, '#b8483e');
for (const [i, p] of [0.12, 0.38, 0.7].entries()) {
  const x = 170 + i * 250;
  drawSnowball(sheet, x, yS + 50, 30, { roll: 0.5, flash: (1 - p) * 0.6 });
  drawShards(sheet, x, yS + 50, 30, p);
}

// コースのもの
const yP = 860;
label('コースに でるもの（足もとの輪：青の点線 = 巻きこめる、赤と！= ぶつかる）', 720, yP - 120, 20, '#3a6aa3');
const PROPS: [string, string, PropKind, boolean | undefined][] = [
  ['木の実', 'いつでも', 'berry', undefined],
  ['小枝', '20cm〜', 'twig', true],
  ['小枝', '20cm より小さいと ×', 'twig', false],
  ['小石', '20cm〜', 'pebble', true],
  ['雪だるま兵', '60cm〜', 'soldier', true],
  ['雪だるま兵', '60cm より小さいと ×', 'soldier', false],
  ['小さな木', '100cm〜', 'tree', true],
  ['小さな木', '100cm より小さいと ×', 'tree', false],
  ['大きな岩', 'まきこめない', 'rock', undefined]
];
for (const [i, [name, note, kind, edible]] of PROPS.entries()) {
  const x = 90 + i * 155;
  zoomed(x, yP, 1.4, () => drawProp(sheet, { kind, x, y: yP, seed: i * 3 + 2, edible }, 1.2));
  label(name, x, yP + 96, 15);
  label(note, x, yP + 116, 11);
}

// 地面
const yG = 1130;
label('地面', 340, yG - 118, 20, '#3a6aa3');
const GROUND: [string, PatchLook][] = [
  ['雪だまり（ぐっと ふえる）', { kind: 'drift', x: 130, y: yG, w: 190, h: 140, seed: 3 }],
  ['氷の地面（すべる・雪がつかない）', { kind: 'ice', x: 350, y: yG, w: 190, h: 140, seed: 6 }],
  ['日なた（すこしずつ とける）', { kind: 'sun', x: 570, y: yG, w: 190, h: 140, seed: 2 }]
];
for (const [name, p] of GROUND) {
  drawPatch(sheet, p, 1.4);
  label(name, p.x, yG + 92, 13);
}

// 門
label('細い門（看板より大きいと 通れない）', 1020, yG - 118, 20, '#3a6aa3');
const gate = (x: number, cm: number, fits: boolean): GateLook => {
  const gap = 2 * radiusOf(cm) + 10;
  return { x, y: yG + 20, gap, cm, left: x - gap / 2 - 50, right: x + gap / 2 + 50, fits };
};
drawGate(sheet, gate(880, 60, true), 1);
drawSnowball(sheet, 880, yG - 8 + 30, radiusOf(48), { roll: 0.4, stuck: stuckOf(['twig', 'berry'], 4) });
label('とおれる（48cm）', 880, yG + 66, 13);
drawGate(sheet, gate(1190, 60, false), 1);
drawSnowball(sheet, 1190, yG - 30, radiusOf(90), { roll: 0.4, stuck: stuckOf(['twig', 'pebble', 'berry', 'twig'], 2) });
label('とおれない（90cm）', 1190, yG + 66, 13);

// とりで
const yF = 1330;
label('とりで（こわれ具合）', 720, yF - 70, 20, '#3a6aa3');
for (const [i, [name, damage, flyT]] of ([
  ['もとの すがた', 0, 0],
  ['目標ちょうど ★', 0.42, 0.5],
  ['1.5 ばい ★★', 0.74, 0.5],
  ['2 ばい ★★★', 1.05, 0.5]
] as const).entries()) {
  const x = 180 + i * 360;
  sheet.save();
  sheet.translate(x, yF);
  sheet.scale(0.68, 0.68);
  sheet.translate(-x, -yF);
  drawFort(sheet, { x, y: yF, damage, flyT, t: 1.3, goal: 100 });
  sheet.restore();
  label(name, x, yF + 116, 15);
}

// 面の背景
const yB = 1520;
label('面の背景', 720, yB - 30, 20, '#3a6aa3');
const BG: [string, Theme, RoadAt, number][] = [
  ['1めん ふもとの林', 'forest', R1, 0],
  ['2めん 細い谷', 'valley', R2, 0],
  ['3めん ふぶきの山', 'blizzard', R3, 0.8]
];
for (const [i, [name, theme, road, blizzard]] of BG.entries()) {
  const x = 140 + i * 400;
  const w = 360;
  const h = 110;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x - 40, yB - 10, w, h);
  sheet.clip();
  sheet.translate(x - 40, yB - 10);
  sheet.scale(w / WIDTH, h / 146);
  drawWorld(sheet, { theme, view: { camX: 240, camY: 240, zoom: 0.9 }, road, t: 1, blizzard });
  sheet.restore();
  label(name, x + 140, yB + 118, 14);
}

// 開発時：画像をファイルに書き出す（png-receiver が動いていれば）。
async function post(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  await fetch(`http://localhost:5190/?name=${name}`, { method: 'POST', body: blob }).catch(() => undefined);
}
void post(screens.canvas, 'd008-screens.png');
void post(sheet.canvas, 'd008-sheet.png');
