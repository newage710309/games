// デザイン確認用：場面ごとの画面と、さくらちゃん・森の子・雪だるま・鍋・器・食べ物・評価・背景の一覧を描く（開発時だけ使う）。
// ゲーム本体の描画は、ここで使っている src/game/ の関数（kitchen.ts・food.ts・kids.ts・chef.ts など）をそのまま使う。
import { drawChef, type ChefPose } from './game/chef';
import {
  FRONT_X,
  HEIGHT,
  MARKS,
  QUEUE_XS,
  QUEUE_Y,
  SAKURA_POS,
  SEAT_XS,
  SEAT_Y,
  WIDTH,
  bowlLayout,
  potLayout
} from './game/constants';
import { drawBowl, drawPot, piece, FOOD_NAME, type FoodKind } from './game/food';
import {
  drawBubble,
  drawHungry,
  drawKid,
  drawRating,
  drawWaitGauge,
  kidHeight,
  type KidKind,
  type Rating,
  type Reaction
} from './game/kids';
import {
  drawCounter,
  drawHud,
  drawRoom,
  drawServeButton,
  drawStageBanner,
  drawTableFront,
  drawTray,
  drawHint,
  STAGE_NAME
} from './game/kitchen';
import { drawSakura } from './game/sakura';
import { drawSnowman } from './game/snowman';
import { COLOR, FONT, outlinedText, rr, text } from './game/ui';

// --- 場面の組み立て ------------------------------------------------------------

interface PotMock {
  food: FoodKind;
  left: number;
  servings?: number;
  low?: boolean;
  pressed?: boolean;
}
interface BowlMock {
  food: FoodKind | null;
  fill: number;
  pouring?: boolean;
}
interface FrontMock {
  kind: KidKind;
  reaction?: Reaction;
  gauge: number;
  bubble?: string;
  hungry?: boolean;
}
interface SceneMock {
  stage: number;
  pots: PotMock[];
  bowls: BowlMock[];
  front?: FrontMock;
  /** 列の 2 番目から。hungry = おなかが鳴っている、okawari = おかわりで割りこんできた。 */
  queue: { kind: KidKind; hungry?: boolean; okawari?: boolean }[];
  seated: { kind: KidKind; reaction: Reaction }[];
  chef?: ChefPose;
  /** 席へ歩いていく子と、その頭の上の評価。 */
  leaving?: { kind: KidKind; x: number; y: number; rating: Rating; points: number; age: number; reaction: Reaction };
  hud: { score: number; left: number; total: number; average: number | null };
  t?: number;
}

function scene(ctx: CanvasRenderingContext2D, m: SceneMock): void {
  const t = m.t ?? 1.2;
  drawRoom(ctx, m.stage, t);
  // 奥の席で食べている子
  for (const [i, s] of m.seated.entries()) drawKid(ctx, SEAT_XS[i], SEAT_Y, s.kind, { reaction: s.reaction, size: 0.68, t: t + i });
  drawTableFront(ctx, m.stage);
  // 列（うしろから描く）
  for (let i = m.queue.length - 1; i >= 0; i--) {
    const q = m.queue[i];
    const x = QUEUE_XS[i];
    drawKid(ctx, x, QUEUE_Y, q.kind, { tray: true, t: t + i, reaction: q.okawari ? 'happy' : 'normal' });
    if (q.hungry) drawHungry(ctx, x, QUEUE_Y - kidHeight(q.kind) - 12, t + i);
    if (q.okawari) drawBubble(ctx, 'ちょっとだけ！', x - 6, QUEUE_Y - kidHeight(q.kind) - 22, x - 4, QUEUE_Y - kidHeight(q.kind) - 4, 12);
  }
  // さくらちゃん
  drawChef(ctx, SAKURA_POS.x, SAKURA_POS.y, { pose: m.chef ?? 'serve', t });
  // 先頭の子
  if (m.front) {
    const f = m.front;
    const h = kidHeight(f.kind);
    drawKid(ctx, FRONT_X, QUEUE_Y, f.kind, { reaction: f.reaction ?? 'normal', t });
    drawWaitGauge(ctx, FRONT_X + 8, QUEUE_Y - h - 12, f.gauge);
    if (f.bubble) drawBubble(ctx, f.bubble, FRONT_X, QUEUE_Y - h - 44, FRONT_X - 4, QUEUE_Y - h - 18, 14);
    if (f.hungry) drawHungry(ctx, FRONT_X + h * 0.5 + 24, QUEUE_Y - h * 0.55, t);
  }
  if (m.leaving) {
    const l = m.leaving;
    drawKid(ctx, l.x, l.y, l.kind, { reaction: l.reaction, size: 0.8, hop: 0.3, t });
    drawRating(ctx, l.x, l.y - kidHeight(l.kind, 0.8) - 22, l.rating, l.age, l.points);
  }
  // カウンター・トレー・器
  drawCounter(ctx, m.stage);
  drawTray(ctx);
  drawServeButton(ctx, m.bowls.some((b) => b.fill > 0), false, t);
  const slots = bowlLayout(m.bowls.length);
  const marks = m.stage === 1 ? 1 : 0.35;
  for (const [i, b] of m.bowls.entries()) {
    drawBowl(ctx, slots[i].bowl, { food: b.food, fill: b.fill, marks, pouring: b.pouring, t });
  }
  // 鍋
  const pr = potLayout(m.pots.length);
  for (const [i, p] of m.pots.entries()) {
    drawPot(ctx, pr[i], p.food, {
      left: p.left,
      
      low: p.low ?? false,
      pressed: p.pressed ?? false,
      keyLabel: `${i + 1}`,
      t
    });
  }
  drawHud(ctx, { stage: m.stage, ...m.hud });
}

// --- 場面 -------------------------------------------------------------------

const S1: SceneMock = {
  stage: 1,
  pots: [{ food: 'soup', left: 0.8, pressed: true }],
  bowls: [{ food: 'soup', fill: 0.62, pouring: true }],
  front: { kind: 'kuma', gauge: 0.7 },
  queue: [{ kind: 'enaga' }, { kind: 'usagi', hungry: true }, { kind: 'risu' }],
  seated: [
    { kind: 'risu', reaction: 'eat' },
    { kind: 'usagi', reaction: 'eat' }
  ],
  hud: { score: 160, left: 10, total: 12, average: 80 }
};

const S1b: SceneMock = {
  stage: 1,
  pots: [{ food: 'soup', left: 0.62, servings: 7 }],
  bowls: [{ food: null, fill: 0 }],
  front: { kind: 'usagi', gauge: 0.95, hungry: true },
  queue: [{ kind: 'risu' }, { kind: 'yamagara' }, { kind: 'kuma' }],
  seated: [
    { kind: 'risu', reaction: 'eat' },
    { kind: 'usagi', reaction: 'eat' },
    { kind: 'kuma', reaction: 'happy' }
  ],
  leaving: { kind: 'kuma', x: 330, y: 262, rating: 'perfect', points: 100, age: 0.25, reaction: 'happy' },
  hud: { score: 260, left: 8, total: 12, average: 87 }
};

const S2: SceneMock = {
  stage: 2,
  pots: [
    { food: 'soup', left: 0.55, servings: 7 },
    { food: 'donguri', left: 0.25, low: true, pressed: true },
    { food: 'ninjin', left: 0.6, servings: 5 }
  ],
  bowls: [
    { food: 'soup', fill: 0.3 },
    { food: 'donguri', fill: 0.22, pouring: true },
    { food: null, fill: 0 }
  ],
  front: { kind: 'risu', gauge: 0.55 },
  queue: [{ kind: 'usagi' }, { kind: 'enaga' }, { kind: 'risu', hungry: true }, { kind: 'usagi' }],
  seated: [
    { kind: 'usagi', reaction: 'eat' },
    { kind: 'enaga', reaction: 'eat' },
    { kind: 'risu', reaction: 'happy' },
    { kind: 'yamagara', reaction: 'eat' },
    { kind: 'usagi', reaction: 'sad' }
  ],
  hud: { score: 640, left: 9, total: 15, average: 71 }
};

const S2b: SceneMock = {
  stage: 2,
  pots: [
    { food: 'soup', left: 0.4, servings: 5 },
    { food: 'donguri', left: 0.5, servings: 4 },
    { food: 'ninjin', left: 0.45, servings: 4 }
  ],
  bowls: [
    { food: 'soup', fill: 0.56 },
    { food: 'donguri', fill: 0.4 },
    { food: 'ninjin', fill: 0.0 }
  ],
  front: { kind: 'usagi', gauge: 0.18, reaction: 'fidget' },
  queue: [{ kind: 'yamagara' }, { kind: 'risu' }, { kind: 'usagi' }],
  seated: [
    { kind: 'usagi', reaction: 'eat' },
    { kind: 'enaga', reaction: 'eat' },
    { kind: 'risu', reaction: 'eat' },
    { kind: 'yamagara', reaction: 'eat' }
  ],
  hud: { score: 820, left: 6, total: 15, average: 68 }
};

const S3: SceneMock = {
  stage: 3,
  pots: [
    { food: 'stew', left: 0.7, pressed: true },
    { food: 'aburaage', left: 0.6, servings: 4 },
    { food: 'honey', left: 0.5, servings: 3 },
    { food: 'kakigori', left: 0.8, servings: 2 }
  ],
  bowls: [
    { food: 'stew', fill: 0.84, pouring: true },
    { food: null, fill: 0 },
    { food: null, fill: 0 },
    { food: null, fill: 0 }
  ],
  front: { kind: 'kuma', gauge: 0.6, bubble: 'シチュー おおもり！ はちみつ いらない' },
  queue: [{ kind: 'kitsune', okawari: true }, { kind: 'snowman' }, { kind: 'enaga' }, { kind: 'kitsune' }],
  seated: [
    { kind: 'enaga', reaction: 'eat' },
    { kind: 'kitsune', reaction: 'eat' },
    { kind: 'kuma', reaction: 'eat' },
    { kind: 'yamagara', reaction: 'happy' },
    { kind: 'kitsune', reaction: 'eat' },
    { kind: 'snowman', reaction: 'eat' }
  ],
  hud: { score: 1480, left: 11, total: 18, average: 82 }
};

const S3b: SceneMock = {
  stage: 3,
  pots: [
    { food: 'stew', left: 0.3, low: true },
    { food: 'aburaage', left: 0.4, servings: 3 },
    { food: 'honey', left: 0.35, servings: 2 },
    { food: 'kakigori', left: 0.5, servings: 1 }
  ],
  bowls: [
    { food: 'stew', fill: 0.3 },
    { food: null, fill: 0 },
    { food: null, fill: 0 },
    { food: null, fill: 0 }
  ],
  front: { kind: 'snowman', gauge: 0.5, reaction: 'melt' },
  queue: [{ kind: 'kitsune' }, { kind: 'kuma' }],
  seated: [
    { kind: 'enaga', reaction: 'eat' },
    { kind: 'kitsune', reaction: 'eat' },
    { kind: 'kuma', reaction: 'eat' },
    { kind: 'yamagara', reaction: 'eat' }
  ],
  hud: { score: 2120, left: 3, total: 18, average: 79 }
};

function shade(ctx: CanvasRenderingContext2D, a = 0.72): void {
  ctx.fillStyle = `rgba(10,18,38,${a})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, on: boolean): void {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 === 0 ? r : r * 0.45;
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = on ? '#ffd84a' : 'rgba(255,255,255,0.15)';
  ctx.fill();
  ctx.strokeStyle = on ? '#b8860b' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function titleMock(ctx: CanvasRenderingContext2D): void {
  drawRoom(ctx, 1, 0.4);
  drawTableFront(ctx, 1);
  drawKid(ctx, 300, QUEUE_Y, 'kuma', { tray: true });
  drawKid(ctx, 372, QUEUE_Y, 'usagi', { tray: true });
  drawKid(ctx, 428, QUEUE_Y, 'risu', { tray: true });
  drawKid(ctx, 230, QUEUE_Y, 'enaga', { tray: true, reaction: 'happy', t: 0.3 });
  drawCounter(ctx, 1);
  drawChef(ctx, 120, 470, { pose: 'cheer', scale: 4, t: 0.25 });
  drawPot(ctx, { x: 240, y: 522, w: 200, h: 110 }, 'soup', { left: 0.9, low: false, pressed: false, t: 0.3 });
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 66, 420, 136, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 100, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, '給食当番', WIDTH / 2, 152, 44, '#f8c3d2', '#8a2f52');
  text(ctx, 'もりの がっこうの きゅうしょくしつ', WIDTH / 2, 186, 13, COLOR.muted, true);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  text(ctx, 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 38, 18, COLOR.ink, true);
  text(ctx, 'HI 4,820 ・ ★★☆ ★☆☆ ☆☆☆', WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}

function introMock(ctx: CanvasRenderingContext2D): void {
  scene(ctx, { ...S1, front: undefined, queue: [{ kind: 'enaga' }, { kind: 'usagi' }, { kind: 'kuma' }], seated: [], bowls: [{ food: null, fill: 0 }], pots: [{ food: 'soup', left: 1, servings: 12 }], hud: { score: 0, left: 12, total: 12, average: null } });
  shade(ctx, 0.45);
  drawStageBanner(ctx, 1, 170);
  drawHint(ctx, 'からだの おおきさで りょうを きめよう', 252);
  drawHint(ctx, 'なべを ながおしで よそう → 「どうぞ！」', 288);
  text(ctx, 'タップで スタート', WIDTH / 2, 612, 15, COLOR.ink, true);
}

function resultMock(ctx: CanvasRenderingContext2D): void {
  drawRoom(ctx, 1, 2);
  for (const [i, k] of (['risu', 'usagi', 'kuma', 'enaga', 'yamagara', 'usagi', 'risu'] as KidKind[]).entries())
    drawKid(ctx, SEAT_XS[i], SEAT_Y, k, { reaction: 'eat', size: 0.55, t: i });
  drawTableFront(ctx, 1);
  drawCounter(ctx, 1);
  shade(ctx, 0.6);
  outlinedText(ctx, '1めん クリア！', WIDTH / 2, 90, 30, '#ffffff', '#2a3668');
  for (let k = 0; k < 3; k++) star(ctx, WIDTH / 2 - 60 + k * 60, 148, 24, k < 3);
  rr(ctx, 60, 190, 360, 190, 14);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  const rows: [string, string][] = [
    ['ぴったり！ × 8', '800'],
    ['いいね × 3', '180'],
    ['まあまあ × 1', '20'],
    ['さくらちゃん おなかいっぱい', '+500'],
    ['めん クリア', '+500']
  ];
  for (const [i, [a, b]] of rows.entries()) {
    text(ctx, a, 84, 216 + i * 30, 14, COLOR.ink, true, 'left');
    text(ctx, b, 396, 216 + i * 30, 15, COLOR.pink, true, 'right');
  }
  text(ctx, 'へいきん 83てん ・ ごうけい 2,000てん', WIDTH / 2, 404, 14, '#ffd84a', true);
  drawChef(ctx, WIDTH / 2, 560, { pose: 'full', scale: 3.6, t: 0.6 });
  text(ctx, 'タップで つぎへ', WIDTH / 2, 618, 15, COLOR.ink, true);
}

function gameOverMock(ctx: CanvasRenderingContext2D): void {
  scene(ctx, { ...S3b, chef: 'little', front: { kind: 'snowman', gauge: 0.5, reaction: 'melt' } });
  drawRating(ctx, FRONT_X, QUEUE_Y - kidHeight('snowman') - 24, 'bad', 0.5);
  shade(ctx, 0.55);
  rr(ctx, 50, 150, 380, 170, 18);
  ctx.fillStyle = 'rgba(15,23,48,0.92)';
  ctx.fill();
  outlinedText(ctx, 'がっかり…', WIDTH / 2, 190, 30, '#8fb4ff', '#1a2b4a');
  text(ctx, 'あついものは とけちゃうよ', WIDTH / 2, 232, 15, COLOR.ink, true);
  text(ctx, '3めん ・ 2,120てん', WIDTH / 2, 262, 13, COLOR.muted, true);
  text(ctx, 'タップで タイトルへ', WIDTH / 2, 296, 14, COLOR.ink, true);
}

function demo1Mock(ctx: CanvasRenderingContext2D): void {
  drawRoom(ctx, 1, 3);
  for (const [i, k] of (['risu', 'usagi', 'enaga', 'kuma', 'usagi', 'yamagara', 'risu'] as KidKind[]).entries())
    drawKid(ctx, SEAT_XS[i], SEAT_Y, k, { reaction: 'happy', size: 0.55, t: i });
  drawTableFront(ctx, 1);
  drawKid(ctx, 300, QUEUE_Y, 'kuma', { tray: true, t: 1 });
  drawCounter(ctx, 1);
  drawChef(ctx, 120, 300, { pose: 'cheer', t: 0.5 });
  drawBubble(ctx, 'いただきます！', 240, 120, 240, 170, 18);
  drawBubble(ctx, 'おかわり…', 330, 230, 305, 255, 13);
  text(ctx, 'デモ：1めんの あと', WIDTH / 2, 600, 14, '#4a3326', true);
}

function demo2Mock(ctx: CanvasRenderingContext2D): void {
  drawRoom(ctx, 2, 3);
  drawTableFront(ctx, 2);
  drawCounter(ctx, 2);
  drawKid(ctx, 200, QUEUE_Y, 'risu', { tray: true });
  drawKid(ctx, 270, QUEUE_Y, 'usagi', { tray: true });
  drawKid(ctx, 340, QUEUE_Y, 'enaga', { tray: true });
  drawSnowman(ctx, 430, QUEUE_Y, { scale: 2.3, grin: true });
  drawChef(ctx, SAKURA_POS.x, SAKURA_POS.y, { pose: 'serve' });
  rr(ctx, 50, 400, 380, 100, 14);
  ctx.fillStyle = 'rgba(255,250,240,0.96)';
  ctx.fill();
  ctx.strokeStyle = '#8c5c31';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'おしらせ', WIDTH / 2, 424, 14, '#8a6a4a', true);
  text(ctx, 'あしたは ゆきまつりの', WIDTH / 2, 452, 17, '#d94d78', true);
  text(ctx, 'とくべつ きゅうしょく', WIDTH / 2, 478, 17, '#d94d78', true);
  text(ctx, '…れつの うしろに だれか いる？', WIDTH / 2, 560, 13, '#4a3326', true);
}

function endingMock(ctx: CanvasRenderingContext2D): void {
  drawRoom(ctx, 3, 4);
  drawTableFront(ctx, 3);
  drawCounter(ctx, 3);
  // 雪だるまが シチューの鍋ごと持っていこうとして、溶けかける
  drawPot(ctx, { x: 236, y: 150, w: 120, h: 100 }, 'stew', { left: 0.6, low: false, pressed: false, t: 4 });
  drawSnowman(ctx, 296, 316, { scale: 3, melt: 0.6, lift: 10 });
  drawBubble(ctx, 'おかわり！', 400, 160, 340, 200, 18);
  drawChef(ctx, 110, 300, { pose: 'serve' });
  drawKid(ctx, 420, QUEUE_Y, 'kitsune', { reaction: 'fidget', t: 1 });
  // みんなで かき氷を かけて 助ける
  for (let k = 0; k < 6; k++) piece(ctx, 'kakigori', 230 + k * 24, 196 - (k % 2) * 10, 12, k);
  text(ctx, 'エンディング：みんなで かき氷を かけて たすける', WIDTH / 2, 600, 13, '#ffffff', true);
}

// --- 一覧 ---------------------------------------------------------------------

function setup(id: string, w: number, h: number): CanvasRenderingContext2D {
  const c = document.getElementById(id) as HTMLCanvasElement;
  c.width = w;
  c.height = h;
  c.style.width = `${w / 2}px`;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no ctx');
  return ctx;
}

const panels: { caption: string; draw: (ctx: CanvasRenderingContext2D) => void }[] = [
  { caption: '① タイトル', draw: titleMock },
  { caption: '② 面の はじめ', draw: introMock },
  { caption: '③ 1めん：クマに おおもり（長押しで よそう）', draw: (ctx) => scene(ctx, S1) },
  { caption: '④ 1めん：ぴったり！ ・ おなかが ぐぅ〜', draw: (ctx) => scene(ctx, S1b) },
  { caption: '⑤ 2めん：リスに どんぐり（鍋が カタカタ）', draw: (ctx) => scene(ctx, S2) },
  { caption: '⑥ 2めん：まちきれずに そわそわ', draw: (ctx) => scene(ctx, S2b) },
  { caption: '⑦ 3めん：注文 ・ おかわりの 割りこみ', draw: (ctx) => scene(ctx, S3) },
  { caption: '⑧ 3めん：雪だるまに 熱いもの → 溶けかけ', draw: (ctx) => scene(ctx, S3b) },
  { caption: '⑨ 面クリア：さくらちゃんも おなかいっぱい', draw: resultMock },
  { caption: '⑩ がっかり → ゲームオーバー', draw: gameOverMock },
  { caption: '⑪ デモ：1めん・2めんの あと', draw: (ctx) => { demo1Mock(ctx); } },
  { caption: '⑫ デモ：2めんの あと／エンディング', draw: (ctx) => { demo2Mock(ctx); } },
  { caption: '⑬ エンディング', draw: endingMock }
];

const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
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
  p.draw(screens);
  screens.restore();
}

// --- シート ---------------------------------------------------------------------
const SW = 1440;
const SH = 2440;
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
const card = (x: number, y: number, w: number, h: number): void => {
  sheet.fillStyle = '#ffffff';
  rr(sheet, x, y, w, h, 12);
  sheet.fill();
};

// さくらちゃん
label('さくらちゃん（給食帽・エプロン・おたま）', 720, 30, 20, '#d2577f');
const poses: [ChefPose, string][] = [
  ['serve', 'おたまを もって 当番'],
  ['cheer', 'クリア！'],
  ['eat', 'じぶんの 給食 もぐもぐ'],
  ['full', 'おなかいっぱい'],
  ['little', 'すくなくて しょんぼり'],
  ['empty', '空の お皿で しょんぼり'],
  ['shock', 'ミスに びっくり']
];
card(30, 50, 1380, 230);
for (const [i, [p, name]] of poses.entries()) {
  const x = 100 + i * 175;
  drawChef(sheet, x, 230, { pose: p, scale: 3.6, t: 0.9 + i * 0.1, food: 'stew' });
  label(name, x, 262, 13);
}

// 森の子
const yK = 310;
label('ならぶ 子たち（大きさ ＝ 量：小鳥・リス すくなめ ／ ウサギ・キツネ ふつう ／ クマ おおもり）', 720, yK, 20, '#3a6aa3');
const kinds: KidKind[] = ['enaga', 'yamagara', 'risu', 'usagi', 'kitsune', 'kuma', 'snowman'];
const reactions: [Reaction, string][] = [
  ['normal', 'ふつう'],
  ['happy', 'にっこり'],
  ['eat', 'もぐもぐ'],
  ['sad', 'しょんぼり'],
  ['fidget', 'そわそわ']
];
card(30, yK + 20, 1380, 760);
for (const [r, [re, rname]] of reactions.entries()) {
  label(rname, 80, yK + 140 + r * 140, 15, '#6a5a52');
  for (const [i, k] of kinds.entries()) {
    const x = 210 + i * 174;
    const y = yK + 186 + r * 140;
    if (k === 'snowman' && re === 'sad') {
      drawKid(sheet, x, y, k, { reaction: 'melt', t: 1 });
      label('溶けかけ', x + 50, y - 10, 11, '#3a6aa3');
    } else drawKid(sheet, x, y, k, { reaction: re, t: 1 + i * 0.3 });
    if (r === 0) label(`${k === 'snowman' ? 'ゆきだるま（かき氷だけ）' : ['エナガ', 'ヤマガラ', 'リス', 'ウサギ', 'キツネ', 'クマ'][i]}`, x, yK + 44, 14);
  }
}

// 頭の上のもの
const yB = yK + 800;
label('おなかが なる ／ 注文 ／ 待ち時間の ゲージ ／ 列に ならぶ（お盆を もつ）', 720, yB, 20, '#3a6aa3');
card(30, yB + 20, 1380, 220);
drawKid(sheet, 120, yB + 200, 'usagi', {});
drawHungry(sheet, 190, yB + 120, 0.5);
drawBubble(sheet, 'シチュー おおもり！', 420, yB + 80, 400, yB + 110, 15);
drawBubble(sheet, 'はちみつ いらない', 420, yB + 140, 400, yB + 170, 15);
drawBubble(sheet, 'ちょっとだけ！', 420, yB + 200, 400, yB + 226, 13);
for (const [i, g] of [1, 0.6, 0.35, 0.12].entries()) {
  drawWaitGauge(sheet, 680 + i * 100, yB + 120, g);
}
label('ゲージ（みどり → きいろ → あか）', 830, yB + 160, 13);
drawKid(sheet, 1060, yB + 210, 'risu', { tray: true });
drawKid(sheet, 1150, yB + 210, 'kitsune', { tray: true });
drawKid(sheet, 1300, yB + 210, 'kuma', { tray: true });

// 鍋
const yP = yB + 270;
label('鍋（ふつう ／ のこり わずかで カタカタ）', 720, yP, 20, '#8c5c31');
card(30, yP + 20, 1380, 300);
const foods: FoodKind[] = ['soup', 'donguri', 'ninjin', 'stew', 'aburaage', 'honey', 'kakigori'];
for (const [i, f] of foods.entries()) {
  const x = 50 + i * 196;
  drawPot(sheet, { x, y: yP + 40, w: 132, h: 122 }, f, { left: 0.8, low: false, pressed: false, t: 1 });
  drawPot(sheet, { x, y: yP + 180, w: 132, h: 122 }, f, { left: 0.2, low: true, pressed: i === 0, t: 1.03 });
}

// 器
const yW = yP + 340;
label('トレーと 器（目盛り：1めん はっきり ／ 2めんから うすく）・ どうぞ！', 720, yW, 20, '#3a6aa3');
card(30, yW + 20, 1380, 300);
{
  const b = bowlLayout(1)[0];
  sheet.save();
  sheet.translate(40 - b.bowl.x + 20, yW + 50 - b.bowl.y);
  drawBowl(sheet, b.bowl, { food: 'soup', fill: MARKS.normal, marks: 1, t: 1 });
  sheet.restore();
  label('1めん：ふつうで ぴったり', 135, yW + 190, 13);
}
const fills: [FoodKind | null, number, string][] = [
  [null, 0, '空'],
  ['donguri', MARKS.small, 'すくなめ'],
  ['ninjin', MARKS.normal, 'ふつう'],
  ['stew', MARKS.large, 'おおもり'],
  ['aburaage', 0.7, ''],
  ['honey', 0.4, ''],
  ['kakigori', 0.62, ''],
  ['soup', 1.22, 'もりすぎ（こぼれる）']
];
for (const [i, [f, v, name]] of fills.entries()) {
  const x = 290 + i * 110;
  const r = { x, y: yW + 70, w: 86, h: 74 };
  drawBowl(sheet, r, { food: f, fill: v, marks: 0.35, t: 1, pouring: i === 3 });
  label(name || (f ? FOOD_NAME[f] : ''), x + 43, yW + 190, 12);
}
sheet.save();
sheet.translate(1180 - 24, yW + 40 - 330);
sheet.scale(0.5, 1);
drawServeButton(sheet, true, false, 0);
sheet.restore();
sheet.save();
sheet.translate(1180 - 24, yW + 100 - 330);
sheet.scale(0.5, 1);
drawServeButton(sheet, false, false, 0);
sheet.restore();
label('どうぞ！：渡せる ／ 空のまま（半分の幅で表示）', 1290, yW + 170, 13);

// 評価
const yR = yW + 340;
label('1人ごとの 評価（頭の上に みじかく 出す）', 360, yR, 20, '#d2577f');
card(30, yR + 20, 660, 160);
for (const [i, r] of (['perfect', 'good', 'ok', 'bad'] as Rating[]).entries()) {
  drawRating(sheet, 110 + i * 160, yR + 100, r, 0.6, [100, 60, 20, 0][i]);
}

// 背景
label('3つの 面の 背景', 1060, yR, 20, '#3a6aa3');
for (let i = 0; i < 3; i++) {
  const x = 720 + i * 232;
  const y = yR + 20;
  const k = 220 / WIDTH;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x, y, 220, 160);
  sheet.clip();
  sheet.translate(x, y - 40 * k);
  sheet.scale(k, k);
  drawRoom(sheet, i + 1, 1.5);
  drawTableFront(sheet, i + 1);
  drawCounter(sheet, i + 1);
  sheet.restore();
  label(`${i + 1}めん ${STAGE_NAME[i]}`, x + 110, y + 176, 12);
}
void drawSakura;
