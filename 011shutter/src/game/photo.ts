// 写真の採点。撮った瞬間の場面の情報（だれがどこに、どんな向き・ポーズ・速さでいたか）と枠の位置から計算する。
// 画像は解析しない。

import { FRAME_H, FRAME_W, groundY } from './constants';
import { POSES, type PoseId } from './poses';
import { PASS_SCORE, PHOTO, type ThemeKind } from './stages';
import { TINY_SCALE, actorScale, insideShape, occluders, type Actor, type Snapshot } from './world';

export interface PhotoResult {
  /** 写真の点数（ボーナス込み）。 */
  score: number;
  /** 写っている・大きさ・構図・隠れていない・ブレていない の点数。 */
  parts: { inFrame: number; size: number; composition: number; clear: number; sharp: number };
  facing: boolean;
  /** めずらしいポーズ（写っていたとき）。 */
  pose: PoseId | null;
  /** お題に合っている。 */
  theme: boolean;
  /** 写っていた子。 */
  subject: 'sakura' | 'fake' | null;
  /** いちばん大きかった減点の理由（ひとこと）。 */
  reason: string;
  /** こっそり雪だるまが写りこんでいる（エンディング用）。 */
  tiny: boolean;
}

/** 体の上に取る点（体の中心と大きさに対する割合）。7×7 の格子のうち、楕円の中のものだけ。 */
const SAMPLES: [number, number][] = [];
for (let i = 0; i < 7; i++) {
  for (let j = 0; j < 7; j++) {
    const u = (i / 6) * 2 - 1;
    const v = (j / 6) * 2 - 1;
    if (u * u + v * v <= 1.05) SAMPLES.push([u, v]);
  }
}

/** 体の中心と半径（画面座標）。 */
export function bodyOf(a: Actor): { cx: number; cy: number; rx: number; ry: number; s: number } {
  const s = actorScale(a);
  const lift = (a.lift ?? 0) + (a.look?.lift ?? 0);
  const foot = (a.y ?? groundY(Math.min(a.z, 1.12))) - lift * s;
  return { cx: a.x, cy: foot - 15.5 * s, rx: 13.5 * s, ry: 15 * s, s };
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

function inFrameFrac(a: Actor, fx: number, fy: number): number {
  const b = bodyOf(a);
  let n = 0;
  for (const [u, v] of SAMPLES) {
    const x = b.cx + u * b.rx;
    const y = b.cy + v * b.ry;
    if (x >= fx && x <= fx + FRAME_W && y >= fy && y <= fy + FRAME_H) n++;
  }
  return n / SAMPLES.length;
}

export function isFacing(a: Actor): boolean {
  const L = a.look;
  if (!L) return false;
  if (L.pose !== null) {
    const info = POSES.find((p) => p.id === L.pose);
    if (L.posePhase === 'pose') return info?.facing ?? false;
    return L.view === 'front' && Math.abs(L.gaze) <= 0.35 && (info?.facing ?? false);
  }
  return L.view === 'front' && Math.abs(L.gaze) <= 0.35;
}

function hasWings(a: Actor): boolean {
  const L = a.look;
  if (!L) return false;
  if (L.flap >= 0.55 && (L.view === 'left' || L.view === 'right')) return true;
  if (L.spread >= 0.5) return true;
  if (L.pose !== null && L.posePhase === 'pose') return POSES.find((p) => p.id === L.pose)?.wings ?? false;
  return false;
}

/**
 * 写っている子を選ぶ。本物のさくらちゃんが少しでも（PHOTO.minInFrame 以上）写っていれば本物。
 * そっくりさんがいっしょに写っていても「ちがう子」にはしない（まん中からずれる・手前で隠れる、で点が下がる）。
 * 本物が写っていないときだけ、いちばん目立つそっくりさんを返す。
 */
function pickSubject(snap: Snapshot, fx: number, fy: number): { a: Actor; frac: number } | null {
  const real = snap.actors.find((a) => a.kind === 'sakura');
  if (real) {
    const frac = inFrameFrac(real, fx, fy);
    if (frac >= PHOTO.minInFrame) return { a: real, frac };
  }
  let best: { a: Actor; frac: number; key: number } | null = null;
  const cx = fx + FRAME_W / 2;
  const cy = fy + FRAME_H / 2;
  for (const a of snap.actors) {
    if (a.kind !== 'fake') continue;
    const frac = inFrameFrac(a, fx, fy);
    if (frac < PHOTO.minInFrame) continue;
    const b = bodyOf(a);
    const d = Math.hypot((b.cx - cx) / (FRAME_W / 2), (b.cy - cy) / (FRAME_H / 2));
    const key = Math.min(frac, 0.9) - d * 0.12;
    if (best === null || key > best.key) best = { a, frac, key };
  }
  return best;
}

/** 写真を採点する。stage は面の番号（お題を決める）。 */
export function scorePhoto(snap: Snapshot, fx: number, fy: number, theme: ThemeKind): PhotoResult {
  const tinyActor = snap.actors.find((a) => a.kind === 'tiny');
  let tiny = false;
  if (tinyActor !== undefined) {
    // 枠に入っていて、手前のものに隠れていないこと（エンディングで丸をつけて見せるので）
    const ts = actorScale(tinyActor) * TINY_SCALE;
    const tx = tinyActor.x;
    const ty = groundY(tinyActor.z) - 18 * ts;
    const inside = tx > fx + 4 && tx < fx + FRAME_W - 4 && ty > fy + 4 && ty < fy + FRAME_H - 4;
    tiny = inside && !occluders(snap).some((sh) => sh.z > tinyActor.z + 0.01 && insideShape(sh, tx, ty));
    // さくらちゃんやそっくりさんのうしろに隠れていないこと
    for (const o of snap.actors) {
      if ((o.kind !== 'sakura' && o.kind !== 'fake') || o.z <= tinyActor.z) continue;
      const b = bodyOf(o);
      if (((tx - b.cx) / b.rx) ** 2 + ((ty - b.cy) / b.ry) ** 2 <= 1.2) tiny = false;
    }
  }
  const empty: PhotoResult = {
    score: 0,
    parts: { inFrame: 0, size: 0, composition: 0, clear: 0, sharp: 0 },
    facing: false,
    pose: null,
    theme: false,
    subject: null,
    reason: 'だれも いないよ',
    tiny
  };
  const pick = pickSubject(snap, fx, fy);
  if (pick === null) return empty;
  const a = pick.a;
  if (a.kind === 'fake') return { ...empty, subject: 'fake', reason: 'ちがう子だよ' };

  const b = bodyOf(a);
  // 大きさ（体の高さ ÷ 枠の高さ）
  const ratio = (b.ry * 2) / FRAME_H;
  let sizeK = 1;
  if (ratio < PHOTO.sizeIdealMin) sizeK = (ratio / PHOTO.sizeIdealMin) ** 1.7;
  else if (ratio > PHOTO.sizeIdealMax) sizeK = clamp01(1 - (ratio - PHOTO.sizeIdealMax) / (PHOTO.sizeTooBig - PHOTO.sizeIdealMax));
  const size = PHOTO.size * sizeK;
  // 構図（枠の中心からのずれ）
  const d = Math.hypot((b.cx - (fx + FRAME_W / 2)) / (FRAME_W / 2), (b.cy - (fy + FRAME_H / 2)) / (FRAME_H / 2));
  const composition = PHOTO.composition * clamp01(1 - (d - PHOTO.compFree) / (PHOTO.compZeroAt - PHOTO.compFree));
  // 隠れていない（体の上の点のうち、手前のものに重なっている割合）
  const shapes = occluders(snap).filter((sh) => sh.z > a.z + 0.02);
  let seen = 0;
  let hidden = 0;
  for (const [u, v] of SAMPLES) {
    const x = b.cx + u * b.rx;
    const y = b.cy + v * b.ry;
    if (x < fx || x > fx + FRAME_W || y < fy || y > fy + FRAME_H) continue;
    seen++;
    if (shapes.some((sh) => insideShape(sh, x, y))) hidden++;
  }
  let hideFrac = seen > 0 ? hidden / seen : 0;
  const whiteout = snap.flash > 0.2 ? snap.flash : 0;
  hideFrac = Math.max(hideFrac, whiteout);
  const clear = PHOTO.clear * clamp01(1 - hideFrac * 1.5);
  // 写っている：枠に入っていて、手前のものに隠れていない部分の割合（隠れた写真は大きく減る）
  const visible = pick.frac * (1 - hideFrac);
  const inFrame = PHOTO.inFrame * visible ** 1.6;
  const cutOff = 1 - pick.frac > pick.frac * hideFrac;
  // ブレていない
  const v = a.v ?? 0;
  const sharp = PHOTO.sharp * clamp01(1 - (v - PHOTO.blurFree) / (PHOTO.blurZeroAt - PHOTO.blurFree));

  const facing = isFacing(a);
  const L = a.look!;
  const pose = L.pose !== null && L.posePhase === 'pose' && visible >= 0.6 ? L.pose : null;
  const base = inFrame + size + composition + clear + sharp;
  const score = Math.round(base + (facing ? PHOTO.facingBonus : 0) + (pose ? PHOTO.poseBonus : 0));

  // いちばん大きかった減点
  const losses: [number, string][] = [
    [PHOTO.inFrame - inFrame, cutOff ? 'はみでてる' : whiteout >= hideFrac - 1e-6 && whiteout > 0 ? 'まっしろ…' : 'かくれてる'],
    [PHOTO.size - size, ratio < PHOTO.sizeIdealMin ? (ratio < 0.24 ? 'とおくて ちいさい' : 'ちょっと ちいさい') : 'ちかすぎ'],
    [PHOTO.composition - composition, 'まんなかから ずれてる'],
    [PHOTO.clear - clear, whiteout >= hideFrac - 1e-6 && whiteout > 0 ? 'まっしろ…' : 'かくれてる'],
    [PHOTO.sharp - sharp, 'ぶれちゃった']
  ];
  losses.sort((p, q) => q[0] - p[0]);
  const reason = losses[0]![0] > 3 ? losses[0]![1] : 'いい かんじ！';

  let themeOk = false;
  if (visible >= 0.6) {
    if (theme === 'facing') themeOk = facing;
    else if (theme === 'wings') themeOk = hasWings(a);
    else {
      const friends = snap.actors.filter((f) => f.kind === 'enaga' && (f.lift ?? 0) === 0 && inFrameFrac(f, fx, fy) >= 0.4).length;
      themeOk = (a.dango ?? false) && friends >= 2;
    }
  }

  return {
    score,
    parts: { inFrame, size, composition, clear, sharp },
    facing,
    pose,
    theme: themeOk,
    subject: 'sakura',
    reason,
    tiny
  };
}

/** お題に合って、面クリアになる写真か。 */
export const passes = (r: PhotoResult): boolean => r.theme && r.score >= PASS_SCORE;
