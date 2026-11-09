// 「もりのしんぶん」の 1 面。面のあとに、選ばれた写真をのせて森じゅうに配る。

import { FRAME_H, FRAME_W } from './constants';
import { drawPhoto } from './hud';
import { drawOwl } from './owl';
import { drawSakuraFlower } from './sakura';
import { FONT, hash, rr } from './ui';
import type { Snapshot } from './world';

/** 新聞の大きさ（ローカル座標）。 */
export const PAPER_W = 300;
export const PAPER_H = 400;

export interface PaperData {
  /** 第何号か（面の番号）。 */
  issue: number;
  headline: string;
  /** のせる写真（なければ「しゃしん なし」）。 */
  photo: { snap: Snapshot; fx: number; fy: number; score: number } | null;
  /** 写真の画像（描いておいたもの）。 */
  image?: HTMLCanvasElement | null;
  /** 編集長のひとこと。 */
  comment: string;
}

const INK = '#2e2622';

function serif(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = INK, align: CanvasTextAlign = 'center'): void {
  ctx.font = `bold ${size}px "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function gothic(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = INK, align: CanvasTextAlign = 'center'): void {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

/** 本文の代わりの、細い灰色の線（読めない小さな字に見える）。 */
function textLines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rows: number, seed: number): void {
  ctx.fillStyle = 'rgba(46,38,34,0.32)';
  for (let k = 0; k < rows; k++) {
    const len = k === rows - 1 ? w * (0.3 + hash(seed, k) * 0.4) : w * (0.88 + hash(seed, k) * 0.12);
    ctx.fillRect(x, y + k * 7, len, 2.6);
  }
}

/**
 * 新聞を (x, y) を左上に、倍率 scale で描く。rot は少しかたむける角度。
 */
export function drawNewspaper(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, d: PaperData, rot = 0): void {
  ctx.save();
  ctx.translate(x + (PAPER_W * scale) / 2, y + (PAPER_H * scale) / 2);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.translate(-PAPER_W / 2, -PAPER_H / 2);

  // 紙
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  rr(ctx, 4, 6, PAPER_W, PAPER_H, 3);
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, PAPER_W, PAPER_H);
  g.addColorStop(0, '#fbf6e8');
  g.addColorStop(1, '#efe6cf');
  ctx.fillStyle = g;
  rr(ctx, 0, 0, PAPER_W, PAPER_H, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,60,40,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 題字
  drawSakuraFlower(ctx, 30, 34, 10, -0.2);
  drawSakuraFlower(ctx, PAPER_W - 30, 34, 10, 0.3);
  serif(ctx, 'もりのしんぶん', PAPER_W / 2, 34, 30);
  ctx.fillStyle = INK;
  ctx.fillRect(14, 58, PAPER_W - 28, 2.2);
  ctx.fillRect(14, 62, PAPER_W - 28, 0.8);
  gothic(ctx, `だい ${d.issue} ごう`, 18, 72, 9, INK, 'left');
  gothic(ctx, 'ゆきのつき ・ はっこう：へんしゅうちょう', PAPER_W - 18, 72, 9, INK, 'right');
  ctx.fillRect(14, 80, PAPER_W - 28, 0.8);

  // 見出し
  serif(ctx, d.headline, PAPER_W / 2, 102, d.headline.length > 12 ? 19 : 22);

  // 写真
  const pw = 200;
  const ph = (pw * FRAME_H) / FRAME_W;
  const px = 16;
  const py = 122;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
  if (d.photo) {
    if (d.image) ctx.drawImage(d.image, px, py, pw, ph);
    else drawPhoto(ctx, d.photo.snap, d.photo.fx, d.photo.fy, px, py, pw, ph);
    // 新聞の写真らしく、少しだけ色をあせさせる
    ctx.fillStyle = 'rgba(240,226,190,0.18)';
    ctx.fillRect(px, py, pw, ph);
  } else {
    ctx.fillStyle = '#d8d0c0';
    ctx.fillRect(px, py, pw, ph);
    gothic(ctx, 'しゃしん なし', px + pw / 2, py + ph / 2, 14, '#7a6a5a');
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, pw, ph);
  gothic(ctx, d.photo ? `しゃしん：きみ（${d.photo.score}てん）` : '', px, py + ph + 11, 8.5, INK, 'left');

  // 右の段：本文
  const cx = px + pw + 12;
  const cw = PAPER_W - cx - 14;
  textLines(ctx, cx, py + 2, cw, 18, d.issue * 7);

  // 下の段：編集長のひとこと
  const by = py + ph + 26;
  ctx.fillStyle = INK;
  ctx.fillRect(14, by - 6, PAPER_W - 28, 0.8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(14, by, 64, PAPER_H - by - 14);
  ctx.clip();
  ctx.fillStyle = '#e6dcc4';
  ctx.fillRect(14, by, 64, PAPER_H - by - 14);
  drawOwl(ctx, 46, by + 94, { scale: 1.05, frontBody: true, cap: true, happy: true });
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.strokeRect(14, by, 64, PAPER_H - by - 14);
  gothic(ctx, 'へんしゅうちょうの ひとこと', 88, by + 8, 10, INK, 'left');
  gothic(ctx, `「${d.comment}」`, 88, by + 26, 11, '#7a2a3a', 'left');
  textLines(ctx, 88, by + 42, PAPER_W - 102, 6, d.issue * 13 + 1);
  ctx.restore();
}
