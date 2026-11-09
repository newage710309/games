// 面のあとのデモ（編集長が写真をえらび、「もりのしんぶん」になって森じゅうに配られる）と、エンディング。

import { drawBird } from './birds';
import { FRAME_H, FRAME_W, HEIGHT, WIDTH, groundY } from './constants';
import type { Photo, StageRecord } from './game';
import { drawPhoto } from './hud';
import { drawNewspaper, PAPER_H, PAPER_W, type PaperData } from './newspaper';
import { drawOwl } from './owl';
import { POSES } from './poses';
import { drawSakura } from './sakura';
import { drawSnowman } from './snowman';
import { STAGES } from './stages';
import { COLOR, outlinedText, rr, text } from './ui';
import { drawWorld } from './world';
import { TAIL_REAL } from './poses';
import { TINY_SCALE, actorScale } from './world';

const ease = (p: number): number => {
  const q = Math.max(0, Math.min(1, p));
  return q * q * (3 - 2 * q);
};

export function say(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, tx: number, ty: number, size = 16): void {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
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

/** 新聞の中身（見出し・写真・ひとこと）。 */
export function paperData(rec: StageRecord): PaperData {
  const best = rec.best;
  let headline = STAGES[rec.stage - 1]!.headline;
  if (best?.r.pose) headline = `さくらちゃん ${POSES.find((p) => p.id === best.r.pose)!.name}！`;
  const sc = best?.r.score ?? 0;
  const comment = sc >= 100 ? 'これは いちめんじゃ！' : sc >= 80 ? 'みごとな しゃしんじゃ！' : 'まずまずじゃな';
  return {
    issue: rec.stage,
    headline,
    photo: best ? { snap: best.snap, fx: best.fx, fy: best.fy, score: sc } : null,
    image: best?.image ?? null,
    comment
  };
}

function photoCard(ctx: CanvasRenderingContext2D, p: Photo, x: number, y: number, w: number, rot: number, glow = false): void {
  const h = (w * FRAME_H) / FRAME_W;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (glow) {
    ctx.shadowColor = 'rgba(255,230,120,0.95)';
    ctx.shadowBlur = 22;
  }
  ctx.fillStyle = '#fffdf8';
  rr(ctx, -w / 2 - 6, -h / 2 - 6, w + 12, h + 26, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (p.image) ctx.drawImage(p.image, -w / 2, -h / 2, w, h);
  else drawPhoto(ctx, p.snap, p.fx, p.fy, -w / 2, -h / 2, w, h);
  text(ctx, `${p.r.score} てん`, 0, h / 2 + 10, 11, '#4a3326', true);
  ctx.restore();
}

/** 面のあと：編集長が 1 面の写真をえらび、新聞が森じゅうに配られる。 */
export function drawPaperScene(ctx: CanvasRenderingContext2D, rec: StageRecord, t: number): void {
  const stage = rec.stage;
  drawWorld(ctx, { stage, camX: 1500, t, actors: [], flash: 0, balls: [] });
  ctx.fillStyle = 'rgba(10,18,38,0.55)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const top = rec.photos.slice(0, 5);
  const best = rec.best;

  if (t < 2.6) {
    // 机の上に写真を広げて、えらぶ
    const pick = ease((t - 1.3) / 0.9);
    for (const [i, p] of top.entries()) {
      if (i === 0) continue;
      ctx.save();
      ctx.globalAlpha = 1 - pick * 0.8;
      photoCard(ctx, p, 110 + ((i - 1) % 2) * 260, 150 + Math.floor((i - 1) / 2) * 170, 150, (i % 2 ? -1 : 1) * 0.08);
      ctx.restore();
    }
    if (best) {
      const w = 150 + pick * 90;
      photoCard(ctx, best, WIDTH / 2, 230 - pick * 20, w, 0.03 * (1 - pick), pick > 0);
    }
    drawOwl(ctx, 110, 600, { scale: 2.2, frontBody: true, cap: true, happy: t > 1.4, frontWing: t > 1.4 ? 'point' : 'rest', time: t });
    say(ctx, t < 1.4 ? 'どれに しようかのう…' : 'これじゃ！', 290, 470, 180, 500, 16);
    return;
  }
  const d = paperData(rec);
  const p2 = t - 2.6;
  if (p2 < 1.6) {
    // 新聞になる
    const k = ease(p2 / 0.5);
    const sc = 0.4 + k * 0.95;
    drawNewspaper(ctx, WIDTH / 2 - (PAPER_W * sc) / 2, 300 - (PAPER_H * sc) / 2, sc, d, (1 - k) * 0.6 - 0.03);
    return;
  }
  // 森じゅうに配られる：小さな新聞が鳥たちのところへ飛んでいく
  const k = ease((p2 - 1.6) / 1.2);
  const readers: [string, number, number][] = [
    ['yamagara', 80, 330],
    ['gojukara', 400, 300],
    ['akagera', 120, 520],
    ['karasu', 380, 540],
    ['enaga', 250, 600]
  ];
  for (const [i, [kind, x, y]] of readers.entries()) {
    const kk = ease((p2 - 1.6 - i * 0.12) / 1.0);
    // 鳥の横に届いて、鳥はうれしそうに読む
    const side = x < WIDTH / 2 ? 1 : -1;
    const tx = x + side * 14 - (side < 0 ? 52 : 0);
    const ty = y - 66;
    const px = WIDTH / 2 - 26 + (tx - WIDTH / 2 + 26) * kk;
    const py = 230 + (ty - 230) * kk;
    drawNewspaper(ctx, px, py, 0.17, d, (1 - kk) * 3 + side * 0.12);
    drawBird(ctx, x, y, kind as 'yamagara', { scale: 2, mood: kk >= 1 ? 'happy' : 'normal', flap: kk < 1 ? 0.6 : 0 });
  }
  const big = 1 - k * 0.35;
  drawNewspaper(ctx, WIDTH / 2 - (PAPER_W * 0.62 * big) / 2, 40, 0.62 * big, d, -0.03);
  if (k >= 1) outlinedText(ctx, 'もりじゅうに くばられた！', WIDTH / 2, 316, 22, '#fff4c2', '#5a3a1e');
  if (t > 2.4) text(ctx, 'タップで つぎへ', WIDTH / 2, 626, 14, COLOR.ink, true);
}

/** エンディングで見せる写真：こっそり雪だるまが写っている写真のうち、いちばん点の高いもの。 */
export function endingPhotos(records: StageRecord[]): Photo[] {
  const out: Photo[] = [];
  for (const rec of records) {
    const p = rec.photos.find((q) => q.r.tiny && q.r.subject === 'sakura') ?? rec.photos.find((q) => q.r.tiny);
    if (p) out.push(p);
  }
  return out;
}

/** エンディング：さくらちゃんが自分ののった新聞を見て照れる → 写真のすみに雪だるまが写っていたオチ。 */
export function drawEnding(ctx: CanvasRenderingContext2D, records: StageRecord[], t: number): void {
  drawWorld(ctx, { stage: 3, camX: 1700, t, actors: [], flash: 0, balls: [] });
  ctx.fillStyle = 'rgba(40,20,50,0.3)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const papers = records.map(paperData);
  const reveal = t > 4.2;

  if (!reveal) {
    // 新聞を見て照れる
    for (const [i, d] of papers.entries()) {
      const k = ease((t - i * 0.4) / 0.6);
      drawNewspaper(ctx, 24 + i * 148, 90 + (i % 2) * 20 - (1 - k) * 200, 0.42, d, (i - 1) * 0.1);
    }
    const blush = ease((t - 1.6) / 0.8);
    drawSakura(ctx, WIDTH / 2, 470, { scale: 4.2, eyes: blush > 0.5 ? 'happy' : 'dot', blush, tail: TAIL_REAL, squash: 0.04 * Math.sin(t * 6) });
    if (t > 2) say(ctx, 'わたしが しんぶんに…！', WIDTH / 2 + 60, 360, WIDTH / 2 + 20, 400, 16);
    return;
  }
  // 写真を並べると、どれにも雪だるまが写っている
  const list = endingPhotos(records);
  const e = t - 4.2;
  for (const [i, p] of list.entries()) {
    const k = ease((e - i * 0.35) / 0.6);
    const w = 128;
    const h = (w * FRAME_H) / FRAME_W;
    const x = 24 + i * 148 + (list.length < 3 ? (3 - list.length) * 74 : 0);
    const y = 70 + (i % 2) * 18 - (1 - k) * 260;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((i - 1) * 0.07);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    rr(ctx, x - 6, y - 6, w + 12, h + 12, 5);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    if (p.image) ctx.drawImage(p.image, x, y, w, h);
    else drawPhoto(ctx, p.snap, p.fx, p.fy, x, y, w, h);
    // 写りこんだ雪だるまを丸で囲む
    const tn = p.snap.actors.find((a) => a.kind === 'tiny');
    if (tn && e > 1.4 + i * 0.3) {
      const s = actorScale(tn) * TINY_SCALE;
      const cx = x + ((tn.x - p.fx) / FRAME_W) * w;
      const cy = y + ((groundY(tn.z) - 18 * s - p.fy) / FRAME_H) * h;
      const r = Math.max(9, 24 * s * (w / FRAME_W));
      ctx.strokeStyle = '#ff4a6e';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(cx, cy, r * Math.min(1, (e - 1.4 - i * 0.3) * 4), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (e > 1.2) outlinedText(ctx, list.length > 0 ? 'あれっ？ しゃしんの すみっこに…' : 'あれっ？ だれかが みてる…', WIDTH / 2, 262, 19, '#ffffff', '#5a2a4a');
  drawSakura(ctx, 160, 480, { scale: 3.6, eyes: e > 2.4 ? 'shock' : 'happy', blush: e > 2.4 ? 0.2 : 1, tail: TAIL_REAL });
  if (e > 2.4) {
    const k = ease((e - 2.4) / 0.8);
    drawSnowman(ctx, 380 + (1 - k) * 160, 560, { scale: 3.4, grin: true, lift: 4 + 3 * Math.sin(t * 6), hop: t * 0.6 });
    if (k >= 1) say(ctx, 'ぜーんぶ うつってたよ！', 330, 352, 372, 410, 15);
  }
  if (e > 4) text(ctx, 'おしまい ・ タップで けっかへ', WIDTH / 2, 626, 14, COLOR.ink, true);
}
