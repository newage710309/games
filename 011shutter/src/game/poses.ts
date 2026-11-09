// さくらちゃんの「めずらしいポーズ」12 種類と、その予兆。描画もここにまとめる。
// どのポーズも、少し前に小さな予兆を出す（見ていれば狙えるように）。

import { drawSakura, type SakuraOptions, type SakuraView } from './sakura';
import { FONT } from './ui';

export type PoseId =
  | 'yawn'
  | 'sneeze'
  | 'stretch'
  | 'dive'
  | 'roll'
  | 'nut'
  | 'sing'
  | 'doze'
  | 'wink'
  | 'puff'
  | 'catch'
  | 'surprise';

export interface PoseInfo {
  id: PoseId;
  /** ずかんに出す名前。 */
  name: string;
  /** 予兆の説明（デザイン確認・ずかん用）。 */
  omen: string;
  /** そのポーズのとき、こちらを向いているか（向きのボーナス）。 */
  facing: boolean;
  /** 羽を広げているか（2 めんのお題）。 */
  wings: boolean;
}

export const POSES: readonly PoseInfo[] = [
  { id: 'yawn', name: 'おおあくび', omen: '目が とろんと する', facing: true, wings: false },
  { id: 'sneeze', name: 'くしゃみ', omen: 'くちばしが むずむず', facing: true, wings: false },
  { id: 'stretch', name: '羽を のびー', omen: '体を ぶるぶるっ', facing: true, wings: true },
  { id: 'dive', name: '雪に ずぼっ', omen: '雪山を じっと 見る', facing: false, wings: false },
  { id: 'roll', name: 'でんぐりがえり', omen: 'ぐっと しゃがむ', facing: false, wings: false },
  { id: 'nut', name: '木の実を くわえる', omen: '木の実が 落ちてくる', facing: true, wings: false },
  { id: 'sing', name: 'うたう', omen: 'むねを ふくらませる', facing: true, wings: false },
  { id: 'doze', name: 'いねむり', omen: 'こっくり こっくり', facing: true, wings: false },
  { id: 'wink', name: 'ウインク', omen: '目が きらっ', facing: true, wings: false },
  { id: 'puff', name: 'まんまる もふもふ', omen: 'つめたい 風が ふく', facing: true, wings: false },
  { id: 'catch', name: '雪の 結晶を キャッチ', omen: '大きな 結晶が ひらひら', facing: true, wings: false },
  { id: 'surprise', name: 'びっくり ジャンプ', omen: 'しげみが がさっ', facing: true, wings: true }
];

export const POSE_INDEX: Record<PoseId, number> = Object.fromEntries(POSES.map((p, i) => [p.id, i])) as Record<PoseId, number>;

/** さくらちゃん（とそっくりさん）の見た目。場面の情報から毎回描き直す。 */
export interface SakuraLook {
  view: SakuraView;
  gaze: number;
  bird: 'sakura' | 'fake';
  /** 尻尾の長さ（本物 1.3、そっくりさん 0.5）。 */
  tail: number;
  /** 羽ばたき 0..1（横向き）。 */
  flap: number;
  /** 正面で羽を広げる 0..1。 */
  spread: number;
  /** 跳ねて地面から浮いている高さ（scale 1 あたりの px）。 */
  lift: number;
  /** つぶれ（着地・しゃがむ）。 */
  squash: number;
  /** ポーズ（予兆 → ポーズ）。 */
  pose: PoseId | null;
  posePhase: 'omen' | 'pose';
  /** 予兆・ポーズの中での経過 0..1。 */
  poseT: number;
}

/** 尻尾の長さ。本物は長く、そっくりさんは短い（2 めんで見分けるところ）。 */
export const TAIL_REAL = 1.3;
export const TAIL_FAKE = 0.5;

export const defaultLook = (): SakuraLook => ({
  view: 'front',
  gaze: 0,
  bird: 'sakura',
  tail: TAIL_REAL,
  flap: 0,
  spread: 0,
  lift: 0,
  squash: 0,
  pose: null,
  posePhase: 'omen',
  poseT: 0
});

// --- 小物 -------------------------------------------------------------------

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#fff6b0'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(170,120,40,0.8)';
  ctx.lineWidth = Math.max(0.5, r * 0.08);
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 === 0 ? r : r * 0.32;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function word(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#4a3326', rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(2, size * 0.28);
  ctx.strokeText(s, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

/** どんぐり。(x, y) が中心、r が半径。 */
export function drawAcorn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#b9763a';
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = Math.max(0.5, r * 0.14);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.78, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a5434';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.45, r * 0.95, r * 0.5, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(r * 0.15, -r * 1.35);
  ctx.stroke();
  ctx.restore();
}

/** 雪の結晶。 */
export function drawFlake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.8, r * 0.16);
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(80,140,210,0.8)';
  ctx.shadowBlur = r * 0.4;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    ctx.moveTo(0, 0);
    ctx.lineTo(cx * r, sy * r);
    const bx = cx * r * 0.55;
    const by = sy * r * 0.55;
    for (const d of [-0.6, 0.6]) {
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + d) * r * 0.3, by + Math.sin(a + d) * r * 0.3);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function note(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#d94d78';
  ctx.strokeStyle = '#d94d78';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2.3, -0.8);
  ctx.lineTo(2.3, -10);
  ctx.quadraticCurveTo(5, -8, 6, -5);
  ctx.stroke();
  ctx.restore();
}

/** 雪の小山（ずぼっ と頭をつっこむ）。(x, y) が足元の中心。 */
function snowMound(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -14, 0, 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d9e6f2');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(110,135,165,0.7)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-19, 2);
  ctx.quadraticCurveTo(-17, -10, -7, -13);
  ctx.quadraticCurveTo(0, -16, 7, -13);
  ctx.quadraticCurveTo(17, -10, 19, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- 本体 -------------------------------------------------------------------

/**
 * さくらちゃん（またはそっくりさん）を (x, footY) = 足元 に、大きさ s で描く。
 * t はアニメーション用の時間（ポーズの中の動きは look.poseT で決まる）。
 */
export function drawSakuraActor(ctx: CanvasRenderingContext2D, x: number, footY: number, s: number, look: SakuraLook, t: number): void {
  const o: SakuraOptions = {
    view: look.view,
    gaze: look.gaze,
    scale: s,
    bird: look.bird,
    tail: look.tail,
    flap: look.flap,
    spread: look.spread,
    squash: look.squash,
    shadow: false
  };
  // 影は、跳ねていても足元の地面に落とす
  ctx.fillStyle = 'rgba(40,70,110,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, footY - 0.6 * s, 12 * s, 2.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  let y = footY - look.lift * s;
  const p = look.poseT;
  const pose = look.pose;
  const omen = look.posePhase === 'omen';
  const front = (): void => {
    o.view = 'front';
    o.gaze = 0;
  };

  let after: (() => void) | null = null;
  let before: (() => void) | null = null;

  if (pose !== null) {
    const hx = x;
    const hy = y - 22 * s; // 頭のあたり
    switch (pose) {
      case 'yawn':
        front();
        if (omen) {
          o.eyes = 'sleepy';
          o.rotate = Math.sin(t * 2.4) * 0.05;
        } else {
          o.eyes = 'closed';
          o.yawn = true;
          o.up = true;
          o.squash = -0.08 * Math.sin(Math.min(1, p * 1.4) * Math.PI);
          after = () => {
            ctx.fillStyle = 'rgba(140,200,255,0.9)';
            ctx.beginPath();
            ctx.ellipse(hx + 9.5 * s, hy + 3.5 * s, 1.1 * s, 1.6 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            word(ctx, 'ふわぁ', hx + 18 * s, hy - 8 * s, 5.2 * s);
          };
        }
        break;
      case 'sneeze':
        front();
        if (omen) {
          o.up = true;
          after = () => {
            ctx.strokeStyle = '#d94d78';
            ctx.lineWidth = 0.7 * s;
            ctx.beginPath();
            for (const d of [-1, 1]) {
              const wob = Math.sin(t * 30 + d) * 0.6 * s;
              ctx.moveTo(hx + d * 3 * s, hy + 6 * s + wob);
              ctx.lineTo(hx + d * 5.5 * s, hy + 5 * s - wob);
            }
            ctx.stroke();
            word(ctx, 'むず…', hx + 15 * s, hy - 6 * s, 4.2 * s, '#8a5a6a');
          };
        } else {
          o.eyes = 'squint';
          o.squash = 0.14;
          o.beakOpen = true;
          y += 1.5 * s;
          after = () => {
            ctx.strokeStyle = 'rgba(217,77,120,0.8)';
            ctx.lineWidth = 0.9 * s;
            ctx.beginPath();
            for (let k = 0; k < 9; k++) {
              const a = -Math.PI * 0.95 + (k / 8) * Math.PI * 0.9;
              const r0 = (19 + p * 3) * s;
              const r1 = (24 + p * 6) * s;
              ctx.moveTo(hx + Math.cos(a) * r0, hy + 8 * s + Math.sin(a) * r0 * 0.9);
              ctx.lineTo(hx + Math.cos(a) * r1, hy + 8 * s + Math.sin(a) * r1 * 0.9);
            }
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            for (let k = 0; k < 5; k++) {
              ctx.beginPath();
              ctx.arc(hx + (k - 2) * 4 * s, hy + (16 + p * 8 + (k % 2) * 3) * s, (1 + (k % 2)) * s * 0.6, 0, Math.PI * 2);
              ctx.fill();
            }
            word(ctx, 'くしゅん！', hx, hy - 16 * s, 5.6 * s, '#d94d78', -0.08);
          };
        }
        break;
      case 'stretch':
        front();
        if (omen) {
          x += Math.sin(t * 60) * 0.5 * s;
          after = () => {
            ctx.strokeStyle = 'rgba(94,52,72,0.7)';
            ctx.lineWidth = 0.7 * s;
            ctx.beginPath();
            for (const d of [-1, 1]) {
              for (let k = 0; k < 2; k++) {
                const xx = hx + d * (17 + k * 3) * s;
                ctx.moveTo(xx, hy + 8 * s);
                ctx.lineTo(xx + d * 1.5 * s, hy + 11 * s);
                ctx.lineTo(xx, hy + 14 * s);
                ctx.lineTo(xx + d * 1.5 * s, hy + 17 * s);
              }
            }
            ctx.stroke();
          };
        } else {
          const k = Math.sin(Math.min(1, p * 1.3) * Math.PI * 0.5);
          o.spread = 0.4 + 0.6 * k;
          o.squash = -0.14 * k;
          o.eyes = 'happy';
          o.up = true;
          after = () => word(ctx, 'のびー', hx, hy - 16 * s, 5.4 * s);
        }
        break;
      case 'dive':
        if (omen) {
          o.view = 'front';
          o.gaze = 0.6;
          o.rotate = Math.sin(t * 14) * 0.12;
          before = () => snowMound(ctx, x + 22 * s, footY, s * 0.8);
        } else {
          // 雪の小山に頭からつっこんで、お尻と尻尾だけが出ている
          o.view = 'back';
          o.rotate = Math.PI * 0.92;
          const mx = x + 4 * s;
          x = mx;
          y = footY - 27 * s + Math.sin(t * 20) * 0.4 * s;
          after = () => {
            snowMound(ctx, mx, footY, s * 0.85);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            for (let k = 0; k < 7; k++) {
              const a = -Math.PI * (0.15 + (k / 6) * 0.7);
              const r = (10 + p * 14 + (k % 3) * 3) * s;
              ctx.beginPath();
              ctx.arc(mx + Math.cos(a) * r, footY - 12 * s + Math.sin(a) * r * 0.7, (0.9 + (k % 2) * 0.7) * s, 0, Math.PI * 2);
              ctx.fill();
            }
            word(ctx, 'ずぼっ', mx + 18 * s, footY - 34 * s, 5.4 * s);
          };
        }
        break;
      case 'roll':
        if (omen) {
          front();
          o.squash = 0.24;
          o.eyes = 'squint';
          after = () => word(ctx, 'ぐっ', hx + 14 * s, hy - 2 * s, 4.6 * s, '#8a5a6a');
        } else {
          o.view = 'right';
          o.rotate = p * Math.PI * 2;
          // 足元ではなく体のまん中を中心に回る
          y -= Math.sin(p * Math.PI) * 8 * s + 17.5 * (1 - Math.cos(o.rotate)) * s;
          x += (p - 0.5) * 16 * s - 17.5 * Math.sin(o.rotate) * s;
          after = () => {
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.1 * s;
            ctx.beginPath();
            ctx.arc(x, y - 16 * s, 21 * s, -Math.PI * 0.95 + p * 6, -Math.PI * 0.35 + p * 6);
            ctx.stroke();
            word(ctx, 'くるりん', x, y - 44 * s, 5 * s);
          };
        }
        break;
      case 'nut':
        front();
        if (omen) {
          o.up = true;
          o.gaze = 0.3;
          const fall = Math.min(1, p);
          after = () => drawAcorn(ctx, hx + 3 * s, hy - (34 - fall * 24) * s, 3 * s, t * 6);
        } else {
          o.eyes = 'happy';
          o.puff = 0.35;
          after = () => {
            drawAcorn(ctx, hx, hy + 6.5 * s, 3 * s, 0.4);
            sparkle(ctx, hx + 13 * s, hy - 10 * s, 3.6 * s);
          };
        }
        break;
      case 'sing':
        front();
        if (omen) {
          o.puff = 0.25 + 0.15 * Math.sin(t * 6);
          o.up = true;
          o.squash = -0.05;
        } else {
          o.beakOpen = true;
          o.up = true;
          o.eyes = 'happy';
          after = () => {
            for (let k = 0; k < 3; k++) {
              const q = (p * 1.6 + k * 0.33) % 1;
              note(ctx, hx + (8 + k * 7 + q * 8) * s, hy - (2 + q * 22) * s, s * (0.55 + 0.1 * k));
            }
          };
        }
        break;
      case 'doze':
        front();
        if (omen) {
          o.eyes = 'sleepy';
          o.rotate = Math.max(0, Math.sin(t * 3.2)) * 0.18;
        } else {
          o.eyes = 'closed';
          o.rotate = 0.22;
          o.squash = 0.08;
          after = () => {
            ctx.strokeStyle = 'rgba(140,200,255,0.9)';
            ctx.fillStyle = 'rgba(220,240,255,0.55)';
            ctx.lineWidth = 0.6 * s;
            const r = (1.8 + 1.2 * Math.sin(t * 3)) * s;
            ctx.beginPath();
            ctx.arc(hx + 4 * s, hy + 9 * s, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            word(ctx, 'Z', hx + 14 * s, hy - 6 * s, 4.4 * s, '#5a78a8');
            word(ctx, 'z', hx + 20 * s, hy - 13 * s, 3.4 * s, '#5a78a8');
          };
        }
        break;
      case 'wink':
        front();
        if (omen) {
          after = () => {
            const k = 0.5 + 0.5 * Math.sin(t * 16);
            sparkle(ctx, hx - 6 * s, hy + 1 * s, (1 + k * 1.2) * s, '#ffffff');
          };
        } else {
          o.eyes = 'wink';
          o.blush = 0.6;
          after = () => {
            sparkle(ctx, hx + 14 * s, hy - 4 * s, 4.2 * s);
            sparkle(ctx, hx + 19 * s, hy + 4 * s, 2.4 * s);
          };
        }
        break;
      case 'puff':
        front();
        if (omen) {
          after = () => {
            ctx.strokeStyle = 'rgba(120,170,220,0.85)';
            ctx.lineWidth = 0.9 * s;
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              const yy = hy + (k * 7 - 2) * s;
              const xx = hx - 30 * s + ((t * 40 + k * 9) % 18) * s;
              ctx.moveTo(xx, yy);
              ctx.quadraticCurveTo(xx + 8 * s, yy - 3 * s, xx + 14 * s, yy);
            }
            ctx.stroke();
            word(ctx, 'ひゅー', hx - 24 * s, hy - 10 * s, 4.2 * s, '#5a78a8');
          };
        } else {
          o.squash = 0.26;
          o.scale = s * 1.12;
          before = () => {
            // もふもふの毛
            ctx.fillStyle = '#fbe1e8';
            ctx.strokeStyle = 'rgba(94,52,72,0.55)';
            ctx.lineWidth = 0.6 * s;
            for (let k = 0; k < 14; k++) {
              const a = (k / 14) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(x + Math.cos(a) * 17 * s, footY - 13 * s + Math.sin(a) * 12 * s, 3 * s, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          };
          after = () => word(ctx, 'もふっ', hx + 20 * s, hy - 8 * s, 5 * s);
        }
        break;
      case 'catch':
        front();
        o.up = true;
        if (omen) {
          after = () => drawFlake(ctx, hx + (6 - p * 6) * s + Math.sin(t * 3) * 3 * s, hy - (40 - p * 18) * s, 4.4 * s, t);
        } else {
          o.beakOpen = true;
          o.eyes = 'happy';
          after = () => {
            drawFlake(ctx, hx, hy + 1 * s, 3.6 * s, t * 0.5);
            sparkle(ctx, hx - 13 * s, hy - 10 * s, 3 * s);
          };
        }
        break;
      case 'surprise':
        front();
        if (omen) {
          o.gaze = -0.8;
          after = () => word(ctx, 'がさっ', hx - 26 * s, hy - 4 * s + Math.sin(t * 40) * 0.6 * s, 4.6 * s, '#6a8a4a', -0.2);
        } else {
          o.eyes = 'shock';
          o.spread = 0.7;
          y -= Math.sin(Math.min(1, p * 1.2) * Math.PI) * 14 * s;
          after = () => word(ctx, '！', hx + 15 * s, y - 34 * s, 8 * s, '#d94d78');
        }
        break;
    }
  }

  before?.();
  drawSakura(ctx, x, y - 16 * (o.scale ?? s), o);
  after?.();
}
