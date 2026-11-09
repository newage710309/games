// ハイスコア・ポーズずかん・アルバムの保存。読み書きに失敗しても遊べるようにする（010 の storage.ts にならう）。

import { POSES, type PoseId } from './poses';
import type { Snapshot } from './world';

const PREFIX = 'sakura-shutter';
// v2：得点の × 10 をやめたので、前の計算のハイスコアとは比べない
const HI_KEY = `${PREFIX}.highscore.v2`;
const ZUKAN_KEY = `${PREFIX}.zukan.v1`;
const ALBUM_KEY = `${PREFIX}.album.v1`;

/** アルバムに残す枚数（古いものから消す）。 */
export const ALBUM_MAX = 48;

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HI_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    // プライベートウィンドウなどで localStorage が使えない場合。
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HI_KEY, String(score));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}

/** ずかんに登録したポーズ。 */
export function loadZukan(): Set<PoseId> {
  const set = new Set<PoseId>();
  try {
    const raw = localStorage.getItem(ZUKAN_KEY);
    if (raw === null) return set;
    const a: unknown = JSON.parse(raw);
    if (!Array.isArray(a)) return set;
    for (const v of a) if (POSES.some((p) => p.id === v)) set.add(v as PoseId);
  } catch {
    /* 読めなければ、まだ何も登録していないことにする。 */
  }
  return set;
}

export function saveZukan(set: Set<PoseId>): void {
  try {
    localStorage.setItem(ZUKAN_KEY, JSON.stringify([...set]));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}

/**
 * アルバムの 1 枚。写真の画像ではなく、撮った瞬間の場面の情報と枠の位置を残す（表示するときに描き直す）。
 */
export interface AlbumEntry {
  snap: Snapshot;
  fx: number;
  fy: number;
  score: number;
  /** 撮った日時（ミリ秒）。 */
  at: number;
}

/** 数字を小数 2 けたに丸め、速さ（v）など描き直しに要らないものを落として、保存を小さくする。 */
function compact(key: string, value: unknown): unknown {
  if (key === 'v') return undefined;
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  return value;
}

function isEntry(e: unknown): e is AlbumEntry {
  if (typeof e !== 'object' || e === null) return false;
  const o = e as Partial<AlbumEntry>;
  return (
    typeof o.fx === 'number' &&
    typeof o.fy === 'number' &&
    typeof o.score === 'number' &&
    typeof o.snap === 'object' &&
    o.snap !== null &&
    typeof o.snap.stage === 'number' &&
    o.snap.stage >= 1 &&
    o.snap.stage <= 3 &&
    Array.isArray(o.snap.actors) &&
    Array.isArray(o.snap.balls)
  );
}

export function loadAlbum(): AlbumEntry[] {
  try {
    const raw = localStorage.getItem(ALBUM_KEY);
    if (raw === null) return [];
    const a: unknown = JSON.parse(raw);
    if (!Array.isArray(a)) return [];
    return a.filter(isEntry).slice(-ALBUM_MAX);
  } catch {
    return [];
  }
}

export function saveAlbum(list: AlbumEntry[]): void {
  try {
    localStorage.setItem(ALBUM_KEY, JSON.stringify(list.slice(-ALBUM_MAX), compact));
  } catch {
    /* 保存できなくてもゲームは続行する。 */
  }
}
