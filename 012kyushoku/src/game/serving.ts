import { FOOD_HOT, FOOD_NAME, type FoodKind } from './food';
import type { KidKind, Rating } from './kids';
import { AMOUNTS, SCORE, THRESHOLDS, WRONG_TOLERANCE } from './stages';

export interface Order {
  food?: FoodKind;
  level?: number;
  refuse?: FoodKind;
}
export interface Customer {
  kind: KidKind;
  level: number;
  hungry: boolean;
  refill: boolean;
  order?: Order;
  bubble?: string;
  hint?: string;
  refillSource?: Customer;
  /** 入れても入れなくてもよい品（おかわりの子の好物）。点には数えない。 */
  extras?: FoodKind[];
  wants: Partial<Record<FoodKind, number>>;
}
/** がっかりの理由。empty = 鍋がなくなって、その子の分をよそえなかった。 */
export type Failure = 'amount' | 'wrong' | 'time' | 'hot' | 'empty';

export function makeCustomer(kind: KidKind, stage: number, hungry = false, refill = false, order?: Order): Customer {
  let level = kind === 'kuma' ? 2 : kind === 'usagi' || kind === 'kitsune' ? 1 : 0;
  if (hungry) level = Math.min(2, level + 1);
  if (refill) level = 0;
  const main: FoodKind = stage === 3 ? 'stew' : 'soup';
  const wants: Partial<Record<FoodKind, number>> = {};
  if (kind === 'snowman' && !refill) wants.kakigori = AMOUNTS[1];
  else wants[main] = AMOUNTS[level];
  const favorite: Partial<Record<KidKind, FoodKind>> = {
    risu: 'donguri', usagi: 'ninjin', kitsune: 'aburaage', kuma: 'honey'
  };
  const food = favorite[kind];
  if (stage > 1 && !refill && food) wants[food] = AMOUNTS[level];
  // おかわり：シチューすくなめ。好物のある子は好物を少し入れても見のがす。吹き出しは「シチュー おかわり！」、好物のない鳥は「おかわり！」
  const extras = refill && food ? [food] : undefined;
  let bubble = refill ? (food ? `${FOOD_NAME[main]} おかわり！` : 'おかわり！') : undefined;
  if (order) {
    const lines: string[] = [];
    if (order.food !== undefined && order.level !== undefined) {
      wants[order.food] = AMOUNTS[order.level];
      lines.push(FOOD_NAME[order.food] + ' ' + ['すくなめ', 'ふつう', 'おおもり'][order.level] + '！');
    }
    if (order.refuse) {
      delete wants[order.refuse];
      lines.push(FOOD_NAME[order.refuse] + ' いらない');
    }
    bubble = lines.join(' ');
  }
  return { kind, level, hungry, refill, order, bubble, wants, extras };
}

// 品ごとの点を平均し、表示する評価は最も悪い品に合わせる。
// 多めによそったときは、どれだけ多くても「まあまあ」までで、がっかりにはしない。少なすぎるとがっかり。
// 少なすぎて、その鍋がもう空なら「なくなった」（failure: empty、emptyFood にその品）。
export function judge(
  customer: Customer,
  foods: FoodKind[],
  bowls: number[],
  pots: number[]
): { rating: Rating; points: number; failure?: Failure; emptyFood?: FoodKind } {
  if (customer.kind === 'snowman' && foods.some((f, i) => FOOD_HOT[f] && bowls[i] >= WRONG_TOLERANCE)) {
    return { rating: 'bad', points: 0, failure: 'hot' };
  }
  if (foods.some((f, i) => customer.wants[f] === undefined && !customer.extras?.includes(f) && bowls[i] >= WRONG_TOLERANCE)) {
    return { rating: 'bad', points: 0, failure: 'wrong' };
  }
  let worst = 0;
  let total = 0;
  let count = 0;
  for (let i = 0; i < foods.length; i++) {
    const target = customer.wants[foods[i]];
    if (target === undefined) continue;
    const diff = Math.abs(target - bowls[i]);
    const over = bowls[i] > target;
    // 食べる品を空のまま渡した、または少なすぎたら、がっかり
    if (bowls[i] <= 0.001 || (!over && diff > THRESHOLDS[2] + 0.000001)) {
      if (pots[i] <= 0.001) return { rating: 'bad', points: 0, failure: 'empty', emptyFood: foods[i] };
      return { rating: 'bad', points: 0, failure: 'amount' };
    }
    const rank = diff <= THRESHOLDS[0] + 0.000001 ? 0 : diff <= THRESHOLDS[1] + 0.000001 ? 1 : 2;
    worst = Math.max(worst, rank);
    total += SCORE[rank];
    count++;
  }
  return { rating: (['perfect', 'good', 'ok'] as const)[worst], points: total / count };
}
