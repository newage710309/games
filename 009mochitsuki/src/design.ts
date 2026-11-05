// デザイン確認用：場面ごとの画面と、さくらちゃん・クマ・杵と臼・おもち・輪・背景の一覧を描く（開発時だけ使う）。
import { drawBear, type BearFace } from './game/bear';
import { BEAR_X, HEIGHT, RING_R, RING_START_R, USU_X, USU_Y, WIDTH } from './game/constants';
import { drawAnimal, type AnimalKind } from './game/crowd';
import { drawDemo } from './game/demo';
import { drawBits, drawDizzy, drawMochi, drawPeekEyes, drawRing, drawStuckSakura, drawThrownSnowball, drawUsu, type RingKind } from './game/mochi';
import { drawSakura } from './game/sakura';
import { drawHud, drawJudge, drawPlayScene, drawSparkleBurst, drawStageBackground, drawStar, say, type HudState, type PlayLook } from './game/scene';
import { drawSnowGuest } from './game/snowman';
import { drawTitleScreen } from './game/title';
import { COLOR, FONT, outlinedText, text } from './game/ui';

const HI = 18400;

interface Frame {
  caption: string;
  look: Omit<PlayLook, 't'>;
  hud: Partial<HudState> & { stage: number };
  extra?: (ctx: CanvasRenderingContext2D, t: number) => void;
}

const FRAMES: Frame[] = [
  {
    caption: '② 1うすめ：はいっ！の まち（輪が ちぢむ）',
    hud: { stage: 1, left: 24, score: 850, combo: 6, chain: 3 },
    look: {
      stage: 1,
      bear: { lift: 0.9 },
      mochi: { done: 0.25 },
      sakura: { pose: 'idle', stuck: 0 },
      ring: { now: RING_R + 42 }
    }
  },
  {
    caption: '③ ぴったり！（おもちが つやつや）',
    hud: { stage: 1, left: 18, score: 2150, combo: 12, chain: 6 },
    look: {
      stage: 1,
      bear: { lift: 0.82 },
      mochi: { done: 0.6, shine: 1, squash: -0.25, tilt: -0.08 },
      sakura: { pose: 'flip', stuck: 0, flip: 0.5 },
      ring: { now: null, flash: 0.8 },
      crowd: 0.5
    },
    extra: (ctx) => {
      drawSparkleBurst(ctx, USU_X, USU_Y - 20, 0.3);
      drawJudge(ctx, 'ぴったり！', 0.2, '#fff4a8', '#a8591a');
    }
  },
  {
    caption: '④ ぺったん！（クマが つく）',
    hud: { stage: 1, left: 18, score: 2150, combo: 12, chain: 6 },
    look: {
      stage: 1,
      bear: { lift: 0, bob: 5 },
      mochi: { done: 0.6, shine: 0.4, squash: 0.95 },
      sakura: { pose: 'idle', stuck: 0 },
      hit: 0.25,
      shake: 2
    },
    extra: (ctx) => outlinedText(ctx, 'ぺったん！', USU_X - 34, 300, 26, '#ffffff', '#6a4a24')
  },
  {
    caption: '⑤ フェイント：振り上げたまま ニヤッ',
    hud: { stage: 1, left: 9, score: 3400, combo: 19, chain: 2 },
    look: {
      stage: 1,
      bear: { lift: 1.05, face: 'grin' },
      mochi: { done: 0.8, shine: 0.3 },
      sakura: { pose: 'worry', stuck: 0 },
      ring: { now: RING_R + 20, kind: 'feint' }
    },
    extra: (ctx) => {
      say(ctx, 'ニヤッ', 262, 292, 335, 345, 18);
      outlinedText(ctx, 'タップしないで！', 134, 254, 19, '#ffe0dc', '#b02e24');
    }
  },
  {
    caption: '⑥ ごつん！（つられて たたかれた）',
    hud: { stage: 1, left: 8, score: 3400, stuck: 1, combo: 0, chain: 0 },
    look: {
      stage: 1,
      bear: { lift: 0.08, face: 'shock', sweat: true },
      mochi: { done: 0.8, shine: 0.3 },
      sakura: { pose: 'dizzy', stuck: 1 },
      shake: 3
    },
    extra: (ctx) => drawJudge(ctx, 'ごつん！', 0.2, '#ffb4a8', '#7a1f18', 38)
  },
  {
    caption: '⑦ 2うすめ：のってきた！ はやつき（ぺたぺたっ）',
    hud: { stage: 2, left: 22, score: 7120, stuck: 1, combo: 15, chain: 4 },
    look: {
      stage: 2,
      bear: { lift: 0.85, face: 'excited', bob: -3 },
      mochi: { done: 0.45, shine: 0.3 },
      sakura: { pose: 'idle', stuck: 1 },
      ring: { now: RING_R + 24, kind: 'fast' },
      ring2: { now: RING_R + 92, kind: 'fast' },
      crowd: 1
    },
    extra: (ctx) => {
      outlinedText(ctx, 'のってきた！', 132, 250, 28, '#ffe38a', '#a0301f');
      say(ctx, 'ぺたぺたっ', 246, 308, 340, 350, 15);
    }
  },
  {
    caption: '⑧ 2うすめ：ふりむき（輪が 見えにくい）',
    hud: { stage: 2, left: 10, score: 8940, stuck: 2, combo: 7, chain: 1 },
    look: {
      stage: 2,
      bear: { lift: 0.92, face: 'away' },
      mochi: { done: 0.75, shine: 0.2 },
      sakura: { pose: 'worry', stuck: 2 },
      ring: { now: RING_R + 36, kind: 'faint' },
      crowd: 0.4
    },
    extra: (ctx) => say(ctx, 'ふ〜ん♪', 296, 276, 372, 332, 15)
  },
  {
    caption: '⑨ 3うすめ：雪だるまの 雪玉（はじく）',
    hud: { stage: 3, left: 30, score: 12300, stuck: 1, combo: 22, chain: 5 },
    look: {
      stage: 3,
      bear: { lift: 0.85, face: 'excited' },
      mochi: { done: 0.4, shine: 0.3 },
      sakura: { pose: 'idle', stuck: 1 },
      snowmen: [
        { x: 40, y: 400, scale: 2, hop: 0.2 },
        { x: 240, y: 384, scale: 1.3, hop: 0.6 }
      ],
      snowball: { x: 150, y: 330, spin: 1.2, ring: 0.65 }
    },
    extra: (ctx) => outlinedText(ctx, 'はじいて！', 150, 262, 22, '#d9f0ff', '#27507e')
  },
  {
    caption: '⑩ 雪玉を はじいた！',
    hud: { stage: 3, left: 30, score: 12400, stuck: 1, combo: 23, chain: 5 },
    look: {
      stage: 3,
      bear: { lift: 0.85, face: 'excited' },
      mochi: { done: 0.4, shine: 0.3 },
      sakura: { pose: 'flip', stuck: 1, flip: 0.5 },
      snowmen: [
        { x: 40, y: 400, scale: 2, hop: 0.2, sweat: true },
        { x: 240, y: 384, scale: 1.3, hop: 0.6 }
      ],
      snowBits: { x: 190, y: 400, p: 0.35 }
    },
    extra: (ctx) => drawJudge(ctx, 'はじいた！ +100', 0.2, '#d9f0ff', '#27507e', 26)
  },
  {
    caption: '⑪ ゲームオーバー：おもちに 目が出て クマが「あっ」',
    hud: { stage: 2, left: 14, score: 6480, stuck: 3, combo: 0, chain: 0 },
    look: {
      stage: 2,
      bear: { lift: 0.9, face: 'shock', sweat: true },
      mochi: { done: 0.6 },
      sakura: { pose: 'idle', stuck: 3, gone: true, peek: true }
    },
    extra: (ctx) => say(ctx, 'あっ', 276, 288, 346, 340, 22)
  },
  {
    caption: '⑫ 面クリア（★ の判定）',
    hud: { stage: 1, left: 0, score: 5330, combo: 30, chain: 7 },
    look: {
      stage: 1,
      bear: { lift: 0.9, face: 'excited' },
      mochi: { done: 1, shine: 1 },
      sakura: { pose: 'happy', stuck: 0 },
      crowd: 1
    },
    extra: (ctx) => {
      ctx.fillStyle = 'rgba(10,18,38,0.8)';
      ctx.fillRect(0, 96, WIDTH, 184);
      outlinedText(ctx, '1うすめ つきあがり！', WIDTH / 2, 126, 26, '#fff4c2', '#5a3a1e');
      drawStar(ctx, WIDTH / 2 - 52, 170, 22, '#ffd84a', '#a8761a');
      drawStar(ctx, WIDTH / 2, 164, 26, '#ffd84a', '#a8761a');
      drawStar(ctx, WIDTH / 2 + 52, 170, 22, 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.5)');
      text(ctx, 'ぴったり 62% … つやつやの おもち', WIDTH / 2, 210, 13, COLOR.ink, true);
      text(ctx, 'めんクリア 500てん ・ ノーミス 1,000てん', WIDTH / 2, 234, 13, COLOR.ink, true);
      text(ctx, 'つぎの ★★★ は ぴったり 80%', WIDTH / 2, 258, 13, COLOR.pink, true);
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

// --- 場面の一覧（4 列） ---
const S = 0.75;
const CAP = 34;
const COLS = 4;
const fw = WIDTH * S;
const fh = HEIGHT * S + CAP;
const panels: { caption: string; draw: (ctx: CanvasRenderingContext2D, t: number) => void }[] = [
  { caption: '① タイトル', draw: (ctx, t) => drawTitleScreen(ctx, t, HI) },
  ...FRAMES.map((f) => ({
    caption: f.caption,
    draw: (ctx: CanvasRenderingContext2D, t: number) => {
      drawPlayScene(ctx, { ...f.look, t });
      drawHud(ctx, { left: 0, score: 0, hiScore: HI, stuck: 0, chain: 0, combo: 0, ...f.hud });
      f.extra?.(ctx, t);
    }
  })),
  { caption: '⑬ 1うすめのあと：まだまだ！', draw: (ctx) => drawDemo(ctx, 'break1', 2.4, false) },
  { caption: '⑭ 2うすめのあと：つまみ食い', draw: (ctx) => drawDemo(ctx, 'break2', 2.9, false) },
  { caption: '⑮ 2うすめのあと：もう 1うす！', draw: (ctx) => drawDemo(ctx, 'break2', 4.8, false) },
  { caption: '⑯ エンディング：みかんの かわり', draw: (ctx) => drawDemo(ctx, 'ending', 8, false) }
];
const rowsN = Math.ceil(panels.length / COLS);
const screens = setup('screens', fw * COLS + 16 * (COLS + 1), (fh + 16) * rowsN + 16);
screens.fillStyle = '#1b1f2a';
screens.fillRect(0, 0, screens.canvas.width, screens.canvas.height);
for (const [i, p] of panels.entries()) {
  const x = 16 + (i % COLS) * (fw + 16);
  const y = 16 + Math.floor(i / COLS) * (fh + 16);
  screens.save();
  screens.font = `bold 15px ${FONT}`;
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
const SH = 2120;
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
label('さくらちゃんの うごき', 400, 30, 20, '#d2577f');
const poses: [string, (x: number, y: number) => void][] = [
  ['ふつう', (x, y) => drawSakura(sheet, x, y, { scale: 3, gaze: 1 })],
  ['返す（はいっ）', (x, y) => drawSakura(sheet, x, y, { scale: 3, view: 'right', flap: 2.2, rotate: 0.2 })],
  ['よろこぶ', (x, y) => drawSakura(sheet, x, y, { scale: 3, eyes: 'happy', gaze: 0.6 })],
  ['青ざめる', (x, y) => drawSakura(sheet, x, y, { scale: 3, eyes: 'shock', gaze: 1 })],
  ['目を回す', (x, y) => {
    drawSakura(sheet, x, y, { scale: 3, dead: true, rotate: 0.1 });
    drawDizzy(sheet, x, y - 48, 1.2);
  }]
];
for (const [i, [name, draw]] of poses.entries()) {
  const x = 90 + i * 155;
  draw(x, 118);
  label(name, x, 186, 14);
}

// くっつく段階
label('おもちが くっつく段階（3 回目で おしまい）', 400, 226, 20, '#d2577f');
const stages: [string, number][] = [
  ['0 かい', 0],
  ['1 かい', 1],
  ['2 かい', 2]
];
for (const [i, [name, stage]] of stages.entries()) {
  const x = 90 + i * 155;
  drawStuckSakura(sheet, x, 318, { scale: 3, stage, gaze: 1, eyes: stage === 2 ? 'shock' : 'dot' });
  label(name, x, 392, 14);
}
sheet.save();
sheet.translate(560, 300);
sheet.scale(0.6, 0.6);
drawUsu(sheet, 0, 0);
drawMochi(sheet, 0, 8, { done: 0.6 });
drawPeekEyes(sheet, 0, 0);
sheet.restore();
label('3 かい（消えて、おもちに 目が出る）', 560, 392, 13);

// クマの表情
label('クマの 表情', 1340, 30, 20, '#8c5c31');
const faces: [string, BearFace, number][] = [
  ['ふつう', 'normal', 0.15],
  ['ニヤッ（フェイント）', 'grin', 1.05],
  ['のってきた！', 'excited', 0.85],
  ['あっ（おしまい）', 'shock', 0.9],
  ['まだまだ！', 'proud', 0.9],
  ['よそ見（ふりむき）', 'away', 0.9]
];
for (const [i, [name, face, lift]] of faces.entries()) {
  const x = 910 + (i % 3) * 210;
  const y = 340 + Math.floor(i / 3) * 296;
  drawBear(sheet, x, y, { scale: 0.62, face, lift });
  label(name, x, y + 16, 13);
}

// 杵の動き
const yK = 1010;
label('杵の 動き（振り上げ 0 → 1）。臼の上に つきおろす', 720, yK - 345, 20, '#8c5c31');
for (const [i, lift] of [0, 0.25, 0.5, 0.75, 1, 1.08].entries()) {
  const x = 60 + i * 232;
  sheet.save();
  sheet.translate(x, 0);
  sheet.scale(0.72, 0.72);
  sheet.translate(-USU_X, 0);
  const base = yK / 0.72;
  const dy = base - USU_Y - 60;
  sheet.translate(0, dy);
  drawBear(sheet, BEAR_X, 582, { lift, layer: 'body' });
  drawUsu(sheet, USU_X, USU_Y);
  drawMochi(sheet, USU_X, USU_Y + 8, { done: 0.8, squash: lift === 0 ? 0.95 : 0 });
  drawBear(sheet, BEAR_X, 582, { lift, layer: 'arms' });
  sheet.restore();
  label(`${lift}`, x + 40, yK + 62, 14);
}

// おもち
const yM = 1170;
label('臼の中の おもち（つくほど なめらか、ぴったりで つやつや）', 480, yM - 70, 20, '#3a6aa3');
const mochis: [string, Parameters<typeof drawMochi>[3]][] = [
  ['つきはじめ', { done: 0 }],
  ['だんだん', { done: 0.45 }],
  ['なめらか', { done: 1 }],
  ['つやつや', { done: 1, shine: 1, t: 0.6 }],
  ['ぺったん', { done: 0.8, squash: 0.95 }],
  ['返す', { done: 0.8, squash: -0.3, tilt: -0.12 }]
];
for (const [i, [name, look]] of mochis.entries()) {
  const x = 100 + i * 175;
  drawUsu(sheet, x, yM);
  drawMochi(sheet, x, yM + 8, look);
  label(name, x, yM + 138, 14);
}

// 雪玉・雪だるま
label('雪だるまと 雪玉', 1240, yM - 70, 20, '#3a6aa3');
drawSnowGuest(sheet, 1150, yM + 90, 'none', { scale: 3 });
drawSnowGuest(sheet, 1290, yM + 90, 'none', { scale: 3, sweat: true });
drawThrownSnowball(sheet, 1380, yM - 10, 15, 0.6);
drawRing(sheet, { x: 1380, y: yM - 10, r: 21, now: 34 });
drawBits(sheet, 1380, yM + 76, 0.3, '#ffffff', 9, 74);
label('はじいた', 1380, yM + 110, 13);

// 輪
const yR = 1470;
label('タイミングの 輪（白い輪が 的に かさなる瞬間が ぴったり）', 720, yR - 136, 20, '#3a6aa3');
const rings: [string, number | null, RingKind, number][] = [
  ['ふつう（出はじめ）', RING_START_R * 0.62, 'normal', 0],
  ['ふつう（もうすぐ）', RING_R * 0.62 + 26, 'normal', 0],
  ['ぴったり！', null, 'normal', 0.8],
  ['はやつき', RING_R * 0.62 + 18, 'fast', 0],
  ['フェイント（タップしない）', RING_R * 0.62 + 18, 'feint', 0],
  ['ふりむき（見えにくい）', RING_R * 0.62 + 26, 'faint', 0]
];
for (const [i, [name, now, kind, flash]] of rings.entries()) {
  const x = 120 + i * 240;
  const w = 232;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x - w / 2, yR - 112, w, 224);
  sheet.clip();
  sheet.fillStyle = i % 2 === 0 ? '#8fb3cf' : '#7a93b0';
  sheet.fillRect(x - w / 2, yR - 112, w, 224);
  drawUsu(sheet, x, yR - 12);
  drawMochi(sheet, x, yR - 4, { done: 1 });
  drawRing(sheet, { x, y: yR - 12, r: RING_R * 0.62 + 34, now: now === null ? null : now + 34, kind, flash });
  sheet.restore();
  label(name, x, yR + 130, 14);
}

// 見物
const yA = 1696;
label('見物の 動物（面が 進むと ふえる）', 480, yA - 72, 20, '#3a6aa3');
const animals: [string, AnimalKind][] = [
  ['ウサギ', 'usagi'],
  ['リス', 'risu'],
  ['キツネ', 'kitsune'],
  ['タヌキ', 'tanuki'],
  ['カラス', 'karasu']
];
for (const [i, [name, kind]] of animals.entries()) {
  const x = 100 + i * 170;
  drawAnimal(sheet, kind, x - 28, yA + 18, { scale: 1.5 });
  drawAnimal(sheet, kind, x + 40, yA + 18, { scale: 1.5, happy: true });
  label(name, x, yA + 40, 14);
}
drawAnimal(sheet, 'karasu', 1020, yA + 18, { scale: 2, mochi: true });
label('つまみ食い', 1000, yA + 40, 14);

// 背景
const yB = 1780;
label('面の背景', 720, yB - 14, 20, '#3a6aa3');
for (const [i, name] of ['1うすめ 昼の森の広場', '2うすめ 夕方（見物がふえる）', '3うすめ 大みそかの夜'].entries()) {
  const stage = i + 1;
  const x = 40 + i * 460;
  const w = 440;
  const h = 290;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x, yB + 6, w, h);
  sheet.clip();
  sheet.translate(x, yB + 6 - 34 * (w / WIDTH));
  sheet.scale(w / WIDTH, w / WIDTH);
  drawStageBackground(sheet, stage, 1.4);
  sheet.restore();
  label(name, x + w / 2, yB + h + 24, 15);
}
