// 雪の坂（面ごとの背景）・カメラ・情報欄を描く。
import { BALL_SCREEN_Y, GAUGE_H, HEIGHT, HUD_H, WIDTH } from './constants';
import { drawFort, type FortLook } from './fort';
import {
  drawGate,
  drawPatch,
  drawPine,
  drawProp,
  drawRidge,
  type GateLook,
  type PatchLook,
  type PropLook,
  type RidgeLook
} from './props';
import { drawRider, drawShards, drawSnowball, type RiderOptions, type Stuck } from './snowball';
import type { Theme } from './stages';
import { COLOR, hash, outlinedText, rr, text } from './ui';

export interface View {
  camX: number;
  camY: number;
  zoom: number;
}

/** ゲーム世界の座標で描くように、カメラを掛ける。 */
export function applyView(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(WIDTH / 2, BALL_SCREEN_Y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.camX, -v.camY);
}

interface Palette {
  /** 道の外の雪。 */
  out: string;
  road: string;
  bump: string;
  bank: string;
}

const PALETTE: Record<Theme, Palette> = {
  forest: { out: '#d3e4ed', road: '#f4f9fd', bump: 'rgba(120,160,205,0.28)', bank: '#c5d8ea' },
  valley: { out: '#7c8ba1', road: '#eff4fb', bump: 'rgba(110,140,185,0.3)', bank: '#b6c9dd' },
  blizzard: { out: '#a8bbd4', road: '#d9e5f2', bump: 'rgba(90,120,170,0.32)', bank: '#a3b8d2' }
};

/** ある y での道の左右のはし。 */
export type RoadAt = (y: number) => [number, number];

/** 雪の坂を描く（カメラを掛けた状態で呼ぶ）。 */
export function drawSlope(ctx: CanvasRenderingContext2D, theme: Theme, v: View, road: RoadAt): void {
  const pal = PALETTE[theme];
  const halfW = WIDTH / 2 / v.zoom;
  const x0 = v.camX - halfW - 4;
  const x1 = v.camX + halfW + 4;
  const y0 = v.camY - BALL_SCREEN_Y / v.zoom - 4;
  const y1 = v.camY + (HEIGHT - BALL_SCREEN_Y) / v.zoom + 4;

  ctx.fillStyle = pal.out;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

  // 道
  const STEP = 40;
  const start = Math.floor(y0 / STEP);
  const end = Math.ceil(y1 / STEP) + 1;
  ctx.beginPath();
  for (let k = start; k <= end; k++) ctx.lineTo(road(k * STEP)[0], k * STEP);
  for (let k = end; k >= start; k--) ctx.lineTo(road(k * STEP)[1], k * STEP);
  ctx.closePath();
  ctx.fillStyle = pal.road;
  ctx.fill();
  ctx.strokeStyle = pal.bank;
  ctx.lineWidth = 10;
  ctx.stroke();

  // 雪のでこぼこ（下る向きの筋と三日月）
  const CELL = 58;
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.bump;
  ctx.lineWidth = 2;
  for (let cy = Math.floor(y0 / CELL); cy * CELL < y1; cy++) {
    for (let cx = Math.floor(x0 / CELL); cx * CELL < x1; cx++) {
      const hx = hash(cx, cy);
      if (hx < 0.42) continue;
      const px = (cx + hash(cx, cy + 40)) * CELL;
      const py = (cy + hash(cx + 40, cy)) * CELL;
      const [l, r] = road(py);
      if (px < l + 4 || px > r - 4) continue;
      ctx.beginPath();
      if (hx > 0.76) {
        ctx.moveTo(px - 11, py);
        ctx.quadraticCurveTo(px, py + 8, px + 11, py);
      } else {
        ctx.moveTo(px, py);
        ctx.lineTo(px + (hx - 0.6) * 8, py + 12 + hx * 12);
      }
      ctx.stroke();
    }
  }

  if (theme === 'valley') {
    drawCliff(ctx, road, -1, x0, y0, y1);
    drawCliff(ctx, road, 1, x1, y0, y1);
  } else {
    drawRoadsideTrees(ctx, theme, road, x0, x1, y0, y1);
  }
}

/** 道ばたに木をならべる。 */
function drawRoadsideTrees(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  road: RoadAt,
  x0: number,
  x1: number,
  y0: number,
  y1: number
): void {
  const ROW = 44;
  const color = theme === 'blizzard' ? '#4d7184' : '#2f6250';
  for (let row = Math.floor((y0 - 20) / ROW); row * ROW < y1 + 90; row++) {
    for (const dir of [-1, 1] as const) {
      for (let k = 0; k < 4; k++) {
        const seed = row * 7 + dir * 13 + k * 31;
        if (hash(seed, 1) < 0.34 + k * 0.1) continue;
        const py = row * ROW + hash(seed, 2) * ROW;
        const [l, r] = road(py);
        const edge = dir < 0 ? l : r;
        const px = edge + dir * (34 + k * 62 + hash(seed, 3) * 30);
        if (px < x0 - 60 || px > x1 + 60) continue;
        drawPine(ctx, px, py, 66 + hash(seed, 4) * 40, true, color);
      }
    }
  }
}

/** 谷のがけ。道のはしからカメラの外まで、ごつごつの岩にする。 */
function drawCliff(ctx: CanvasRenderingContext2D, road: RoadAt, dir: -1 | 1, far: number, y0: number, y1: number): void {
  const STEP = 30;
  const start = Math.floor(y0 / STEP) - 1;
  const end = Math.ceil(y1 / STEP) + 1;
  const edge = (k: number): number => {
    const [l, r] = road(k * STEP);
    return (dir < 0 ? l : r) + dir * (7 + hash(k, dir + 5) * 15);
  };
  const g = ctx.createLinearGradient(edge(start), 0, far, 0);
  g.addColorStop(0, '#596a83');
  g.addColorStop(0.3, '#7e8ea5');
  g.addColorStop(1, '#68778e');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#37445b';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(far + dir * 10, start * STEP);
  for (let k = start; k <= end; k++) ctx.lineTo(edge(k), k * STEP);
  ctx.lineTo(far + dir * 10, end * STEP);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 岩のひび・段に積もった雪
  for (let k = start; k <= end; k++) {
    if (hash(k, dir + 9) < 0.35) continue;
    const y = k * STEP + hash(k, dir + 7) * 18;
    const x = edge(k) + dir * (14 + hash(k, dir + 8) * 70);
    ctx.fillStyle = '#f2f7fc';
    ctx.beginPath();
    ctx.ellipse(x, y, 16 + hash(k, 3) * 22, 5 + hash(k, 4) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,70,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 8);
    ctx.lineTo(x + 6, y + 18);
    ctx.lineTo(x - 2, y + 26);
    ctx.stroke();
  }
}

/** 雪玉の転がったあと（カメラを掛けた状態で呼ぶ）。 */
export function drawTrail(ctx: CanvasRenderingContext2D, pts: { x: number; y: number; r: number }[], theme: Theme): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = theme === 'blizzard' ? 'rgba(115,145,190,0.42)' : 'rgba(150,180,220,0.42)';
  ctx.beginPath();
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = pts[i]!.r * 1.5;
    ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
    ctx.lineTo(pts[i]!.x, pts[i]!.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** ふぶき。先（画面の下）ほど白くて見えにくい。strength は 0..1。 */
export function drawBlizzard(ctx: CanvasRenderingContext2D, t: number, strength: number): void {
  if (strength <= 0) return;
  const gust = 0.82 + Math.sin(t * 0.9) * 0.18;
  const g = ctx.createLinearGradient(0, BALL_SCREEN_Y - 40, 0, HEIGHT);
  g.addColorStop(0, 'rgba(236,244,252,0)');
  g.addColorStop(0.42, `rgba(236,244,252,${0.62 * strength * gust})`);
  g.addColorStop(0.72, `rgba(236,244,252,${0.93 * strength * gust})`);
  g.addColorStop(1, `rgba(236,244,252,${0.98 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // 吹きつける雪
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < 74; k++) {
    const sp = 260 + (k % 6) * 70;
    const x = ((((k * 97.3 - t * sp) % (WIDTH + 80)) + WIDTH + 80) % (WIDTH + 80)) - 40;
    const y = (((k * 61.7 + t * sp * 0.42) % HEIGHT) + HEIGHT) % HEIGHT;
    const len = 12 + (k % 5) * 7;
    ctx.strokeStyle = `rgba(255,255,255,${(0.45 + (k % 3) * 0.2) * strength})`;
    ctx.lineWidth = 1.2 + (k % 3) * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y - len * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

/** 雪玉と障害物をまとめた、世界の 1 場面。 */
export interface Scene {
  theme: Theme;
  view: View;
  road: RoadAt;
  t: number;
  patches?: PatchLook[];
  ridges?: RidgeLook[];
  trail?: { x: number; y: number; r: number }[];
  props?: PropLook[];
  gates?: GateLook[];
  fort?: FortLook;
  ball?: {
    x: number;
    y: number;
    r: number;
    roll: number;
    stuck?: Stuck[];
    flash?: number;
    /** null ならさくらちゃんを乗せない（転げ落ちたあと）。 */
    rider?: RiderOptions | null;
    /** かけらの飛び散り 0..1。 */
    shards?: number;
    alpha?: number;
  };
  /** ゲーム世界の座標で、いちばん手前に描くもの。 */
  overlay?: () => void;
  /** ふぶきの強さ 0..1。 */
  blizzard?: number;
}

export function drawWorld(ctx: CanvasRenderingContext2D, s: Scene): void {
  ctx.save();
  applyView(ctx, s.view);
  drawSlope(ctx, s.theme, s.view, s.road);
  for (const p of s.patches ?? []) drawPatch(ctx, p, s.t);
  if (s.trail) drawTrail(ctx, s.trail, s.theme);

  // 奥（y が小さい）から順に描く
  const items: { y: number; draw: () => void }[] = [];
  for (const rd of s.ridges ?? []) items.push({ y: rd.y1, draw: () => drawRidge(ctx, rd) });
  for (const p of s.props ?? []) items.push({ y: p.y, draw: () => drawProp(ctx, p, s.t) });
  for (const g of s.gates ?? []) items.push({ y: g.y, draw: () => drawGate(ctx, g, s.t) });
  const f = s.fort;
  if (f) items.push({ y: f.y + 40, draw: () => drawFort(ctx, f) });
  const b = s.ball;
  if (b) {
    items.push({
      y: b.y + b.r * 0.3,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = b.alpha ?? 1;
        drawSnowball(ctx, b.x, b.y, b.r, { roll: b.roll, stuck: b.stuck, flash: b.flash });
        ctx.restore();
        if (b.rider !== null) drawRider(ctx, b.x, b.y, b.r, s.t, b.rider);
        if (b.shards !== undefined) drawShards(ctx, b.x, b.y, b.r, b.shards);
      }
    });
  }
  items.sort((p, q) => p.y - q.y);
  for (const it of items) it.draw();
  s.overlay?.();
  ctx.restore();
  drawBlizzard(ctx, s.t, s.blizzard ?? 0);
}

export interface HudState {
  stage: number;
  /** とりでまでのこり（m）。 */
  left: number;
  score: number;
  hiScore: number;
  /** 今の大きさ（cm）。 */
  cm: number;
  goal: number;
  /** 大きさが減っている（赤くする）。 */
  shrink?: boolean;
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, line: string): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 === 0 ? r : r * 0.46;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** 上の情報欄と、大きさのものさし。 */
export function drawHud(ctx: CanvasRenderingContext2D, h: HudState): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);
  text(ctx, '❚❚', 21, HUD_H / 2 + 1, 15, COLOR.muted, true);
  text(ctx, `${h.stage}めん`, 66, HUD_H / 2, 16, COLOR.ink, true);
  text(ctx, 'とりでまで', 146, 12, 10, COLOR.muted, true);
  text(ctx, `${h.left}m`, 146, 27, 15, '#8fd0ff', true);
  text(ctx, 'てんすう', 270, 12, 10, COLOR.muted, true);
  text(ctx, h.score.toLocaleString('en-US'), 270, 27, 15, COLOR.ink, true);
  text(ctx, 'ハイスコア', 400, 12, 10, COLOR.muted, true);
  text(ctx, h.hiScore.toLocaleString('en-US'), 400, 27, 15, COLOR.muted, true);

  // 大きさの欄
  const y = HUD_H;
  ctx.fillStyle = 'rgba(10,18,38,0.72)';
  ctx.fillRect(0, y, WIDTH, GAUGE_H);
  const reached = h.cm >= h.goal;
  outlinedText(ctx, `${Math.floor(h.cm)}cm`, 60, y + GAUGE_H / 2 + 1, 25, h.shrink ? '#ffb4b4' : reached ? '#ffe38a' : '#ffffff', '#1a2b4a');

  // ものさし：0〜目標の 2 倍。目標・1.5 倍・2 倍に星
  const bx = 124;
  const bw = WIDTH - bx - 24;
  const by = y + 27;
  const bh = 9;
  const top = h.goal * 2;
  const px = (cm: number): number => bx + (Math.min(top, cm) / top) * bw;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, bx, by, bw, bh, 4.5);
  ctx.fill();
  ctx.fillStyle = reached ? '#ffd84a' : '#8fd0ff';
  rr(ctx, bx, by, Math.max(bh, px(h.cm) - bx), bh, 4.5);
  ctx.fill();
  text(ctx, `もくひょう ${h.goal}cm`, bx, y + 13, 12, reached ? '#ffe38a' : COLOR.ink, true, 'left');
  for (const [mul, n] of [
    [1, 1],
    [1.5, 2],
    [2, 3]
  ] as const) {
    const x = px(h.goal * mul);
    const got = h.cm >= h.goal * mul;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, by - 2, 2, bh + 4);
    const shift = mul === 2 ? -9 : 0; // いちばん右は、はみ出さないように左へ
    for (let k = 0; k < n; k++) {
      drawStar(ctx, x + shift + (k - (n - 1) / 2) * 11, y + 14, 5.5, got ? '#ffd84a' : 'rgba(255,255,255,0.28)', got ? '#a8761a' : 'rgba(255,255,255,0.5)');
    }
  }
}
