import { Game } from './game';
import { WIDTH, HEIGHT, COUNTER_TOP, FRONT_X, QUEUE_Y, SAKURA_POS, SEAT_XS, SEAT_Y, bowlLayout, potLayout, type Rect } from './constants';
import { drawRoom, drawTableFront, drawCounter, drawTray, drawServeButton, drawHud, drawStageBanner, drawHint } from './kitchen';
import { drawKid, drawHungry, drawBubble, drawWaitGauge, drawRating, kidHeight } from './kids';
import { drawChef } from './chef';
import { drawBowl, drawPot, FOOD_NAME } from './food';
import { AMOUNTS, STAGES, WALK_TIME } from './stages';
import type { Customer } from './serving';
import { drawDemo } from './demo';
import { PAUSE_CONTINUE, PAUSE_SOUND, PAUSE_TITLE } from './input';
import { text, outlinedText, rr, COLOR } from './ui';

const FAILURES = {
  amount: 'りょうが あわなかったよ', wrong: 'ちがう たべものが あるよ',
  time: 'まちくたびれちゃった', hot: 'あついものは とけちゃうよ', empty: 'なべが なくなった！'
};

/** 鍋がなくなったときの、ひとこと（「スープが なくなった！」）。 */
const emptyLine = (game: Game): string => (game.emptyFood ? `${FOOD_NAME[game.emptyFood]}が なくなった！` : FAILURES.empty);
const LEVEL_NAME = ['すくなめ', 'ふつう', 'おおもり'];

/** がっかりの理由を、どうすればよかったかが分かるように 2 行で書く（量のずれのときだけ 2 行目を出す）。 */
function failureLines(game: Game): [string, string?] {
  const c = game.current;
  if (game.failure === 'empty') return [emptyLine(game), 'もりすぎると あとの子の ぶんが たりなくなるよ'];
  if (game.failure !== 'amount' || !c) return [FAILURES[game.failure ?? 'amount']];
  // がっかりの原因になった品：多めはがっかりにならないので、少なすぎた（または空の）品のうち、いちばんずれたもの
  let worst = -1;
  let worstDiff = -1;
  game.foods.forEach((f, i) => {
    const target = c.wants[f];
    if (target === undefined) return;
    const bowl = game.bowls[i] ?? 0;
    if (bowl > target) return;
    const d = target - bowl;
    if (d > worstDiff) { worstDiff = d; worst = i; }
  });
  if (worst < 0) return [FAILURES.amount];
  const food = game.foods[worst];
  const target = c.wants[food] ?? 0;
  const level = LEVEL_NAME[Math.max(0, AMOUNTS.findIndex((a) => Math.abs(a - target) < 0.001))];
  // 2 品以上ほしい子に、1 品を空のまま渡した：「あぶらあげも あげてね」
  const wanted = game.foods.filter((f) => c.wants[f] !== undefined).length;
  if (wanted >= 2 && (game.bowls[worst] ?? 0) <= 0.001) {
    return [`${FOOD_NAME[food]}も あげてね`, `${FOOD_NAME[food]}は 「${level}」 だったよ`];
  }
  const first = `${FOOD_NAME[food]}は 「${level}」 だったよ`;
  const why = c.order ? 'ちゅうもんを よく みてね'
    : c.refill ? 'おかわりは ちょっとだけ'
    : c.hungry ? 'おなかが なってる子は 1だん おおめ'
    : 'からだの おおきさで きめよう';
  return [first, why];
}

function shade(ctx: CanvasRenderingContext2D, alpha = 0.72): void {
  ctx.fillStyle = `rgba(10,18,38,${alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}
function button(ctx: CanvasRenderingContext2D, rect: Rect, label: string): void {
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fillStyle = '#f4dfba'; ctx.fill();
  ctx.strokeStyle = '#895c3d'; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2, 18, '#4a3326', true);
}

// 前の子の幅に次の子の幅を足して、列の座標を決める。
function queuePositions(customers: Customer[]): number[] {
  if (!customers.length) return [];
  const halfWidth = (customer: Customer): number => Math.max(22, kidHeight(customer.kind) * 0.44);
  const positions = [FRONT_X];
  for (let i = 1; i < customers.length; i++) {
    positions.push(positions[i - 1] + halfWidth(customers[i - 1]) + halfWidth(customers[i]) + 8);
  }
  return positions;
}

function scene(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.clock;
  drawRoom(ctx, game.stage, t);
  for (const r of game.results) {
    if (r.departing) {
      if (game.customers[game.index + 1]?.refillSource === r.customer && game.walkTime > 0) continue;
      drawKid(ctx, SEAT_XS[r.seat] + r.age * 90, SEAT_Y + r.age * 25, r.customer.kind, { size: 0.68, t });
    } else if (r.age >= 1) {
      const reaction = r.rating === 'ok' ? 'eat' : Math.floor(t * 2) % 2 ? 'eat' : 'happy';
      drawKid(ctx, SEAT_XS[r.seat], SEAT_Y, r.customer.kind, { size: 0.68, reaction, t });
    }
  }
  drawTableFront(ctx, game.stage);
  const progress = 1 - game.walkTime / WALK_TIME;
  const visible = game.customers.slice(game.index);
  const positions = queuePositions(visible);
  const previous = game.index > 0 ? queuePositions(game.customers.slice(game.index - 1)) : [];
  const queue = visible.slice(1);
  for (let i = queue.length - 1; i >= 0; i--) {
    const customer = queue[i];
    const target = positions[i + 1];
    const from = previous[i + 2] ?? target + 100;
    let x = target + (from - target) * (1 - progress);
    let y = QUEUE_Y;
    // ２番目のおかわりは奥の席から列に入る。
    if (i === 0 && customer.refill && game.walkTime > 0) {
      const old = game.results.find(r => r.departing && r.customer === customer.refillSource);
      if (old) {
        x = SEAT_XS[old.seat] + (target - SEAT_XS[old.seat]) * progress;
        y = SEAT_Y + (QUEUE_Y - SEAT_Y) * progress;
      }
    }
    if (x - kidHeight(customer.kind) * 0.5 > WIDTH) continue;
    drawKid(ctx, x, y, customer.kind, { tray: true, t });
    if (customer.hungry) drawHungry(ctx, x, y - kidHeight(customer.kind) - 12, t);
    if (customer.refill) drawBubble(ctx, 'ちょっとだけ！', x, y - kidHeight(customer.kind) - 22, x, y - kidHeight(customer.kind), 12);
  }
  // ミスのとき（がっかり → ゲームオーバー）は、さくらちゃんが驚いた顔になる
  const chefPose = game.screen === 'bad' || game.screen === 'over' ? 'shock'
    : game.screen === 'eat'
    ? game.sceneTime < 1.6 ? 'eat' : game.full ? 'full' : game.pots[0] > 0 ? 'little' : 'empty'
    : 'serve';
  drawChef(ctx, SAKURA_POS.x, SAKURA_POS.y, { pose: chefPose, food: game.foods[0], t: game.screen === 'bad' ? game.sceneTime : t });
  if (game.screen === 'bad' && game.failure === 'empty') {
    drawBubble(ctx, emptyLine(game), SAKURA_POS.x + 100, SAKURA_POS.y - 138, SAKURA_POS.x + 52, SAKURA_POS.y - 96, 16);
  }
  const customer = game.current;
  if (customer && ['play', 'bad', 'over'].includes(game.screen)) {
    const x = FRONT_X + ((previous[1] ?? FRONT_X + 100) - FRONT_X) * (1 - progress);
    const height = kidHeight(customer.kind);
    const reaction = game.screen === 'bad' || game.screen === 'over'
      ? game.failure === 'hot' ? 'melt' : 'sad' : game.time / game.waitMax < 0.25 ? 'fidget' : 'normal';
    drawKid(ctx, x, QUEUE_Y, customer.kind, { reaction, t });
    if (game.screen === 'bad') drawRating(ctx, x, QUEUE_Y - height - 25, 'bad', game.sceneTime);
    else if (game.screen === 'play' && game.walkTime <= 0) drawWaitGauge(ctx, x + 8, QUEUE_Y - height - 12, Math.max(0, game.time / game.waitMax));
    if (customer.bubble) drawBubble(ctx, customer.bubble, x, QUEUE_Y - height - 44, x, QUEUE_Y - height - 18, 13);
    // カウンターの子の「ぐぅ〜」は、さくらちゃんとのあいだ（左側）に大きく出す。2 番目の子と重ならない。
    if (customer.hungry) drawHungry(ctx, x - height * 0.35 - 40, QUEUE_Y - height * 0.6, t, 1.45);
  }
  for (const r of game.results.filter(item => !item.departing && item.age < 1)) {
    const x = FRONT_X + (SEAT_XS[r.seat] - FRONT_X) * r.age;
    const y = QUEUE_Y + (SEAT_Y - QUEUE_Y) * r.age;
    drawKid(ctx, x, y, r.customer.kind, { size: 0.8, reaction: 'happy', t });
    drawRating(ctx, x, y - kidHeight(r.customer.kind, 0.8) - 22, r.rating, r.age, r.points);
  }
  drawCounter(ctx, game.stage);
  drawTray(ctx);
  drawServeButton(ctx, game.bowls.some(value => value > 0), false, t);
  bowlLayout(game.foods.length).forEach((slot, i) => {
    const fill = game.screen === 'eat' && i === 0 ? Math.max(0, Math.min(game.pots[0], 0.55)) * Math.min(1, game.sceneTime / 1.2) : game.bowls[i] ?? 0;
    drawBowl(ctx, slot.bowl, { food: fill > 0 ? game.foods[i] : null, fill, marks: STAGES[game.stage - 1].marks, pouring: game.hold === i || (game.screen === 'eat' && i === 0 && game.sceneTime < 1.2), t });
  });
  potLayout(game.foods.length).forEach((pot, i) => {
    const food = game.foods[i];
    const remaining = Math.max(0, game.pots[i] ?? 0);
    drawPot(ctx, pot, food, {
      left: remaining / (game.initial[i] || 1), empty: remaining <= 0.001,
      low: game.low[i] ?? false, pressed: game.hold === i, keyLabel: String(i + 1), t
    });
  });
  drawHud(ctx, { stage: game.stage, score: Math.round(game.score), left: game.customers.length - game.index, total: game.customers.length, average: game.points.length ? game.average : null });
  if (game.screen === 'play' && customer?.hint && game.walkTime <= 0) drawHint(ctx, customer.hint, 65);
  if (game.screen === 'eat') drawHint(ctx, game.sceneTime < 1.6 ? 'さくらちゃんの きゅうしょく' : game.full ? 'おなかいっぱい！' : game.pots[0] > 0 ? 'すくなくて しょんぼり' : '空のお皿で しょんぼり', 75);
}

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (game.screen === 'demo' || game.screen === 'ending') { drawDemo(ctx, game.stage, game.sceneTime, game.screen === 'ending'); return; }
  scene(ctx, game);
  if (game.screen === 'play' && !game.paused || game.screen === 'bad' || game.screen === 'eat') return;
  const line = (label: string, y: number, size = 18): void => text(ctx, label, 240, y, size, COLOR.ink, true);
  if (game.paused) {
    shade(ctx, 0.72);
    outlinedText(ctx, 'ポーズ', 240, 185, 34, '#fff', '#2a3668');
    button(ctx, PAUSE_CONTINUE, 'つづける');
    button(ctx, PAUSE_SOUND, 'おと：' + (game.audio.muted ? 'OFF' : 'ON'));
    button(ctx, PAUSE_TITLE, 'タイトルへ');
    return;
  }
  if (game.screen === 'title') {
    // デザイン確認画面と同じ、給食室の上にタイトルを重ねる。
    drawRoom(ctx, 1, game.clock); drawTableFront(ctx, 1);
    drawKid(ctx, 230, QUEUE_Y, 'enaga', { tray: true, reaction: 'happy' });
    drawKid(ctx, 300, QUEUE_Y, 'kuma', { tray: true });
    drawKid(ctx, 372, QUEUE_Y, 'usagi', { tray: true });
    drawCounter(ctx, 1);
    drawChef(ctx, 120, 470, { pose: 'cheer', scale: 4, t: game.clock });
    drawPot(ctx, { x: 240, y: 522, w: 200, h: 110 }, 'soup', { left: 0.9, low: false, pressed: false, t: game.clock });
    ctx.fillStyle = 'rgba(10,18,38,0.82)'; ctx.fillRect(0, 0, WIDTH, 40);
    text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
    rr(ctx, 30, 66, 420, 136, 16); ctx.fillStyle = 'rgba(15,23,48,.85)'; ctx.fill();
    outlinedText(ctx, 'さくらちゃんの', 240, 100, 26, '#fff', '#2a3668');
    outlinedText(ctx, '給食当番', 240, 152, 44, '#f8c3d2', '#8a2f52');
    line('もりの がっこうの きゅうしょくしつ', 186, 13);
    ctx.fillStyle = 'rgba(10,18,38,.82)'; ctx.fillRect(0, 580, 480, 60);
    line('タップ / Space で はじめる', 596, 17);
    line('HI ' + Math.round(game.records.high) + '  ' + game.records.stars.map(n => '★'.repeat(n) + '☆'.repeat(3 - n)).join(' '), 622, 13);
    return;
  }
  if (game.screen === 'over') {
    // ゲームオーバー：上の場面（驚いたさくらちゃんと、しょんぼりした子）は暗くしすぎず、パネルはカウンターから下に出す
    shade(ctx, 0.25);
    ctx.fillStyle = 'rgba(10,18,38,0.55)';
    ctx.fillRect(0, COUNTER_TOP, WIDTH, HEIGHT - COUNTER_TOP);
  } else {
    shade(ctx, game.screen === 'intro' ? 0.45 : 0.68);
  }
  if (game.screen === 'intro') {
    drawStageBanner(ctx, game.stage, 170);
    drawHint(ctx, game.stage === 1 ? 'からだの おおきさで りょうを きめよう' : game.stage === 2 ? 'すきな たべものも よそおう' : 'ちゅうもんを よく みよう', 260);
    drawHint(ctx, 'なべを ながおし → どうぞ！', 300); line('タップで スタート', 580); return;
  }
  if (game.screen === 'result') {
    outlinedText(ctx, game.stage + 'めん クリア！', 240, 90, 30, '#fff', '#2a3668');
    line('★'.repeat(game.stars) + '☆'.repeat(3 - game.stars), 145, 36);
    rr(ctx, 60, 185, 360, 205, 14); ctx.fillStyle = 'rgba(15,23,48,.9)'; ctx.fill();
    (['perfect', 'good', 'ok'] as const).forEach((rating, i) => {
      const count = game.ratings.filter(r => r === rating).length;
      const points = game.ratings.reduce((sum, value, index) => sum + (value === rating ? game.ratingPoints[index] : 0), 0);
      line(['ぴったり！', 'いいね', 'まあまあ'][i] + ' × ' + count + '　' + Math.round(points) + 'てん', 215 + i * 30, 15);
    });
    line('さくらちゃん ' + (game.full ? 'おなかいっぱい +500' : 'のこり ' + (game.pots[0] > 0 ? 'すこし' : 'なし')), 315, 14);
    line('めんクリア +500', 350, 15);
    line('へいきん ' + Math.round(game.average) + 'てん　ごうけい ' + Math.round(game.score), 420, 15);
    drawChef(ctx, 240, 560, { pose: game.full ? 'full' : game.pots[0] > 0 ? 'little' : 'empty', scale: 3.2, t: game.clock });
    line('タップで つぎへ', 618, 14); return;
  }
  if (game.screen === 'over') {
    const [first, why] = failureLines(game);
    const top = 372;
    rr(ctx, 40, top, 400, why ? 228 : 200, 18);
    ctx.fillStyle = 'rgba(15,23,48,.95)'; ctx.fill();
    outlinedText(ctx, 'がっかり…', 240, top + 38, 32, '#8fb4ff', '#1a2b4a');
    line(first, top + 83, 16);
    if (why) text(ctx, why, 240, top + 110, 14, '#ffe38a', true);
    const y = top + (why ? 148 : 120);
    line(game.stage + 'めん ・ ' + Math.round(game.score) + 'てん', y, 14);
    line('タップで タイトルへ', y + 42, 15);
    // パネルの外（上）に、なくなったひとことの吹き出しを残す
    if (game.failure === 'empty') drawBubble(ctx, emptyLine(game), SAKURA_POS.x + 100, SAKURA_POS.y - 138, SAKURA_POS.x + 52, SAKURA_POS.y - 96, 16);
  }
}
