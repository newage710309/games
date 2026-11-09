// 画面を描く。状態は game.ts が持ち、ここは見せるだけ。

import { FRAME_H, FRAME_W, HEIGHT, WIDTH } from './constants';
import { drawEnding, drawPaperScene, say } from './demo';
import { isTouchDevice } from './device';
import {
  ALBUM_PAGE,
  BACK_BTN,
  PAGE_NEXT,
  PAGE_PREV,
  PAUSE_MENU,
  TITLE_BTNS,
  type Button,
  type Game,
  type Phase
} from './game';
import { drawCameraFrame, drawHud, drawPauseButton, drawPhoto, drawScorePopup, drawShutterButton, renderPhotoCanvas } from './hud';
import { drawOwl } from './owl';
import { passes } from './photo';
import { POSES, defaultLook, drawSakuraActor } from './poses';
import { RANKS, STAGES, STAR_LINES, rankFor } from './stages';
import type { AlbumEntry } from './storage';
import { COLOR, blink, outlinedText, rr, text } from './ui';
import { drawWorld, insideShape, occluders } from './world';

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  switch (game.phase) {
    case 'title':
      drawTitle(ctx, game);
      return;
    case 'zukan':
      drawZukan(ctx, game);
      return;
    case 'album':
      drawAlbum(ctx, game);
      return;
    case 'results':
      drawResults(ctx, game);
      return;
    case 'paper':
      if (game.record) drawPaperScene(ctx, game.record, game.phaseTime);
      return;
    case 'gameover':
      drawGameOver(ctx, game);
      return;
    case 'ending':
      drawEnding(ctx, game.records, game.phaseTime);
      return;
    case 'final':
      drawFinal(ctx, game);
      return;
    default:
      break;
  }

  const phase: Phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  drawPlay(ctx, game, phase);
  if (phase === 'intro') drawIntro(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

// --- 共通 ---------------------------------------------------------------------

function button(ctx: CanvasRenderingContext2D, b: Button, label: string, primary = false, selected = false): void {
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = primary ? '#f8c3d2' : 'rgba(15,23,48,0.88)';
  ctx.strokeStyle = selected ? '#ff6f98' : primary ? '#8a2f52' : COLOR.panelBorder;
  ctx.lineWidth = selected ? 3 : 1.6;
  ctx.fill();
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, primary ? 19 : 16, primary ? '#2a0f1a' : COLOR.ink, true);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  rr(ctx, x, y, w, h, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.9)';
  ctx.fill();
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, line: string): void {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr2 = k % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function stars(ctx: CanvasRenderingContext2D, cx: number, cy: number, n: number, r: number): void {
  for (let k = 0; k < 3; k++) {
    const on = k < n;
    drawStar(ctx, cx + (k - 1) * r * 2.4, cy, r, on ? '#ffd84a' : 'rgba(255,255,255,0.12)', on ? '#a8761a' : 'rgba(255,255,255,0.3)');
  }
}

const tapText = (pc: string): string => (isTouchDevice() ? 'タップで ' : `${pc}で `);

// --- タイトル -------------------------------------------------------------------

/**
 * タイトル画面の場面の位置。1 めんは木や松が多いので、さくらちゃんと枠のまわりに
 * 手前のものがかからない位置を一度だけ探しておく。
 */
let titleCam: number | null = null;
function findTitleCam(): number {
  const rect = { x: 150, y: 270, w: 180, h: 150 };
  let best = 0;
  let bestN = Infinity;
  for (let cam = 100; cam <= 1800; cam += 4) {
    const sh = occluders({ stage: 1, camX: cam, t: 0, actors: [], flash: 0, balls: [] }).filter((q) => q.z > 0.3);
    let n = 0;
    for (let i = 0; i <= 10; i++)
      for (let j = 0; j <= 8; j++) if (sh.some((q) => insideShape(q, rect.x + (rect.w * i) / 10, rect.y + (rect.h * j) / 8))) n++;
    if (n < bestN) {
      bestN = n;
      best = cam;
    }
    if (n === 0) break;
  }
  return best;
}

function drawTitle(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.time;
  // さくらちゃんが雪の森できょろきょろ
  const look = defaultLook();
  const phase = Math.floor(t / 1.6) % 4;
  look.gaze = [0, 1, 0, -1][phase]!;
  look.squash = 0.02 * Math.sin(t * 3);
  titleCam ??= findTitleCam();
  drawWorld(ctx, {
    stage: 1,
    camX: titleCam,
    t,
    actors: [
      { kind: 'tiny', x: 298, z: 0.16, face: -1 },
      { kind: 'sakura', x: 240, z: 0.36, look }
    ],
    flash: 0,
    balls: []
  });
  drawCameraFrame(ctx, { x: 240 - FRAME_W / 2, y: 340 - FRAME_H / 2, winding: null, flash: 0, empty: false, t });
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  rr(ctx, 30, 62, 420, 136, 16);
  ctx.fillStyle = 'rgba(15,23,48,0.85)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', WIDTH / 2, 96, 26, '#ffffff', '#2a3668');
  outlinedText(ctx, 'シャッターチャンス', WIDTH / 2, 148, 40, '#f8c3d2', '#8a2f52');
  text(ctx, 'もりのしんぶんの カメラマンに なろう', WIDTH / 2, 182, 13, COLOR.muted, true);

  const sel = isTouchDevice() ? -1 : game.titleCursor;
  button(ctx, TITLE_BTNS[0]!, 'はじめる', true, sel === 0);
  button(ctx, TITLE_BTNS[1]!, `ポーズずかん ${game.zukan.size}/${POSES.length}`, false, sel === 1);
  button(ctx, TITLE_BTNS[2]!, `アルバム ${game.album.length}まい`, false, sel === 2);

  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 58, WIDTH, 58);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで えらぶ', WIDTH / 2, HEIGHT - 38, 16, COLOR.ink, true);
  }
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 14, 12, COLOR.muted, true);
}

// --- ずかん・アルバム ------------------------------------------------------------

function drawZukan(ctx: CanvasRenderingContext2D, game: Game): void {
  drawWorld(ctx, { stage: 1, camX: 300, t: game.time, actors: [], flash: 0, balls: [] });
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, 'ポーズずかん', WIDTH / 2, 34, 24, '#f8c3d2', '#8a2f52');
  text(ctx, `${game.zukan.size} / ${POSES.length} しゅるい`, WIDTH / 2, 62, 13, COLOR.ink, true);
  const cw = 144;
  const ch = 122;
  for (const [i, p] of POSES.entries()) {
    const x = 24 + (i % 3) * (cw + 6);
    const y = 78 + Math.floor(i / 3) * (ch + 4);
    const found = game.zukan.has(p.id);
    rr(ctx, x, y, cw, ch, 10);
    ctx.fillStyle = found ? '#fffdf8' : 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch - 30);
    ctx.clip();
    if (found) {
      const look = defaultLook();
      look.pose = p.id;
      look.posePhase = 'pose';
      look.poseT = 0.5;
      drawSakuraActor(ctx, x + cw / 2, y + 84, 1.9, look, game.time);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + cw / 2, y + 56, 26, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      text(ctx, '？', x + cw / 2, y + 56, 28, COLOR.ink, true);
    }
    ctx.restore();
    text(ctx, found ? `${i + 1}. ${p.name}` : `${i + 1}. ？？？`, x + cw / 2, y + ch - 24, 12, found ? '#d2577f' : COLOR.muted, true);
    text(ctx, found ? `予兆：${p.omen}` : '', x + cw / 2, y + ch - 9, 10, '#6a5a52', true);
  }
  button(ctx, BACK_BTN, 'もどる');
}

/** アルバムの写真の画像（表示するときに描き直して、覚えておく）。 */
const albumCache = new WeakMap<AlbumEntry, HTMLCanvasElement | null>();

function drawAlbum(ctx: CanvasRenderingContext2D, game: Game): void {
  drawWorld(ctx, { stage: 2, camX: 300, t: game.time, actors: [], flash: 0, balls: [] });
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, 'アルバム', WIDTH / 2, 34, 24, '#f8c3d2', '#8a2f52');
  const n = game.album.length;
  const pages = Math.max(1, Math.ceil(n / ALBUM_PAGE));
  text(ctx, n === 0 ? 'まだ しゃしんが ないよ' : `${n}まい ・ ${game.albumPage + 1} / ${pages} ページ`, WIDTH / 2, 62, 13, COLOR.ink, true);
  // あたらしい写真が先頭
  const list = [...game.album].reverse().slice(game.albumPage * ALBUM_PAGE, (game.albumPage + 1) * ALBUM_PAGE);
  const w = 136;
  const h = (w * FRAME_H) / FRAME_W;
  for (const [i, e] of list.entries()) {
    const x = 28 + (i % 3) * (w + 18);
    const y = 92 + Math.floor(i / 3) * (h + 44);
    rr(ctx, x - 5, y - 5, w + 10, h + 26, 4);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    let img = albumCache.get(e);
    if (img === undefined) {
      img = renderPhotoCanvas(e.snap, e.fx, e.fy, w, h);
      albumCache.set(e, img);
    }
    if (img) ctx.drawImage(img, x, y, w, h);
    else drawPhoto(ctx, e.snap, e.fx, e.fy, x, y, w, h);
    text(ctx, `${e.snap.stage}めん ・ ${e.score}てん`, x + w / 2, y + h + 11, 11, '#4a3326', true);
  }
  if (pages > 1) {
    button(ctx, PAGE_PREV, '← まえ');
    button(ctx, PAGE_NEXT, 'つぎ →');
  }
  button(ctx, BACK_BTN, 'もどる');
}

// --- 撮影 ---------------------------------------------------------------------------

function drawPlay(ctx: CanvasRenderingContext2D, game: Game, phase: Phase): void {
  if (game.view) drawWorld(ctx, game.view);
  const playing = phase === 'playing';
  if (playing) {
    drawCameraFrame(ctx, {
      x: game.frameX,
      y: game.frameY,
      winding: game.wind > 0 ? 1 - game.wind / 1.0 : null,
      flash: game.shutterFlash,
      empty: game.film === 0,
      t: game.time
    });
    drawShutterButton(ctx, game.wind > 0 ? 1 - game.wind / 1.0 : null, game.shutterDown > 0, game.film === 0);
  }
  drawHud(ctx, {
    stage: game.stageIndex + 1,
    theme: game.stage.themeText,
    themeOk: game.themeOk,
    total: game.stageTotal,
    film: game.film,
    filmMax: 10,
    timeLeft: game.timeLeft
  });
  if (playing && game.popup) drawScorePopup(ctx, game.popup);
  if (playing && game.film === 0) outlinedText(ctx, 'フィルムを つかいきった！', WIDTH / 2, 300, 20, '#ffffff', '#3a2a40');
  // さいごの 5 秒
  if (playing && game.field && game.timeLeft < 0.1 && game.film > 0) {
    const left = Math.ceil(game.timeLeft * 50);
    outlinedText(ctx, `のこり ${left}びょう`, WIDTH / 2, 70, 16, '#ffd84a', '#5a3a1e');
  }
}

function drawIntro(ctx: CanvasRenderingContext2D, game: Game): void {
  const st = game.stage;
  const n = game.stageIndex + 1;
  ctx.fillStyle = 'rgba(10,18,38,0.55)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const k = Math.min(1, game.phaseTime / 0.35);
  ctx.save();
  ctx.translate(0, (1 - k) * -40);
  ctx.globalAlpha = k;
  rr(ctx, 40, 100, 400, 200, 18);
  ctx.fillStyle = '#fbf6e8';
  ctx.fill();
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, `${n}めん  ${st.name}`, WIDTH / 2, 130, 16, '#6a5a52', true);
  text(ctx, 'きょうの おだい', WIDTH / 2, 164, 14, '#8a6a4a', true);
  outlinedText(ctx, st.themeLines[0], WIDTH / 2, 202, 26, '#d94d78', '#ffffff');
  outlinedText(ctx, st.themeLines[1], WIDTH / 2, 236, 26, '#d94d78', '#ffffff');
  text(ctx, 'フィルム 10まい ・ おだいの しゃしんが 60てん いじょうで クリア', WIDTH / 2, 278, 11, '#6a5a52', true);
  ctx.restore();
  const hint =
    n === 1
      ? '木や 枝の かげに よく かくれるぞ。出てくる ところを ねらうのじゃ'
      : n === 2
        ? 'にせものが いっぱいじゃ。しっぽと 頭の かざりを 見るのじゃ'
        : 'にせものと 雪だるまに 気をつけろ。花の かざりが ほんものじゃ';
  const how = isTouchDevice() ? 'ドラッグで わく ・ 右下の ボタンで さつえい' : 'マウス / ←→↑↓ で わく ・ クリック / スペースで さつえい';
  rr(ctx, 40, 312, 400, 30, 10);
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fill();
  text(ctx, how, WIDTH / 2, 327, 12, COLOR.ink, true);
  drawOwl(ctx, 100, 600, { scale: 2.2, frontBody: true, cap: true, frontWing: 'point', time: game.time });
  say(ctx, 'たのんだぞ、カメラマン！', 300, 386, 190, 430, 15);
  rr(ctx, 196, 430, 270, 64, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.fill();
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const [h1, h2] = hint.includes('。') ? hint.split('。') : [hint, ''];
  text(ctx, `${h1}${h2 ? '。' : ''}`, 331, 451, 12, '#4a3326', true);
  if (h2) text(ctx, h2!, 331, 473, 12, '#4a3326', true);
  if (game.phaseTime > 0.5 && blink(game.phaseTime)) text(ctx, tapText('クリック / スペース') + 'スタート', WIDTH / 2, 616, 16, COLOR.ink, true);
}

function drawPaused(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,12,26,0.7)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawPauseButton(ctx);
  text(ctx, 'ポーズ', WIDTH / 2, 206, 28, COLOR.ink, true);
  button(ctx, PAUSE_MENU.resume, 'つづける', true);
  button(ctx, PAUSE_MENU.sound, game.muted ? 'おと：OFF' : 'おと：ON');
  button(ctx, PAUSE_MENU.title, 'タイトルへ');
}

// --- 面のあと -------------------------------------------------------------------------

function drawResults(ctx: CanvasRenderingContext2D, game: Game): void {
  const rec = game.record;
  if (!rec) return;
  drawWorld(ctx, { stage: rec.stage, camX: 1500, t: game.time, actors: [], flash: 0, balls: [] });
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, `${rec.stage}めん の しゃしん`, WIDTH / 2, 28, 20, '#ffffff', '#2a3668');
  const t = game.phaseTime;
  const cw = 212;
  const chh = 92;
  const tw = 96;
  const th = (tw * FRAME_H) / FRAME_W;
  if (rec.photos.length === 0) text(ctx, 'しゃしんが 1まいも ないよ', WIDTH / 2, 200, 16, COLOR.ink, true);
  for (const [i, p] of rec.photos.entries()) {
    if (t < i * 0.08) break;
    const x = 22 + (i % 2) * (cw + 12);
    const y = 50 + Math.floor(i / 2) * (chh + 6);
    rr(ctx, x, y, cw, chh, 8);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    if (p.image) ctx.drawImage(p.image, x + 7, y + 7, tw, th);
    else drawPhoto(ctx, p.snap, p.fx, p.fy, x + 7, y + 7, tw, th);
    const ok = passes(p.r);
    text(ctx, `${i + 1}い`, x + 118, y + 16, 12, '#8a6a4a', true, 'left');
    text(ctx, `${p.r.score}`, x + 160, y + 40, 26, p.r.score >= 80 ? '#d94d78' : p.r.score >= 60 ? '#4a3326' : '#8a7a80', true);
    text(ctx, 'てん', x + 192, y + 46, 10, '#6a5a52', true);
    text(ctx, p.r.reason, x + 158, y + 68, 10, '#6a5a52', true);
    if (ok || p.r.pose) text(ctx, `${ok ? '✓おだい ' : ''}${p.r.pose ? 'ポーズ' : ''}`, x + 158, y + 82, 10, ok ? '#2f7a3a' : '#d94d78', true);
  }
  if (t < 0.6) return;
  // 合計
  const by = 538;
  rr(ctx, 22, by, 436, 86, 10);
  ctx.fillStyle = 'rgba(15,23,48,0.94)';
  ctx.fill();
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.stroke();
  // ★ は「写真の点数の合計」で決まる。得点は「写真の点数の合計 ＋ おだい ＋ ポーズ ＋ クリア」
  text(ctx, `しゃしんの ごうけい ${rec.total}てん`, 40, by + 14, 14, COLOR.pink, true, 'left');
  stars(ctx, 400, by + 14, rec.stars, 10);
  const p = rec.points;
  const gained = p.photos + p.theme + p.poses + p.clear;
  const fmt = (n: number): string => n.toLocaleString('en-US');
  text(ctx, `この めんの とくてん ＋${fmt(gained)}`, 40, by + 34, 13, COLOR.ink, true, 'left');
  text(ctx, `ごうけい ${fmt(game.score)}`, 440, by + 34, 13, '#ffd84a', true, 'right');
  text(ctx, `（しゃしん ${fmt(p.photos)} ＋ おだい ${p.theme} ＋ ポーズ ${p.poses} ＋ クリア ${p.clear}）`, 40, by + 52, 11, COLOR.muted, true, 'left');
  let note = '';
  let noteColor = '#ffd84a';
  if (!rec.cleared) {
    note = 'おだいの しゃしんが ないよ…';
    noteColor = '#ffb4c4';
  } else if (rec.newPoses.length > 0) note = `ポーズずかんに ${rec.newPoses.length}しゅるい とうろく！`;
  else {
    const next = STAR_LINES.find((v) => rec.total < v);
    if (next !== undefined) note = `つぎの ★ まで あと ${next - rec.total}てん`;
  }
  text(ctx, note, 40, by + 71, 12, noteColor, true, 'left');
  if (t > 1.2 && blink(t)) text(ctx, tapText('クリック') + 'つぎへ', WIDTH / 2, 633, 11, COLOR.ink, true);
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  const rec = game.record;
  drawWorld(ctx, { stage: rec?.stage ?? 1, camX: 1500, t: game.time, actors: [], flash: 0, balls: [] });
  ctx.fillStyle = 'rgba(10,18,38,0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, 'ゲームオーバー', WIDTH / 2, 140, 34, '#ffb4c4', '#5a1f30');
  text(ctx, `おだい「${game.stage.themeText}」の`, WIDTH / 2, 196, 14, COLOR.ink, true);
  text(ctx, '60てん いじょうの しゃしんが なかった', WIDTH / 2, 220, 14, COLOR.ink, true);
  drawOwl(ctx, 150, 560, { scale: 2.6, frontBody: true, cap: true });
  say(ctx, 'あしたの しんぶんは おやすみじゃ…', 300, 330, 200, 380, 15);
  if (game.phaseTime > 1.5 && blink(game.phaseTime)) text(ctx, tapText('クリック') + 'つぎへ', WIDTH / 2, 616, 15, COLOR.ink, true);
}

/** 称号の段のしるし（小さなカメラ）。on なら色つき。 */
function cameraIcon(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, top: boolean): void {
  ctx.fillStyle = on ? (top ? '#ffd84a' : '#f8c3d2') : 'rgba(255,255,255,0.14)';
  rr(ctx, x - 10, y - 6, 20, 13, 3);
  ctx.fill();
  ctx.fillRect(x - 4, y - 9, 8, 4);
  ctx.fillStyle = on ? '#3a2030' : 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(x, y + 0.5, 3.6, 0, Math.PI * 2);
  ctx.fill();
}

/** 称号の色（段ごと）。 */
const RANK_COLOR = ['#cfe3ff', '#9fe0b0', '#8fd0ff', '#f8c3d2', '#ffd84a'] as const;

function drawFinal(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 50, 36, 380, 556);
  text(ctx, 'けっか', WIDTH / 2, 62, 15, COLOR.muted, true);
  const all = game.records.length === STAGES.length && game.records.every((r) => r.cleared);
  outlinedText(ctx, all ? 'もりのしんぶん だいにんき！' : 'おつかれさま！', WIDTH / 2, 94, 22, '#ffd84a', '#5a3a1e');
  const look = defaultLook();
  look.squash = 0.02 * Math.sin(game.time * 3);
  drawSakuraActor(ctx, WIDTH / 2, 176, 2.1, { ...look, pose: all ? 'wink' : null, posePhase: 'pose', poseT: 0.5 }, game.time);
  for (let i = 0; i < STAGES.length; i++) {
    const rec = game.records[i];
    const y = 204 + i * 28;
    text(ctx, `${i + 1}めん`, 96, y, 14, COLOR.ink, true, 'left');
    if (rec) {
      stars(ctx, 214, y, rec.stars, 9);
      const pt = rec.points;
      text(ctx, `${(pt.photos + pt.theme + pt.poses + pt.clear).toLocaleString('en-US')} てん`, 384, y, 14, COLOR.pink, true, 'right');
    } else text(ctx, '―', 214, y, 14, COLOR.muted, true);
  }
  // 各面の点数を足したものが てんすう（足し算の線）
  ctx.strokeStyle = 'rgba(207,227,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(96, 278);
  ctx.lineTo(384, 278);
  ctx.stroke();
  text(ctx, 'ごうけい（てんすう）', WIDTH / 2, 294, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 326, 34, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 360, 14, '#ffd84a', true);
  else text(ctx, `これまでの ハイスコア ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 360, 12, COLOR.muted, true);

  // 称号（点数で 5 段階）
  const r = rankFor(game.score);
  const rank = RANKS[r]!;
  const top = r === RANKS.length - 1;
  const k = Math.min(1, Math.max(0, (game.phaseTime - 0.4) / 0.35));
  rr(ctx, 76, 380, 328, 140, 14);
  ctx.fillStyle = top ? 'rgba(255,216,74,0.12)' : 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.strokeStyle = top ? '#ffd84a' : COLOR.panelBorder;
  ctx.lineWidth = top ? 2 : 1.2;
  ctx.stroke();
  text(ctx, 'しょうごう', WIDTH / 2, 398, 12, COLOR.muted, true);
  for (let i = 0; i < RANKS.length; i++) cameraIcon(ctx, WIDTH / 2 + (i - 2) * 28, 422, i <= r, top);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(WIDTH / 2, 456);
  ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  outlinedText(ctx, rank.name, 0, 0, top ? 24 : 22, RANK_COLOR[r]!, top ? '#6a3a10' : '#1a2b4a');
  ctx.restore();
  text(ctx, rank.comment, WIDTH / 2, 484, 12, COLOR.ink, true);
  const next = RANKS[r + 1];
  text(
    ctx,
    next ? `「${next.name}」まで あと ${(next.min - game.score).toLocaleString('en-US')}てん` : 'いちばん上の しょうごう！',
    WIDTH / 2,
    506,
    11,
    top ? '#ffd84a' : COLOR.muted,
    true
  );
  text(ctx, `ポーズずかん ${game.zukan.size} / ${POSES.length}`, WIDTH / 2, 548, 13, COLOR.pink, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, tapText('クリック') + 'タイトルへ', WIDTH / 2, 616, 15, COLOR.ink, true);
}
