// 自動プレイのボット。腕前（枠を動かす速さ・シャッターまでの反応の遅さ・そっくりさんを見分けそこねる割合）を変えて、
// 難しさを確かめる（tools/bot.ts から使う）。

import { FRAME_H, FRAME_W } from './constants';
import { makeRng } from './field';
import type { Game } from './game';
import { bodyOf, scorePhoto, type PhotoResult } from './photo';
import { STAGE_TIME } from './stages';
import type { Actor, Snapshot } from './world';

export interface BotSkill {
  name: string;
  /** 枠を動かす速さ（px/秒）。 */
  speed: number;
  /** 見てからシャッターを押すまで（秒）。目で追うのも同じだけ遅れる。 */
  reaction: number;
  /** そっくりさんを本物とまちがえる割合（2 めん、ねらう子を選びなおすたび）。 */
  misId: number;
  /** ねらいのぶれ（px）。 */
  aimNoise: number;
  /** この点数を超えそうなら撮る（時間とフィルムの残りで下げていく）。 */
  want: number;
  /** とりあえず連打する（いい瞬間を待たない）。 */
  spam?: boolean;
}

export const SKILLS: BotSkill[] = [
  { name: 'はじめて', speed: 260, reaction: 0.5, misId: 0.35, aimNoise: 22, want: 70 },
  { name: 'ふつう', speed: 420, reaction: 0.32, misId: 0.15, aimNoise: 13, want: 80 },
  { name: 'じょうず', speed: 700, reaction: 0.2, misId: 0.04, aimNoise: 8, want: 90 }
];

export class Bot {
  private rng: () => number;
  /** ねらっている子（そっくりさんのこともある）。 */
  private targetFake = -1;
  private retargetIn = 0;
  /** 見えた位置の記録（反応の遅れのぶんだけ古いものを使う）。 */
  private seen: { t: number; x: number; y: number }[] = [];
  /** 押すと決めた時刻。 */
  private pressAt: number | null = null;
  private noiseX = 0;
  private noiseY = 0;
  private noiseIn = 0;

  constructor(
    readonly skill: BotSkill,
    seed: number
  ) {
    this.rng = makeRng(seed);
  }

  private target(snap: Snapshot): Actor | undefined {
    const fakes = snap.actors.filter((a) => a.kind === 'fake');
    if (this.targetFake >= 0 && fakes[this.targetFake]) return fakes[this.targetFake];
    return snap.actors.find((a) => a.kind === 'sakura');
  }

  /** ボットが思う点数（まちがえた子を本物だと思いこんでいるときは、入れかえて数える）。 */
  private estimate(game: Game, snap: Snapshot): PhotoResult {
    let s = snap;
    if (this.targetFake >= 0) {
      const fakes = snap.actors.filter((a) => a.kind === 'fake');
      const f = fakes[this.targetFake];
      if (f) {
        s = {
          ...snap,
          actors: snap.actors.map((a) => (a === f ? { ...a, kind: 'sakura' as const } : a.kind === 'sakura' ? { ...a, kind: 'fake' as const } : a))
        };
      }
    }
    return scorePhoto(s, game.frameX, game.frameY, game.stage.theme);
  }

  step(game: Game, dt: number): void {
    const f = game.field;
    const snap = game.view;
    if (!f || !snap) return;
    const t = f.t;
    // 面が変わると時刻が 0 にもどるので、前の面の記録を消す
    const last = this.seen[this.seen.length - 1];
    if (last && last.t > t) {
      this.seen = [];
      this.pressAt = null;
    }

    // ねらう子を選びなおす（2 めんは、ときどき そっくりさんと まちがえる）
    this.retargetIn -= dt;
    if (this.retargetIn <= 0) {
      this.retargetIn = 2 + this.rng() * 2;
      const nf = snap.actors.filter((a) => a.kind === 'fake').length;
      this.targetFake = nf > 0 && this.rng() < this.skill.misId ? Math.floor(this.rng() * nf) : -1;
    }
    const tg = this.target(snap);
    if (tg) {
      const b = bodyOf(tg);
      let x = b.cx;
      // だんごのときは、なかまもいっしょに入るように まん中をねらう
      const fr = snap.actors.filter((a) => a.kind === 'enaga' && (a.lift ?? 0) === 0);
      if (tg.dango && fr.length > 0) x = (b.cx + fr.reduce((s, a) => s + a.x, 0)) / (fr.length + 1);
      this.seen.push({ t, x, y: b.cy });
    }
    while (this.seen.length > 2 && this.seen[1]!.t <= t - this.skill.reaction) this.seen.shift();
    const look = this.seen[0];

    // 枠を、少し前に見えた位置へ動かす
    this.noiseIn -= dt;
    if (this.noiseIn <= 0) {
      this.noiseIn = 0.6 + this.rng() * 0.6;
      this.noiseX = (this.rng() * 2 - 1) * this.skill.aimNoise;
      this.noiseY = (this.rng() * 2 - 1) * this.skill.aimNoise;
    }
    if (look) {
      const gx = look.x + this.noiseX - FRAME_W / 2;
      const gy = look.y + this.noiseY - FRAME_H / 2;
      const dx = gx - game.frameX;
      const dy = gy - game.frameY;
      const d = Math.hypot(dx, dy);
      const st = this.skill.speed * dt;
      if (d <= st) game.moveFrame(dx, dy);
      else game.moveFrame((dx / d) * st, (dy / d) * st);
    }

    // シャッター：押すと決めてから、反応の遅れのあとで押す
    if (this.pressAt !== null) {
      if (t >= this.pressAt) {
        game.shoot();
        this.pressAt = null;
      }
      return;
    }
    if (game.wind > 0 || game.film === 0) return;
    if (this.skill.spam) {
      this.pressAt = t + this.skill.reaction;
      return;
    }
    const est = this.estimate(game, snap);
    const left = Math.max(0.1, STAGE_TIME - t);
    // 残り時間で撮れる見込みの枚数より、フィルムが多いほど、ねらいを下げる
    const chances = left / 4;
    const hurry = Math.max(0, game.film - chances) / Math.max(1, game.film);
    const need = game.themeOk ? this.skill.want - 25 * hurry : Math.min(this.skill.want, 72) - 20 * hurry;
    const themeWanted = !game.themeOk;
    let go = est.score >= need && (!themeWanted || est.theme || left < 6);
    if (est.pose && est.score >= 60) go = true;
    if (go) this.pressAt = t + this.skill.reaction;
  }
}
