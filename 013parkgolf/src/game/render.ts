// 画面の描画（場面ごと）。ゲームの状態は game.ts、コースの絵は field.ts、人物は golfer.ts / bear.ts / kitsune.ts。

import { drawBear, type BearOptions } from './bear';
import { BEAR_SCALE, FOX_SCALE, HEIGHT, HUD_H, WIDTH } from './constants';
import { drawEnding, drawDemo } from './demo';
import { isTouchDevice } from './device';
import { drawAbove, drawGround, type Theme } from './field';
import { BACK_BTN, BIG_POWER, PAUSE_MENU, TITLE_BTNS, type Button, type Game, type Phase } from './game';
import { drawBall, drawFlag, drawGolfer } from './golfer';
import { HOLES } from './holes';
import {
  drawAceBanner,
  drawAceStamp,
  drawHoleStamp,
  drawAimGuide,
  drawConfetti,
  drawHud,
  drawPauseButton,
  drawPowerMeter,
  drawResultWord,
  drawScoreCard,
  say,
  stars
} from './hud';
import { drawKitsune, type KitsuneOptions } from './kitsune';
import { drawSakura } from './sakura';
import { COURSES, coursePar, courseTarget } from './stages';
import { COLOR, blink, outlinedText, rr, text } from './ui';

const tapText = (pc: string): string => (isTouchDevice() ? 'タップで ' : `${pc}で `);
const THEMES: Theme[] = ['spring', 'autumn', 'winter'];

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const phase: Phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  switch (phase) {
    case 'title':
      drawTitle(ctx, game);
      return;
    case 'stamps':
      drawStamps(ctx, game);
      return;
    case 'card':
      drawCard(ctx, game);
      return;
    case 'demo':
      drawDemo(ctx, game.demoNo, game.phaseTime);
      if (game.phaseTime > 1.5 && blink(game.phaseTime)) text(ctx, tapText('クリック') + 'つぎの コースへ', WIDTH / 2, 622, 14, COLOR.ink, true);
      return;
    case 'gameover':
      drawGameOver(ctx, game);
      return;
    case 'ending':
      drawEnding(ctx, game.phaseTime);
      if (game.phaseTime > 1.5 && blink(game.phaseTime)) text(ctx, tapText('クリック') + 'すすむ', WIDTH / 2, 628, 12, '#ffffff', true);
      return;
    case 'final':
      drawFinal(ctx, game);
      return;
    default:
      break;
  }
  drawPlay(ctx, game, phase);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

// --- 共通 ---------------------------------------------------------------------

function button(ctx: CanvasRenderingContext2D, b: Button, label: string, primary = false, selected = false, size?: number): void {
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = primary ? '#f8c3d2' : 'rgba(18,40,28,0.9)';
  ctx.strokeStyle = selected ? '#ff6f98' : primary ? '#8a2f52' : COLOR.panelBorder;
  ctx.lineWidth = selected ? 3 : 1.6;
  ctx.fill();
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, size ?? (primary ? 19 : 15), primary ? '#2a0f1a' : COLOR.ink, true);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  rr(ctx, x, y, w, h, 16);
  ctx.fillStyle = 'rgba(18,40,28,0.92)';
  ctx.fill();
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** 仲間（クマとキツネ）を反応つきで描く。 */
function drawFriends(ctx: CanvasRenderingContext2D, game: Game, bx: number, by: number, fx: number, fy: number): void {
  const r = game.reaction;
  const t = game.reactionT;
  // 反応は 2.5 秒くらいで「見ている」にもどる（ホールのおわりはそのまま）
  const active = game.phase === 'holeEnd' || t < 2.5;
  const rr2 = active ? r : 'watch';
  const bo: BearOptions = { scale: BEAR_SCALE, noKine: true, hat: 'cap' };
  const fo: KitsuneOptions = { scale: FOX_SCALE, t: game.time };
  if (rr2 === 'clap') {
    bo.arms = 'clap';
    bo.clap = Math.abs(Math.sin(game.time * 12));
    bo.face = 'excited';
    fo.pose = 'clap';
    fo.mood = 'happy';
  } else if (rr2 === 'cover') {
    bo.arms = 'cover';
    fo.pose = 'cover';
  } else if (rr2 === 'hooray') {
    bo.cheer = 1;
    bo.face = 'excited';
    bo.bob = -Math.abs(Math.sin(game.time * 9)) * 40;
    fo.pose = 'hooray';
    fo.mood = 'happy';
  } else if (rr2 === 'shock') {
    bo.face = 'shock';
    bo.sweat = true;
  } else {
    bo.bob = Math.sin(game.time * 2) * 3;
  }
  // 奥にいるほうを先に描く
  const drawB = (): void => drawBear(ctx, bx, by, bo);
  const drawF = (): void => drawKitsune(ctx, fx, fy, fo);
  if (by < fy) {
    drawB();
    drawF();
  } else {
    drawF();
    drawB();
  }
}

// --- プレイ中 -----------------------------------------------------------------------

function drawPlay(ctx: CanvasRenderingContext2D, game: Game, phase: Phase): void {
  const hole = game.hole;
  const theme = THEMES[game.courseIndex]!;
  const v = { hole, theme, camY: game.camY, t: game.time, snowT: game.clock };
  const b = game.ball;
  const inCup = b.done === 'cup' || (phase === 'holeEnd' && !game.holeResult?.pickedUp);
  ctx.save();
  ctx.translate(0, -game.camY);
  drawGround(ctx, v);
  if (!inCup) drawBall(ctx, b.x, b.y, b.roll, 0, undefined, theme === 'winter' ? 'orange' : 'white');
  drawAbove(ctx, v);
  const wave = game.aceT !== null ? Math.max(0.2, 1.2 - game.aceT * 0.15) : 0.15;
  drawFlag(ctx, hole.cup.x, hole.cup.y, game.time, wave, '#ff6f98', game.holeIndex + 1);
  // 人物は奥（上）から順に
  const golfer = (): void => {
    if (phase === 'courseIntro' || phase === 'flyover') {
      drawGolfer(ctx, game.golferX, game.golferY, { pose: 'address', aim: game.golferAim, t: game.golferT });
      return;
    }
    if (phase === 'holeEnd' && (game.golferPose === 'happy' || game.golferPose === 'sad' || game.golferPose === 'wait')) {
      drawGolfer(ctx, game.golferX, game.golferY, { pose: game.golferPose === 'wait' ? 'address' : game.golferPose, aim: -Math.PI / 2, t: game.golferT });
      return;
    }
    const dp = game.dragPower;
    drawGolfer(ctx, game.golferX, game.golferY, {
      pose: game.golferPose,
      aim: game.golferAim,
      swing: dp && !dp.cancel ? dp.power : 0,
      t: game.golferT
    });
  };
  const gy = game.golferY;
  const fy = Math.max(game.bearY, game.foxY);
  if (fy < gy) {
    drawFriends(ctx, game, game.bearX, game.bearY, game.foxX, game.foxY);
    golfer();
  } else {
    golfer();
    drawFriends(ctx, game, game.bearX, game.bearY, game.foxX, game.foxY);
  }
  // ねらい
  if (phase === 'aim' && !game.viewing) {
    const dp = game.dragPower;
    const turning = game.drag?.touch && game.drag.mode === 'aim';
    if (dp) drawAimGuide(ctx, b.x, b.y, game.aim, dp.power, dp.cancel);
    // 向きを回している間は、合わせやすいようにガイド線を長めに出す（転がる道すじではない）
    else drawAimGuide(ctx, b.x, b.y, game.aim, turning ? 0.5 : 0.05, false);
  }
  // キツネのヒント（小声）
  if (game.hint && phase === 'aim' && !game.viewing) {
    const k = Math.min(1, game.hint.t * 4);
    ctx.globalAlpha = k * Math.min(1, (6 - game.hint.t) * 2);
    const bx = game.foxX;
    const by = game.foxY - 74;
    say(ctx, game.hint.text, bx, by, game.foxX + 4, game.foxY - 42, 12, true);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 上の情報欄
  drawHud(ctx, {
    course: game.courseIndex + 1,
    holeNo: game.holeIndex + 1,
    par: hole.par,
    strokes: phase === 'aim' ? game.strokes + 1 : Math.max(1, game.strokes),
    maxStrokes: game.maxStrokes,
    target: game.target,
    total: game.courseTotal,
    viewing: game.viewing
  });

  if (phase === 'aim') {
    const dp = game.dragPower;
    if (game.viewing) {
      rr(ctx, 90, 580, 300, 40, 12);
      ctx.fillStyle = 'rgba(12,26,20,0.8)';
      ctx.fill();
      text(ctx, isTouchDevice() ? 'うえ・したに ドラッグで みわたす' : 'ドラッグ / ↑↓ で みわたす ・ V で もどる', WIDTH / 2, 600, 13, COLOR.ink, true);
    } else if (dp) {
      // カメラはボールを画面の 555px より上に置くので、下に出してもさくらちゃんにかぶらない
      drawPowerMeter(ctx, dp.power, dp.cancel, game.charging);
    }
    else if (game.drag?.touch && game.drag.mode === 'aim') {
      rr(ctx, 90, 590, 300, 40, 12);
      ctx.fillStyle = 'rgba(12,26,20,0.8)';
      ctx.fill();
      text(ctx, '← よこに うごかして むきを あわせる →', WIDTH / 2, 610, 13, COLOR.ink, true);
    } else if (isTouchDevice() ? game.holeNo <= 1 && !game.drag : game.phaseTime < 6 && game.strokes === 0 && game.holeNo === 0) {
      rr(ctx, 40, 584, 400, 50, 12);
      ctx.fillStyle = 'rgba(12,26,20,0.8)';
      ctx.fill();
      text(ctx, isTouchDevice() ? 'よこに ドラッグ：むきを あわせる' : 'マウスで うしろへ ひっぱって、はなすと うつ', WIDTH / 2, 599, 14, COLOR.ink, true);
      text(
        ctx,
        isTouchDevice() ? 'したへ ひっぱって はなす：うつ（ながく ひくほど つよい）' : 'やじるしキー（← →）で むき、Space ながおしで つよさ',
        WIDTH / 2,
        620,
        isTouchDevice() ? 13 : 11,
        isTouchDevice() ? COLOR.ink : COLOR.muted,
        true
      );
    }
  }

  if (phase === 'courseIntro') drawCourseIntro(ctx, game);
  if (phase === 'flyover') drawFlyoverTitle(ctx, game);
  if (phase === 'rolling' && game.golferPose === 'spin' && game.golferT < 1.1) {
    ctx.globalAlpha = Math.min(1, (1.1 - game.golferT) * 3);
    outlinedText(ctx, 'おもいきり！', WIDTH / 2, 110, 24, '#ffd84a', '#5a3a1e');
    ctx.globalAlpha = 1;
  }
  if (game.message && (phase === 'result' || phase === 'rolling')) {
    const m = game.message;
    drawResultWord(ctx, m.text, m.t, m.good);
    if (m.sub) text(ctx, m.sub, WIDTH / 2, 268, 13, COLOR.ink, true);
  }
  if (phase === 'holeEnd') drawHoleEnd(ctx, game);
}

function drawCourseIntro(ctx: CanvasRenderingContext2D, game: Game): void {
  const c = game.course;
  ctx.fillStyle = 'rgba(12,26,20,0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 40, 150, 400, 250);
  text(ctx, `${c.no}めん`, WIDTH / 2, 186, 16, COLOR.muted, true);
  outlinedText(ctx, c.name, WIDTH / 2, 226, 26, '#f8c3d2', '#8a2f52');
  text(ctx, `3ホール ・ パーの ごうけい ${coursePar(c)}`, WIDTH / 2, 270, 14, COLOR.ink, true);
  outlinedText(ctx, `もくひょう ${courseTarget(c)}打 いない`, WIDTH / 2, 308, 22, '#ffd84a', '#5a3a1e');
  text(ctx, 'もくひょうを こえると、きょうは ここまで', WIDTH / 2, 344, 12, COLOR.muted, true);
  const best = game.best[game.courseIndex];
  if (best) text(ctx, `これまでの きろく ${best.strokes}打`, WIDTH / 2, 372, 12, COLOR.muted, true);
  if (game.phaseTime > 0.5 && blink(game.phaseTime)) text(ctx, tapText('クリック / スペース') + 'スタート', WIDTH / 2, 600, 16, COLOR.ink, true);
}

function drawFlyoverTitle(ctx: CanvasRenderingContext2D, game: Game): void {
  const h = game.hole;
  const a = Math.min(1, game.phaseTime * 3, (game.flyDur + 0.9 - game.phaseTime) * 3);
  ctx.globalAlpha = Math.max(0, a);
  ctx.fillStyle = 'rgba(12,26,20,0.55)';
  ctx.fillRect(0, HUD_H, WIDTH, 92);
  text(ctx, `${game.courseIndex + 1}めん  ${game.holeIndex + 1}ホール`, WIDTH / 2, HUD_H + 22, 15, '#ffffff', true);
  outlinedText(ctx, `${h.name}   パー${h.par}`, WIDTH / 2, HUD_H + 56, 24, '#f8c3d2', '#8a2f52');
  text(ctx, `${game.maxStrokes}打 までに いれよう`, WIDTH / 2, HUD_H + 80, 11, COLOR.ink, true);
  ctx.globalAlpha = 1;
  if (game.phaseTime > 0.5) text(ctx, tapText('クリック') + 'とばす', WIDTH / 2, 622, 12, '#ffffff', true);
}

function drawHoleEnd(ctx: CanvasRenderingContext2D, game: Game): void {
  const r = game.holeResult;
  if (!r) return;
  const t = game.phaseTime;
  if (r.ace) {
    drawConfetti(ctx, t);
    drawAceBanner(ctx, t);
    if (t > 1.2) {
      const k = Math.min(1, (t - 1.2) / 0.2);
      drawAceStamp(ctx, 360, 380, 1.6 - 0.6 * k, -0.18);
      if (game.newStamp && t > 1.6) text(ctx, 'きねんスタンプが ホールインワンに！', WIDTH / 2, 470, 14, '#ffd84a', true);
    }
    text(ctx, '＋1000てん', WIDTH / 2, 300, 18, '#ffd84a', true);
  } else {
    drawResultWord(ctx, r.word, t, r.strokes <= game.hole.par && !r.pickedUp);
    text(ctx, r.pickedUp ? `${r.strokes}打で はいらなかったので ひろいあげ` : `${r.strokes}打`, WIDTH / 2, 272, 15, COLOR.ink, true);
    if (r.points > 0) text(ctx, `＋${r.points}てん`, WIDTH / 2, 296, 15, '#ffd84a', true);
    // バーディ以上で、はじめてのホールなら「ナイスショットきねん」のスタンプ
    if (game.newStamp === 1 && t > 0.8) {
      const k = Math.min(1, (t - 0.8) / 0.2);
      drawHoleStamp(ctx, 380, 380, 1, 1.3 - 0.5 * k, -0.18);
      if (t > 1.1) text(ctx, 'きねんスタンプ ゲット！', 380, 448, 13, '#ffd84a', true);
    }
  }
  if (t > 1 && blink(t)) text(ctx, tapText('クリック') + 'つぎへ', WIDTH / 2, 622, 13, '#ffffff', true);
}

function drawPaused(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,16,12,0.7)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPauseButton(ctx);
  text(ctx, 'ポーズ', WIDTH / 2, 206, 28, COLOR.ink, true);
  button(ctx, PAUSE_MENU.resume, 'つづける', true);
  button(ctx, PAUSE_MENU.sound, game.muted ? 'おと：OFF' : 'おと：ON');
  button(ctx, PAUSE_MENU.title, 'タイトルへ');
}

// --- タイトル -------------------------------------------------------------------

function drawTitle(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.time;
  const hole = HOLES[0]!;
  const camY = hole.tee.y - 300;
  const v = { hole, theme: 'spring' as Theme, camY, t };
  ctx.save();
  ctx.translate(0, -camY);
  drawGround(ctx, v);
  drawBall(ctx, hole.tee.x, hole.tee.y);
  drawAbove(ctx, v);
  // さくらちゃんがかまえて、ときどき素振り
  const ph = t % 4;
  const swing = ph < 1.2 ? Math.sin((ph / 1.2) * Math.PI) * 0.8 : 0;
  drawGolfer(ctx, hole.tee.x, hole.tee.y, { pose: swing > 0.02 ? 'back' : 'address', aim: -Math.PI / 2, swing });
  drawBear(ctx, 350, hole.tee.y + 80, { scale: BEAR_SCALE, noKine: true, hat: 'cap', bob: Math.sin(t * 2) * 3 });
  drawKitsune(ctx, 404, hole.tee.y + 30, { scale: FOX_SCALE });
  ctx.restore();
  ctx.fillStyle = 'rgba(12,26,20,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 62, 420, 136, 16);
  ctx.fillStyle = 'rgba(18,40,28,0.86)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 96, 26, '#ffffff', '#1f3a2a');
  outlinedText(ctx, 'パークゴルフ', WIDTH / 2, 148, 42, '#f8c3d2', '#8a2f52');
  text(ctx, 'さかを よんで カップを ねらおう', WIDTH / 2, 182, 13, COLOR.muted, true);

  const sel = isTouchDevice() ? -1 : game.titleCursor;
  button(ctx, TITLE_BTNS[0]!, 'はじめる', true, sel === 0);
  button(ctx, TITLE_BTNS[1]!, `きねんスタンプ ${game.stamps.filter((v) => v > 0).length}/9`, false, sel === 1);

  ctx.fillStyle = 'rgba(12,26,20,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで えらぶ（↑↓）', WIDTH / 2, HEIGHT - 38, 16, COLOR.ink, true);
  }
  const bests = game.best
    .map((b, i) => (b ? `${i + 1}めん ${'★'.repeat(b.stars) || '－'} ${b.strokes}打` : null))
    .filter((s): s is string => s !== null);
  text(ctx, [`HI ${game.hiScore.toLocaleString('en-US')}`, ...bests].join(' ・ '), WIDTH / 2, HEIGHT - 14, 11, COLOR.muted, true);
}

function drawStamps(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#1d3a2a');
  g.addColorStop(1, '#0d1c16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  rr(ctx, 30, 24, 420, 548, 16);
  ctx.fillStyle = '#fbf6e8';
  ctx.fill();
  outlinedText(ctx, 'きねんスタンプ', WIDTH / 2, 54, 22, '#d94d78', '#ffffff');
  const got = game.stamps.filter((v) => v > 0).length;
  const aces = game.stamps.filter((v) => v === 2).length;
  text(ctx, `${got} / 9 ・ ホールインワン ${aces}`, WIDTH / 2, 80, 13, '#8a6a4a', true);
  text(ctx, 'バーディ いじょうで スタンプ、ホールインワンで とくべつな スタンプ', WIDTH / 2, 98, 10, '#8a6a4a', true);
  for (let i = 0; i < 9; i++) {
    const cx = 100 + (i % 3) * 140;
    const cy = 156 + Math.floor(i / 3) * 140;
    ctx.strokeStyle = 'rgba(120,100,80,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if ((game.stamps[i] ?? 0) > 0) drawHoleStamp(ctx, cx, cy, game.stamps[i]!, 1, -0.2 + (i % 4) * 0.08);
    else text(ctx, '？', cx, cy, 26, 'rgba(120,100,80,0.35)', true);
    text(ctx, `${Math.floor(i / 3) + 1}-${(i % 3) + 1} ${HOLES[i]!.name}`, cx, cy + 60, 11, '#6a5a52', true);
  }
  button(ctx, BACK_BTN, 'もどる');
}

// --- コースの終わり -----------------------------------------------------------------

function drawCard(ctx: CanvasRenderingContext2D, game: Game): void {
  const rec = game.records[game.records.length - 1];
  if (!rec) return;
  const c = COURSES[rec.course - 1]!;
  const theme = THEMES[rec.course - 1]!;
  const hole = c.holes[2]!;
  drawGround(ctx, { hole, theme, camY: 0, t: game.time });
  drawAbove(ctx, { hole, theme, camY: 0, t: game.time });
  ctx.fillStyle = 'rgba(12,26,20,0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const t = game.cardTime;
  const shown = Math.max(0, Math.min(3, Math.floor((t - 0.5) / 0.55) + 1));
  const showTotal = t > game.cardRevealTime - 0.2;
  drawScoreCard(ctx, 40, 70, {
    course: c.no,
    courseName: c.name,
    holes: c.holes.map((h, i) => ({ name: h.name, par: h.par, strokes: rec.strokes[i] ?? null, ace: rec.aces[i] ?? false })),
    target: courseTarget(c),
    shown,
    showTotal,
    stars: rec.stars,
    cleared: rec.cleared
  });
  if (showTotal) {
    text(ctx, `この めんの とくてん ＋${rec.points.toLocaleString('en-US')}`, WIDTH / 2, 404, 15, '#ffd84a', true);
    text(ctx, `ごうけい ${game.score.toLocaleString('en-US')}てん`, WIDTH / 2, 428, 12, COLOR.ink, true);
    const par = coursePar(c);
    let note = '';
    if (!rec.cleared) note = `もくひょうより ${rec.total - courseTarget(c)}打 おおかった…`;
    else if (rec.stars < 3) {
      const need = rec.stars === 0 ? par + 2 : rec.stars === 1 ? par : par - 2;
      note = `★ を ふやすには ${need}打 いない`;
    } else note = 'すごい！ ★★★';
    text(ctx, note, WIDTH / 2, 452, 12, COLOR.muted, true);
  }
  const happy = showTotal && rec.cleared;
  drawBear(ctx, 140, 590, {
    scale: 0.4,
    noKine: true,
    hat: 'cap',
    arms: happy ? 'clap' : 'down',
    clap: Math.abs(Math.sin(game.time * 10)),
    face: happy ? 'excited' : showTotal ? 'shock' : 'normal'
  });
  drawKitsune(ctx, 340, 586, { scale: 2.2, pose: happy ? 'clap' : 'watch', mood: happy ? 'happy' : 'normal', t: game.time });
  drawSakura(ctx, 240, 560, {
    scale: 2,
    eyes: happy ? 'happy' : showTotal ? 'closed' : 'dot',
    spread: happy ? 0.8 + 0.2 * Math.sin(game.time * 10) : 0,
    tail: 1
  });
  if (t > game.cardRevealTime + 0.4 && blink(game.phaseTime)) text(ctx, tapText('クリック') + 'つぎへ', WIDTH / 2, 626, 13, COLOR.ink, true);
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  const rec = game.records[game.records.length - 1];
  const ci = (rec?.course ?? 1) - 1;
  const c = COURSES[ci]!;
  const hole = c.holes[2]!;
  drawGround(ctx, { hole, theme: THEMES[ci]!, camY: 0, t: game.time });
  drawAbove(ctx, { hole, theme: THEMES[ci]!, camY: 0, t: game.time });
  ctx.fillStyle = 'rgba(30,20,10,0.62)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, 'きょうは ここまで', WIDTH / 2, 110, 32, '#ffd8a8', '#5a2a10');
  if (rec) text(ctx, `ごうけい ${rec.total}打（もくひょう ${courseTarget(c)}打）`, WIDTH / 2, 152, 14, COLOR.ink, true);
  const t = game.phaseTime;
  drawBear(ctx, 140, 520, { scale: 0.32, noKine: true, hat: 'cap', bob: Math.sin(t * 2) * 3 });
  drawKitsune(ctx, 350, 520, { scale: 2.4, mood: 'happy' });
  drawSakura(ctx, 250, 506, { scale: 2.2, eyes: t > 2.2 ? 'happy' : 'closed', tail: 1, squash: 0.06 });
  if (t > 0.6) say(ctx, 'また こんど\nいっしょに まわろう', 240, 300, 160, 380, 16);
  if (t > 1.5 && blink(t)) text(ctx, tapText('クリック') + 'つぎへ', WIDTH / 2, 612, 14, COLOR.ink, true);
}

function drawFinal(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#1d3a2a');
  g.addColorStop(1, '#0d1c16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 50, 36, 380, 556);
  text(ctx, 'けっか', WIDTH / 2, 62, 15, COLOR.muted, true);
  const all = game.records.length === 3 && game.records.every((r) => r.cleared);
  outlinedText(ctx, all ? '9ホール まわりきった！' : 'おつかれさま！', WIDTH / 2, 94, 22, '#ffd84a', '#5a3a1e');
  drawSakura(ctx, WIDTH / 2, 160, { scale: 2, eyes: all ? 'happy' : 'dot', spread: all ? 0.7 : 0, tail: 1, squash: 0.02 * Math.sin(game.time * 3) });
  for (let i = 0; i < 3; i++) {
    const rec = game.records[i];
    const y = 214 + i * 32;
    text(ctx, `${i + 1}めん`, 90, y, 14, COLOR.ink, true, 'left');
    if (rec) {
      stars(ctx, 214, y, rec.stars, 9);
      text(ctx, `${rec.total}打`, 300, y, 14, rec.cleared ? COLOR.ink : '#ff9a7a', true, 'right');
      text(ctx, `${rec.points.toLocaleString('en-US')}てん`, 390, y, 14, COLOR.pink, true, 'right');
    } else text(ctx, '―', 214, y, 14, COLOR.muted, true);
  }
  ctx.strokeStyle = 'rgba(207,227,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(90, 300);
  ctx.lineTo(390, 300);
  ctx.stroke();
  text(ctx, 'ごうけい（てんすう）', WIDTH / 2, 318, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 352, 34, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 388, 14, '#ffd84a', true);
  else text(ctx, `これまでの ハイスコア ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 388, 12, COLOR.muted, true);
  const aces = game.records.reduce((s, r) => s + r.aces.filter(Boolean).length, 0);
  text(ctx, `きょうの ホールインワン ${aces}かい`, WIDTH / 2, 430, 13, aces > 0 ? '#ffd84a' : COLOR.muted, true);
  text(ctx, `きねんスタンプ ${game.stamps.filter((v) => v > 0).length} / 9（ホールインワン ${game.stamps.filter((v) => v === 2).length}）`, WIDTH / 2, 458, 13, COLOR.pink, true);
  if (aces > 0) drawAceStamp(ctx, 370, 520, 0.7, -0.2);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, tapText('クリック') + 'タイトルへ', WIDTH / 2, 616, 15, COLOR.ink, true);
}

void BIG_POWER;
