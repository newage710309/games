import { drawPictureOnBranch, drawPictureSakuraFriends, drawPictureSnowDay } from './art';

export interface Stage {
  /** クリア時に表示する題名。 */
  readonly title: string;
  /** 隠れているイラスト（PICTURE の左上を原点に描く）。 */
  readonly drawPicture: (ctx: CanvasRenderingContext2D, t: number) => void;
  /** ブロックの色（いちばん上の段 → いちばん下の段へ補間する）。 */
  readonly colorTop: string;
  readonly colorBottom: string;
}

/**
 * 全 3 面。ブロックはどの面も 8 列 × 12 段で絵を全部おおう。
 * 難しさはブロックの並びではなく、ラケットの長さで変える（constants.ts）。
 */
export const STAGES: readonly Stage[] = [
  { title: 'ゆきのひ', drawPicture: drawPictureSnowDay, colorTop: '#4f86e8', colorBottom: '#a6d2ff' },
  { title: 'えだのうえで', drawPicture: drawPictureOnBranch, colorTop: '#7d62d0', colorBottom: '#c7b5ff' },
  { title: 'さくらちゃんとなかま', drawPicture: drawPictureSakuraFriends, colorTop: '#e8628f', colorBottom: '#ffbfd4' }
];

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 段ごとのブロックの色。上から下へだんだん明るくなる。 */
export function brickColor(stage: Stage, row: number, rows: number): string {
  const a = hexToRgb(stage.colorTop);
  const b = hexToRgb(stage.colorBottom);
  const t = rows <= 1 ? 0 : row / (rows - 1);
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
