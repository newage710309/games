import {
  CELL,
  COLS,
  HEIGHT,
  HOME_COLS,
  ROW_HOME,
  ROW_HUD_BOTTOM,
  ROW_HUD_TOP,
  ROW_MEDIAN,
  ROW_ROAD_FIRST,
  ROW_ROAD_LAST,
  ROW_START,
  ROW_WATER_FIRST,
  ROW_WATER_LAST,
  TIME_LIMIT,
  WIDTH,
  colX,
  rowY
} from './constants';
import { LANES, type LaneObject } from './level';
import type { Game } from './game';
import type { Direction } from './input';
// タッチ端末ではキー名を出しても意味がないので案内文を切り替える。
import { isTouchDevice as isTouch } from './device';

const FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, system-ui, sans-serif';

const COLOR = {
  hud: '#0a1226',
  hedge: '#154d2e',
  bay: '#0d3a52',
  water: '#12467e',
  waterDark: '#0e3a69',
  median: '#3b2d6b',
  road: '#2b2f3a',
  roadLine: '#5b6274',
  start: '#3b2d6b',
  ink: '#e8f2ff',
  muted: '#8fa5ce'
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

function band(ctx: CanvasRenderingContext2D, row: number, color: string, rows = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, rowY(row), WIDTH, CELL * rows);
}

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.save();
  if (game.shake > 0) {
    const s = game.shake * 5;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  drawBackground(ctx, game.elapsed);
  drawHomes(ctx, game);
  drawLanes(ctx, game);

  if (game.phase !== 'gameover' && game.phase !== 'title') {
    drawPlayerState(ctx, game);
  }

  ctx.restore();

  drawHud(ctx, game);
  drawOverlay(ctx, game);
}

// --- 背景 --------------------------------------------------------------

function drawBackground(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  band(ctx, ROW_HUD_TOP, COLOR.hud);
  band(ctx, ROW_HOME, COLOR.hedge);

  // 川：さざ波を横縞で表現。
  band(ctx, ROW_WATER_FIRST, COLOR.water, ROW_WATER_LAST - ROW_WATER_FIRST + 1);
  ctx.fillStyle = COLOR.waterDark;
  for (let row = ROW_WATER_FIRST; row <= ROW_WATER_LAST; row++) {
    const y = rowY(row);
    for (let i = 0; i < 7; i++) {
      const phase = (t * 22 + row * 37 + i * 71) % (WIDTH + 90);
      ctx.fillRect(phase - 90, y + 12 + (i % 3) * 9, 44, 3);
    }
  }

  band(ctx, ROW_MEDIAN, COLOR.median);
  band(ctx, ROW_ROAD_FIRST, COLOR.road, ROW_ROAD_LAST - ROW_ROAD_FIRST + 1);

  // 車線の破線。
  ctx.fillStyle = COLOR.roadLine;
  for (let row = ROW_ROAD_FIRST + 1; row <= ROW_ROAD_LAST; row++) {
    const y = rowY(row) - 1;
    for (let x = 6; x < WIDTH; x += 28) ctx.fillRect(x, y, 16, 2);
  }
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, rowY(ROW_ROAD_FIRST) - 2, WIDTH, 2);
  ctx.fillRect(0, rowY(ROW_ROAD_LAST + 1) - 2, WIDTH, 2);

  band(ctx, ROW_START, COLOR.start);
  band(ctx, ROW_HUD_BOTTOM, COLOR.hud);
}

// --- お家（ゴール）------------------------------------------------------

function drawHomes(ctx: CanvasRenderingContext2D, game: Game): void {
  const y = rowY(ROW_HOME);

  // 生け垣のテクスチャ。
  ctx.fillStyle = '#1c6b3e';
  for (let c = 0; c < COLS; c++) {
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(colX(c) + 4 + i * 12, y + 6 + ((c + i) % 3) * 9, 8, 6);
    }
  }

  for (let i = 0; i < HOME_COLS.length; i++) {
    const x = colX(HOME_COLS[i]!);
    ctx.fillStyle = COLOR.bay;
    rr(ctx, x + 2, y + 3, CELL - 4, CELL - 6, 7);
    ctx.fill();
    ctx.strokeStyle = '#2aa06a';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (game.homes[i] === true) {
      drawBird(ctx, x, y, { scale: 0.8 });
    } else if (game.flyBay === i) {
      drawFly(ctx, x + CELL / 2, y + CELL / 2, game.elapsed);
    }
  }
}

function drawFly(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  const bob = Math.sin(t * 9) * 2;
  ctx.fillStyle = '#ffd84d';
  ctx.beginPath();
  ctx.ellipse(cx, cy + bob, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const flap = Math.sin(t * 30) * 3;
  ctx.beginPath();
  ctx.ellipse(cx - 6, cy - 4 + bob, 5, 2 + flap * 0.2, -0.5, 0, Math.PI * 2);
  ctx.ellipse(cx + 6, cy - 4 + bob, 5, 2 + flap * 0.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// --- レーン上のオブジェクト ---------------------------------------------

function drawLanes(ctx: CanvasRenderingContext2D, game: Game): void {
  for (let i = 0; i < LANES.length; i++) {
    const lane = LANES[i]!;
    const objects = game.laneObjects[i];
    if (objects === undefined) continue;

    for (const obj of objects) {
      switch (lane.kind) {
        case 'log':
          drawLog(ctx, obj, lane.color);
          break;
        case 'turtle':
          drawTurtles(ctx, obj, lane.color);
          break;
        case 'truck':
          drawVehicle(ctx, obj, lane.color, lane.speed > 0, true);
          break;
        case 'car':
          drawVehicle(ctx, obj, lane.color, lane.speed > 0, false);
          break;
      }
    }
  }
}

function drawLog(ctx: CanvasRenderingContext2D, o: LaneObject, color: string): void {
  const y = o.y + 6;
  const h = CELL - 12;
  ctx.fillStyle = color;
  rr(ctx, o.x, y, o.w, h, 9);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (let x = o.x + 16; x < o.x + o.w - 8; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + h - 4);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(o.x + 6, y + 3, o.w - 12, 3);
}

function drawTurtles(ctx: CanvasRenderingContext2D, o: LaneObject, color: string): void {
  const count = Math.round(o.w / CELL);
  let alpha = 1;
  if (o.dive === 'sinking') alpha = 0.55;
  else if (o.dive === 'rising') alpha = 0.7;
  else if (o.dive === 'under') alpha = 0.18;

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const cx = o.x + i * CELL + CELL / 2;
    const cy = o.y + CELL / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // 甲羅の模様。
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (o.dive !== 'under') {
      ctx.fillStyle = '#d9f5e4';
      ctx.beginPath();
      ctx.arc(cx + 12, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#07200f';
      ctx.beginPath();
      ctx.arc(cx + 13, cy - 1, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  o: LaneObject,
  color: string,
  facingRight: boolean,
  truck: boolean
): void {
  const y = o.y + 7;
  const h = CELL - 14;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, o.x + 2, y + 4, o.w, h, 6);
  ctx.fill();

  ctx.fillStyle = color;
  rr(ctx, o.x, y, o.w, h, 6);
  ctx.fill();

  // 窓。
  ctx.fillStyle = 'rgba(16,26,48,0.75)';
  const winW = truck ? 16 : 12;
  const winX = facingRight ? o.x + o.w - winW - 5 : o.x + 5;
  rr(ctx, winX, y + 4, winW, h - 8, 3);
  ctx.fill();

  if (truck) {
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const midX = facingRight ? o.x + o.w - winW - 12 : o.x + winW + 12;
    ctx.moveTo(midX, y + 2);
    ctx.lineTo(midX, y + h - 2);
    ctx.stroke();
  }

  // ヘッドライト。
  ctx.fillStyle = 'rgba(255,255,220,0.9)';
  const lx = facingRight ? o.x + o.w - 4 : o.x + 1;
  ctx.fillRect(lx, y + 3, 3, 4);
  ctx.fillRect(lx, y + h - 7, 3, 4);
}

// --- さくらちゃん（プレイヤー） ------------------------------------------

const SAKURA = {
  bodyLight: '#fff4f7',
  bodyMid: '#f8d9e1',
  bodyEdge: '#eebccb',
  outline: 'rgba(130,60,85,0.4)',
  wing: '#eab0c1',
  ink: '#1c1418',
  beak: '#5a4a4f',
  cheek: 'rgba(240,110,145,0.32)',
  petal: '#f47fa4',
  petalEdge: 'rgba(255,255,255,0.85)',
  flowerCenter: '#d94d78',
  stamen: '#ffe38a',
  shadow: 'rgba(0,0,0,0.2)'
} as const;

export interface BirdOptions {
  /** 目線の向き。-1 = 左、0 = 正面、1 = 右。進む方向へ目とくちばしを寄せる。 */
  gaze?: number;
  /** 0..1 のホップ進行度。跳んでいる間だけ少し膨らむ。 */
  hopP?: number;
  scale?: number;
  /** 車にぶつかったときの × 目。 */
  dead?: boolean;
}

const gazeOf = (facing: Direction): number => (facing === 'left' ? -1 : facing === 'right' ? 1 : 0);

/** 桜の花。5 枚の花びらを中心から放射状に並べる。 */
function drawSakuraFlower(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.25);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = SAKURA.petal;
    ctx.fill();
    ctx.strokeStyle = SAKURA.petalEdge;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = SAKURA.flowerCenter;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SAKURA.stamen;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * さくらちゃん（桜色のシマエナガ）を描く。(x, y) はセルの左上。
 * 正面向きのぬいぐるみ風。桜の花飾りは常に向かって右に付けるので、
 * 左右反転はせず、目とくちばしだけを進む方向へ寄せて向きを表す。
 */
export function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: BirdOptions = {}
): void {
  const { gaze = 0, hopP = 1, scale = 1, dead = false } = opts;
  const pop = 1 + Math.sin(hopP * Math.PI) * 0.22;
  const fx = gaze * 1.4; // 顔のパーツの横ずれ量

  ctx.save();
  ctx.translate(x + CELL / 2, y + CELL / 2);
  ctx.scale(scale * pop, scale * pop);

  // 足元の影。
  ctx.fillStyle = SAKURA.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 13.5, 10, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // 両脇の小さな翼。体の後ろから少しだけのぞかせる。
  ctx.fillStyle = SAKURA.wing;
  ctx.beginPath();
  ctx.ellipse(-12, 4.5, 3, 5, 0.35, 0, Math.PI * 2);
  ctx.ellipse(12, 4.5, 3, 5, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // まんまるの体。左上から光が当たったような、ふわっとしたグラデーション。
  const grad = ctx.createRadialGradient(-4, -4, 2, 0, 1.5, 14);
  grad.addColorStop(0, SAKURA.bodyLight);
  grad.addColorStop(0.55, SAKURA.bodyMid);
  grad.addColorStop(1, SAKURA.bodyEdge);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 13.5, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SAKURA.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // ほっぺ。
  ctx.fillStyle = SAKURA.cheek;
  ctx.beginPath();
  ctx.ellipse(-7.5 + fx, 3.2, 2.3, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse(7.5 + fx, 3.2, 2.3, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 目：小さな点。
  if (dead) {
    ctx.strokeStyle = SAKURA.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const ex of [-4.5, 4.5]) {
      ctx.moveTo(ex - 1.8, -1.8);
      ctx.lineTo(ex + 1.8, 1.8);
      ctx.moveTo(ex + 1.8, -1.8);
      ctx.lineTo(ex - 1.8, 1.8);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = SAKURA.ink;
    ctx.beginPath();
    ctx.arc(-4.5 + fx, 0, 1.5, 0, Math.PI * 2);
    ctx.arc(4.5 + fx, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-4 + fx, -0.5, 0.5, 0, Math.PI * 2);
    ctx.arc(5 + fx, -0.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ちょこんとした小さいくちばし。
  ctx.fillStyle = SAKURA.beak;
  ctx.beginPath();
  ctx.moveTo(-1.7 + fx, 2);
  ctx.lineTo(1.7 + fx, 2);
  ctx.lineTo(fx, 4.3);
  ctx.closePath();
  ctx.fill();

  // 向かって右の頭に桜の花飾り。
  drawSakuraFlower(ctx, 7.5, -7.5, 4.7);

  ctx.restore();
}

function drawPlayerState(ctx: CanvasRenderingContext2D, game: Game): void {
  const x = game.frogX;
  const y = game.frogY;

  if (game.phase === 'dying') {
    drawDeath(ctx, game, x, y);
    return;
  }
  drawBird(ctx, x, y, { gaze: gazeOf(game.frogFacing), hopP: game.hopProgress });
}

function drawDeath(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number): void {
  const p = game.deathProgress;
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;

  if (game.deathCause === 'water') {
    ctx.strokeStyle = `rgba(190,225,255,${1 - p})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + p * 22 + i * 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }

  // ぺしゃんこになって消える。
  ctx.save();
  ctx.globalAlpha = 1 - p * 0.6;
  ctx.translate(cx, cy);
  ctx.scale(1 + p * 0.5, Math.max(0.15, 1 - p));
  ctx.translate(-cx, -cy);
  drawBird(ctx, x, y, { dead: true });
  ctx.restore();
}

// --- HUD ---------------------------------------------------------------

function drawHud(ctx: CanvasRenderingContext2D, game: Game): void {
  const topY = rowY(ROW_HUD_TOP);
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, topY, WIDTH, CELL);

  ctx.textBaseline = 'middle';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${game.score}`, 10, topY + CELL / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLOR.muted;
  ctx.fillText(`HI ${game.highScore}`, WIDTH - 10, topY + CELL / 2);

  // 下段。
  const botY = rowY(ROW_HUD_BOTTOM);
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, botY, WIDTH, CELL);

  // 残機。
  for (let i = 0; i < Math.max(0, game.lives); i++) {
    drawBird(ctx, 4 + i * 22, botY + 4, { scale: 0.6 });
  }

  ctx.textAlign = 'left';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = COLOR.muted;
  ctx.fillText(`LEVEL ${game.level}`, 86, botY + CELL / 2);

  // 残り時間バー。
  const barW = 150;
  const barX = WIDTH - barW - 10;
  const barY = botY + 14;
  const ratio = Math.max(0, game.timeLeft / TIME_LIMIT);
  ctx.fillStyle = '#1d2742';
  rr(ctx, barX, barY, barW, 12, 6);
  ctx.fill();
  ctx.fillStyle = ratio > 0.4 ? '#4ccf63' : ratio > 0.18 ? '#ffcc46' : '#ff5d5d';
  if (ratio > 0) {
    rr(ctx, barX, barY, Math.max(6, barW * ratio), 12, 6);
    ctx.fill();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = COLOR.muted;
  ctx.fillText('TIME', barX - 8, botY + CELL / 2);
}

// --- オーバーレイ -------------------------------------------------------

function panel(ctx: CanvasRenderingContext2D, h: number): number {
  const y = (HEIGHT - h) / 2;
  ctx.fillStyle = 'rgba(6,10,24,0.82)';
  rr(ctx, 34, y, WIDTH - 68, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,130,200,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  return y;
}

const DEATH_TEXT: Record<string, string> = {
  car: 'くるまに ぶつかった！',
  water: 'かわに おちた！',
  time: 'じかん ぎれ！',
  edge: 'ながされた！',
  bay: 'そこは おうちじゃない！'
};

function drawOverlay(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (game.phase === 'title') {
    const y = panel(ctx, 244);
    ctx.fillStyle = '#f8c3d2';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('さくらちゃんの', WIDTH / 2, y + 30);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText('大横断', WIDTH / 2, y + 66);
    drawBird(ctx, WIDTH / 2 - CELL / 2, y + 92, { scale: 1.15 });
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = COLOR.muted;
    ctx.fillText('くるまと かわを こえて', WIDTH / 2, y + 158);
    ctx.fillText('5つの おうちを めざそう！', WIDTH / 2, y + 180);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(blink(game.elapsed) ? startPrompt() : '', WIDTH / 2, y + 216);
    return;
  }

  if (game.phase === 'paused') {
    const y = panel(ctx, 110);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText('ポーズ', WIDTH / 2, y + 44);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = COLOR.muted;
    ctx.fillText(resumePrompt(), WIDTH / 2, y + 76);
    return;
  }

  if (game.phase === 'clear') {
    const y = panel(ctx, 130);
    ctx.fillStyle = '#ffe37a';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`レベル ${game.level} クリア！`, WIDTH / 2, y + 48);
    ctx.fillStyle = COLOR.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`つぎは レベル ${game.level + 1}`, WIDTH / 2, y + 86);
    return;
  }

  if (game.phase === 'dying') {
    ctx.fillStyle = '#ff9b9b';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(DEATH_TEXT[game.deathCause] ?? '', WIDTH / 2, rowY(ROW_MEDIAN) + CELL / 2);
    return;
  }

  if (game.phase === 'gameover') {
    const y = panel(ctx, 210);
    ctx.fillStyle = '#ff7a7a';
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText('ゲームオーバー', WIDTH / 2, y + 52);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`スコア ${game.score}`, WIDTH / 2, y + 100);
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = COLOR.muted;
    ctx.fillText(`ハイスコア ${game.highScore}`, WIDTH / 2, y + 128);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(blink(game.elapsed) ? retryPrompt() : '', WIDTH / 2, y + 172);
  }
}

const blink = (t: number): boolean => Math.floor(t * 1.6) % 2 === 0;

const startPrompt = (): string =>
  isTouch() ? 'タップ で スタート' : 'SPACE / クリック で スタート';

const retryPrompt = (): string =>
  isTouch() ? 'タップ で もういちど' : 'SPACE / クリック で もういちど';

const resumePrompt = (): string =>
  isTouch() ? '❚❚ ボタン または タップ で さいかい' : 'P で さいかい';
