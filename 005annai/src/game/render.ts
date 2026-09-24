import { HEIGHT, SAKURA_Y, WIDTH } from './constants';
import { drawLeaver, drawQueue } from './crowd';
import { drawDemo } from './demo';
import { isTouchDevice } from './device';
import { PAUSE_MENU, READY_TIME, missMessage, type Button, type Game } from './game';
import { drawAnimal } from './guests';
import {
  drawCounter,
  drawField,
  drawFooter,
  drawGuide,
  drawHud,
  drawPop,
  type GuidePose
} from './scene';
import { drawSnowGuest } from './snowman';
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

  drawPlayfield(ctx, game);

  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  if (phase === 'ready') drawReady(ctx, game);
  if (phase === 'stageClear') drawStageClear(ctx, game);
  if (game.phase === 'miss' && game.phaseTime > 0.9) drawMissCaption(ctx, game);
  if (game.phase === 'gameover') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

function drawPlayfield(ctx: CanvasRenderingContext2D, game: Game): void {
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const moving = phase === 'playing';
  const missed = phase === 'miss' || phase === 'gameover';
  drawField(ctx, game.time);
  drawQueue(ctx, game.queue, game.front, game.walked, moving, missed && game.missReason === 'timeout');
  drawCounter(ctx, moving && game.front < 0.7 ? (blink(game.time, 3) ? 1 : 0.4) : 0);
  for (const l of game.leavers) drawLeaver(ctx, l);

  let pose: GuidePose = 'idle';
  if (missed) pose = 'shock';
  else if (phase === 'stageClear') pose = 'happy';
  else if (game.poseTime > 0) pose = game.poseDir === 'up' ? 'no' : game.poseDir;
  drawGuide(ctx, game.sakuraX, SAKURA_Y, pose, moving && pose === 'idle' ? game.time : 0);

  for (const p of game.pops) {
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, p.t - 0.5) / 0.3;
    drawPop(ctx, p.text, p.x, p.y - p.t * 40);
    ctx.restore();
  }
  drawHud(ctx, {
    stage: game.stageIndex + 1,
    timeLeft: game.timeLeft,
    guestsLeft: game.guestsLeft,
    score: game.score,
    hiScore: game.hiScore
  });
  drawFooter(ctx);
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fillRect(0, y, WIDTH, h);
}

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.phaseTime;
  const s = game.stage;
  banner(ctx, 250, 130);
  text(ctx, `${game.stageIndex + 1}めん`, WIDTH / 2, 282, 30, COLOR.ink, true);
  const goal = s.count !== undefined ? `${s.count}にん あんないしたら ゴール` : `${s.time}びょう がんばろう`;
  text(ctx, goal, WIDTH / 2, 316, 14, COLOR.muted, true);
  text(ctx, t < READY_TIME - 0.8 ? 'よーい…' : 'はじめ！', WIDTH / 2, 352, 20, COLOR.pink, true);
  if (game.stageIndex === 0 && game.score === 0) {
    const how = isTouchDevice() ? 'スワイプで あんない' : 'スワイプ か やじるしキー で あんない';
    banner(ctx, 392, 36);
    text(ctx, how, WIDTH / 2, 410, 14, COLOR.ink, true);
  }
}

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  banner(ctx, 250, 110);
  const last = game.stage.count !== undefined;
  outlinedText(ctx, last ? 'ぜんいん あんない！' : 'おしまい！', WIDTH / 2, 286, 26, '#fff4c2', '#5a3a1e');
  text(ctx, `${game.stageIndex + 1}めん クリア ・ ${game.stageGuided}にん あんないした`, WIDTH / 2, 326, 15, COLOR.ink, true);
}

function drawMissCaption(ctx: CanvasRenderingContext2D, game: Game): void {
  if (game.missGuest === null) return;
  const [head] = missMessage(game.missGuest, game.missReason);
  outlinedText(ctx, head, WIDTH / 2, 250, 26, '#ffffff', '#b8483e');
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
  ctx.fillStyle = 'rgba(8,12,26,0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 40, 170, 400, 270);
  if (game.missGuest !== null) {
    const [head, sub] = missMessage(game.missGuest, game.missReason);
    outlinedText(ctx, head, WIDTH / 2, 208, 26, '#ffffff', '#b8483e');
    text(ctx, sub, WIDTH / 2, 246, 14, COLOR.ink, true);
  }
  text(ctx, `${game.stageIndex + 1}めん ・ ${game.guided}にん あんないした`, WIDTH / 2, 280, 13, COLOR.muted, true);
  text(ctx, 'てんすう', WIDTH / 2, 308, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 338, 32, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 376, 15, '#ffd84a', true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) {
    text(ctx, 'タップで タイトルへ', WIDTH / 2, 414, 14, COLOR.muted, true);
  }
}

function drawResult(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 50, 110, 380, 400);
  text(ctx, 'けっか', WIDTH / 2, 146, 16, COLOR.muted, true);
  outlinedText(ctx, 'ぜんぶ クリア！', WIDTH / 2, 186, 28, '#ffd84a', '#5a3a1e');
  drawGuide(ctx, WIDTH / 2, 262, 'happy', 0, 2.6);
  text(ctx, 'てんすう', WIDTH / 2, 330, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 360, 36, COLOR.ink, true);
  text(ctx, `${game.guided}にん あんないした`, WIDTH / 2, 398, 15, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 436, 15, '#ffd84a', true);
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 470, 12, COLOR.muted, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) {
    text(ctx, 'タップで タイトルへ', WIDTH / 2, 560, 15, COLOR.ink, true);
  }
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

// --- タイトル ----------------------------------------------------------------

export function drawTitleScreen(ctx: CanvasRenderingContext2D, t: number, hiScore: number): void {
  drawField(ctx, t);
  ctx.fillStyle = 'rgba(10,18,38,0.45)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 40, 70, 400, 120, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 104, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'あんないがかり', WIDTH / 2, 150, 40, '#f8c3d2', '#8a2f52');
  drawGuide(ctx, WIDTH / 2, 290, 'idle', t, 3.4);
  const hop = (t * 1.2) % 1;
  drawAnimal(ctx, 110, 430, 'shimaenaga', { scale: 1.8, hop });
  drawSnowGuest(ctx, 240, 450, 'none', { scale: 1.8, hop: (t * 0.5) % 1 });
  drawAnimal(ctx, 370, 430, 'kitsune', { scale: 1.8, hop: (hop + 0.5) % 1 });
  text(ctx, '← とり', 110, 460, 16, '#ffffff', true);
  text(ctx, '↑ おことわり', 240, 480, 16, '#ffffff', true);
  text(ctx, 'けもの →', 370, 460, 16, '#ffffff', true);

  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 42, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 16, 12, COLOR.muted, true);
}
