// デザイン確認用：場面ごとの画面と、さくらちゃん・ポーズ・そっくりさん・編集長・雪だるま・枠・新聞・背景の一覧を描く（開発時だけ使う）。
import { drawBird } from './game/birds';
import { FRAME_H, FRAME_W, HEIGHT, HUD_H, WIDTH, groundY, scaleAt } from './game/constants';
import {
  drawCameraFrame,
  drawHud,
  drawPhoto,
  drawScorePopup,
  drawShutterButton,
  type HudState,
  type PopupState
} from './game/hud';
import { drawNewspaper, PAPER_H, PAPER_W } from './game/newspaper';
import { drawOwl } from './game/owl';
import { POSES, TAIL_FAKE, TAIL_REAL, defaultLook, drawSakuraActor, type SakuraLook } from './game/poses';
import { drawSakura } from './game/sakura';
import { drawSnowball, drawSnowman } from './game/snowman';
import { COLOR, FONT, outlinedText, rr, text } from './game/ui';
import { drawWorld, type Actor, type Snapshot } from './game/world';

const look = (o: Partial<SakuraLook> = {}): SakuraLook => ({ ...defaultLook(), ...o });
const sakura = (x: number, z: number, o: Partial<SakuraLook> = {}, extra: Partial<Actor> = {}): Actor => ({
  kind: 'sakura',
  x,
  z,
  look: look(o),
  ...extra
});
const fake = (x: number, z: number, o: Partial<SakuraLook> = {}): Actor => ({ kind: 'fake', x, z, look: look({ bird: 'fake', tail: TAIL_FAKE, ...o }) });
const snap = (stage: number, camX: number, actors: Actor[], extra: Partial<Snapshot> = {}): Snapshot => ({
  stage,
  camX,
  t: 1.3,
  actors,
  flash: 0,
  balls: [],
  ...extra
});

const THEMES = ['こっちを むいた さくらちゃん', '羽を ひろげた しゅんかん', 'なかまと だんごに なっているところ'];

function hud(stage: number, o: Partial<HudState> = {}): HudState {
  return { stage, theme: THEMES[stage - 1], themeOk: false, total: 0, film: 10, filmMax: 10, timeLeft: 0.8, ...o };
}

// --- 場面 -------------------------------------------------------------------

const S1 = snap(1, 380, [
  { kind: 'tiny', x: 316, z: 0.45, face: -1 },
  sakura(250, 0.55, { view: 'front', gaze: 0.3 })
]);
const S1b = snap(1, 620, [
  { kind: 'tiny', x: 148, z: 0.52, face: 1 },
  sakura(210, 0.62, { pose: 'yawn', posePhase: 'pose', poseT: 0.5 })
]);
const S2 = snap(2, 140, [
  { kind: 'yamagara', x: 70, z: 0.45, y: 0 },
  { kind: 'tiny', x: 392, z: 0.42, face: -1 },
  fake(330, 0.5, { view: 'left' }),
  sakura(150, 0.7, { view: 'right', flap: 0.4 }),
  { kind: 'gojukara', x: 400, z: 0.75 }
]);
// 2 めんの枝の上の鳥（枝の位置は bigTreeBranches と同じ式）
S2.actors[0].y = groundY(0.45) - 230 * (scaleAt(0.45) / 2.2);
S2.actors[0].x = 160 - 140 * 0.79 + 70;

const S2b = snap(2, 900, [
  { kind: 'tiny', x: 120, z: 0.18 },
  { kind: 'akagera', x: 380, z: 0.62 },
  fake(330, 0.58, { view: 'front', gaze: -0.4 }),
  sakura(230, 0.6, { pose: 'stretch', posePhase: 'pose', poseT: 0.6 })
]);
const S3 = snap(3, 500, [
  { kind: 'tiny', x: 312, z: 0.5, face: -1 },
  { kind: 'enaga', x: 180, z: 0.6, puff: 0.18, mood: 'happy' },
  sakura(222, 0.6, { view: 'front', gaze: 0 }),
  { kind: 'enaga', x: 264, z: 0.6, puff: 0.18, mood: 'happy' },
  { kind: 'enaga', x: 306, z: 0.6, puff: 0.18, mood: 'happy' }
]);
S3.actors[2].look!.squash = 0.12;
const S3b = snap(
  3,
  1100,
  [
    { kind: 'tiny', x: 70, z: 0.2 },
    sakura(260, 0.5, { view: 'left' }),
    { kind: 'snowman', x: 150, z: 1.15, hop: 0.3, arm: 4, face: 1 }
  ],
  { flash: 0, balls: [{ x: 300, y: 210, r: 16 }] }
);

/** 枠の左上を、枠のまん中が (cx, cy) になるように決める。 */
const frameAt = (cx: number, cy: number): { x: number; y: number } => ({ x: cx - FRAME_W / 2, y: cy - FRAME_H / 2 });

function popup(s: Snapshot, cx: number, cy: number, score: number, reason: string, theme: boolean, poseName: string | null, age = 0.6): PopupState {
  const f = frameAt(cx, cy);
  return { snap: s, fx: f.x, fy: f.y, score, reason, theme, poseName, age };
}

function playScreen(
  ctx: CanvasRenderingContext2D,
  s: Snapshot,
  frame: { x: number; y: number },
  h: HudState,
  o: { winding?: number | null; pop?: PopupState; t?: number } = {}
): void {
  drawWorld(ctx, s);
  drawCameraFrame(ctx, { ...frame, winding: o.winding ?? null, flash: 0, empty: h.film === 0, t: o.t ?? 0 });
  drawShutterButton(ctx, o.winding ?? null, false, h.film === 0);
  drawHud(ctx, h);
  if (o.pop) drawScorePopup(ctx, o.pop);
}

function say(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, tx: number, ty: number, size = 16): void {
  ctx.save();
  ctx.font = `bold ${size}px ${FONT}`;
  const w = ctx.measureText(s).width + 28;
  const h = size + 18;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + h / 2 - 1);
  ctx.lineTo(tx, ty);
  ctx.lineTo(x + 9, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rr(ctx, x - w / 2, y - h / 2, w, h, h / 2.4);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 8, y + h / 2 - 3, 16, 4);
  text(ctx, s, x, y, size, '#4a3326', true);
  ctx.restore();
}

function titleMock(ctx: CanvasRenderingContext2D): void {
  const s = snap(1, 200, [{ kind: 'tiny', x: 400, z: 0.2 }, sakura(240, 0.6, { view: 'front', gaze: 0.4 })]);
  drawWorld(ctx, s);
  drawCameraFrame(ctx, { ...frameAt(240, 420), winding: null, flash: 0, empty: false, t: 0 });
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 66, 420, 136, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 100, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'シャッターチャンス', WIDTH / 2, 152, 40, '#f8c3d2', '#8a2f52');
  text(ctx, 'もりのしんぶん カメラマン', WIDTH / 2, 186, 13, COLOR.muted, true);
  for (const [i, s2] of ['ポーズずかん', 'アルバム'].entries()) {
    rr(ctx, 70 + i * 180, 520, 160, 40, 12);
    ctx.fillStyle = 'rgba(15,23,48,0.85)';
    ctx.fill();
    ctx.strokeStyle = COLOR.panelBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, s2, 150 + i * 180, 540, 15, COLOR.ink, true);
  }
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  text(ctx, 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 38, 18, COLOR.ink, true);
  text(ctx, 'HI 12,800 ・ ポーズずかん 5 / 12', WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}

function themeMock(ctx: CanvasRenderingContext2D): void {
  drawWorld(ctx, snap(1, 0, [sakura(330, 0.45, { view: 'left' })]));
  ctx.fillStyle = 'rgba(10,18,38,0.55)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  rr(ctx, 40, 110, 400, 190, 18);
  ctx.fillStyle = '#fbf6e8';
  ctx.fill();
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '1めん  雪の森の朝', WIDTH / 2, 140, 16, '#6a5a52', true);
  text(ctx, 'きょうの おだい', WIDTH / 2, 176, 14, '#8a6a4a', true);
  outlinedText(ctx, 'こっちを むいた', WIDTH / 2, 214, 26, '#d94d78', '#ffffff');
  outlinedText(ctx, 'さくらちゃん', WIDTH / 2, 248, 26, '#d94d78', '#ffffff');
  text(ctx, 'フィルム 10まい ・ 60てん いじょうで クリア', WIDTH / 2, 282, 12, '#6a5a52', true);
  drawOwl(ctx, 130, 560, { scale: 2.6, frontBody: true, cap: true, frontWing: 'point', time: 0.3 });
  say(ctx, 'たのんだぞ、カメラマン！', 300, 360, 200, 400, 15);
  text(ctx, 'タップで スタート', WIDTH / 2, 612, 15, COLOR.ink, true);
}

function resultMock(ctx: CanvasRenderingContext2D): void {
  drawWorld(ctx, snap(1, 1600, []));
  ctx.fillStyle = 'rgba(10,18,38,0.78)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, '1めん の しゃしん', WIDTH / 2, 36, 22, '#ffffff', '#2a3668');
  const list: [Snapshot, number, number, number, string][] = [
    [S1b, 210, 420, 112, 'ベストショット！'],
    [S1, 250, 440, 78, 'いい かんじ'],
    [S1, 300, 400, 54, 'まんなかから ずれてる'],
    [S1, 250, 380, 41, 'かくれてる'],
    [S1, 120, 300, 0, 'だれも いないよ']
  ];
  for (const [i, [s, cx, cy, sc, why]] of list.entries()) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 30 + col * 216;
    const y = 64 + row * 158;
    rr(ctx, x, y, 204, 148, 8);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    const f = frameAt(cx, cy);
    drawPhoto(ctx, s, f.x, f.y, x + 8, y + 8, 116, 93);
    text(ctx, `${i + 1}い`, x + 164, y + 24, 14, '#8a6a4a', true);
    text(ctx, `${sc}`, x + 164, y + 56, 26, sc >= 80 ? '#d94d78' : '#4a3326', true);
    text(ctx, 'てん', x + 164, y + 80, 11, '#6a5a52', true);
    text(ctx, why, x + 102, y + 124, 11, '#6a5a52', true);
    if (i === 0) {
      ctx.fillStyle = '#7fd88a';
      ctx.beginPath();
      ctx.arc(x + 118, y + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '✓', x + 118, y + 15, 13, '#14401c', true);
    }
  }
  rr(ctx, 246, 380, 204, 148, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  text(ctx, 'ごうけい 285てん', 348, 420, 16, COLOR.pink, true);
  text(ctx, 'おだい ＋500 ・ ポーズ ＋300', 348, 448, 11, COLOR.ink, true);
  text(ctx, 'クリア ＋500', 348, 468, 11, COLOR.ink, true);
  text(ctx, '★ まであと 315てん', 348, 498, 12, '#ffd84a', true);
  text(ctx, 'タップで つぎへ', WIDTH / 2, 612, 15, COLOR.ink, true);
}

function paperMock(ctx: CanvasRenderingContext2D): void {
  drawWorld(ctx, snap(1, 1600, []));
  ctx.fillStyle = 'rgba(10,18,38,0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const f = frameAt(210, 420);
  drawNewspaper(ctx, 40, 40, 1.33, {
    issue: 1,
    headline: 'さくらちゃん 大あくび！',
    photo: { snap: S1b, fx: f.x, fy: f.y, score: 112 },
    comment: 'これは いちめんじゃ！'
  }, -0.03);
  drawOwl(ctx, 420, 630, { scale: 1.6, frontBody: true, cap: true, happy: true, frontWing: 'point' });
}

function endingMock(ctx: CanvasRenderingContext2D): void {
  drawWorld(ctx, snap(3, 1700, []));
  ctx.fillStyle = 'rgba(40,20,50,0.35)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const f1 = frameAt(260, 430);
  const f2 = frameAt(330, 440);
  const f3 = frameAt(250, 430);
  for (const [i, [s, f, tx, ty]] of (
    [
      [S1, f1, 316, groundY(0.45)],
      [S2, f2, 392, groundY(0.42)],
      [S3, f3, 312, groundY(0.5)]
    ] as const
  ).entries()) {
    const x = 26 + i * 148;
    const y = 70 + (i % 2) * 18;
    ctx.save();
    ctx.translate(x + 66, y + 60);
    ctx.rotate((i - 1) * 0.08);
    ctx.translate(-(x + 66), -(y + 60));
    rr(ctx, x, y, 132, 120, 6);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    drawPhoto(ctx, s, f.x, f.y, x + 6, y + 6, 120, 96);
    // 写りこんだ雪だるまを丸で囲む
    const px = x + 6 + ((tx - f.x) / FRAME_W) * 120;
    const py = y + 6 + ((ty - 8 - f.y) / FRAME_H) * 96;
    ctx.strokeStyle = '#ff5a7a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  outlinedText(ctx, 'あれっ？ この子…', WIDTH / 2, 236, 20, '#ffffff', '#5a2a4a');
  drawSakura(ctx, 170, 480, { scale: 4, eyes: 'happy', blush: 1, tail: TAIL_REAL });
  drawSnowman(ctx, 380, 560, { scale: 3.4, grin: true, lift: 6 });
  say(ctx, 'ぜんぶ うつってた！', 330, 360, 370, 420, 15);
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
  { caption: '② 面の はじめ：編集長が お題を出す', draw: themeMock },
  {
    caption: '③ 1めん：木や 枝の かげに 気をつけて',
    draw: (ctx) => playScreen(ctx, S1, frameAt(250, 430), hud(1, { total: 0, film: 10, timeLeft: 0.85 }))
  },
  {
    caption: '④ 撮った直後：右上に 写真と 点数（ゲームは 止めない）',
    draw: (ctx) =>
      playScreen(ctx, S1b, frameAt(214, 420), hud(1, { themeOk: true, total: 112, film: 7, timeLeft: 0.62 }), {
        winding: 0.45,
        pop: popup(S1b, 210, 420, 112, 'いい かんじ！', true, 'おおあくび')
      })
  },
  {
    caption: '⑤ 2めん：桜色の そっくりさん（星の かざり・しっぽ 短い）',
    draw: (ctx) =>
      playScreen(ctx, S2, frameAt(330, 440), hud(2, { total: 64, film: 8, timeLeft: 0.7 }), {
        pop: popup(S2, 330, 440, 0, 'ちがう子だよ', false, null)
      })
  },
  {
    caption: '⑥ 2めん：羽を のびー（お題 ✓ ＋ ポーズ）',
    draw: (ctx) =>
      playScreen(ctx, S2b, frameAt(232, 420), hud(2, { themeOk: true, total: 182, film: 6, timeLeft: 0.45 }), {
        pop: popup(S2b, 232, 420, 118, 'いい かんじ！', true, '羽を のびー', 1.0)
      })
  },
  {
    caption: '⑦ 3めん：なかまと だんご',
    draw: (ctx) =>
      playScreen(ctx, S3, frameAt(244, 430), hud(3, { themeOk: true, total: 88, film: 5, timeLeft: 0.5 }), {
        pop: popup(S3, 244, 430, 88, 'いい かんじ！', true, null)
      })
  },
  {
    caption: '⑧ 3めん：雪だるまが 横切る・雪玉',
    draw: (ctx) =>
      playScreen(ctx, S3b, frameAt(250, 440), hud(3, { total: 88, film: 4, timeLeft: 0.3 }), {
        pop: popup(S3b, 250, 440, 32, 'かくれてる', false, null, 0.3)
      })
  },
  { caption: '⑨ 面のあと：点数の 高い順', draw: resultMock },
  { caption: '⑩ 編集長が 1面に えらぶ', draw: paperMock },
  { caption: '⑪ エンディング：ぜんぶの 写真に 雪だるま', draw: endingMock }
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
const SH = 3000;
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

// ふつうの動き
label('さくらちゃん：ふつうの 動き（しっぽが 長いのが 本物）', 720, 30, 20, '#d2577f');
const moves: [string, Partial<SakuraLook>][] = [
  ['正面（こっちを むく）', { view: 'front' }],
  ['よそ見', { view: 'front', gaze: -1 }],
  ['走る（横）', { view: 'right', squash: 0.04 }],
  ['跳ねる', { view: 'right', lift: 10, flap: 0.5 }],
  ['着地', { view: 'left', squash: 0.18 }],
  ['飛ぶ（羽ばたき）', { view: 'right', lift: 18, flap: 1 }],
  ['奥へ 行く（後ろ姿）', { view: 'back' }],
  ['羽を ひろげて 着地', { view: 'front', spread: 0.9, lift: 6 }]
];
for (const [i, [name, o]] of moves.entries()) {
  const x = 100 + i * 172;
  drawSakuraActor(sheet, x, 170, 3, look(o), 0.8);
  label(name, x, 200, 13);
}

// めずらしいポーズ
const yP = 250;
label('めずらしい ポーズ 12 しゅるい（左：予兆 → 右：ポーズ）', 720, yP, 20, '#d2577f');
for (const [i, p] of POSES.entries()) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const x0 = 30 + col * 352;
  const y0 = yP + 30 + row * 250;
  sheet.fillStyle = '#ffffff';
  rr(sheet, x0, y0, 336, 236, 12);
  sheet.fill();
  sheet.save();
  sheet.beginPath();
  sheet.rect(x0, y0, 336, 236);
  sheet.clip();
  drawSakuraActor(sheet, x0 + 90, y0 + 168, 2.8, look({ pose: p.id, posePhase: 'omen', poseT: 0.6 }), 0.7);
  drawSakuraActor(sheet, x0 + 246, y0 + 168, 2.8, look({ pose: p.id, posePhase: 'pose', poseT: 0.5 }), 0.7);
  sheet.restore();
  label('→', x0 + 168, y0 + 120, 22, '#b9a0a8');
  label(`${i + 1}. ${p.name}`, x0 + 168, y0 + 196, 15, '#d2577f');
  label(`予兆：${p.omen}`, x0 + 168, y0 + 218, 12, '#6a5a52');
}

// 雪かぶり・そっくりさん
const yL = yP + 30 + 3 * 250 + 30;
label('さくらちゃん ／ 桜色の そっくりさん（2めんから。しっぽが 短く、頭の かざりが 星）', 720, yL, 20, '#3a6aa3');
sheet.fillStyle = '#f4f8fc';
rr(sheet, 30, yL + 24, 640, 220, 12);
sheet.fill();
for (const [i, [name, o]] of (
  [
    ['正面', {}],
    ['横', { view: 'right' }],
    ['後ろ姿', { view: 'back' }]
  ] as [string, Partial<SakuraLook>][]
).entries()) {
  const x = 140 + i * 210;
  drawSakuraActor(sheet, x, yL + 196, 3.2, look(o), 0.5);
  label(name, x, yL + 226, 13);
}
sheet.fillStyle = '#f4f8fc';
rr(sheet, 690, yL + 24, 720, 220, 12);
sheet.fill();
for (const [i, [name, a]] of (
  [
    ['本物（しっぽ 長い）', look({})],
    ['そっくりさん（星の かざり）', look({ bird: 'fake', tail: TAIL_FAKE })],
    ['本物（横）', look({ view: 'left' })],
    ['そっくりさん（横）', look({ bird: 'fake', tail: TAIL_FAKE, view: 'left' })]
  ] as [string, SakuraLook][]
).entries()) {
  const x = 780 + i * 180;
  drawSakuraActor(sheet, x, yL + 196, 3.2, a, 0.5);
  label(name, x, yL + 226, 13);
}

// 編集長・雪だるま・鳥
const yO = yL + 290;
label('編集長の フクロウ ／ 雪だるま ／ 2めんの 鳥たち', 720, yO, 20, '#8c5c31');
const owls: [string, Parameters<typeof drawOwl>[3]][] = [
  ['ふつう', { frontBody: true, cap: true }],
  ['お題を 出す', { frontBody: true, cap: true, frontWing: 'point', time: 0.2 }],
  ['いい 写真！', { frontBody: true, cap: true, happy: true }]
];
for (const [i, [name, o]] of owls.entries()) {
  const x = 90 + i * 150;
  drawOwl(sheet, x, yO + 220, { scale: 2.3, ...o });
  label(name, x, yO + 244, 13);
}
const snows: [string, () => void][] = [
  ['ふつう', () => drawSnowman(sheet, 560, yO + 220, { scale: 4 })],
  ['雪玉を 投げる', () => {
    drawSnowman(sheet, 720, yO + 220, { scale: 4, lift: 7, face: 1 });
    drawSnowball(sheet, 790, yO + 90, 14, 0.3);
  }],
  ['前を 横切る', () => drawSnowman(sheet, 880, yO + 220, { scale: 4, hop: 0.25, face: -1 })],
  ['こっそり（小さく 写りこむ）', () => drawSnowman(sheet, 1040, yO + 220, { scale: 1.6, grin: true })]
];
for (const [i, [name, f]] of snows.entries()) {
  f();
  label(name, 560 + i * 160, yO + 244, 13);
}
for (const [i, k] of (['yamagara', 'gojukara', 'akagera', 'karasu', 'enaga'] as const).entries()) {
  drawBird(sheet, 1170 + (i % 3) * 90, yO + 110 + Math.floor(i / 3) * 110, k, { scale: 2, flap: i === 4 ? 0.6 : 0 });
}
label('2めんの 鳥 ／ 3めんの なかま', 1260, yO + 244, 13);

// 枠・シャッター・採点
const yF = yO + 290;
label('カメラの 枠 と シャッター（撮れる ／ ジー… 巻いている ／ フィルム なし）', 720, yF, 20, '#3a6aa3');
for (const [i, st] of ([null, 0.5, 'empty'] as const).entries()) {
  const x0 = 30 + i * 300;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x0, yF + 24, 280, 250);
  sheet.clip();
  sheet.translate(x0 - 160, yF + 24 - 380);
  drawWorld(sheet, snap(1, 300, [sakura(250, 0.5, {})]));
  drawCameraFrame(sheet, { ...frameAt(250, 470), winding: typeof st === 'number' ? st : null, flash: 0, empty: st === 'empty', t: 0 });
  drawShutterButton(sheet, typeof st === 'number' ? st : null, false, st === 'empty');
  sheet.restore();
}
// 採点の小窓
const pops: PopupState[] = [
  popup(S1, 250, 430, 46, 'ちょっと ちいさい', true, null),
  popup(S1, 300, 400, 0, 'だれも いないよ', false, null),
  popup(S1b, 212, 420, 112, 'いい かんじ！', true, 'おおあくび')
];
for (const [i, p] of pops.entries()) {
  sheet.save();
  sheet.translate(930 + i * 170 - 318, yF + 40 - HUD_H);
  drawScorePopup(sheet, p);
  sheet.restore();
}
label('撮るたびの 採点（点数・減点の 理由・✓・ベストショット・ポーズ）', 1180, yF + 260, 13);

// HUD
const yH = yF + 300;
sheet.save();
sheet.translate(30, yH);
drawHud(sheet, hud(2, { themeOk: true, total: 182, film: 6, timeLeft: 0.45 }));
sheet.restore();
sheet.save();
sheet.translate(540, yH);
drawHud(sheet, hud(3, { total: 0, film: 2, timeLeft: 0.12 }));
sheet.restore();
label('上の 情報欄（お題 ✓、ごうけい、のこり フィルム、残り時間の バー）', 1240, yH + 22, 13);

// 新聞
const yN = yH + 80;
label('「もりのしんぶん」の 1面', 360, yN, 20, '#8c5c31');
{
  const f = frameAt(232, 420);
  drawNewspaper(sheet, 30, yN + 24, 1.6, { issue: 2, headline: 'さくらちゃん 羽を のびー！', photo: { snap: S2b, fx: f.x, fy: f.y, score: 118 }, comment: 'みごとな はばたきじゃ！' });
}
// 背景
label('3つの 面の 背景', 1080, yN, 20, '#3a6aa3');
for (const [i, name] of ['1めん 雪の森の朝', '2めん 鳥たちの集まる木', '3めん 夕暮れの雪原'].entries()) {
  const x = 760;
  const y = yN + 24 + i * 214;
  const w = 640;
  const h = 190;
  sheet.save();
  sheet.beginPath();
  sheet.rect(x, y, w, h);
  sheet.clip();
  sheet.translate(x, y - 190 * (w / WIDTH));
  sheet.scale(w / WIDTH, w / WIDTH);
  drawWorld(sheet, snap(i + 1, 300, []));
  sheet.restore();
  label(name, x + 100, y + 16, 14, '#ffffff');
}
const used = yN + 24 + PAPER_H * 1.6 + 40;
void used;
void PAPER_W;
