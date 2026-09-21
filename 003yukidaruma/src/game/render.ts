import {
  BOARD_H,
  BOARD_W,
  BOARD_X,
  BOARD_Y,
  CELL,
  COLS,
  DEATH_TIME,
  DELTA,
  FOOTER_H,
  HATCH_TIME,
  HEIGHT,
  HUD_H,
  ENEMY_BREAK_TIME,
  ROWS,
  WALL,
  WALL_SHAKE_TIME,
  WIDTH,
  type Dir
} from './constants';
import { drawDemo } from './demo';
import { PAUSE_BUTTON, posCol, posRow, type Button, type Enemy, type Game } from './game';
import { isTouchDevice as isTouch } from './device';
import { drawIce, drawSakura, drawSakuraFlower, drawSnowman } from './sprites';
import { COLOR, blink, drawSnowfall, outlinedText, rr, text } from './ui';

/** キャラクターの大きさ（1 マス 48px に合わせる）。 */
const SAKURA_SCALE = 1.45;
const SNOWMAN_SCALE = 1.3;

const cx = (col: number): number => BOARD_X + col * CELL + CELL / 2;
const cy = (row: number): number => BOARD_Y + row * CELL + CELL / 2;

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (game.phase === 'demo') {
    drawDemo(ctx, game.stageIndex, game.phaseTime, game.demoTime);
    return;
  }
  if (game.phase === 'title') {
    drawTitle(ctx, game);
    return;
  }

  drawHud(ctx, game);
  drawBoard(ctx, game);
  drawFooter(ctx, game);

  switch (game.phase) {
    case 'ready':
      drawReady(ctx, game);
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

// --- 盤面 ----------------------------------------------------------------

/** 雪の地面の模様（毎フレーム同じ位置になるよう、乱数ではなく固定の式で置く）。 */
const FLOOR_DOTS = Array.from({ length: 70 }, (_, k) => ({
  x: BOARD_X + ((k * 97.3) % BOARD_W),
  y: BOARD_Y + ((k * 61.7 + (k % 7) * 13) % BOARD_H),
  r: 1.5 + (k % 3)
}));

function drawBoard(ctx: CanvasRenderingContext2D, game: Game): void {
  drawWalls(ctx, game);

  ctx.fillStyle = COLOR.floor;
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
  ctx.fillStyle = COLOR.floorDot;
  for (const d of FLOOR_DOTS) {
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r * 1.6, d.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
  ctx.clip();

  // 面の始めは、卵の入った氷を点滅させて場所を教える
  const showEggs = game.phase === 'ready' && game.readyIsStageStart && blink(game.phaseTime, 2.2);
  const cracks = new Map<number, number>();
  for (const e of game.enemies) {
    if (e.state === 'break') cracks.set(e.breakRow * COLS + e.breakCol, Math.min(1, e.timer / ENEMY_BREAK_TIME));
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!game.hasIce(col, row)) continue;
      drawIce(ctx, BOARD_X + col * CELL, BOARD_Y + row * CELL, CELL, {
        showEgg: showEggs && game.hasEgg(col, row),
        crack: cracks.get(row * COLS + col) ?? 0
      });
    }
  }

  // すべっている氷と、巻きこまれた雪だるま
  for (const s of game.slides) {
    const { dx, dy } = DELTA[s.dir];
    const x = BOARD_X + (s.col + dx * s.t) * CELL;
    const y = BOARD_Y + (s.row + dy * s.t) * CELL;
    s.victims.forEach((e, k) => {
      drawSnowman(ctx, x + CELL / 2 + dx * CELL * (0.62 + k * 0.12), y + CELL / 2 + dy * CELL * (0.62 + k * 0.12), {
        scale: SNOWMAN_SCALE,
        facing: e.facing,
        flat: 0.55,
        flatDx: dx,
        stun: true,
        time: game.elapsed,
        shadow: false
      });
    });
    drawIce(ctx, x, y, CELL);
  }

  // 雪だるまとさくらちゃん（下にいるものほど手前に描く）
  const actors: { y: number; draw: () => void }[] = [];
  for (const e of game.enemies) {
    if (e.state === 'carried') continue;
    actors.push({ y: enemyY(e), draw: () => drawEnemy(ctx, game, e) });
  }
  actors.push({ y: cy(posRow(game.player)), draw: () => drawPlayer(ctx, game) });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();

  ctx.restore();

  // 氷のかけら・点数（盤面の外にはみ出してもよい）
  for (const s of game.shards) {
    ctx.globalAlpha = Math.max(0, 1 - s.age / s.life);
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
  for (const p of game.popups) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / 1.1);
    outlinedText(ctx, p.text, p.x, p.y - 14 - p.age * 30, 18, '#ffffff', COLOR.popup);
  }
  ctx.globalAlpha = 1;
}

const enemyY = (e: Enemy): number => (e.state === 'squashed' || e.state === 'kicked' ? e.py : cy(posRow(e)));

function drawWalls(ctx: CanvasRenderingContext2D, game: Game): void {
  const x0 = BOARD_X - WALL;
  const y0 = BOARD_Y - WALL;
  const w = BOARD_W + WALL * 2;
  const h = BOARD_H + WALL * 2;
  ctx.fillStyle = COLOR.wall;
  rr(ctx, x0, y0, w, h, 10);
  ctx.fill();

  // ゆれている壁は明るく光らせて、こまかくふるわせる
  const sides: Record<Dir, [number, number, number, number]> = {
    up: [x0, y0, w, WALL],
    down: [x0, BOARD_Y + BOARD_H, w, WALL],
    left: [x0, y0, WALL, h],
    right: [BOARD_X + BOARD_W, y0, WALL, h]
  };
  for (const [dir, [x, y, sw, sh]] of Object.entries(sides) as [Dir, [number, number, number, number]][]) {
    const s = game.wallShake[dir];
    if (s <= 0) continue;
    const k = s / WALL_SHAKE_TIME;
    const j = Math.sin(game.elapsed * 90) * 3 * k;
    const jx = dir === 'left' || dir === 'right' ? j : 0;
    const jy = dir === 'up' || dir === 'down' ? j : 0;
    ctx.globalAlpha = 0.35 + 0.65 * k;
    ctx.fillStyle = COLOR.wallShake;
    ctx.fillRect(x + jx, y + jy, sw, sh);
    ctx.globalAlpha = 1;
  }

  // 内側のふち
  ctx.strokeStyle = COLOR.wallLight;
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, BOARD_W + 2, BOARD_H + 2);
  // 壁の上の雪（点々）
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let x = x0 + 10; x < x0 + w - 6; x += 22) {
    ctx.beginPath();
    ctx.arc(x, y0 + 7, 4, 0, Math.PI * 2);
    ctx.arc(x + 9, y0 + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game): void {
  const p = game.player;
  const x = cx(posCol(p));
  let y = cy(posRow(p));

  if (game.phase === 'dying' || (game.phase === 'gameover' && game.lives <= 0)) {
    const t = game.phase === 'dying' ? game.phaseTime : DEATH_TIME;
    const k = Math.min(1, t / DEATH_TIME);
    ctx.save();
    ctx.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
    drawSakura(ctx, x, y, {
      scale: SAKURA_SCALE,
      dead: true,
      rotate: Math.sin(t * 18) * 0.25 * (1 - k),
      squash: Math.min(0.3, k * 0.5)
    });
    ctx.restore();
    return;
  }

  // 再開直後はぶつかっても平気な間だけ点滅
  if (p.invincible > 0 && blink(p.invincible, 5)) return;

  if (p.moving) y -= Math.abs(Math.sin(p.walked * Math.PI)) * 3;
  const push = p.pushTime < 0.2 ? Math.sin((p.pushTime / 0.2) * Math.PI) * 0.16 : 0;
  // 押している向きに少し体を寄せる
  const { dx, dy } = DELTA[p.facing];
  drawSakura(ctx, x + dx * push * 20, y + dy * push * 14, {
    scale: SAKURA_SCALE,
    // 下向きは正面、上向きは後ろ姿、左右は真横
    view: p.facing === 'up' ? 'back' : p.facing === 'down' ? 'front' : p.facing,
    squash: push
  });
}

function drawEnemy(ctx: CanvasRenderingContext2D, game: Game, e: Enemy): void {
  const t = game.elapsed;
  switch (e.state) {
    case 'squashed': {
      const k = Math.min(1, e.timer / 0.1);
      const alpha = e.timer < 0.4 ? 1 : Math.max(0, 1 - (e.timer - 0.4) / 0.3);
      drawSnowman(ctx, e.px, e.py, {
        scale: SNOWMAN_SCALE,
        facing: e.facing,
        flat: 0.55 + k * 0.4,
        flatDx: e.vx,
        stun: true,
        time: t,
        alpha,
        shadow: false
      });
      return;
    }
    case 'kicked':
      drawSnowman(ctx, e.px, e.py, {
        scale: SNOWMAN_SCALE,
        facing: e.facing,
        stun: true,
        time: t,
        rotate: e.timer * 12 * Math.sign(e.vx || 1),
        alpha: Math.max(0, 1 - e.timer / 1.1),
        shadow: false
      });
      return;
    case 'hatch': {
      // 雪の山から、ぴょこんと出てくる
      const k = Math.min(1, e.timer / HATCH_TIME);
      const x = cx(e.col);
      const y = cy(e.row);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#b9d3ea';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y + 16, 18 * (1 - k * 0.4), 8 * (1 - k * 0.5), 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      const grow = k < 0.8 ? k / 0.8 : 1 + Math.sin(((k - 0.8) / 0.2) * Math.PI) * 0.1;
      ctx.save();
      ctx.translate(x, y + 16);
      ctx.scale(1, grow);
      ctx.translate(-x, -(y + 16));
      drawSnowman(ctx, x, y, { scale: SNOWMAN_SCALE, facing: e.facing, shadow: false, alpha: 0.5 + k * 0.5 });
      ctx.restore();
      return;
    }
    default: {
      const x = cx(posCol(e));
      const y = cy(posRow(e));
      drawSnowman(ctx, x, y, {
        scale: SNOWMAN_SCALE,
        facing: e.facing,
        time: t,
        walk: e.moving ? e.t + e.id * 0.37 : 0,
        stun: e.state === 'stun',
        breaking: e.state === 'break',
        angry: game.enemyHurried
      });
      // 気絶がもうすぐ解けるときは点滅して知らせる
      if (e.state === 'stun' && e.timer < 1 && blink(e.timer, 4)) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// --- 上下の帯 ------------------------------------------------------------

function drawHud(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  const y = HUD_H / 2;
  text(ctx, `SCORE ${game.score}`, 12, y, 16, COLOR.ink, true, 'left');
  text(ctx, `HI ${Math.max(game.highScore, game.score)}`, 250, y, 15, COLOR.muted, true);
  if (game.buttons.includes(PAUSE_BUTTON)) drawSmallButton(ctx, PAUSE_BUTTON);
}

function drawFooter(ctx: CanvasRenderingContext2D, game: Game): void {
  const top = HEIGHT - FOOTER_H;
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, top, WIDTH, FOOTER_H);
  const y = top + FOOTER_H / 2;
  text(ctx, `STAGE ${game.stageIndex + 1}「${game.stage.title}」`, 10, y, 12, COLOR.pink, true, 'left');

  // のこりの数（さくらちゃんの小さな顔を並べる）
  for (let i = 0; i < Math.max(0, game.lives); i++) {
    drawSakura(ctx, 252 + i * 22, y + 1, { scale: 0.55, shadow: false });
  }

  drawSnowman(ctx, WIDTH - 72, y + 1, { scale: 0.48, shadow: false });
  text(ctx, `のこり ${game.enemiesLeft}`, WIDTH - 10, y, 12, COLOR.ink, true, 'right');
}

function drawSmallButton(ctx: CanvasRenderingContext2D, b: Button): void {
  ctx.fillStyle = COLOR.panel;
  rr(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, 13, COLOR.muted, true);
}

// --- 画面ごとの重ね描き --------------------------------------------------

export function drawButton(ctx: CanvasRenderingContext2D, b: Button, primary: boolean, label = b.label): void {
  ctx.fillStyle = primary ? '#3a2040' : COLOR.panel;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.strokeStyle = primary ? COLOR.accent : COLOR.panelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2, 15, COLOR.ink, true);
}

/** 盤面の中ほどに置く、半透明の帯。 */
function band(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(8,14,32,0.78)';
  ctx.fillRect(BOARD_X, y, BOARD_W, h);
}

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  if (game.readyIsStageStart) {
    band(ctx, 250, 118);
    text(ctx, `STAGE ${game.stageIndex + 1}`, WIDTH / 2, 280, 30, COLOR.pink, true);
    text(ctx, `「${game.stage.title}」`, WIDTH / 2, 314, 18, COLOR.ink, true);
    text(ctx, 'ピンクに光る氷には 雪だるまのたまごが入っているよ', WIDTH / 2, 346, 12, COLOR.muted);
  } else {
    band(ctx, 286, 52);
    text(ctx, 'READY', WIDTH / 2, 312, 26, COLOR.pink, true);
  }
}

function drawPaused(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(6,10,24,0.74)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  text(ctx, 'ポーズ', WIDTH / 2, 216, 30, COLOR.ink, true);
  for (const b of game.buttons) {
    const label = b.id === 'mute' ? `おと：${game.muted ? 'オフ' : 'オン'}` : b.label;
    drawButton(ctx, b, b.id === 'resume', label);
  }
  const hint = isTouch() ? 'ボタンのそとをタップしても つづけられるよ' : 'P / Esc で つづける ・ M で おとのオン／オフ';
  text(ctx, hint, WIDTH / 2, 474, 12, COLOR.muted);
}

const fmtTime = (sec: number): string => {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  band(ctx, 222, 190);
  text(ctx, `ステージ ${game.stageIndex + 1} クリア！`, WIDTH / 2, 256, 28, COLOR.pink, true);
  text(ctx, `タイム ${fmtTime(game.stageTime)}`, WIDTH / 2, 298, 16, COLOR.ink, true);
  text(
    ctx,
    game.timeBonus > 0 ? `はやくクリア ボーナス +${game.timeBonus}` : 'はやくクリアすると ボーナスがもらえるよ',
    WIDTH / 2,
    326,
    14,
    game.timeBonus > 0 ? COLOR.pink : COLOR.muted,
    game.timeBonus > 0
  );
  if (game.clearReady && blink(game.phaseTime)) {
    text(ctx, isTouch() ? 'タップで つぎへ' : 'クリック / SPACE で つぎへ', WIDTH / 2, 380, 15, COLOR.ink, true);
  }
}

function drawAllClear(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(6,10,24,0.8)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawSakura(ctx, WIDTH / 2, 220, { scale: 2.6, squash: Math.sin(game.elapsed * 5) * 0.04 });
  for (let k = 0; k < 6; k++) {
    const a = game.elapsed * 0.6 + (k / 6) * Math.PI * 2;
    drawSakuraFlower(ctx, WIDTH / 2 + Math.cos(a) * 90, 220 + Math.sin(a) * 60, 8, a);
  }
  text(ctx, 'ぜんぶクリア！', WIDTH / 2, 320, 30, COLOR.pink, true);
  text(ctx, '雪だるまを ぜんぶ たいじしたよ。おめでとう！', WIDTH / 2, 356, 14, COLOR.ink);
  text(ctx, `スコア ${game.score}　・　HI ${game.highScore}`, WIDTH / 2, 400, 17, COLOR.ink, true);
  if (game.score >= game.highScore && game.score > 0) text(ctx, 'ハイスコア！', WIDTH / 2, 428, 14, COLOR.accent, true);
  for (const b of game.buttons) drawButton(ctx, b, true);
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(6,10,24,0.72)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  text(ctx, 'ゲームオーバー', WIDTH / 2, 300, 30, '#ff8f9f', true);
  text(ctx, `のこりの雪だるま ${game.enemiesLeft}`, WIDTH / 2, 340, 15, COLOR.ink);
  if (game.stageIndex > 0) {
    text(ctx, 'やりなおすと スコアは 0 からになります', WIDTH / 2, 370, 12, COLOR.muted);
  }
  game.buttons.forEach((b, i) => drawButton(ctx, b, i === 0));
  if (!isTouch()) text(ctx, 'SPACE：やりなおす ・ Esc：タイトルへ', WIDTH / 2, 500, 12, COLOR.muted);
}

// --- タイトル ------------------------------------------------------------

function drawTitle(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.elapsed;
  // 空と雪原
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#15254d');
  sky.addColorStop(0.55, '#2c4c80');
  sky.addColorStop(0.56, '#e9f3fb');
  sky.addColorStop(1, '#cfe1f1');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawSnowfall(ctx, t, 0.55 * HEIGHT);

  text(ctx, 'さくらちゃんの', WIDTH / 2, 92, 22, COLOR.pink, true);
  outlinedText(ctx, '雪だるま退治', WIDTH / 2, 140, 46, '#ffffff', '#23406e');
  if (game.highScore > 0) text(ctx, `HI ${game.highScore}`, WIDTH / 2, 186, 15, COLOR.muted, true);

  // 氷を押して、雪だるまをはさむ（くり返し）
  const loop = t % 4;
  const ground = 0.55 * HEIGHT + 60;
  const iceStart = 150;
  const slide = loop < 0.6 ? 0 : Math.min(1, (loop - 0.6) / 0.35);
  const iceX = iceStart + slide * 186; // 雪だるまの手前（x = 336）で止まる
  const hit = loop >= 0.95;
  const push = loop > 0.35 && loop < 0.75 ? Math.sin(((loop - 0.35) / 0.4) * Math.PI) * 0.16 : 0;
  drawSakura(ctx, iceStart - 44 + push * 24, ground, { scale: 1.8, view: 'right', squash: push });
  if (!hit || loop > 3.2) {
    drawSnowman(ctx, 380, ground - 2, { scale: 1.5, facing: -1, time: t, walk: t * 0.8 });
  } else {
    drawSnowman(ctx, 375, ground - 2, {
      scale: 1.5,
      facing: -1,
      time: t,
      flat: 0.85,
      flatDx: 1,
      stun: true,
      alpha: loop < 2.4 ? 1 : Math.max(0, 1 - (loop - 2.4) / 0.6),
      shadow: false
    });
    if (loop < 2.2) outlinedText(ctx, '400', 400, ground - 50 - (loop - 1) * 16, 20, '#ffffff', COLOR.popup);
  }
  // くり返しの切れ目で氷が元の位置へ飛ばないよう、最後に消して最初に出す
  ctx.globalAlpha = loop < 0.25 ? loop / 0.25 : loop > 3.6 ? Math.max(0, (4 - loop) / 0.4) : 1;
  drawIce(ctx, iceX - CELL * 0.6, ground - CELL * 0.6 - 4, CELL * 1.2);
  ctx.globalAlpha = 1;

  const rules = [
    '十字キーで うごいて、氷を おして すべらせよう',
    'すべる氷で 雪だるまを はさむと やっつけられる',
    'うごかない氷を おすと われる（たまご入りは 500点）',
    '外の壁を おすと ゆれて、壁ぎわの雪だるまが 気絶'
  ];
  ctx.fillStyle = 'rgba(14,26,52,0.72)';
  rr(ctx, 30, 448, WIDTH - 60, 118, 12);
  ctx.fill();
  rules.forEach((r, i) => text(ctx, `・${r}`, 46, 470 + i * 25, 13, COLOR.ink, false, 'left'));

  const prompt = isTouch() ? 'タップで スタート' : 'クリック または SPACE で スタート';
  if (blink(t)) outlinedText(ctx, prompt, WIDTH / 2, 596, 18, '#ffffff', '#23406e');
  if (!isTouch()) text(ctx, '矢印キー / WASD で いどう ・ P ポーズ ・ M 消音', WIDTH / 2, 624, 12, '#4b6488');
}
