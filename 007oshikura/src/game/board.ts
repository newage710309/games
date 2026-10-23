// フィールドのます目と、その中の動物・雪だるまを描く。
// 動物の絵は案内係（005）と同じ正面姿。同じ動物がとなり合うと、うしろの座布団（色つきのマス）がつながって見える。
import { CELL, COLS, FIELD_X, FIELD_Y, ROWS } from './constants';
import { drawAnimal, type AnimalKind, type Mood } from './guests';
import { drawSnowGuest } from './snowman';

/** マスに入るもの。snow = おじゃまの雪だるま、bigsnow = おおきい雪だるま（2 回溶かすと消える）。 */
export type Piece = AnimalKind | 'snow' | 'bigsnow';
/** grid[row][col]。row 0 がいちばん上。 */
export type Grid = (Piece | null)[][];

export const isAnimal = (p: Piece | null): p is AnimalKind => p !== null && p !== 'snow' && p !== 'bigsnow';

/** 動物ごとの座布団の色。色でも見分けられるように、となり合っても区別しやすい色にする。 */
export const TILE: Record<AnimalKind, string> = {
  karasu: '#8f98bd',
  yamagara: '#f0ac6c',
  gojukara: '#86bdee',
  akagera: '#ee8686',
  shimaenaga: '#eef2fa',
  risu: '#c79466',
  momonga: '#c3afe8',
  kitsune: '#f5d462',
  usagi: '#a3dcb8'
};

/** マスの左上。 */
export const cellX = (col: number): number => FIELD_X + col * CELL;
export const cellY = (row: number): number => FIELD_Y + row * CELL;

/** 文字列の並びからます目を作る（デザイン確認・テスト用）。'.' = 空。 */
export function gridFrom(rows: string[], legend: Record<string, Piece>): Grid {
  const g: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    const line = rows[r - (ROWS - rows.length)] ?? '';
    g.push(Array.from({ length: COLS }, (_, c) => legend[line[c] ?? '.'] ?? null));
  }
  return g;
}

function tilePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * 座布団を描く。同じ動物が右・下にいれば、すき間を埋めてつなげる。
 * skip に入っているマス（いま消えている最中など）は描かない。
 */
export function drawTiles(ctx: CanvasRenderingContext2D, grid: Grid, skip?: (r: number, c: number) => boolean): void {
  const pad = 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = grid[r][c];
      if (!isAnimal(p) || skip?.(r, c)) continue;
      const x = cellX(c);
      const y = cellY(r);
      ctx.fillStyle = TILE[p];
      ctx.globalAlpha = 0.85;
      tilePath(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 10);
      ctx.fill();
      const right = c + 1 < COLS ? grid[r][c + 1] : null;
      if (right === p && !skip?.(r, c + 1)) ctx.fillRect(x + CELL / 2, y + pad + 6, CELL, CELL - pad * 2 - 12);
      const down = r + 1 < ROWS ? grid[r + 1][c] : null;
      if (down === p && !skip?.(r + 1, c)) ctx.fillRect(x + pad + 6, y + CELL / 2, CELL - pad * 2 - 12, CELL);
      ctx.globalAlpha = 1;
    }
  }
}

export interface CellLook {
  mood?: Mood;
  /** ぎゅっと寄る量 0..1（消えるとき）。(towardX, towardY) へ寄りながら横につぶれる。 */
  squeeze?: number;
  towardX?: number;
  towardY?: number;
  /** 溶ける量 0..1（雪だるま）。 */
  melt?: number;
  alpha?: number;
  /** 上下にゆれる（あぶないときに、あわてる）。 */
  shake?: number;
}

/** 1 マスぶんを描く。(x, y) はマスの左上。 */
export function drawPiece(ctx: CanvasRenderingContext2D, p: Piece, x: number, y: number, look: CellLook = {}): void {
  const { mood = 'normal', squeeze = 0, melt = 0, alpha = 1, shake = 0 } = look;
  let cx = x + CELL / 2;
  let cy = y + CELL - 4;
  if (squeeze > 0 && look.towardX !== undefined && look.towardY !== undefined) {
    cx += (look.towardX - cx) * squeeze * 0.32;
    cy += (look.towardY + CELL / 2 - 4 - cy) * squeeze * 0.32;
  }
  cy += shake;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (isAnimal(p)) {
    // 押し合って横にふくらむ
    ctx.translate(cx, cy);
    ctx.scale(1 + squeeze * 0.22, 1 - squeeze * 0.16);
    drawAnimal(ctx, 0, 0, p, { scale: 1.18, mood, shadow: false });
  } else {
    const big = p === 'bigsnow';
    // 雪だるまのうしろには、氷っぽいうすい座布団（つながらない）
    ctx.fillStyle = 'rgba(200,225,250,0.22)';
    tilePath(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 10);
    ctx.fill();
    ctx.translate(cx, cy + 2);
    // 溶けると背が低くなって、横に広がる
    ctx.scale((big ? 1.45 : 1.22) * (1 + melt * 0.35), (big ? 1.28 : 1.2) * (1 - melt * 0.75));
    drawSnowGuest(ctx, 0, 0, 'none', { scale: 1, shadow: false });
    if (big) scarf(ctx);
    ctx.restore();
    if (melt > 0) drips(ctx, cx, cy, melt);
    return;
  }
  ctx.restore();
}

/** おおきい雪だるまの赤いマフラー。 */
function scarf(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#d9534f';
  ctx.strokeStyle = '#8a2a28';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, -16.6, 7.4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, -16);
  ctx.lineTo(6.4, -9);
  ctx.lineTo(3.4, -8.6);
  ctx.lineTo(1.4, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** 溶けて落ちるしずくと、足もとの水たまり。 */
function drips(ctx: CanvasRenderingContext2D, cx: number, cy: number, melt: number): void {
  ctx.fillStyle = 'rgba(143,208,255,0.9)';
  for (const [dx, d] of [
    [-9, 0.2],
    [6, 0.5],
    [12, 0.8]
  ] as const) {
    const y = cy - 22 + ((melt * 1.6 + d) % 1) * 20;
    ctx.beginPath();
    ctx.moveTo(cx + dx, y - 3.5);
    ctx.quadraticCurveTo(cx + dx - 2.4, y + 0.5, cx + dx, y + 1.6);
    ctx.quadraticCurveTo(cx + dx + 2.4, y + 0.5, cx + dx, y - 3.5);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(143,208,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, 10 + melt * 8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** ぎゅっと消えるときの、白い湯気（p = 0..1）。 */
export function drawSteam(ctx: CanvasRenderingContext2D, x: number, y: number, p: number): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p) * 0.9;
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    const d = 10 + p * 34;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - p * 10, 6 + p * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 落ちてくる組の着地点の目印（小さな点線の枠）。 */
export function drawLandingMark(ctx: CanvasRenderingContext2D, row: number, col: number, kind: Piece): void {
  const x = cellX(col);
  const y = cellY(row);
  ctx.save();
  ctx.strokeStyle = isAnimal(kind) ? TILE[kind] : '#ffffff';
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  tilePath(ctx, x + 5, y + 5, CELL - 10, CELL - 10, 9);
  ctx.stroke();
  ctx.restore();
}
