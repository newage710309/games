import { createCustomers, STAGES } from '../src/game/stages';
for (let seed = 1; seed <= 2000; seed++) {
  let state = seed;
  const random = (): number => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  for (let stage = 1; stage <= 3; stage++) {
    const customers = createCustomers(stage, random);
    const group = (kind: string): string => kind === 'enaga' || kind === 'yamagara' ? 'bird' : kind;
    const counts: Record<string, number> = {};
    for (const [i, c] of customers.entries()) {
      if (!c.refill) counts[group(c.kind)] = (counts[group(c.kind)] || 0) + 1;
      if (i >= 2 && group(c.kind) === group(customers[i - 1].kind) && group(c.kind) === group(customers[i - 2].kind)) throw Error('3連続');
      if (c.refill && (!c.refillSource || customers.indexOf(c.refillSource) < 0 || customers.indexOf(c.refillSource) >= i - 2 || c.kind !== c.refillSource.kind)) throw Error('おかわりの元');
    }
    if (customers.length !== STAGES[stage - 1].count) throw Error('人数');
    for (const [kind, count] of Object.entries(STAGES[stage - 1].groups)) if (counts[kind] !== count) throw Error('組み合わせ');
    if (customers.filter(c => c.refill).length !== STAGES[stage - 1].refills.length) throw Error('おかわり人数');
    if (customers.filter(c => c.hungry).length !== STAGES[stage - 1].hungry) throw Error('空腹人数');
    if (customers.filter(c => c.order).length !== STAGES[stage - 1].orders) throw Error('注文人数 seed=' + seed);
    const birds = customers.filter(c => !c.refill && group(c.kind) === 'bird');
    if (Math.abs(birds.filter(c => c.kind === 'enaga').length - birds.filter(c => c.kind === 'yamagara').length) > 1) throw Error('小鳥の種類');
  }
}
console.log('2000 seeds × 3 stages: counts, orders, hunger, refills and queue constraints OK');
