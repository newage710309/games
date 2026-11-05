import { HEIGHT, HUD_H, RING_R, RING_START_R, USU_X, USU_Y, WIDTH } from './constants';
import { drawDemo } from './demo';
import { isTouchDevice } from './device';
import { PAUSE_MENU, SNOWMEN, type Button, type Game, type Phase } from './game';
import { drawSakura } from './sakura';
import { drawHud, drawJudge, drawPlayScene, drawSparkleBurst, drawStar, say, type SakuraPose } from './scene';
import type { Trick } from './stages';
import { drawTitleScreen } from './title';
import { COLOR, blink, outlinedText, rr, text } from './ui';

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  switch (game.phase) {
    case 'title':
      drawTitleScreen(ctx, game.time, game.hiScore);
      return;
    case 'demo':
      drawDemo(ctx, game.stageIndex === 0 ? 'break1' : 'break2', game.phaseTime, game.phaseTime > 1);
      return;
    case 'ending':
      drawDemo(ctx, 'ending', game.phaseTime, game.phaseTime > 1.5);
      return;
    case 'result':
      drawResult(ctx, game);
      return;
    default:
      break;
  }

  const phase: Phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const now = game.now();
  drawPlayfield(ctx, game, phase, now);
  if (phase === 'ready') drawReady(ctx, game);
  if (phase === 'playing') drawLesson(ctx, game);
  if (phase === 'stageClear') drawStageClear(ctx, game);
  if (phase === 'buried') drawBuriedSpeech(ctx, game);
  if (game.phase === 'gameover') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

/** 3 回目のミスのあと、おもちに目が出る時刻と、クマが「あっ」と止まる時刻。 */
const EYES_T = 0.25;
const NOTICE_T = 1.25;

/** 埋まってからの、クマの杵の動き：気づかず振り上げて、つこうとして、あっと止まる。 */
function buriedLift(t: number): number {
  if (t < NOTICE_T - 0.3) return 0.2 + 0.85 * Math.min(1, t / 0.5);
  if (t < NOTICE_T) return 1.05 - ((t - (NOTICE_T - 0.3)) / 0.3) * 0.3;
  return 0.75 + Math.sin(Math.min(1, (t - NOTICE_T) / 0.2) * Math.PI) * 0.05;
}

function drawPlayfield(ctx: CanvasRenderingContext2D, game: Game, phase: Phase, now: number): void {
  const buried = phase === 'buried' || phase === 'gameover';
  const buriedT = phase === 'gameover' ? 9 : game.phaseTime;
  const flipping = game.flipT < 0.24;
  const worried = game.isGrinning(now) || game.worryT < 0.8;

  let pose: SakuraPose = 'idle';
  if (phase === 'stageClear') pose = 'happy';
  else if (game.dizzyT < 0.9) pose = 'dizzy';
  else if (flipping) pose = 'flip';
  else if (worried) pose = 'worry';

  const rings = phase === 'playing' ? game.rings(now) : [];
  const radius = (p: number): number => RING_R + (RING_START_R - RING_R) * p;
  const [r1, r2] = rings;
  const flash = game.flashT < 0.22 ? 1 - game.flashT / 0.22 : 0;
  const since = game.sinceStrike(now);
  const ball = phase === 'playing' ? game.snowball(now) : null;

  let face = game.bearFace(now);
  if (buried) face = buriedT > NOTICE_T ? 'shock' : 'normal';

  drawPlayScene(ctx, {
    stage: game.stageIndex + 1,
    t: game.time,
    shake: game.shake,
    bear: {
      lift: buried ? buriedLift(buriedT) : phase === 'stageClear' ? 0.9 : game.liftAt(now),
      face,
      sweat: (buried && buriedT > NOTICE_T) || game.bonkT < 1,
      bob: game.exciteT < 1.5 && !buried ? Math.sin(game.time * 16) * 3 : 0
    },
    mochi: {
      done: game.doneness,
      shine: phase === 'stageClear' ? Math.max(0.5, game.ratio) : game.shineLevel,
      squash: since >= 0 && since < 0.16 ? 1 - since / 0.16 : flipping ? -0.25 * Math.sin((game.flipT / 0.24) * Math.PI) : 0,
      tilt: flipping ? -0.1 * Math.sin((game.flipT / 0.24) * Math.PI) : 0
    },
    sakura: {
      pose,
      stuck: game.stuck,
      flip: flipping ? game.flipT / 0.24 : 0,
      gone: buried,
      peek: buried && buriedT > EYES_T
    },
    ring: r1 ? { now: radius(r1.p), kind: r1.kind, flash } : flash > 0 ? { now: null, flash } : undefined,
    ring2: r2 ? { now: radius(r2.p), kind: r2.kind } : undefined,
    snowball: ball ?? undefined,
    snowBits: game.snowBitsT < 0.5 ? { ...game.snowBitsAt, p: game.snowBitsT / 0.5 } : undefined,
    snowmen:
      game.stageIndex === 2
        ? SNOWMEN.map((m, i) => ({ ...m, hop: game.time * 0.4 + i * 0.3 + game.snowmanHop(i, now), sweat: game.snowBitsT < 0.8 }))
        : undefined,
    hit: !buried && game.hitT < 0.3 ? game.hitT / 0.3 : undefined,
    crowd: phase === 'stageClear' ? 1 : game.exciteT < 1.5 ? 1 : 0
  });

  if (game.sparkT < 0.45) drawSparkleBurst(ctx, USU_X, USU_Y - 20, game.sparkT / 0.45);
  if (game.exciteT < 1.4) outlinedText(ctx, 'のってきた！', 132, 250, 28, '#ffe38a', '#a0301f');
  if (game.isGrinning(now) && phase === 'playing') say(ctx, 'ニヤッ', 262, 292, 335, 345, 18);
  if (game.pop) drawJudge(ctx, game.pop.text, game.pop.t / 0.7, game.pop.color, game.pop.outline, game.pop.size);

  drawHud(ctx, {
    stage: game.stageIndex + 1,
    left: game.left,
    score: game.score,
    hiScore: game.hiScore,
    stuck: game.stuck,
    chain: game.chain,
    combo: game.combo
  });
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, y, WIDTH, h);
}

const HINTS: [string, string][] = [
  ['クマが ぺったん → はいっ！で タップ', '輪が 的に かさなる ときが ぴったり'],
  ['ぺたぺたっ は 2かい タップ', 'よそ見のときは 音と リズムで'],
  ['雪玉は 拍の あいまに はじく', 'はやくなっても あわてないで']
];

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  const [h1, h2] = HINTS[game.stageIndex]!;
  banner(ctx, 96, 150);
  text(ctx, `${game.stageIndex + 1}うすめ ${game.stage.name}`, WIDTH / 2, 124, 26, COLOR.ink, true);
  text(ctx, `${game.left}かい ついて おもちを しあげよう`, WIDTH / 2, 156, 15, '#ffe38a', true);
  text(ctx, h1, WIDTH / 2, 184, 13, COLOR.ink, true);
  text(ctx, h2, WIDTH / 2, 204, 13, COLOR.ink, true);
  if (game.stageIndex === 0) text(ctx, isTouchDevice() ? 'どこでも タップ' : 'クリック か スペース', WIDTH / 2, 228, 13, COLOR.pink, true);
}

const LESSON_TEXT: Record<Trick, [string, string]> = {
  feint: ['フェイント！', 'ニヤッとしたら タップしない'],
  fast: ['はやつき！', 'ぺたぺたっ で すばやく 2かい'],
  away: ['ふりむき！', '輪が うすい。音と リズムで'],
  snow: ['雪玉の じゃま！', '飛んできたら タップで はじく']
};

/** はじめてのいたずらの、お手本の説明。 */
function drawLesson(ctx: CanvasRenderingContext2D, game: Game): void {
  const l = game.lesson;
  if (l === null) return;
  const [a, b] = LESSON_TEXT[l.trick];
  ctx.fillStyle = 'rgba(10,18,38,0.85)';
  rr(ctx, 12, 84, 276, 72, 12);
  ctx.fill();
  text(ctx, a, 150, 106, 20, '#ffe38a', true);
  text(ctx, b, 150, 134, 14, COLOR.ink, true);
  text(ctx, 'おてほん', 150, 170, 12, 'rgba(30,40,70,0.75)', true);
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, size = 22): void {
  for (let k = 0; k < 3; k++) {
    const got = k < n;
    const big = k === 1 ? 1.18 : 1;
    drawStar(
      ctx,
      x + (k - 1) * size * 2.35,
      y - (k === 1 ? size * 0.25 : 0),
      size * big,
      got ? '#ffd84a' : 'rgba(255,255,255,0.2)',
      got ? '#a8761a' : 'rgba(255,255,255,0.5)'
    );
  }
}

const FINISH = ['ふつうの おもち', 'つやのある おもち', 'つやつやの おもち'];

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  banner(ctx, 80, 210);
  outlinedText(ctx, `${game.stageIndex + 1}うすめ つきあがり！`, WIDTH / 2, 112, 26, '#fff4c2', '#5a3a1e');
  drawStars(ctx, WIDTH / 2, 158, game.stars);
  text(ctx, `ぴったり ${Math.round(game.ratio * 100)}% … ${FINISH[game.stars - 1]}`, WIDTH / 2, 200, 14, COLOR.ink, true);
  text(ctx, `めんクリア ${game.stageBonus}てん`, WIDTH / 2, 222, 13, COLOR.ink, true);
  text(
    ctx,
    game.noMissBonus > 0 ? `ノーミス！ ${game.noMissBonus.toLocaleString('en-US')}てん` : `ミス ${game.misses}かい`,
    WIDTH / 2,
    242,
    13,
    game.noMissBonus > 0 ? '#ffe38a' : COLOR.muted,
    true
  );
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, 'タップで つぎへ', WIDTH / 2, 270, 12, COLOR.muted, true);
}

function drawBuriedSpeech(ctx: CanvasRenderingContext2D, game: Game): void {
  if (game.phaseTime > NOTICE_T) say(ctx, 'あっ', 276, 288, 346, 340, 22);
  else if (game.phaseTime < 0.9) outlinedText(ctx, 'おもちに うまった！', WIDTH / 2 - 20, 250, 24, '#ffffff', '#7a1f18');
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(15,23,48,0.94)';
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,12,26,0.45)';
  ctx.fillRect(0, HUD_H, WIDTH, HEIGHT - HUD_H);
  panel(ctx, 40, 90, 400, 240);
  outlinedText(ctx, 'おもちと まちがえられた…', WIDTH / 2, 126, 24, '#ffffff', '#b8483e');
  text(ctx, `${game.stageIndex + 1}うすめ ・ のこり ${game.left}かい`, WIDTH / 2, 164, 14, COLOR.ink, true);
  text(ctx, 'てんすう', WIDTH / 2, 196, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 228, 32, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 266, 15, '#ffd84a', true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, 'タップで タイトルへ', WIDTH / 2, 302, 14, COLOR.muted, true);
}

function drawResult(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 50, 80, 380, 460);
  text(ctx, 'けっか', WIDTH / 2, 112, 16, COLOR.muted, true);
  outlinedText(ctx, '3うす つきあがり！', WIDTH / 2, 150, 28, '#ffd84a', '#5a3a1e');
  drawSakura(ctx, WIDTH / 2, 216, { scale: 2.4, eyes: 'happy' });
  for (const [i, n] of game.starLog.entries()) {
    const y = 288 + i * 34;
    text(ctx, `${i + 1}うすめ`, WIDTH / 2 - 92, y, 15, COLOR.ink, true);
    drawStars(ctx, WIDTH / 2 + 34, y + 1, n, 11);
  }
  text(ctx, 'てんすう', WIDTH / 2, 402, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 432, 36, COLOR.ink, true);
  text(ctx, `ぴったり ${game.totalPerfects}かい`, WIDTH / 2, 468, 14, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 494, 15, '#ffd84a', true);
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 520, 12, COLOR.muted, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, 'タップで タイトルへ', WIDTH / 2, 576, 15, COLOR.ink, true);
}

function button(ctx: CanvasRenderingContext2D, b: Button, label: string, primary = false): void {
  ctx.fillStyle = primary ? COLOR.accent : COLOR.panel;
  ctx.strokeStyle = primary ? '#ffd0de' : COLOR.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, 17, primary ? '#2a0f1a' : COLOR.ink, true);
}

function drawPaused(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,12,26,0.7)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  text(ctx, 'ポーズ', WIDTH / 2, 206, 28, COLOR.ink, true);
  button(ctx, PAUSE_MENU.resume, 'つづける', true);
  button(ctx, PAUSE_MENU.sound, game.muted ? 'おと：OFF' : 'おと：ON');
  button(ctx, PAUSE_MENU.title, 'タイトルへ');
}

