import {
  BALL_R,
  DIFFICULTIES,
  HEIGHT,
  HUD_H,
  PADDLE_H,
  PADDLE_Y,
  PICTURE,
  SCORE_LIFE_BONUS,
  WIDTH
} from './constants';
import type { Button, Game } from './game';
import { loadHighScore } from './storage';
import { isTouchDevice as isTouch } from './device';

const FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, system-ui, sans-serif';

const COLOR = {
  bgTop: '#101a36',
  bgBottom: '#0a1024',
  hud: '#0a1226',
  ink: '#e8f2ff',
  muted: '#8fa5ce',
  pink: '#f8c3d2',
  accent: '#f283a8',
  panel: '#1a2540',
  panelBorder: '#2a3c68'
} as const;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const blink = (t: number): boolean => Math.floor(t * 1.6) % 2 === 0;

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  bold = false,
  align: CanvasTextAlign = 'center'
): void {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  drawBackground(ctx);
  drawPicture(ctx, game);
  drawBricks(ctx, game);
  drawParticles(ctx, game);

  const inPlay = game.phase === 'serve' || game.phase === 'playing' || game.phase === 'paused';
  if (inPlay) {
    drawPaddle(ctx, game.paddle.x, game.paddle.w);
    drawBall(ctx, game.ball.x, game.ball.y);
  }

  drawHud(ctx, game);

  switch (game.phase) {
    case 'title':
      drawTitle(ctx, game);
      break;
    case 'serve':
      drawServe(ctx, game);
      break;
    case 'paused':
      drawPaused(ctx, game);
      break;
    case 'stageClear':
      drawStageClear(ctx, game);
      break;
    case 'allClear':
      drawAllClear(ctx, game);
      break;
    case 'gameover':
      drawGameOver(ctx, game);
      break;
    default:
      break;
  }
}

// --- 盤面 --------------------------------------------------------------

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, COLOR.bgTop);
  g.addColorStop(1, COLOR.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/**
 * ブロックの下に隠れているイラスト。崩したブロックのところにだけ描く。
 * ブロックは 1px 内側に寄せて描いているので、絵を全面に描くとブロックどうしのすき間から
 * 輪郭が透けて、崩す前から鳥の形が分かってしまう（タイトル画面の「右目だけ」も台無しになる）。
 * ブロックは隙間なく敷き詰めた格子なので、全部崩せば絵全体が見える。
 */
function drawPicture(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.save();
  ctx.beginPath();
  for (const b of game.bricks) if (!b.alive) ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  ctx.translate(PICTURE.x, PICTURE.y);
  game.stage.drawPicture(ctx, game.elapsed);
  ctx.restore();

  // 面をクリアしたら、絵の上にキラキラを散らす
  if (game.phase === 'stageClear' || game.phase === 'allClear') drawSparkles(ctx, game.phaseTime);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(PICTURE.x - 1, PICTURE.y - 1, PICTURE.w + 2, PICTURE.h + 2);
}

function drawSparkles(ctx: CanvasRenderingContext2D, t: number): void {
  const spots: readonly [number, number][] = [
    [60, 40], [400, 60], [120, 230], [360, 250], [230, 24], [30, 150], [430, 170], [300, 120]
  ];
  spots.forEach(([x, y], i) => {
    const a = Math.max(0, Math.sin(t * 3 + i * 1.3));
    if (a <= 0) return;
    const r = 3 + a * 5;
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.translate(PICTURE.x + x, PICTURE.y + y);
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r, 0);
    }
    ctx.fill();
    ctx.restore();
  });
}

function drawBricks(ctx: CanvasRenderingContext2D, game: Game): void {
  for (const b of game.bricks) {
    if (!b.alive) continue;
    const x = b.x + 1;
    const y = b.y + 1;
    const w = b.w - 2;
    const h = b.h - 2;
    ctx.fillStyle = b.color;
    rr(ctx, x, y, w, h, 4);
    ctx.fill();
    // 上のハイライトと下の影で、ぷっくりしたブロックに見せる
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    rr(ctx, x + 3, y + 2, w - 6, 4, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x + 3, y + h - 4, w - 6, 2);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, game: Game): void {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawPaddle(ctx: CanvasRenderingContext2D, cx: number, w: number): void {
  const x = cx - w / 2;
  const g = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
  g.addColorStop(0, '#ffb3cb');
  g.addColorStop(1, '#e8628f');
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, x + 2, PADDLE_Y + 4, w, PADDLE_H, PADDLE_H / 2);
  ctx.fill();
  ctx.fillStyle = g;
  rr(ctx, x, PADDLE_Y, w, PADDLE_H, PADDLE_H / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  rr(ctx, x + 6, PADDLE_Y + 2, w - 12, 3, 1.5);
  ctx.fill();
}

/** オレンジ色のボール。ふちに向かって濃くなり、左上に光が当たって見える。 */
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(255,150,50,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, BALL_R + 4, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, BALL_R);
  g.addColorStop(0, '#ffe2b8');
  g.addColorStop(0.45, '#ffa63d');
  g.addColorStop(1, '#f07818');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

// --- HUD ---------------------------------------------------------------

function drawHud(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  const y = HUD_H / 2;

  if (game.phase === 'title') {
    text(ctx, `むずかしさ：${game.difficulty.label}`, 12, y, 14, COLOR.muted, false, 'left');
    text(ctx, `HI ${game.highScore}`, WIDTH - 12, y, 15, COLOR.muted, true, 'right');
    return;
  }

  text(ctx, `SCORE ${game.score}`, 12, y, 15, COLOR.ink, true, 'left');
  text(ctx, `STAGE ${game.stageIndex + 1}/${game.stageCount}`, WIDTH / 2, y, 14, COLOR.pink, true);
  text(ctx, `HI ${game.highScore}`, WIDTH - 12, y, 15, COLOR.muted, true, 'right');

  // 画面下：のこりボール数と難易度
  const by = HEIGHT - 18;
  text(ctx, 'のこり', 12, by, 12, COLOR.muted, false, 'left');
  for (let i = 0; i < Math.max(0, game.lives); i++) {
    drawBall(ctx, 58 + i * 18, by);
  }
  text(ctx, `${game.difficulty.label}（点数×${game.scoreMul}）・ラケット ${game.paddle.w}px`, WIDTH - 12, by, 12, COLOR.muted, false, 'right');
}

// --- 画面ごとの重ね描き --------------------------------------------------

function drawButton(ctx: CanvasRenderingContext2D, b: Button, primary: boolean): void {
  ctx.fillStyle = primary ? '#3a2040' : COLOR.panel;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.strokeStyle = primary ? COLOR.accent : COLOR.panelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, 15, COLOR.ink, true);
}

function drawTitle(ctx: CanvasRenderingContext2D, game: Game): void {
  text(ctx, 'さくらちゃんの', WIDTH / 2, 390, 18, COLOR.pink, true);
  text(ctx, 'ブロックくずし', WIDTH / 2, 424, 34, COLOR.ink, true);
  text(ctx, 'ブロックをくずすと、シマエナガのイラストが見えてくるよ', WIDTH / 2, 456, 13, COLOR.muted);
  text(ctx, 'むずかしさ（ラケットの長さ）をえらんでね', WIDTH / 2, 478, 13, COLOR.ink);

  game.buttons.forEach((b, i) => {
    const d = DIFFICULTIES[i]!;
    const selected = i === game.difficultyIndex;
    ctx.fillStyle = selected ? '#3a2040' : COLOR.panel;
    rr(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.strokeStyle = selected ? COLOR.accent : COLOR.panelBorder;
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();
    text(ctx, d.label, b.x + b.w / 2, b.y + 16, 16, selected ? COLOR.ink : COLOR.muted, true);
    // ラケットの長さを、そのままの比率で見せる
    const pw = game.paddleWidthFor(i, 0) * 0.9;
    ctx.fillStyle = selected ? COLOR.accent : '#6b5a7a';
    rr(ctx, b.x + (b.w - pw) / 2, b.y + 30, pw, 8, 4);
    ctx.fill();
    // 難しいほど点数が高い
    text(ctx, `点数 ×${d.scoreMul}`, b.x + b.w / 2, b.y + 49, 12, selected ? COLOR.pink : COLOR.muted, true);
    text(ctx, `HI ${loadHighScore(d.id)}`, b.x + b.w / 2, b.y + 63, 10, COLOR.muted);
  });

  const prompt = isTouch() ? 'えらんでタップすると スタート' : 'クリック または SPACE で スタート';
  if (blink(game.elapsed)) text(ctx, prompt, WIDTH / 2, 590, 15, COLOR.ink, true);
  if (!isTouch()) text(ctx, '← → でえらぶ ・ マウス / ← → でラケットをうごかす', WIDTH / 2, 618, 12, COLOR.muted);
}

function drawServe(ctx: CanvasRenderingContext2D, game: Game): void {
  // ステージの最初だけ、ステージ番号を大きく出す
  if (game.bricksLeft === game.bricks.length) {
    text(ctx, `STAGE ${game.stageIndex + 1}`, WIDTH / 2, 444, 30, COLOR.pink, true);
  }
  if (blink(game.elapsed)) {
    text(ctx, isTouch() ? 'タップで はっしゃ' : 'クリック / SPACE で はっしゃ', WIDTH / 2, 512, 15, COLOR.ink, true);
  }
}

/** ポーズ画面。「つづける」「おと：オン／オフ」「タイトルへ」を並べる。 */
function drawPaused(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(6,10,24,0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  text(ctx, 'ポーズ', WIDTH / 2, 216, 30, COLOR.ink, true);
  for (const b of game.buttons) {
    const label = b.id === 'mute' ? `おと：${game.muted ? 'オフ' : 'オン'}` : b.label;
    drawButton(ctx, { ...b, label }, b.id === 'resume');
  }
  const hint = isTouch() ? 'ボタンのそとをタップしても つづけられるよ' : 'P / Esc で つづける ・ M で おとのオン／オフ';
  text(ctx, hint, WIDTH / 2, 474, 12, COLOR.muted);
}

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  text(ctx, `ステージ ${game.stageIndex + 1} クリア！`, WIDTH / 2, 408, 28, COLOR.pink, true);
  text(ctx, `「${game.stage.title}」`, WIDTH / 2, 444, 20, COLOR.ink, true);
  text(ctx, `のこりボール ボーナス +${game.lives * SCORE_LIFE_BONUS * game.scoreMul}`, WIDTH / 2, 478, 14, COLOR.muted);
  if (game.clearReady && blink(game.phaseTime)) {
    text(ctx, isTouch() ? 'タップで つぎのステージへ' : 'クリック / SPACE で つぎのステージへ', WIDTH / 2, 540, 15, COLOR.ink, true);
  }
}

function drawAllClear(ctx: CanvasRenderingContext2D, game: Game): void {
  text(ctx, 'ぜんぶクリア！', WIDTH / 2, 400, 30, COLOR.pink, true);
  text(ctx, `「${game.stage.title}」`, WIDTH / 2, 434, 18, COLOR.ink, true);
  text(ctx, `${game.stageCount} まいのイラストを ぜんぶ見つけたよ。おめでとう！`, WIDTH / 2, 462, 13, COLOR.muted);
  text(ctx, `スコア ${game.score}　・　HI ${game.highScore}`, WIDTH / 2, 486, 15, COLOR.ink, true);
  for (const b of game.buttons) drawButton(ctx, b, true);
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  text(ctx, 'ゲームオーバー', WIDTH / 2, 410, 30, '#ff8f9f', true);
  const left = game.bricksLeft;
  text(ctx, `あと ${left} こ で「${game.stage.title}」が見えるよ`, WIDTH / 2, 450, 14, COLOR.ink);
  game.buttons.forEach((b, i) => drawButton(ctx, b, i === 0));
  if (!isTouch()) text(ctx, 'SPACE：やりなおす ・ Esc：タイトルへ', WIDTH / 2, 562, 12, COLOR.muted);
}
