import { cellX, cellY, drawLandingMark, drawPiece, drawSteam, drawTiles, TILE, isAnimal } from './board';
import { CELL, FIELD_H, FIELD_W, FIELD_X, FIELD_Y, HEIGHT, WIDTH } from './constants';
import { drawDemo } from './demo';
import { CHILD_OFFSET } from './logic';
import { isTouchDevice } from './device';
import { GYU_TIME, PAUSE_MENU, READY_TIME, type Button, type Game } from './game';
import { drawSakura } from './sakura';
import { drawBackground, drawChain, drawFieldFrame, drawFooter, drawGyu, drawHud, drawPop, drawSide } from './scene';
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

  drawPlayfield(ctx, game);

  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  if (phase === 'ready') drawReady(ctx, game);
  if (phase === 'stageClear') drawStageClear(ctx, game);
  if (game.phase === 'miss' && game.phaseTime > 0.6) {
    outlinedText(ctx, 'あふれちゃった…', FIELD_X + FIELD_W / 2, 250, 26, '#ffffff', '#b8483e');
  }
  if (game.phase === 'gameover') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

const key = (r: number, c: number): string => `${r},${c}`;

function drawPlayfield(ctx: CanvasRenderingContext2D, game: Game): void {
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const missed = phase === 'miss' || phase === 'gameover';
  const t = game.time;
  drawBackground(ctx, t);
  drawFieldFrame(ctx, game.danger > 0 && blink(t, game.danger >= 1 ? 3 : 1.5) ? game.danger : 0);

  // ぎゅっと消えているかたまり（寄る中心はかたまりごと）
  const gyu = new Map<string, { x: number; y: number }>();
  const centers: { x: number; y: number; kind: string }[] = [];
  for (const g of game.gyuGroups) {
    const x = g.cells.reduce((s, [, c]) => s + cellX(c), 0) / g.cells.length + CELL / 2;
    const y = g.cells.reduce((s, [r]) => s + cellY(r), 0) / g.cells.length + CELL / 2;
    centers.push({ x, y, kind: g.kind });
    for (const [r, c] of g.cells) gyu.set(key(r, c), { x, y });
  }
  const melt = new Set(game.melting.map(([r, c]) => key(r, c)));
  const p = Math.min(1, game.stepTime / GYU_TIME);

  ctx.save();
  ctx.beginPath();
  ctx.rect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
  ctx.clip();
  drawTiles(ctx, game.grid, (r, c) => gyu.has(key(r, c)));
  // 消えるかたまりの座布団は、寄せ集めた 1 枚の丸に
  for (const c of centers) {
    ctx.fillStyle = TILE[c.kind as keyof typeof TILE];
    ctx.globalAlpha = 0.8 * (1 - Math.max(0, p - 0.7) / 0.3);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, CELL * (1.3 - p * 0.4), CELL * (1.1 - p * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (let r = 0; r < game.grid.length; r++) {
    for (let c = 0; c < game.grid[r].length; c++) {
      const piece = game.grid[r][c];
      if (piece === null) continue;
      const g = gyu.get(key(r, c));
      if (g !== undefined) {
        // 寄ってぎゅっとなったあと、最後にすっと消える
        const alpha = 1 - Math.max(0, p - 0.75) / 0.25;
        drawPiece(ctx, piece, cellX(c), cellY(r), { squeeze: Math.min(1, p * 1.6), towardX: g.x, towardY: g.y, mood: 'happy', alpha });
      } else if (melt.has(key(r, c))) {
        drawPiece(ctx, piece, cellX(c), cellY(r), { melt: p });
      } else {
        const shake = missed ? Math.sin(t * 30 + r + c) * 1.2 : 0;
        drawPiece(ctx, piece, cellX(c), cellY(r), { shake, mood: missed && isAnimal(piece) ? 'puzzled' : 'normal' });
      }
    }
  }
  for (const f of game.fallers) drawPiece(ctx, f.piece, cellX(f.col), cellY(0) + f.y * CELL);
  const a = game.active;
  if (a !== null && phase === 'playing') {
    for (const [r, c, piece] of game.landing()) if (r >= 0) drawLandingMark(ctx, r, c, piece);
    const [dr, dc] = CHILD_OFFSET[a.rot];
    drawPiece(ctx, a.axis, cellX(a.col), cellY(0) + a.y * CELL);
    drawPiece(ctx, a.child, cellX(a.col + dc), cellY(0) + (a.y + dr) * CELL);
  }
  ctx.restore();

  for (const c of centers) {
    drawSteam(ctx, c.x, c.y, p);
    if (p < 0.95) drawGyu(ctx, c.x, c.y - 30, p);
  }
  for (const pop of game.pops) {
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, pop.t - 0.6) / 0.3;
    drawPop(ctx, pop.text, pop.x, pop.y - pop.t * 36);
    ctx.restore();
  }
  if (game.chainShow !== null) {
    const s = game.chainShow;
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, s.t - 0.9) / 0.3;
    drawChain(ctx, s.n, 210 - Math.min(1, s.t * 4) * 20);
    ctx.restore();
  }

  drawSide(
    ctx,
    {
      next: game.next,
      snowIn: game.snowIn,
      snowCount: game.snowNext,
      mood: game.sakuraMood,
      say: game.sakuraSay
    },
    t
  );
  drawHud(ctx, { stage: game.stageIndex + 1, left: game.left, score: game.score, hiScore: game.hiScore });
  drawFooter(ctx);
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.8)';
  ctx.fillRect(0, y, WIDTH, h);
}

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.phaseTime;
  banner(ctx, 250, 130);
  text(ctx, `${game.stageIndex + 1}めん`, WIDTH / 2, 282, 30, COLOR.ink, true);
  text(ctx, `${game.stage.goal}ぴき ぎゅっと したら クリア`, WIDTH / 2, 316, 14, COLOR.muted, true);
  text(ctx, t < READY_TIME - 0.8 ? 'よーい…' : 'はじめ！', WIDTH / 2, 352, 20, COLOR.pink, true);
  if (game.stageIndex === 0 && game.score === 0) {
    banner(ctx, 392, 58);
    const [l1, l2] = isTouchDevice()
      ? ['どこでも スワイプ ← → で いどう', 'タップ で まわす ・ ↓ スワイプ で はやく']
      : ['← → で いどう ・ ↑ か スペース で まわす', '↓ で はやく おとす'];
    text(ctx, l1, WIDTH / 2, 410, 14, COLOR.ink, true);
    text(ctx, l2, WIDTH / 2, 432, 14, COLOR.ink, true);
  }
}

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  banner(ctx, 250, 110);
  outlinedText(ctx, `${game.stageIndex + 1}めん クリア！`, WIDTH / 2, 286, 28, '#fff4c2', '#5a3a1e');
  text(ctx, `${game.stage.goal}ぴき ぎゅっと した ・ ボーナス 500てん`, WIDTH / 2, 326, 15, COLOR.ink, true);
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
  panel(ctx, 40, 170, 400, 280);
  outlinedText(ctx, 'あふれちゃった…', WIDTH / 2, 208, 26, '#ffffff', '#b8483e');
  text(ctx, 'でてくる ところが ふさがったよ', WIDTH / 2, 246, 14, COLOR.ink, true);
  text(ctx, `${game.stageIndex + 1}めん ・ ${game.cleared}ひき けした ・ さいだい ${game.maxChain}れんさ`, WIDTH / 2, 278, 13, COLOR.muted, true);
  text(ctx, 'てんすう', WIDTH / 2, 306, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 336, 32, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 374, 15, '#ffd84a', true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) {
    text(ctx, 'タップで タイトルへ', WIDTH / 2, 420, 14, COLOR.muted, true);
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
  drawSakura(ctx, WIDTH / 2, 262, { scale: 2.6, eyes: 'happy' });
  text(ctx, 'てんすう', WIDTH / 2, 330, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 360, 36, COLOR.ink, true);
  text(ctx, `${game.cleared}ひき ぎゅっと した ・ さいだい ${game.maxChain}れんさ`, WIDTH / 2, 398, 15, COLOR.ink, true);
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
