// 給食室の背景（3 つの面）、奥の長テーブル、カウンター・トレー、ボタン、上の情報欄を描く。

import {
  COUNTER_BOTTOM,
  COUNTER_TOP,
  HEIGHT,
  HUD_H,
  PAUSE_BTN,
  QUEUE_Y,
  SEAT_Y,
  SERVE_BTN,
  TRAY,
  WIDTH
} from './constants';
import { drawSnowman } from './snowman';
import { COLOR, FONT, hash, outlinedText, rr, text } from './ui';

export const STAGE_NAME = ['朝の給食室', '大にぎわいの日', 'ゆきまつりの特別給食'] as const;

interface Theme {
  wall: string;
  wallDark: string;
  sky: [string, string];
  light: string;
  floor: string;
  floorLine: string;
}

const THEMES: Theme[] = [
  { wall: '#f7ecd6', wallDark: '#e8d5b2', sky: ['#bfe0f7', '#fdf2dc'], light: 'rgba(255,236,180,0.22)', floor: '#d9b07a', floorLine: '#b98a54' },
  { wall: '#fbeedd', wallDark: '#efd6b8', sky: ['#8fcdf5', '#e4f4ff'], light: 'rgba(255,255,220,0.18)', floor: '#dcb37c', floorLine: '#b98a54' },
  { wall: '#efe0d0', wallDark: '#d9c0aa', sky: ['#2c3d78', '#c48ab4'], light: 'rgba(255,200,140,0.2)', floor: '#c99c68', floorLine: '#a3743f' }
];

// --- 奥（壁・窓・黒板・床） -------------------------------------------------

/** 給食室の奥（情報欄の下からカウンターの天板まで）。t = 時間（雪・ちょうちんのゆれ）。 */
export function drawRoom(ctx: CanvasRenderingContext2D, stage: number, t = 0): void {
  const th = THEMES[Math.max(0, Math.min(2, stage - 1))];
  const floorTop = 236;
  // 壁
  ctx.fillStyle = th.wall;
  ctx.fillRect(0, 0, WIDTH, floorTop);
  // 腰板
  ctx.fillStyle = th.wallDark;
  ctx.fillRect(0, floorTop - 46, WIDTH, 46);
  ctx.strokeStyle = 'rgba(140,92,49,0.25)';
  ctx.lineWidth = 1;
  for (let x = 12; x < WIDTH; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, floorTop - 46);
    ctx.lineTo(x, floorTop);
    ctx.stroke();
  }
  ctx.fillStyle = '#b98a54';
  ctx.fillRect(0, floorTop - 49, WIDTH, 4);

  // 窓（左）
  windowView(ctx, 18, HUD_H + 16, 176, 118, stage, t);
  // 黒板（右）：きょうの こんだて
  blackboard(ctx, 236, HUD_H + 14, 226, 104, stage);

  // 床
  const g = ctx.createLinearGradient(0, floorTop, 0, COUNTER_TOP);
  g.addColorStop(0, th.floorLine);
  g.addColorStop(0.15, th.floor);
  g.addColorStop(1, th.floor);
  ctx.fillStyle = g;
  ctx.fillRect(0, floorTop, WIDTH, COUNTER_TOP - floorTop);
  ctx.strokeStyle = 'rgba(120,80,40,0.25)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const y = floorTop + k * k * 2.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  // 窓からの光
  ctx.fillStyle = th.light;
  ctx.beginPath();
  ctx.moveTo(18, HUD_H + 134);
  ctx.lineTo(194, HUD_H + 134);
  ctx.lineTo(300, COUNTER_TOP);
  ctx.lineTo(60, COUNTER_TOP);
  ctx.closePath();
  ctx.fill();

  // 面ごとのかざり
  if (stage === 2) paperChains(ctx);
  if (stage === 3) lanterns(ctx, t);

  // 列の床の印（ここに並んでね）
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.ellipse(312 + k * 52, QUEUE_Y + 1, 16, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function windowView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stage: number, t: number): void {
  const th = THEMES[stage - 1];
  ctx.save();
  rr(ctx, x, y, w, h, 6);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  if (stage === 1) {
    // 朝日
    ctx.fillStyle = 'rgba(255,240,190,0.9)';
    ctx.beginPath();
    ctx.arc(x + w * 0.75, y + h * 0.42, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (stage === 3) {
    // 夕方の星
    ctx.fillStyle = 'rgba(255,255,230,0.9)';
    for (let k = 0; k < 8; k++) {
      ctx.beginPath();
      ctx.arc(x + hash(k, 1) * w, y + hash(k, 2) * h * 0.45, 1 + (k % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 雪の木
  for (let k = 0; k < 6; k++) {
    const tx = x + 10 + k * 32 + hash(k, 4) * 10;
    const ty = y + h - 18 - hash(k, 5) * 10;
    const s = 0.7 + hash(k, 6) * 0.5;
    ctx.fillStyle = stage === 3 ? '#2d4a5e' : '#3f7a5a';
    ctx.beginPath();
    ctx.moveTo(tx, ty - 44 * s);
    ctx.lineTo(tx + 17 * s, ty);
    ctx.lineTo(tx - 17 * s, ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tx, ty - 44 * s);
    ctx.lineTo(tx + 8 * s, ty - 26 * s);
    ctx.quadraticCurveTo(tx, ty - 22 * s, tx - 8 * s, ty - 26 * s);
    ctx.closePath();
    ctx.fill();
  }
  // 雪の野原
  ctx.fillStyle = stage === 3 ? '#dfe3f5' : '#f4f9ff';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h - 20);
  ctx.quadraticCurveTo(x + w * 0.5, y + h - 34, x + w, y + h - 18);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  if (stage === 3) {
    // ゆきまつりの雪像（大きな雪だるま）と、かまくらの明かり
    drawSnowman(ctx, x + w * 0.3, y + h - 12, { scale: 1.3, grin: true, shadow: false });
    ctx.fillStyle = '#f6f2ff';
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h - 10, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffcf7a';
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h - 10, 9, Math.PI, 0);
    ctx.fill();
  }
  // 降る雪
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 18; k++) {
    const fx = x + ((k * 37.3 + Math.sin(t + k) * 6) % w);
    const fy = y + ((k * 23.1 + t * (12 + (k % 4) * 5)) % h);
    ctx.beginPath();
    ctx.arc(fx, fy, 1.1 + (k % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 窓わく
  ctx.strokeStyle = '#a77a4c';
  ctx.lineWidth = 6;
  rr(ctx, x, y, w, h, 6);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  // 窓のさん（雪）
  ctx.fillStyle = '#ffffff';
  rr(ctx, x - 6, y + h + 1, w + 12, 7, 3);
  ctx.fill();
}

const MENU = [
  ['きょうの こんだて', 'やさいスープ'],
  ['きょうの こんだて', 'スープ・どんぐり・にんじん'],
  ['ゆきまつり とくべつ こんだて', 'シチュー・あぶらあげ・はちみつ・かき氷']
] as const;

function blackboard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stage: number): void {
  ctx.fillStyle = '#8c5c31';
  rr(ctx, x - 5, y - 5, w + 10, h + 10, 5);
  ctx.fill();
  ctx.fillStyle = '#2f5a46';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x + 8, y + 8, w * 0.5, 6);
  const [a, b] = MENU[stage - 1];
  text(ctx, a, x + w / 2, y + 22, 13, '#f2f6ee', true);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 36);
  ctx.lineTo(x + w - 18, y + 36);
  ctx.stroke();
  const size = b.length > 12 ? 11 : 15;
  text(ctx, b, x + w / 2, y + 56, size, '#ffe38a', true);
  // チョークの絵（さくらの花と、にっこり顔）
  ctx.strokeStyle = 'rgba(248,195,210,0.9)';
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 5; k++) {
    const a2 = (k / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + 26 + Math.cos(a2) * 5, y + h - 20 + Math.sin(a2) * 5, 3.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  text(ctx, stage === 2 ? 'おおにぎわい！' : stage === 3 ? 'ゆきまつり！' : 'いただきます', x + w - 60, y + h - 18, 12, '#ffffff', true);
  // 黒板消しとチョーク
  ctx.fillStyle = '#d9c7a8';
  ctx.fillRect(x + w * 0.4, y + h + 1, 26, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + w * 0.4 + 34, y + h + 2, 12, 3);
}

/** 2 めん：わかざり。 */
function paperChains(ctx: CanvasRenderingContext2D): void {
  const colors = ['#f283a8', '#ffd84a', '#7fd88a', '#8fd0ff', '#c79aff'];
  for (let row = 0; row < 2; row++) {
    const y0 = HUD_H + 4 + row * 6;
    const x0 = row === 0 ? 0 : WIDTH * 0.5;
    const x1 = row === 0 ? WIDTH * 0.55 : WIDTH;
    const n = 14;
    for (let k = 0; k <= n; k++) {
      const p = k / n;
      const x = x0 + (x1 - x0) * p;
      const y = y0 + Math.sin(p * Math.PI) * 12;
      ctx.strokeStyle = colors[(k + row) % colors.length];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 3.4, (k % 2) * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // 三角の旗
  for (let k = 0; k < 9; k++) {
    const x = 210 + k * 30;
    const y = HUD_H + 136 + Math.sin((k / 8) * Math.PI) * 10;
    ctx.fillStyle = colors[k % colors.length];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 24, y);
    ctx.lineTo(x + 12, y + 16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#8c5c31';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 9; k++) {
    const x = 210 + k * 30;
    const y = HUD_H + 136 + Math.sin((k / 8) * Math.PI) * 10;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** 3 めん：ちょうちん。 */
function lanterns(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.strokeStyle = '#5a3a26';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H + 8);
  ctx.quadraticCurveTo(WIDTH / 2, HUD_H + 34, WIDTH, HUD_H + 8);
  // 黒板の上は よけるように、ちょうちんは小さめ
  ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const x = 34 + k * 69;
    const p = x / WIDTH;
    const y = HUD_H + 8 + 4 * p * (1 - p) * 26 - 2;
    const sw = Math.sin(t * 1.5 + k) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sw);
    ctx.scale(0.8, 0.8);
    const g = ctx.createRadialGradient(0, 12, 2, 0, 12, 14);
    g.addColorStop(0, '#fff1c4');
    g.addColorStop(1, k % 2 === 0 ? '#ff6f6f' : '#ffb04a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 12, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(-5, 0, 10, 2.5);
    ctx.fillRect(-5, 22, 10, 2.5);
    ctx.restore();
  }
}

/** 奥の長テーブルの手前の板（座った子の下半分をかくす）。座った子を描いたあとに描く。 */
export function drawTableFront(ctx: CanvasRenderingContext2D, stage: number): void {
  const y = SEAT_Y - 12;
  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ctx.fillRect(126, y + 22, 344, 6);
  ctx.fillStyle = stage === 3 ? '#c98f5c' : '#d9a56a';
  rr(ctx, 124, y, 348, 14, 3);
  ctx.fill();
  ctx.fillStyle = '#b07a44';
  ctx.fillRect(124, y + 12, 348, 6);
  // テーブルクロス（3 めん）
  if (stage === 3) {
    ctx.fillStyle = 'rgba(255,111,111,0.75)';
    for (let k = 0; k < 12; k++) ctx.fillRect(124 + k * 29, y, 14.5, 12);
  }
  // 脚
  ctx.fillStyle = '#8c5c31';
  for (const x of [134, 458]) ctx.fillRect(x, y + 18, 6, 14);
}

// --- カウンター -------------------------------------------------------------

/** カウンター（天板と前の板）と、その下の給食室の床。 */
export function drawCounter(ctx: CanvasRenderingContext2D, stage: number): void {
  // 天板（ステンレス）
  const g = ctx.createLinearGradient(0, COUNTER_TOP, 0, COUNTER_BOTTOM - 14);
  g.addColorStop(0, '#f4f7fa');
  g.addColorStop(1, '#c9d2dc');
  ctx.fillStyle = g;
  ctx.fillRect(0, COUNTER_TOP, WIDTH, COUNTER_BOTTOM - 14 - COUNTER_TOP);
  ctx.fillStyle = '#9aa6b4';
  ctx.fillRect(0, COUNTER_TOP, WIDTH, 3);
  // 前の板（木）
  ctx.fillStyle = stage === 3 ? '#b4794a' : '#c78a52';
  ctx.fillRect(0, COUNTER_BOTTOM - 14, WIDTH, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, COUNTER_BOTTOM - 2, WIDTH, 2);
  // 給食室の床（タイル）
  ctx.fillStyle = '#e6edf2';
  ctx.fillRect(0, COUNTER_BOTTOM, WIDTH, HEIGHT - COUNTER_BOTTOM);
  ctx.strokeStyle = '#cdd8e1';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, COUNTER_BOTTOM);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = COUNTER_BOTTOM + 32; y < HEIGHT; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

/** トレー（器を並べるお盆）。 */
export function drawTray(ctx: CanvasRenderingContext2D, highlight = false): void {
  const r = TRAY;
  ctx.fillStyle = 'rgba(60,40,20,0.2)';
  rr(ctx, r.x + 3, r.y + 5, r.w, r.h, 14);
  ctx.fill();
  ctx.fillStyle = '#e9b97a';
  rr(ctx, r.x, r.y, r.w, r.h, 14);
  ctx.fill();
  ctx.strokeStyle = highlight ? '#ff8fb0' : '#8c5c31';
  ctx.lineWidth = highlight ? 3 : 2;
  ctx.stroke();
  ctx.fillStyle = '#f4cf98';
  rr(ctx, r.x + 7, r.y + 7, r.w - 14, r.h - 14, 10);
  ctx.fill();
}

/** 「どうぞ！」ボタン（器の上の横長ボタン）。ready = 何か入っていて渡せる、pressed = 押した瞬間。 */
export function drawServeButton(ctx: CanvasRenderingContext2D, ready: boolean, pressed = false, t = 0): void {
  const b = SERVE_BTN;
  const dy = pressed ? 3 : 0;
  const glow = ready ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
  // 影
  rr(ctx, b.x, b.y + 4, b.w, b.h, b.h / 2);
  ctx.fillStyle = ready ? '#a8501a' : '#6b7280';
  ctx.fill();
  rr(ctx, b.x, b.y + dy, b.w, b.h, b.h / 2);
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, ready ? '#ffd08a' : '#e4e4e8');
  g.addColorStop(1, ready ? '#f28a2e' : '#a9aeb8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = ready ? `rgba(255,255,255,${0.5 + glow * 0.5})` : '#6b7280';
  ctx.lineWidth = ready ? 2.4 : 1.6;
  ctx.stroke();
  // つや
  rr(ctx, b.x + 16, b.y + dy + 5, b.w - 32, 8, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  outlinedText(ctx, 'どうぞ！', b.x + b.w / 2, b.y + b.h / 2 + dy + 1, 20, '#ffffff', ready ? '#a8501a' : '#6b7280');
  text(ctx, 'Space', b.x + b.w - 34, b.y + b.h / 2 + dy + 1, 11, ready ? '#ffffff' : '#eef0f4', true);
}

// --- 上の情報欄 -------------------------------------------------------------

export interface HudState {
  stage: number;
  score: number;
  /** まだよそっていない子の数（さくらちゃんは数えない）。 */
  left: number;
  total: number;
  /** これまでの 1 人あたりの平均点（まだいなければ null）。 */
  average: number | null;
}

export function drawPauseButton(ctx: CanvasRenderingContext2D): void {
  const b = PAUSE_BTN;
  rr(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(b.x + 12, b.y + 11, 4, 14);
  ctx.fillRect(b.x + 20, b.y + 11, 4, 14);
}

export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = 'rgba(10,18,38,0.88)';
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  drawPauseButton(ctx);
  text(ctx, `${h.stage}めん  ${STAGE_NAME[h.stage - 1]}`, 48, 13.5, 12, COLOR.ink, true, 'left');
  text(ctx, `${h.score.toLocaleString()}てん`, 48, 32, 14, COLOR.pink, true, 'left');
  if (h.average !== null) text(ctx, `へいきん ${Math.round(h.average)}`, 150, 32.5, 11, COLOR.muted, true, 'left');
  // のこりの人数（トレーの印を並べる）
  text(ctx, `のこり ${h.left}にん`, WIDTH - 8, 13.5, 12, COLOR.ink, true, 'right');
  const n = h.total;
  const cw = Math.min(11, 200 / n);
  for (let k = 0; k < n; k++) {
    const x = WIDTH - 8 - (n - k) * cw;
    ctx.fillStyle = k < n - h.left ? 'rgba(255,255,255,0.18)' : '#f8c3d2';
    rr(ctx, x + 1, 26, cw - 2.5, 10, 2);
    ctx.fill();
  }
}

/** 面の名前の帯（面のはじめ）。 */
export function drawStageBanner(ctx: CanvasRenderingContext2D, stage: number, y = 200): void {
  ctx.fillStyle = 'rgba(255,250,240,0.95)';
  rr(ctx, 40, y - 44, WIDTH - 80, 88, 16);
  ctx.fill();
  ctx.strokeStyle = '#8c5c31';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, `${stage}めん`, WIDTH / 2, y - 20, 15, '#8a6a4a', true);
  outlinedText(ctx, STAGE_NAME[stage - 1], WIDTH / 2, y + 14, stage === 3 ? 22 : 26, '#d94d78', '#ffffff');
}

/** 小さな文字の説明（ちょっとしたヒント）。 */
export function drawHint(ctx: CanvasRenderingContext2D, s: string, y: number): void {
  ctx.save();
  ctx.font = `bold 13px ${FONT}`;
  const w = ctx.measureText(s).width + 26;
  rr(ctx, WIDTH / 2 - w / 2, y - 14, w, 28, 14);
  ctx.fillStyle = 'rgba(15,23,48,0.78)';
  ctx.fill();
  text(ctx, s, WIDTH / 2, y + 0.5, 13, '#ffffff', true);
  ctx.restore();
}
