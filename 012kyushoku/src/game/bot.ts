import { Game } from './game';
import { AMOUNTS, SPEED } from './stages';
import type { FoodKind } from './food';

// 誤差は秒単位。品の速度によって量の誤差が変わる。
export const SKILLS = {
  'はじめて': { error: 0.26, delay: 0.7, mistake: 0.08 },
  'ふつう': { error: 0.16, delay: 0.4, mistake: 0.04 },
  'じょうず': { error: 0.09, delay: 0.2, mistake: 0.015 },
  'もりすぎ': { error: 0.16, delay: 0.4, mistake: 0.04 }
} as const;
export type SkillName = keyof typeof SKILLS;

export class Bot {
  private target = -1;
  private remaining = 0;
  private delay = 0;
  private mistaken = false;
  private lastIndex = -1;
  private lastStage = -1;
  private planned: Partial<Record<FoodKind, number>> = {};
  private attemptedWrong = false;

  constructor(public game: Game, public skill: SkillName = 'ふつう') {}

  update(dt: number): void {
    const game = this.game;
    const skill = SKILLS[this.skill];
    if (game.screen === 'title') { game.startRun(); return; }
    if (game.screen === 'intro' || game.screen === 'result' || game.screen === 'demo') { game.advance(); return; }
    if (game.screen !== 'play' || game.walkTime > 0) return;
    const customer = game.current;
    if (!customer) return;
    if (this.lastIndex !== game.index || this.lastStage !== game.stage) {
      this.lastIndex = game.index;
      this.lastStage = game.stage;
      this.delay = skill.delay;
      this.target = -1;
      this.attemptedWrong = false;
      this.planned = { ...customer.wants };
      // 空腹または注文を見落とすと、通常の量をそのまま渡す。
      if ((customer.hungry || customer.order) && game.random() < skill.mistake) {
        const main = game.foods[0];
        if (this.planned[main] !== undefined) {
          const level = customer.kind === 'kuma' ? 2 : customer.kind === 'kitsune' || customer.kind === 'usagi' ? 1 : 0;
          this.planned[main] = AMOUNTS[level];
        }
      }
    }
    if (this.delay > 0) { this.delay -= dt; return; }
    if (this.target >= 0) {
      this.remaining -= dt;
      if (this.remaining <= 0 || game.hold !== this.target) {
        game.release(this.target);
        this.target = -1;
        this.mistaken = false;
        this.delay = skill.delay * 0.5;
      }
      return;
    }
    const next = game.foods.findIndex((food, i) => this.planned[food] !== undefined && game.bowls[i] === 0);
    // 鍋が空なら、よそえないのでそのまま渡す（「○○が なくなった！」になる）
    if (next < 0 || game.pots[next] <= 0.001) { game.serve(); return; }
    const wrong = !this.attemptedWrong && game.random() < skill.mistake
      ? game.foods.findIndex((food, i) => this.planned[food] === undefined && game.bowls[i] === 0) : -1;
    this.attemptedWrong = true;
    this.target = wrong >= 0 ? wrong : next;
    this.mistaken = wrong >= 0;
    const food = game.foods[this.target];
    const amount = (this.planned[food] ?? 0) + (this.skill === 'もりすぎ' ? 0.1 : 0);
    const timingError = (game.random() * 2 - 1) * skill.error;
    // ちがう鍋を押したときは、気づいてすぐ離す（判断の遅さの 2 割）。少しなら見のがしてもらえる。
    this.remaining = this.mistaken ? skill.delay * 0.2 : Math.max(0.01, amount / SPEED[food] + timingError);
    game.press(this.target);
  }
}
