// デザイン確認用：場面ごとの画面と、さくらちゃん・クラブ・仲間・雪だるま・地面・HUD・コースの一覧を描く（開発時だけ使う）。
import { drawBear, type BearOptions } from './game/bear';
import { BEAR_SCALE, FOX_SCALE, HEIGHT, HUD_H, WIDTH } from './game/constants';
import type { Hole } from './game/course';
import { drawAbove, drawCourseAll, drawGround, drawKamakura, drawRock, drawStump, drawTreeTop, type Theme } from './game/field';
import { drawBall, drawClub, drawFlag, drawGolfer, drawSakuraCurled, drawTee, drawCup, drawZzz, type GolferState } from './game/golfer';
import { HOLES } from './game/holes';
import {
  drawAceBanner,
  drawAceStamp,
  drawHoleStamp,
  drawAimGuide,
  drawConfetti,
  drawHud,
  drawPowerMeter,
  drawResultWord,
  drawScoreCard,
  say,
  stars,
  type HudState
} from './game/hud';
import { drawKitsune, type KitsuneOptions } from './game/kitsune';
import { drawSakura } from './game/sakura';
import { drawSnowman } from './game/snowman';
import { COURSES, courseTarget } from './game/stages';
import { COLOR, FONT, outlinedText, rr, text } from './game/ui';

const THEME: Theme[] = ['spring', 'spring', 'spring', 'autumn', 'autumn', 'autumn', 'winter', 'winter', 'winter'];
const hole = (i: number): Hole => HOLES[i]!;

function hud(i: number, o: Partial<HudState> = {}): HudState {
  const c = COURSES[Math.floor(i / 3)]!;
  const h = hole(i);
  return { course: c.no, holeNo: (i % 3) + 1, par: h.par, strokes: 1, maxStrokes: h.par + 3, target: courseTarget(c), total: 0, ...o };
}

const BEAR_S = BEAR_SCALE;
const bear = (ctx: CanvasRenderingContext2D, x: number, y: number, o: BearOptions = {}): void =>
  drawBear(ctx, x, y, { scale: BEAR_S, noKine: true, hat: 'cap', ...o });
const fox = (ctx: CanvasRenderingContext2D, x: number, y: number, o: KitsuneOptions = {}): void => drawKitsune(ctx, x, y, { scale: FOX_SCALE, ...o });

interface Scene {
  i: number;
  camY: number;
  ball?: { x: number; y: number };
  golfer?: GolferState;
  gallery?: (ctx: CanvasRenderingContext2D) => void;
  extra?: (ctx: CanvasRenderingContext2D) => void;
  flagWave?: number;
  t?: number;
}

/** プレイ中の画面（ワールド座標で地面・人物を描き、そのあと HUD）。 */
function playScreen(ctx: CanvasRenderingContext2D, s: Scene, h: HudState | null, after?: (ctx: CanvasRenderingContext2D) => void): void {
  const hl = hole(s.i);
  const theme = THEME[s.i]!;
  const t = s.t ?? 1.2;
  const v = { hole: hl, theme, camY: s.camY, t };
  ctx.save();
  ctx.translate(0, -s.camY);
  drawGround(ctx, v);
  if (s.ball) drawBall(ctx, s.ball.x, s.ball.y, 0.4, 0, undefined, theme === 'winter' ? 'orange' : 'white');
  drawAbove(ctx, v);
  drawFlag(ctx, hl.cup.x, hl.cup.y, t, s.flagWave ?? 0.15, '#ff6f98', (s.i % 3) + 1);
  s.gallery?.(ctx);
  if (s.ball && s.golfer) drawGolfer(ctx, s.ball.x, s.ball.y, s.golfer);
  s.extra?.(ctx);
  ctx.restore();
  if (h) drawHud(ctx, h);
  after?.(ctx);
}

// --- 場面 -------------------------------------------------------------------

function titleMock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, {
    i: 0,
    camY: 330,
    ball: { x: 240, y: 680 },
    golfer: { pose: 'address', aim: -Math.PI / 2 },
    gallery: (c) => {
      bear(c, 360, 700);
      fox(c, 400, 640);
    }
  }, null);
  ctx.fillStyle = 'rgba(12,26,20,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 62, 420, 136, 16);
  ctx.fillStyle = 'rgba(18,40,28,0.86)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 96, 26, '#ffffff', '#1f3a2a');
  outlinedText(ctx, 'パークゴルフ', WIDTH / 2, 148, 42, '#f8c3d2', '#8a2f52');
  text(ctx, 'さかを よんで カップを ねらおう', WIDTH / 2, 182, 13, COLOR.muted, true);
  for (const [k, [label, primary]] of ([
    ['はじめる', true],
    ['きねんスタンプ 4/9', false]
  ] as const).entries()) {
    const x = 110;
    const y = 470 + k * 56;
    rr(ctx, x, y, 260, 44, 12);
    ctx.fillStyle = primary ? '#f8c3d2' : 'rgba(18,40,28,0.88)';
    ctx.strokeStyle = primary ? '#8a2f52' : COLOR.panelBorder;
    ctx.lineWidth = 1.6;
    ctx.fill();
    ctx.stroke();
    text(ctx, label, x + 130, y + 23, primary ? 19 : 15, primary ? '#2a0f1a' : COLOR.ink, true);
  }
  ctx.fillStyle = 'rgba(12,26,20,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  text(ctx, 'クリック / スペースで えらぶ', WIDTH / 2, HEIGHT - 38, 16, COLOR.ink, true);
  text(ctx, 'HI 3,250 ・ 1めん ★★ 14打', WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}

function introMock(ctx: CanvasRenderingContext2D): void {
  // ホールの始め：カップからティーへカメラが流れる（とちゅう）
  playScreen(ctx, { i: 1, camY: 200 }, null);
  ctx.fillStyle = 'rgba(12,26,20,0.55)';
  ctx.fillRect(0, 0, WIDTH, 120);
  outlinedText(ctx, '1めん  2ホール', WIDTH / 2, 38, 20, '#ffffff', '#1f3a2a');
  outlinedText(ctx, 'かわせみの いけ   パー4', WIDTH / 2, 76, 24, '#f8c3d2', '#8a2f52');
  text(ctx, 'カップから ティーまで みわたしているよ', WIDTH / 2, 104, 12, COLOR.ink, true);
  // 流れる向きの矢印
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(452, 300);
  ctx.lineTo(452, 420);
  ctx.moveTo(444, 410);
  ctx.lineTo(452, 422);
  ctx.lineTo(460, 410);
  ctx.stroke();
  text(ctx, 'タップで とばす', WIDTH / 2, 616, 14, COLOR.ink, true);
}

const gal1 = (ctx: CanvasRenderingContext2D, o: { bear?: BearOptions; fox?: KitsuneOptions } = {}): void => {
  bear(ctx, 340, 724, o.bear);
  fox(ctx, 394, 700, o.fox);
};

function addressMock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, { i: 0, camY: 120, ball: { x: 240, y: 680 }, golfer: { pose: 'address', aim: -Math.PI / 2 - 0.1 }, gallery: (c) => gal1(c) }, hud(0));
}

function dragMock(ctx: CanvasRenderingContext2D): void {
  const aim = -Math.PI / 2 - 0.12;
  playScreen(
    ctx,
    {
      i: 0,
      camY: 120,
      ball: { x: 240, y: 680 },
      golfer: { pose: 'back', aim, swing: 0.62 },
      gallery: (c) => gal1(c),
      extra: (c) => {
        drawAimGuide(c, 240, 680, aim, 0.62, false);
        // 指（引っぱっている所）
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath();
        c.arc(262, 760, 16, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.5)';
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(240, 680);
        c.lineTo(262, 760);
        c.stroke();
        c.setLineDash([]);
      }
    },
    hud(0)
  );
  drawPowerMeter(ctx, 0.62, false);
}

function spinMock(ctx: CanvasRenderingContext2D): void {
  playScreen(
    ctx,
    {
      i: 0,
      camY: 120,
      ball: { x: 236, y: 540 },
      golfer: { pose: 'spin', aim: -Math.PI / 2, t: 0.35 },
      gallery: (c) => gal1(c, { bear: { face: 'shock' }, fox: { mood: 'normal' } })
    },
    hud(0, { strokes: 2 })
  );
  outlinedText(ctx, 'おもいきり！', WIDTH / 2, 120, 26, '#ffd84a', '#5a3a1e');
}

function hintMock(ctx: CanvasRenderingContext2D): void {
  playScreen(
    ctx,
    {
      i: 0,
      camY: 120,
      ball: { x: 240, y: 680 },
      golfer: { pose: 'address', aim: -Math.PI / 2 },
      gallery: (c) => {
        bear(c, 340, 724);
        fox(c, 394, 700, { pose: 'whisper' });
        say(c, 'カップの てまえ、\n右へ まがる 坂だよ', 352, 610, 392, 662, 13, true);
      }
    },
    hud(0)
  );
}

function pondMock(ctx: CanvasRenderingContext2D): void {
  playScreen(
    ctx,
    {
      i: 1,
      camY: 360,
      ball: { x: 210, y: 600 },
      golfer: { pose: 'sad', aim: -Math.PI / 2, t: 0.4 },
      gallery: (c) => {
        bear(c, 100, 560, { arms: 'cover' });
        fox(c, 60, 610, { pose: 'cover' });
        // 池のしぶき
        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.ellipse(280, 680, 8 + k * 7, 4 + k * 3.5, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
    },
    hud(1, { strokes: 3, total: 6 })
  );
  outlinedText(ctx, 'ポチャン！', WIDTH / 2, 110, 30, '#8fd0ff', '#1f3a5a');
  text(ctx, '1打 ペナルティ。はいる てまえから うちなおし', WIDTH / 2, 146, 13, COLOR.ink, true);
}

function autumnMock(ctx: CanvasRenderingContext2D): void {
  playScreen(
    ctx,
    {
      i: 3,
      camY: 200,
      ball: { x: 142, y: 560 },
      golfer: { pose: 'address', aim: -Math.PI / 2 - 0.05 },
      gallery: (c) => {
        bear(c, 60, 640, { arms: 'clap', clap: 0.2, face: 'excited' });
        fox(c, 40, 560, { pose: 'watch' });
      }
    },
    hud(3, { strokes: 2, total: 1 })
  );
}

function winterMock(ctx: CanvasRenderingContext2D): void {
  playScreen(
    ctx,
    {
      i: 7,
      camY: 480,
      ball: { x: 130, y: 760 },
      golfer: { pose: 'back', aim: Math.PI / 2 - 0.02 + Math.PI, swing: 0.4 },
      gallery: (c) => {
        bear(c, 220, 800);
        fox(c, 260, 790);
      },
      t: 2.3
    },
    hud(6, { holeNo: 2, par: 4, maxStrokes: 7, strokes: 2, total: 4, target: 17 })
  );
}

function aceMock(ctx: CanvasRenderingContext2D): void {
  playScreen(
    ctx,
    {
      i: 0,
      camY: 0,
      t: 0.8,
      flagWave: 1,
      gallery: (c) => {
        bear(c, 300, 260, { cheer: 1, face: 'excited', bob: -16 });
        fox(c, 180, 250, { pose: 'hooray', mood: 'happy', t: 0.3 });
        drawGolfer(c, 220, 330, { pose: 'happy', aim: -Math.PI / 2, t: 0.2 });
      }
    },
    hud(0, { strokes: 1, total: 1 })
  );
  drawConfetti(ctx, 1.6);
  drawAceBanner(ctx, 1);
  drawAceStamp(ctx, 380, 420, 0.9);
  text(ctx, '＋1000てん', WIDTH / 2, 300, 18, '#ffd84a', true);
}

function cardMock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, { i: 2, camY: 0 }, null);
  ctx.fillStyle = 'rgba(12,26,20,0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawScoreCard(ctx, 40, 90, {
    course: 1,
    courseName: 'はるの かわべコース',
    holes: [
      { name: 'さくら なみき', par: 3, strokes: 1, ace: true },
      { name: 'かわせみの いけ', par: 4, strokes: 5, ace: false },
      { name: 'はるの かわべ', par: 5, strokes: 5, ace: false }
    ],
    target: 17,
    shown: 3,
    showTotal: true,
    stars: 2,
    cleared: true
  });
  text(ctx, 'この めんの とくてん ＋1,750', WIDTH / 2, 430, 15, '#ffd84a', true);
  text(ctx, '（ホールインワン 1000 ＋ ボギー 50 ＋ パー 200 ＋ クリア 500）', WIDTH / 2, 452, 11, COLOR.muted, true);
  bear(ctx, 150, 580, { arms: 'clap', clap: 0.6, face: 'excited' });
  fox(ctx, 330, 570, { pose: 'clap', mood: 'happy', t: 0.2 });
  drawSakura(ctx, 240, 560, { scale: 1.6, eyes: 'happy', spread: 0.8, tail: 1 });
  text(ctx, 'タップで つぎへ', WIDTH / 2, 622, 13, COLOR.ink, true);
}

function gameOverMock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, { i: 5, camY: 0, t: 3 }, null);
  ctx.fillStyle = 'rgba(30,20,10,0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, 'きょうは ここまで', WIDTH / 2, 110, 32, '#ffd8a8', '#5a2a10');
  text(ctx, 'ごうけい 21打（もくひょう 17打）', WIDTH / 2, 152, 14, COLOR.ink, true);
  bear(ctx, 150, 520, { scale: 0.32, face: 'normal' } as BearOptions);
  fox(ctx, 350, 520, { scale: 2.4, mood: 'happy' });
  drawSakura(ctx, 250, 520, { scale: 2.2, eyes: 'closed', tail: 1, squash: 0.06 });
  say(ctx, 'また こんど\nいっしょに まわろう', 240, 300, 170, 380, 16);
  text(ctx, 'タップで タイトルへ', WIDTH / 2, 612, 14, COLOR.ink, true);
}

function stampBookMock(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#1d3a2a');
  g.addColorStop(1, '#0d1c16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  rr(ctx, 30, 30, 420, 560, 16);
  ctx.fillStyle = '#fbf6e8';
  ctx.fill();
  outlinedText(ctx, 'きねんスタンプ', WIDTH / 2, 66, 22, '#d94d78', '#ffffff');
  text(ctx, '3 / 9', WIDTH / 2, 94, 13, '#8a6a4a', true);
  for (let i = 0; i < 9; i++) {
    const cx = 100 + (i % 3) * 140;
    const cy = 168 + Math.floor(i / 3) * 140;
    ctx.strokeStyle = 'rgba(120,100,80,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if ([0, 3, 4, 6].includes(i)) drawHoleStamp(ctx, cx, cy, i === 0 ? 2 : 1, 1, -0.2 + i * 0.05);
    else text(ctx, '？', cx, cy, 26, 'rgba(120,100,80,0.35)', true);
    text(ctx, `${Math.floor(i / 3) + 1}-${(i % 3) + 1} ${hole(i).name}`, cx, cy + 60, 11, '#6a5a52', true);
  }
  text(ctx, 'タップで もどる', WIDTH / 2, 612, 14, COLOR.ink, true);
}

function demo1Mock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, { i: 2, camY: 0, t: 2 }, null);
  ctx.fillStyle = 'rgba(12,26,20,0.35)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // 遠くの秋の森
  ctx.fillStyle = 'rgba(12,26,20,0.6)';
  ctx.fillRect(0, 380, WIDTH, 260);
  bear(ctx, 300, 600, { scale: 0.62, cheer: 0.9, face: 'proud' } as BearOptions);
  drawSakura(ctx, 120, 570, { scale: 2.4, eyes: 'happy', tail: 1 });
  fox(ctx, 200, 610, { scale: 2.2, mood: 'happy' });
  say(ctx, 'つぎは 森の コースだ！', 260, 200, 300, 260, 18);
}

function demo2Mock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, { i: 5, camY: 0, t: 2 }, null);
  ctx.fillStyle = 'rgba(30,40,70,0.45)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawSnowman(ctx, 340, 600, { scale: 4.4, lift: 6, face: -1 });
  drawSakura(ctx, 110, 580, { scale: 2.4, eyes: 'shock', tail: 1 });
  bear(ctx, 200, 620, { scale: 0.5, face: 'shock' } as BearOptions);
  say(ctx, 'ふゆは ゆきの コースで\nしょうぶだ！', 300, 250, 320, 410, 17);
}

function endingMock(ctx: CanvasRenderingContext2D): void {
  playScreen(ctx, { i: 0, camY: 120, t: 4 }, null);
  ctx.fillStyle = 'rgba(255,220,200,0.18)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // ① 丸くなって休む → ② クマがティーに置く → ③ パタパタ抗議
  const x = 240;
  const y = 680 - 120;
  drawTee(ctx, x, y);
  bear(ctx, x + 70, y + 30, { scale: 0.42, face: 'grin', arms: 'clap', clap: 0.8 } as BearOptions);
  drawClub(ctx, x + 66, y - 66, x + 22, y + 4, Math.PI, 1.6);
  drawSakura(ctx, x - 6, y - 26, { scale: 1.9, view: 'right', flap: 1, tail: 1, eyes: 'squint' });
  ctx.strokeStyle = '#ff6f6f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 52, y - 70);
  ctx.lineTo(x - 40, y - 56);
  ctx.moveTo(x - 38, y - 76);
  ctx.lineTo(x - 30, y - 58);
  ctx.stroke();
  say(ctx, 'ボールじゃ ないよ！', 150, 380, 220, 460, 17);
  // 小さな絵：丸くなって休んでいた所
  rr(ctx, 20, 60, 150, 120, 10);
  ctx.fillStyle = 'rgba(255,253,246,0.95)';
  ctx.fill();
  drawSakuraCurled(ctx, 95, 130, 2, 0.5);
  drawZzz(ctx, 120, 100, 0.5, 1.4);
  text(ctx, 'すやすや…', 95, 76, 12, '#6a5a52', true);
  text(ctx, '「お、こんな ところに ボールが」', WIDTH / 2, 220, 14, '#4a3326', true);
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
  { caption: '② ホールの はじめ（カップ → ティー）', draw: introMock },
  { caption: '③ 1めん：かまえ・クマと キツネが 見ている', draw: addressMock },
  { caption: '④ 引っぱり中：短い ガイド線と 強さ', draw: dragMock },
  { caption: '⑤ 思いきり 打って くるっと 回る', draw: spinMock },
  { caption: '⑥ キツネの ヒント（1めんだけ、小声）', draw: hintMock },
  { caption: '⑦ 池ぽちゃ：顔を おおう・1打 ペナルティ', draw: pondMock },
  { caption: '⑧ 2めん：小川と 橋・落ち葉・根', draw: autumnMock },
  { caption: '⑨ 3めん：氷・雪・雪だるま・かまくら', draw: winterMock },
  { caption: '⑩ ホールインワン：大はしゃぎ・旗・スタンプ', draw: aceMock },
  { caption: '⑪ コースの 終わり：スコアカード', draw: cardMock },
  { caption: '⑫ ゲームオーバー：なぐさめ', draw: gameOverMock },
  { caption: '⑬ きねんスタンプ（タイトルから）', draw: stampBookMock },
  { caption: '⑭ 1めんの あと：クマ', draw: demo1Mock },
  { caption: '⑮ 2めんの あと：雪だるまが 呼びに 来る', draw: demo2Mock },
  { caption: '⑯ エンディング：ボールと まちがえる', draw: endingMock }
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
const SH = 2700;
const sheet = setup('sheet', SW, SH);
sheet.fillStyle = '#eef4ea';
sheet.fillRect(0, 0, SW, SH);
const label = (s: string, x: number, y: number, size = 16, color = '#4a3326'): void => {
  sheet.font = `bold ${size}px ${FONT}`;
  sheet.fillStyle = color;
  sheet.textAlign = 'center';
  sheet.textBaseline = 'middle';
  sheet.fillText(s, x, y);
};
const grass = (x: number, y: number, w: number, h: number, theme: Theme = 'spring'): void => {
  rr(sheet, x, y, w, h, 12);
  sheet.fillStyle = theme === 'winter' ? '#e4edf6' : theme === 'autumn' ? '#a7b956' : '#86c65a';
  sheet.fill();
};

// さくらちゃん
label('さくらちゃん：かまえ → 引っぱる → 打つ → 思いきり（くるっと 回る） → 喜ぶ → がっかり → 丸くなって 休む', 720, 30, 19, '#d2577f');
grass(20, 50, 1400, 230);
sheet.save();
sheet.translate(0, 0);
const poses: [string, GolferState, number][] = [
  ['かまえ', { pose: 'address', aim: -Math.PI / 2, scale: 2.4 }, 0],
  ['引っぱる（強さ 1/2）', { pose: 'back', aim: -Math.PI / 2, swing: 0.5, scale: 2.4 }, 0],
  ['引っぱる（いっぱい）', { pose: 'back', aim: -Math.PI / 2, swing: 1, scale: 2.4 }, 0],
  ['ふつうに 打つ', { pose: 'swing', aim: -Math.PI / 2, t: 0.3, scale: 2.4 }, 0],
  ['思いきり（回る とちゅう）', { pose: 'spin', aim: -Math.PI / 2, t: 0.3, scale: 2.4 }, 0],
  ['回りおわって 目が回る', { pose: 'spin', aim: -Math.PI / 2, t: 1.1, scale: 2.4 }, 0],
  ['喜ぶ', { pose: 'happy', aim: -Math.PI / 2, t: 0.1, scale: 2.4 }, 0],
  ['がっかり', { pose: 'sad', aim: -Math.PI / 2, t: 0.1, scale: 2.4 }, 0]
];
for (const [i, [name, st]] of poses.entries()) {
  const bx = 150 + i * 160;
  const by = 200;
  if (st.pose !== 'happy' && st.pose !== 'sad') drawBall(sheet, st.pose === 'swing' || st.pose === 'spin' ? bx : bx, st.pose === 'swing' || st.pose === 'spin' ? by - 40 : by, 0, 0, 5 * 2.4);
  drawGolfer(sheet, bx, by, st);
  label(name, bx - 40, 266, 13);
}
sheet.restore();
// 向き
grass(20, 300, 700, 200);
label('打つ 向きが かわると 立つ 位置も かわる（打つ向きの 左手）', 370, 320, 14);
for (const [i, a] of [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 2, Math.PI].entries()) {
  const bx = 100 + i * 130;
  const by = 420;
  drawBall(sheet, bx, by, 0, 0, 7.5);
  drawGolfer(sheet, bx, by, { pose: 'address', aim: a, scale: 1.5 });
  drawAimGuide(sheet, bx, by, a, 0.3, false);
}
// 丸くなって休む
grass(740, 300, 680, 200);
label('丸くなって 休む（エンディング。白い ボールに 見える）', 1080, 320, 14);
drawSakuraCurled(sheet, 860, 420, 3.2, 0.3);
drawZzz(sheet, 900, 370, 0.3, 2);
drawBall(sheet, 990, 432, 0, 0, 5 * 3.2);
label('ボール（同じ 倍率）', 990, 476, 12);
drawTee(sheet, 1120, 420);
drawSakuraCurled(sheet, 1120, 410, 2.2, 0.8);
label('ティーに 置かれた', 1120, 476, 12);
drawSakura(sheet, 1300, 420, { scale: 2.6, view: 'right', flap: 1, tail: 1 });
label('パタパタ 抗議', 1300, 476, 12);

// 道具
const yT = 530;
label('木の クラブ（さくらちゃんより 大きい）・ボール・カップと 旗・ティー', 720, yT, 19, '#8c5c31');
grass(20, yT + 20, 1400, 220);
drawSakura(sheet, 120, yT + 150, { scale: 3, tail: 1 });
drawClub(sheet, 200, yT + 50, 228, yT + 200, 0, 3);
label('クラブの 長さ ＝ 体の 約 1.6 倍', 190, yT + 226, 12);
for (const [i, a] of [-Math.PI / 2, 0, Math.PI / 4].entries()) drawClub(sheet, 340 + i * 90, yT + 60, 360 + i * 90, yT + 170, a, 2.2, i === 2 ? 12 : 0);
label('ヘッドの 向き（打つ面） ／ 浮いている', 450, yT + 226, 12);
for (const [i, r] of [0, 1.6, 3.2].entries()) drawBall(sheet, 640 + i * 50, yT + 130, r, 0, 10, i === 2 ? 'orange' : 'white');
label('ボール（右は 冬の オレンジ）', 690, yT + 226, 12);
drawCup(sheet, 860, yT + 150);
drawFlag(sheet, 860, yT + 150, 1, 0.15);
drawCup(sheet, 960, yT + 150);
drawFlag(sheet, 960, yT + 150, 1.3, 1);
label('旗（ふつう ／ ホールインワンで ゆれる）', 910, yT + 226, 12);
drawTee(sheet, 1110, yT + 130);
drawBall(sheet, 1110, yT + 130);
label('ティー（ゴムの マット）', 1110, yT + 226, 12);
drawHoleStamp(sheet, 1250, yT + 120, 1, 0.8);
drawHoleStamp(sheet, 1350, yT + 120, 2, 0.8);
label('きねんスタンプ（バーディ ／ ホールインワン）', 1300, yT + 226, 12);

// クマとキツネ
const yB = yT + 270;
label('クマと キツネ：見ている ・ 拍手 ・ 顔を おおう ・ 大はしゃぎ ・ ヒントの 吹き出し', 720, yB, 19, '#8c5c31');
grass(20, yB + 20, 1400, 260);
const bears: [string, BearOptions][] = [
  ['見ている', {}],
  ['拍手', { arms: 'clap', clap: 0.4, face: 'excited' }],
  ['顔を おおう', { arms: 'cover' }],
  ['大はしゃぎ', { cheer: 1, face: 'excited', bob: -20 }],
  ['あわてる', { face: 'shock', sweat: true }],
  ['張りきる', { cheer: 0.6, face: 'proud' }]
];
for (const [i, [name, o]] of bears.entries()) {
  const x = 90 + i * 120;
  bear(sheet, x, yB + 230, { scale: 0.5, ...o });
  label(name, x, yB + 256, 12);
}
const foxes: [string, KitsuneOptions][] = [
  ['見ている', {}],
  ['拍手', { pose: 'clap', mood: 'happy', t: 0.1 }],
  ['顔を おおう', { pose: 'cover' }],
  ['大はしゃぎ', { pose: 'hooray', mood: 'happy', t: 0.2 }],
  ['ないしょ話', { pose: 'whisper' }]
];
for (const [i, [name, o]] of foxes.entries()) {
  const x = 830 + i * 110;
  fox(sheet, x, yB + 230, { scale: 2.6, ...o });
  label(name, x, yB + 256, 12);
}
sheet.save();
sheet.translate(1000, yB);
say(sheet, 'いまの 坂、\n右に まがるよ', 330, 110, 270, 160, 15, true);
sheet.restore();
label('コースの 上での 大きさ →', 1060, yB + 60, 12);
bear(sheet, 1160, yB + 70);
fox(sheet, 1200, yB + 66);
drawGolfer(sheet, 1120, yB + 80, { pose: 'address', aim: -Math.PI / 2 });
drawBall(sheet, 1120, yB + 80);

// 雪だるま
const yS = yB + 310;
label('雪だるま（3めん・往復して コースを ふさぐ）／ かまくらの トンネル', 720, yS, 19, '#3a6aa3');
grass(20, yS + 20, 1400, 200, 'winter');
for (const [i, o] of [{ face: 1, hop: 0 }, { face: -1, hop: 0.25 }, { face: 0, lift: 6 }].entries()) {
  drawSnowman(sheet, 100 + i * 120, yS + 190, { scale: 3, ...o });
}
label('右へ ／ 左へ ／ 当たって ぴょん', 220, yS + 206, 12);
drawCourseSnowmanRow();
drawKamakura(sheet, 900, yS + 120, Math.PI / 2, false, 0.5);
drawKamakura(sheet, 1040, yS + 120, -Math.PI / 2, true, 0.5);
label('入口（穴に 入る）', 900, yS + 190, 12);
label('出口（同じ ちょうちん・矢印）', 1040, yS + 190, 12);
drawTreeTop(sheet, 1180, yS + 110, 26, 'winter');
drawRock(sheet, 1280, yS + 110, 14, 'winter');
label('雪の 木・岩', 1230, yS + 190, 12);

function drawCourseSnowmanRow(): void {
  for (let k = 0; k < 4; k++) {
    const x = 520 + k * 80;
    drawSnowman(sheet, x, yS + 150, { scale: 0.78, hop: k * 0.25, face: k % 2 === 0 ? 1 : -1 });
    drawBall(sheet, x + 22, yS + 150, 0, 0, undefined, 'orange');
  }
  label('コースの 上（ボールと 同じ 倍率）', 640, yS + 190, 12);
}

// 地面
const yG = yS + 250;
label('地面の 種類（当たりは 描いた 形の まま）', 720, yG, 19, '#3f7a35');
const tiles: { name: string; hole: number; theme: Theme; camY: number; x0: number }[] = [
  { name: '芝・ラフ・OB の くい', hole: 0, theme: 'spring', camY: 470, x0: -10 },
  { name: '傾斜（右へ 下る、2重の 矢印は 強め）', hole: 0, theme: 'spring', camY: 200, x0: 150 },
  { name: '池', hole: 0, theme: 'spring', camY: 210, x0: 300 },
  { name: '川', hole: 2, theme: 'spring', camY: 880, x0: 300 },
  { name: '木・岩（はね返る）', hole: 2, theme: 'spring', camY: 1110, x0: 160 },
  { name: '落ち葉（よく 止まる）', hole: 3, theme: 'autumn', camY: 110, x0: 250 },
  { name: '小川と 橋', hole: 3, theme: 'autumn', camY: 410, x0: 60 },
  { name: '木の根（向きが 少し かわる）', hole: 4, theme: 'autumn', camY: 540, x0: 200 },
  { name: '雪（すぐ 止まる）', hole: 6, theme: 'winter', camY: 70, x0: 150 },
  { name: '氷（よく すべる）', hole: 6, theme: 'winter', camY: 260, x0: 150 },
  { name: 'かまくらの トンネル', hole: 7, theme: 'winter', camY: 580, x0: 60 },
  { name: '秋の 木・切り株', hole: 4, theme: 'autumn', camY: 840, x0: 160 }
];
for (const [i, tl] of tiles.entries()) {
  const x = 20 + (i % 6) * 236;
  const y = yG + 24 + Math.floor(i / 6) * 210;
  sheet.save();
  rr(sheet, x, y, 224, 176, 10);
  sheet.clip();
  sheet.translate(x - tl.x0, y - tl.camY);
  const v = { hole: hole(tl.hole), theme: tl.theme, camY: tl.camY, t: 0.7 };
  drawGround(sheet, v);
  drawAbove(sheet, v);
  sheet.restore();
  label(tl.name, x + 112, y + 190, 12);
}
drawStump(sheet, 0, -100, 1);

// HUD
const yH = yG + 450;
label('上の 情報欄（もくひょう ○打　いま ○打）・強さメーター', 720, yH, 19, '#3a6aa3');
sheet.save();
sheet.translate(20, yH + 20);
drawHud(sheet, hud(0, { strokes: 2, total: 1 }));
sheet.restore();
sheet.save();
sheet.translate(520, yH + 20);
drawHud(sheet, hud(2, { holeNo: 3, strokes: 7, total: 19, viewing: true }));
sheet.restore();
sheet.save();
sheet.translate(1000 - 130, yH + 20 - 580);
sheet.beginPath();
sheet.rect(130, 580, 480, 60);
sheet.clip();
sheet.fillStyle = '#5e9f4c';
sheet.fillRect(130, 580, 480, 60);
drawPowerMeter(sheet, 0.95, false);
sheet.restore();
label('ふつう（あと ○打）', 260, yH + 84, 12);
label('目標を こえた・コースをみる 中・あと 1打', 760, yH + 84, 12);
label('思いきり（赤）', 1240, yH + 84, 12);
sheet.save();
sheet.translate(20, yH + 100);
sheet.fillStyle = '#86c65a';
rr(sheet, 0, 0, 460, 90, 10);
sheet.fill();
for (const [i, p] of [0.15, 0.55, 0.97].entries()) drawAimGuide(sheet, 70 + i * 150, 70, -Math.PI / 2 + 0.4, p, false);
drawAimGuide(sheet, 420, 50, 0, 0, true);
sheet.restore();
label('ガイド線（弱い ／ 中くらい ／ 思いきり ／ 少しだけ 引いた＝やめる）', 250, yH + 206, 12);
sheet.save();
sheet.translate(500, yH + 100);
drawResultWord(sheet, 'バーディ！', 1, true);
sheet.restore();
sheet.save();
sheet.translate(500, yH + 30);
sheet.restore();
label('結果の 文字', 740, yH + 206, 12);
stars(sheet, 1150, yH + 150, 2, 16);
label('★（コースの 合計打数で 決まる）', 1150, yH + 206, 12);

// コース全体
const yC = yH + 240;
label('3つの コースの 背景 と 9ホールの 全体図（左から 1-1 … 3-3。縮小）', 720, yC, 19, '#3a6aa3');
const k = 0.31;
for (let i = 0; i < 9; i++) {
  const hl = hole(i);
  const x = 20 + i * 156;
  const y = yC + 24;
  sheet.save();
  sheet.translate(x, y);
  sheet.scale(k, k);
  sheet.beginPath();
  sheet.rect(0, 0, WIDTH, hl.h);
  sheet.clip();
  drawCourseAll(sheet, { hole: hl, theme: THEME[i]!, camY: 0, t: 0.5, viewH: hl.h });
  drawFlag(sheet, hl.cup.x, hl.cup.y, 0.5, 0.15, '#ff6f98', (i % 3) + 1);
  drawBall(sheet, hl.tee.x, hl.tee.y, 0, 0, undefined, THEME[i] === 'winter' ? 'orange' : 'white');
  sheet.restore();
  label(`${Math.floor(i / 3) + 1}-${(i % 3) + 1} パー${hl.par}`, x + 78, y + hl.h * k + 14, 13);
  label(hl.name, x + 78, y + hl.h * k + 32, 12, '#6a5a52');
}
void HUD_H;
