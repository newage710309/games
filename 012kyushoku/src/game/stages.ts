import type { FoodKind } from './food';
import type { KidKind } from './kids';
import { makeCustomer, type Customer } from './serving';

// ゲームバランスを調整するときは、このファイルの値を変更する。
export const AMOUNTS = [0.3, 0.55, 0.85] as const;
export const SPEED: Record<FoodKind, number> = {
  soup: 0.75, stew: 0.72, donguri: 0.58, ninjin: 0.58,
  aburaage: 0.58, honey: 0.38, kakigori: 0.58
};
export const LIMIT = 1.25;
/**
 * 食べない品（熱いものも）が、器の深さのこの割合より少なければ、入っていないものとして判定する。
 * 「こうかん」がないので、ちがう鍋をうっかり押しても、すぐ離せば取り返せるように。
 */
export const WRONG_TOLERANCE = 0.1;
export const SCORE = [100, 60, 20] as const;
/**
 * 評価の幅（ちょうどいい量からのずれ）：ぴったり・いいね・まあまあ。これを超えるとがっかり。
 * まあまあの幅は、1 段階まちがえた量（ずれ 0.25〜0.30）を少しずれて入れても、がっかりにしない広さにする。
 * がっかりは「はっきりした失敗」（2 段階ちがう、空のまま渡す など）だけにする。
 */
export const THRESHOLDS = [0.05, 0.12, 0.36] as const;
export const STAR_AVERAGES = [60, 75, 95] as const;
export const CLEAR_BONUS = 500;
export const FULL_BONUS = 500;
/**
 * 鍋がカタカタする基準。これから来る子の分（本体の鍋はさくらちゃんの分も）に足す、ゆとりの残りの割合。
 * ゆとりを半分より多く使ってしまったら、カタカタして知らせる。
 */
export const LOW_KEEP = 0.5;
export const FIRST_WAIT = 25;
export const WALK_TIME = 0.7;
export const BAD_TIME = 1.1;
export const EAT_TIME = 2.8;

// 小鳥はエナガとヤマガラを交互に割り当てる。おかわりは通常の人数とは別。
type Group = 'bird' | 'risu' | 'usagi' | 'kuma' | 'kitsune' | 'snowman';
export const STAGES: {
  foods: FoodKind[]; count: number;
  /**
   * 鍋のゆとり（器の深さに対する割合。鍋ごとに足す）。全員にぴったりよそえば、本体の鍋には
   * さくらちゃんの分（ふつう 0.55）＋ゆとりが残る。0.55 未満にして、残りが「あと 1人ぶん」と出るようにする。
   */
  slack: number;
  /** 器の目盛りの濃さ（1 = はっきり、名前つき）。 */
  marks: number;
  wait: number;
  groups: Partial<Record<Group, number>>; hungry: number; orders: number; refills: number[];
}[] = [
  { foods: ['soup'], count: 12, slack: 0.45, marks: 1, wait: 12,
    groups: { bird: 3, risu: 2, usagi: 4, kuma: 3 }, hungry: 3, orders: 0, refills: [] },
  { foods: ['soup', 'donguri', 'ninjin'], count: 15, slack: 0.35, marks: 0.75, wait: 14,
    groups: { bird: 4, risu: 5, usagi: 6 }, hungry: 4, orders: 0, refills: [] },
  { foods: ['stew', 'aburaage', 'honey', 'kakigori'], count: 18, slack: 0.25, marks: 0.55, wait: 16,
    groups: { bird: 4, kitsune: 5, kuma: 4, snowman: 2 }, hungry: 0, orders: 6, refills: [7, 12, 16] }
];

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 種類の人数を崩さずに条件を満たす順序を探索する。
// おかわりも行列の一員として、同種３連続の判定に含める。
export function createCustomers(stage: number, random: () => number): Customer[] {
  const config = STAGES[stage - 1];
  const fixed: Record<number, Group> = stage === 1
    ? { 0: 'bird', 1: 'usagi', 2: 'kuma', 3: 'risu', 4: 'bird', 5: 'usagi' }
    : stage === 2 ? { 0: 'bird', 1: 'risu', 2: 'bird' }
    : { 0: 'bird', 1: 'kitsune', 2: 'bird', 3: 'snowman', 4: 'bird' };
  // しかけを付けない場所：はじめての場面（注文・雪だるま・おかわりの最初の 1 回）の前後。2 回目からのおかわりの前後には付けてよい。
  const firstRefill = config.refills[0];
  const quiet = stage === 3 ? new Set([0, 2, 4, firstRefill - 1, firstRefill + 1]) : new Set<number>();
  const remaining = { ...config.groups };
  const order: Group[] = [];
  const sources = new Map<number, number>();
  const groupKeys = Object.keys(config.groups) as Group[];

  const arrange = (index: number): boolean => {
    if (index === config.count) return true;
    const refill = config.refills.includes(index);
    // 食べ終わった子がまだ席にいる範囲から、同じ子を二度選ばずに戻す。
    const choices = refill
      ? shuffle(Array.from({ length: 5 }, (_, i) => index - 3 - i).filter(i => i >= 0 && !config.refills.includes(i) && order[i] !== 'snowman' && ![...sources.values()].includes(i)), random)
      : shuffle(groupKeys.filter(group => (remaining[group] ?? 0) > 0 && (!fixed[index] || fixed[index] === group) && !(group === 'snowman' && quiet.has(index)) && !(group === 'snowman' && index < 3)), random);
    for (const choice of choices) {
      const source = refill ? choice as number : -1;
      const group = refill ? order[source] : choice as Group;
      if (index >= 2 && order[index - 1] === group && order[index - 2] === group) continue;
      order[index] = group;
      if (refill) sources.set(index, source);
      else remaining[group] = (remaining[group] ?? 0) - 1;
      if (arrange(index + 1)) return true;
      if (refill) sources.delete(index);
      else remaining[group] = (remaining[group] ?? 0) + 1;
      order.length = index;
    }
    return false;
  };
  if (!arrange(0)) throw new Error('客の人数と列の条件を両立できません');

  let birdNumber = random() < 0.5 ? 0 : 1;
  const customers: Customer[] = [];
  for (let i = 0; i < order.length; i++) {
    const sourceIndex = sources.get(i);
    if (sourceIndex !== undefined) {
      const source = customers[sourceIndex];
      const customer = makeCustomer(source.kind, stage, false, true);
      customer.refillSource = source;
      if (i === config.refills[0]) customer.hint = 'おかわりは ちょっとだけ';
      customers.push(customer);
    } else {
      const group = order[i];
      const kind: KidKind = group === 'bird' ? (birdNumber++ % 2 ? 'yamagara' : 'enaga') : group;
      customers.push(makeCustomer(kind, stage));
    }
  }
  if (stage === 1) {
    customers[4] = makeCustomer(customers[4].kind, stage, true);
    customers[4].hint = 'おなかが なってる子は 1だん おおめに';
  }
  if (stage === 3) {
    const c = customers[1];
    customers[1] = makeCustomer(c.kind, stage, false, false, { food: 'stew', level: 0 });
    customers.forEach(customer => { if (customer.refillSource === c) customer.refillSource = customers[1]; });
    customers[1].hint = 'ちゅうもんが あるときは ちゅうもんどおりに';
    customers[3].hint = 'ゆきだるまは かき氷だけ。あついものは だめ';
    const candidates = shuffle(customers.map((_, i) => i).filter(i => i > 4 && !quiet.has(i) && !customers[i].refill && customers[i].kind !== 'snowman'), random);
    for (const [n, i] of candidates.slice(0, config.orders - 1).entries()) {
      const previous = customers[i];
      const favorite: FoodKind | undefined = previous.kind === 'kitsune' ? 'aburaage' : previous.kind === 'kuma' ? 'honey' : undefined;
      const mode = n % 3;
      const orderSpec = favorite && mode === 1 ? { refuse: favorite }
        : { food: favorite && mode === 0 ? favorite : 'stew' as FoodKind, level: random() < 0.5 ? 0 : 2, refuse: mode === 2 ? favorite : undefined };
      const replacement = makeCustomer(previous.kind, stage, false, false, orderSpec);
      customers[i] = replacement;
      // 入れ替えた客を参照しているおかわりも、新しい客に結び直す。
      customers.forEach(c => { if (c.refillSource === previous) c.refillSource = replacement; });
    }
  } else {
    const already = stage === 1 ? 1 : 0;
    const candidates = shuffle(customers.map((_, i) => i).filter(i => i > (stage === 1 ? 5 : 2) && customers[i].kind !== 'kuma'), random);
    for (const i of candidates.slice(0, config.hungry - already)) customers[i] = makeCustomer(customers[i].kind, stage, true);
  }
  if (stage === 2) {
    // 好物も、スープと同じ量。リスとウサギの最初の 1 人で、それぞれ教える（おなかの音を付けたあとに決める）。
    customers[1].hint = 'リスは どんぐりも。スープと おなじ すくなめ';
    const usagi = customers.findIndex((c, i) => i > 1 && c.kind === 'usagi' && !c.hungry);
    if (usagi >= 0) customers[usagi].hint = 'ウサギは にんじんも。スープと おなじ ふつう';
  }
  return customers;
}
