import { isTouchDevice } from './device';
import {
  DEPART_TIME,
  PAUSE_MENU,
  READY_TIME,
  type Button,
  type Game
} from './game';
import { drawAnimal, type AnimalKind } from './guests';
import { drawAnimalBack } from './guestsBack';
import { drawSakura } from './sakura';
import { drawSnowGuest } from './snowman';
import {
  DOOR_X,
  GUEST_SCALE,
  HEIGHT,
  WIDTH,
  drawBench,
  drawFooter,
  drawGranny,
  drawHud,
  drawStaff,
  drawStation,
  drawTapMark,
  drawTrain,
  grannyPos,
  proj,
  slotPos,
  trainName,
  yukimaruPos,
  type StaffPose
} from './station';
import { DANGER_TIME, GRANNY_STAY, MAX_IN_LINE, TRAINS, YUKIMARU_RUN } from './trains';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const ease = (v: number): number => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  switch (game.phase) {
    case 'title':
      drawTitleScreen(ctx, game.time, game.hiScore);
      return;
    case 'clear':
      drawClearScreen(ctx, game.phaseTime);
      if (game.phaseTime > 1.5 && blink(game.phaseTime, 1)) {
        text(ctx, 'タップで つぎへ', WIDTH / 2, HEIGHT - 22, 13, 'rgba(255,255,255,0.8)', true);
      }
      return;
    case 'result':
      drawResult(ctx, game);
      return;
    default:
      break;
  }

  drawPlatform(ctx, game);

  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  if (phase === 'ready') drawReady(ctx, game);
  if (phase === 'depart') drawDepart(ctx, game);
  if (game.phase === 'miss' && game.phaseTime > 0.5) drawMissCaption(ctx, game);
  if (game.phase === 'gameover') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

/** 電車の位置（入ってくる・発車する）とドアの開き具合。 */
function trainState(game: Game): { open: number; dx: number } {
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const t = game.phaseTime;
  if (phase === 'ready') {
    const arrive = ease(t / 1.4);
    return { dx: (1 - arrive) * -560, open: clamp01((t - 1.5) / 0.4) };
  }
  if (phase === 'depart') {
    const go = Math.max(0, t - 0.9);
    return { dx: go * go * 160, open: 1 - clamp01(t / 0.4) };
  }
  return { dx: 0, open: 1 };
}

function drawPlatform(ctx: CanvasRenderingContext2D, game: Game): void {
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const t = game.time;
  drawStation(ctx, t);
  const ts = trainState(game);
  drawTrain(ctx, ts.open, ts.dx);

  // 車内に押しこまれていくお客さん
  for (const e of game.entering) {
    if (e.t < 0) continue;
    const p = slotPos(e.door, 0);
    const k = e.t / 0.3;
    drawAnimalBack(ctx, p.x, p.y - k * 50, e.kind, { scale: GUEST_SCALE * (1 - k * 0.2), alpha: 1 - k });
  }

  // おばあちゃんのベンチ
  const gp = grannyPos();
  drawBench(ctx, gp.x, gp.y + 2);
  drawGrannyNow(ctx, game);

  // 列のお客さんと、さくらちゃんを足元の y の順に描く
  const items: { y: number; draw: () => void }[] = [];
  for (const [i, col] of game.cols.entries()) {
    for (const [j, p] of col.entries()) {
      const pos = slotPos(i, j);
      // あぶない！の最中、ホームの端の 5 人目はぐらぐら
      const teeter = game.danger[i]! >= 0 && j === MAX_IN_LINE - 1;
      const shake = p.shake > 0 ? Math.sin(p.shake * 60) * 3 : teeter ? Math.sin(t * 38) * 3.5 : 0;
      const hop = phase === 'playing' ? (t * 1.3 + p.id * 0.37) % 1 : 0;
      items.push({
        y: pos.y,
        draw: () => {
          drawAnimalBack(ctx, pos.x + shake, pos.y, p.kind, { scale: GUEST_SCALE, hop: p.shake > 0 ? 0 : hop * 0.4 });
          if (p.luggage) drawLuggage(ctx, pos.x + shake, pos.y, GUEST_SCALE);
        }
      });
    }
  }
  const pose = staffPose(game);
  items.push({ y: game.staffY + 16, draw: () => drawStaff(ctx, game.staffX, game.staffY - 20, pose) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  // 4 人並んだ列は「あぶない！」、5 人目がホームの端に着いたら大きく「あぶない！！」（押しこめばセーフ）
  if (phase === 'playing') {
    for (const [i, col] of game.cols.entries()) {
      const d = game.danger[i]!;
      if (d >= 0) {
        const p = slotPos(i, MAX_IN_LINE - 1);
        ctx.strokeStyle = blink(t, 6) ? '#ff3b3b' : '#ffd84a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 2, 42, 15, 0, 0, Math.PI * 2);
        ctx.stroke();
        const s = 1 + Math.sin(t * 20) * 0.08;
        outlinedText(ctx, 'あぶない！！', p.x, p.y + 42, Math.round(22 * s), '#ffffff', '#d63a3e');
        // 残り時間のゲージ
        const k = 1 - Math.min(1, d / DANGER_TIME);
        ctx.fillStyle = 'rgba(20,20,30,0.6)';
        rr(ctx, p.x - 30, p.y + 60, 60, 7, 3);
        ctx.fill();
        ctx.fillStyle = '#ff5a5a';
        rr(ctx, p.x - 30, p.y + 60, 60 * k, 7, 3);
        ctx.fill();
        continue;
      }
      if (col.length !== MAX_IN_LINE - 1 || !blink(t, 2.5)) continue;
      const p = slotPos(i, MAX_IN_LINE - 1);
      outlinedText(ctx, 'あぶない！', p.x, p.y - 16, 16, '#ffffff', '#d63a3e');
    }
    // 画面のふちを赤く点滅
    if (game.danger.some((d) => d >= 0) && blink(t, 4)) {
      ctx.strokeStyle = 'rgba(255,60,60,0.55)';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 45, WIDTH - 10, HEIGHT - 76);
    }
  }
  // アウトになった列
  if ((phase === 'miss' || phase === 'gameover') && game.missDoor >= 0) {
    const p = slotPos(game.missDoor, MAX_IN_LINE - 1);
    ctx.strokeStyle = '#d63a3e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 40, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawYukimaruNow(ctx, game);
  if (game.tapMark !== null) drawTapMark(ctx, game.tapMark.x, game.tapMark.y, game.tapMark.t / 0.45);

  for (const p of game.pops) {
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, p.t - 0.6) / 0.3;
    outlinedText(ctx, p.text, p.x, p.y - p.t * 36, 18, '#ffe38a', '#6a3a20');
    ctx.restore();
  }

  drawHud(ctx, {
    score: game.score,
    hiScore: game.hiScore,
    train: game.trainIndex + 1,
    depart: phase === 'depart' ? 1 : game.departProgress,
    timeLeft: phase === 'depart' ? 0 : game.timeLeft
  });
  // 時間になったら、残りのお客さんを押しこめば発車
  if (phase === 'playing' && game.closing) {
    outlinedText(ctx, 'ドアが しまるよ！ のこりを おしこもう', WIDTH / 2, 64, 15, '#ffffff', '#2f4a86');
  }
  drawFooter(ctx);
}

function staffPose(game: Game): StaffPose {
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  if (phase === 'miss' || phase === 'gameover') return 'shock';
  if (phase === 'depart') return 'happy';
  if (phase === 'ready') return 'stand';
  if (game.lane < 0) return game.granny !== null && game.granny.thanked > 0 ? 'help' : 'stand';
  if (!game.arrived) return 'wait';
  return game.pushAnim < 0.15 ? 'push' : 'wait';
}

function drawGrannyNow(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = game.granny;
  if (g === null) return;
  const p = grannyPos();
  const fadeIn = clamp01(g.t / 0.4);
  ctx.save();
  ctx.globalAlpha = g.thanked > 0 ? 1 - clamp01((g.thanked - 0.7) / 0.5) : fadeIn;
  const missFake = (game.phase === 'miss' || game.phase === 'gameover') && game.missReason === 'fake';
  if (g.fake && (g.facing || missFake)) {
    drawSnowGuest(ctx, p.x, p.y, 'granny', { scale: 2.1, hop: (game.time * 0.8) % 1, sweat: missFake });
    if (!missFake && g.t > 1) outlinedText(ctx, 'ふらふら…', p.x, p.y - 96, 12, '#ffffff', '#6a4a80');
  } else {
    // 向こうを向いているときは、本物もへんそうも同じ後ろ姿（見分けられない）
    drawGranny(ctx, p.x, p.y, {
      away: !g.facing && g.thanked === 0,
      wobble: g.thanked > 0 ? 0 : clamp01(0.3 + (g.t / GRANNY_STAY) * 0.9),
      time: game.time,
      happy: g.thanked > 0
    });
  }
  ctx.restore();
  if (g.thanked > 0 && g.thanked < 1) outlinedText(ctx, 'ありがとうね', p.x + 44, p.y - 124, 13, '#ffffff', '#6a4a80');
}

function drawYukimaruNow(ctx: CanvasRenderingContext2D, game: Game): void {
  if (game.yukimaru !== null) {
    const p = yukimaruPos(game.yukimaru / YUKIMARU_RUN);
    const flap = 0.3 + Math.abs(Math.sin(game.time * 14)) * 0.5;
    drawSakura(ctx, p.x, p.y - 20 - Math.abs(Math.sin(game.time * 10)) * 4, {
      view: 'left',
      bird: 'yukimaru',
      scale: 2.2,
      flap
    });
    ctx.strokeStyle = 'rgba(120,140,170,0.8)';
    ctx.lineWidth = 2;
    for (const dy of [-26, -14, -2]) {
      ctx.beginPath();
      ctx.moveTo(p.x + 40, p.y + dy);
      ctx.lineTo(p.x + 62, p.y + dy);
      ctx.stroke();
    }
    outlinedText(ctx, 'まって〜！', p.x, p.y - 70, 15, '#ffffff', '#3a6aa3');
  }
  const b = game.yukimaruBoard;
  if (b !== null) {
    // 近いドアへぴょんと飛びこむ
    let door = 0;
    for (const [i, x] of DOOR_X.entries()) if (Math.abs(x - b.x) < Math.abs(DOOR_X[door]! - b.x)) door = i;
    const to = slotPos(door, 0);
    const k = ease(b.t / 0.6);
    const x = b.x + (to.x - b.x) * k;
    const y = b.y + (to.y - 50 - b.y) * k - Math.sin(k * Math.PI) * 60;
    ctx.save();
    ctx.globalAlpha = 1 - clamp01((b.t - 0.5) / 0.3);
    drawSakura(ctx, x, y - 20, { bird: 'yukimaru', scale: 2.2, eyes: 'happy' });
    ctx.restore();
  }
}

/** 大荷物（背負った大きなリュック）。後ろ姿のお客さんの上に重ねて、背中に背負っているように見せる。 */
export function drawLuggage(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#b8483e';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1;
  rr(ctx, -15, -44, 30, 32, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a3028';
  rr(ctx, -10, -30, 20, 10, 3);
  ctx.fill();
  ctx.fillStyle = '#f4f0e6';
  ctx.beginPath();
  ctx.ellipse(0, -46, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fillRect(0, y, WIDTH, h);
}

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.phaseTime;
  banner(ctx, 330, 120);
  text(ctx, trainName(game.trainIndex), WIDTH / 2, 362, 30, COLOR.ink, true);
  text(ctx, `${TRAINS[game.trainIndex]!.time}びょう がんばったら はっしゃ`, WIDTH / 2, 396, 14, COLOR.muted, true);
  text(ctx, t < READY_TIME - 0.6 ? 'でんしゃが きたよ…' : 'はじめ！', WIDTH / 2, 426, 18, COLOR.pink, true);
  if (game.trainIndex === 0 && game.score === 0) {
    const how = isTouchDevice() ? 'れつを タップで いどう・おしこみは じどう' : 'れつを クリック か ← → で いどう・おしこみは じどう';
    banner(ctx, 460, 34);
    text(ctx, how, WIDTH / 2, 477, 13, COLOR.ink, true);
  }
}

function drawDepart(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.phaseTime;
  const a = ease((t - 0.3) / 0.4) * (1 - clamp01((t - DEPART_TIME + 0.4) / 0.4));
  ctx.save();
  ctx.globalAlpha = a;
  outlinedText(ctx, `${trainName(game.trainIndex)} はっしゃ！`, WIDTH / 2, 370, 28, '#ffffff', '#2f4a86');
  outlinedText(ctx, 'ボーナス +500', WIDTH / 2, 410, 20, '#ffe38a', '#6a3a20');
  ctx.restore();
}

function missText(game: Game): [string, string] {
  return game.missReason === 'fake'
    ? ['おばあちゃんじゃ なかった！', 'ゆきだるまの へんそうに だまされちゃった…']
    : ['ホームの はしまで きちゃった！', 'おきゃくさんが あふれちゃった…'];
}

function drawMissCaption(ctx: CanvasRenderingContext2D, game: Game): void {
  const [head] = missText(game);
  outlinedText(ctx, head, WIDTH / 2, 210, 24, '#ffffff', '#b8483e');
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
  panel(ctx, 30, 170, 420, 270);
  const [head, sub] = missText(game);
  outlinedText(ctx, head, WIDTH / 2, 208, 24, '#ffffff', '#b8483e');
  text(ctx, sub, WIDTH / 2, 246, 14, COLOR.ink, true);
  text(ctx, `${trainName(game.trainIndex)} ・ ${game.pushedTotal}にん のせた`, WIDTH / 2, 280, 13, COLOR.muted, true);
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
  drawStaff(ctx, WIDTH / 2, 262, 'happy', 2.6);
  text(ctx, 'てんすう', WIDTH / 2, 330, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 360, 36, COLOR.ink, true);
  text(ctx, `${game.pushedTotal}にん のせた`, WIDTH / 2, 398, 15, COLOR.ink, true);
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

// --- エンディング・タイトル ----------------------------------------------------

/** エンディング：3 本とも発車。 */
export function drawClearScreen(ctx: CanvasRenderingContext2D, t: number): void {
  drawStation(ctx, t);
  const go = Math.max(0, t - 0.4);
  drawTrain(ctx, 0, 120 + go * go * 120);
  ctx.fillStyle = 'rgba(10,18,38,0.35)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const a = ease((t - 0.8) / 0.8);
  ctx.save();
  ctx.globalAlpha = a;
  outlinedText(ctx, '3ぼん ぜんぶ', WIDTH / 2, 200, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'はっしゃ おーらい！', WIDTH / 2, 246 + (1 - a) * 10, 32, '#ffe38a', '#b8483e');
  text(ctx, 'みんな ゆきまつりに まにあったね！', WIDTH / 2, 290, 15, '#ffffff', true);
  ctx.restore();
  const p = proj(WIDTH / 2, 470);
  drawStaff(ctx, p.x, p.y, t > 2 ? 'happy' : 'stand', 3);
  const enter = ease((t - 1.6) / 0.6);
  if (enter > 0) {
    ctx.save();
    ctx.globalAlpha = enter;
    drawGranny(ctx, p.x - 110, p.y + 40, { happy: true, scale: 2.2 });
    drawSakura(ctx, p.x + 110, p.y + 20 - Math.abs(Math.sin(t * 5)) * 8, { bird: 'yukimaru', scale: 2.2, eyes: 'happy' });
    ctx.restore();
  }
  // 手をふるお客さん（窓の外へ）
  const kinds: AnimalKind[] = ['karasu', 'risu', 'kitsune', 'usagi', 'momonga'];
  for (const [i, k] of kinds.entries()) {
    const e = ease((t - 2.4 - i * 0.2) / 0.5);
    if (e <= 0) continue;
    drawAnimal(ctx, 60 + i * 90, 600, k, { scale: 1.4, mood: 'happy', hop: (t * 1.5 + i * 0.3) % 1, alpha: e });
  }
  drawSnowfall(ctx, t, HEIGHT, 30);
}

export function drawTitleScreen(ctx: CanvasRenderingContext2D, t: number, hiScore: number): void {
  drawStation(ctx, t);
  drawTrain(ctx, 1);
  const cols: AnimalKind[][] = [['karasu', 'usagi'], ['risu', 'kitsune', 'momonga'], ['yamagara']];
  for (const [i, col] of cols.entries()) {
    for (const [j, k] of col.entries()) {
      const p = slotPos(i, j);
      drawAnimalBack(ctx, p.x, p.y, k, { scale: GUEST_SCALE, hop: (t * 1.3 + i + j * 0.3) % 1 * 0.4 });
    }
  }
  ctx.fillStyle = 'rgba(10,18,38,0.45)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 40, 60, 400, 120, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.88)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 96, 24, '#ffffff', '#2a3668');
  outlinedText(ctx, 'ぎゅうぎゅうでんしゃ', WIDTH / 2, 142, 34, '#f8c3d2', '#8a2f52');
  drawStaff(ctx, WIDTH / 2, 470, 'happy', 3.2);
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 42, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 16, 12, COLOR.muted, true);
}
