import { CELL, ROW_WATER_FIRST, ROW_ROAD_FIRST, WIDTH, mod, rowY } from './constants';

export type LaneKind = 'car' | 'truck' | 'log' | 'turtle';

export interface LaneDef {
  readonly row: number;
  readonly kind: LaneKind;
  /** px/秒。正 = 右へ、負 = 左へ。 */
  readonly speed: number;
  /** オブジェクトの幅（セル数）。 */
  readonly cells: number;
  /** 1 レーンに配置する個数。 */
  readonly count: number;
  /** オブジェクトの開始位置どうしの間隔（px）。 */
  readonly spacing: number;
  /**
   * 1 周の長さ（px）。省略時は spacing * count で、全台が等間隔に並ぶ。
   * spacing * count より長くすると、車間はそのままで 1 周に 1 か所だけ
   * 大きな空きができる（台数を間引いて難易度を下げるときに使う）。
   */
  readonly period?: number;
  /** 初期位置のずらし（px）。 */
  readonly offset: number;
  /** 潜る亀にするインデックス（kind === 'turtle' のときのみ）。 */
  readonly divers?: readonly number[];
  readonly color: string;
}

export interface LaneObject {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** 亀の潜り状態。丸太・車は常に 'up'。 */
  readonly dive: DiveState;
  /** 乗れるか（水面レーンのみ意味を持つ）。 */
  readonly rideable: boolean;
}

export type DiveState = 'up' | 'sinking' | 'under' | 'rising';

/**
 * レーン定義。
 * spacing * count は「画面幅 + オブジェクト幅」以上にして、
 * 折り返し時に必ず画面外から現れるようにしている。
 */
export const LANES: readonly LaneDef[] = [
  // --- 川（上側）---
  { row: ROW_WATER_FIRST + 0, kind: 'log', speed: 75, cells: 3, count: 3, spacing: 230, offset: 0, color: '#8a5a33' },
  { row: ROW_WATER_FIRST + 1, kind: 'turtle', speed: -90, cells: 3, count: 4, spacing: 175, offset: 60, divers: [1, 3], color: '#3fa36b' },
  { row: ROW_WATER_FIRST + 2, kind: 'log', speed: 55, cells: 5, count: 2, spacing: 380, offset: 140, color: '#9a663a' },
  { row: ROW_WATER_FIRST + 3, kind: 'log', speed: 105, cells: 2, count: 4, spacing: 155, offset: 30, color: '#7d5130' },
  { row: ROW_WATER_FIRST + 4, kind: 'turtle', speed: -80, cells: 2, count: 4, spacing: 160, offset: 100, divers: [0], color: '#46b077' },

  // --- 道路（下側）---
  // 難易度調整のため各レーン 1 台ずつ間引いている。period は間引く前の
  // spacing * count のまま据え置き、車間を変えずに 1 台ぶんの空きを作る。
  { row: ROW_ROAD_FIRST + 0, kind: 'car', speed: -170, cells: 1, count: 3, spacing: 160, period: 640, offset: 0, color: '#f0d24a' },
  { row: ROW_ROAD_FIRST + 1, kind: 'truck', speed: 110, cells: 2, count: 2, spacing: 220, period: 660, offset: 80, color: '#d8dee9' },
  { row: ROW_ROAD_FIRST + 2, kind: 'car', speed: -130, cells: 1, count: 2, spacing: 200, period: 600, offset: 40, color: '#7ad3ff' },
  { row: ROW_ROAD_FIRST + 3, kind: 'car', speed: 150, cells: 1, count: 3, spacing: 150, period: 600, offset: 20, color: '#ff7a7a' },
  { row: ROW_ROAD_FIRST + 4, kind: 'car', speed: -95, cells: 1, count: 2, spacing: 210, period: 630, offset: 120, color: '#c39bff' }
];

const DIVE_CYCLE = 7.5;

/** 潜る亀の状態を時刻から求める。 */
function diveStateAt(t: number, phase: number): DiveState {
  const p = mod(t + phase, DIVE_CYCLE);
  if (p < 4.2) return 'up';
  if (p < 5.1) return 'sinking';
  if (p < 6.6) return 'under';
  return 'rising';
}

/** 1 周の長さ。period 未指定なら全台が等間隔になる長さ。 */
export const lanePeriod = (lane: LaneDef): number => lane.period ?? lane.spacing * lane.count;

/**
 * 指定レーンのオブジェクト矩形を求める。
 * 位置はレーン全体をスクロールさせ、1 周の長さで折り返すだけなので
 * 生成・破棄が不要でメモリも一定。
 */
export function laneObjects(lane: LaneDef, elapsed: number, speedMul: number): LaneObject[] {
  const w = lane.cells * CELL;
  const total = lanePeriod(lane);
  const scroll = lane.offset + lane.speed * speedMul * elapsed;
  const y = rowY(lane.row);
  const out: LaneObject[] = [];

  for (let i = 0; i < lane.count; i++) {
    const x = mod(i * lane.spacing + scroll, total) - w;
    let dive: DiveState = 'up';
    if (lane.kind === 'turtle' && lane.divers?.includes(i)) {
      dive = diveStateAt(elapsed, i * 1.9 + lane.row * 0.7);
    }
    out.push({ index: i, x, y, w, h: CELL, dive, rideable: dive !== 'under' });
  }
  return out;
}

export const isWaterLane = (lane: LaneDef): boolean =>
  lane.kind === 'log' || lane.kind === 'turtle';

/** レーン定義の自己診断（開発時のみ使用）。 */
export function validateLanes(): string[] {
  const errors: string[] = [];
  for (const lane of LANES) {
    const period = lanePeriod(lane);

    // 1 周が画面より短いと、車が画面の中で急に現れたり消えたりする。
    const need = WIDTH + lane.cells * CELL;
    if (period < need) {
      errors.push(`row ${lane.row}: period=${period} < 画面幅+車幅=${need}`);
    }

    // 1 周が spacing * count より短いと、折り返し部分の車間が詰まる。
    const minPeriod = lane.spacing * lane.count;
    if (period < minPeriod) {
      errors.push(`row ${lane.row}: period=${period} < spacing*count=${minPeriod}`);
    }
  }
  return errors;
}
