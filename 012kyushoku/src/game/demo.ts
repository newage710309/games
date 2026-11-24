import { drawRoom, drawTableFront, drawCounter, drawTray, drawHint } from './kitchen';
import { drawChef } from './chef';
import { drawKid, drawBubble, heart, type KidKind } from './kids';
import { drawSnowman, drawSnowball } from './snowman';
import { drawPot, drawBowl, piece } from './food';
import { SEAT_XS, SEAT_Y, WIDTH, HEIGHT, bowlLayout, potLayout } from './constants';
import { STAGES } from './stages';
import { text, rr, drawSnowfall } from './ui';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const ease = (v: number): number => { const k = clamp01(v); return k * k * (3 - 2 * k); };

// 給食が終わったあとのカウンターも、普段と同じ道具を使って描く。
function drawCountertop(ctx: CanvasRenderingContext2D, stage: number, time: number): void {
  drawCounter(ctx, stage);
  drawTray(ctx);
  const foods = STAGES[stage - 1].foods;
  bowlLayout(foods.length).forEach(slot => drawBowl(ctx, slot.bowl, { food: null, fill: 0, marks: stage === 1 ? 1 : 0.35, t: time }));
  potLayout(foods.length).forEach((pot, i) => drawPot(ctx, pot, foods[i], {
    left: 0.14 + i * 0.03, low: false, pressed: false, t: time
  }));
}

// --- 1 めんのあと：ごちそうさま → ハート → あしたの こんだて -----------------------

const STAGE1_SEATS: KidKind[] = ['risu', 'usagi', 'enaga', 'kuma', 'yamagara', 'usagi'];

function drawStage1(ctx: CanvasRenderingContext2D, time: number): void {
  const thanks = time >= 2.4;
  const menu = time >= 6.4;
  if (menu) {
    // 黒板：あしたの こんだて（2 めんの予告）
    const k = ease((time - 6.4) / 0.5);
    ctx.save();
    ctx.globalAlpha = k;
    // 部屋の黒板（右上）を書きかえる。席の子より先に描いて、耳や頭が黒板の手前に出るようにする
    rr(ctx, 240, 62, 218, 96, 6); ctx.fillStyle = '#315c4d'; ctx.fill();
    text(ctx, 'あしたの こんだて', 349, 82, 15, '#ffffff', true);
    text(ctx, 'スープ・どんぐり・にんじん', 349, 106, 13, '#fff6c8', true);
    piece(ctx, 'donguri', 262, 84, 20, 0.2);
    piece(ctx, 'ninjin', 436, 84, 20, -0.3);
    ctx.restore();
  }
  // 席の子：はじめは食べていて、ごちそうさまで顔を上げる。献立が出たら、リスとウサギ（左の 2 人）は前へ出てくる
  STAGE1_SEATS.forEach((kind, i) => {
    if (menu && i < 2) return;
    drawKid(ctx, SEAT_XS[i], SEAT_Y, kind, { reaction: thanks ? 'happy' : 'eat', size: 0.65, t: time + i });
  });
  drawTableFront(ctx, 1);
  // 空になった器
  STAGE1_SEATS.forEach((_, i) => {
    if (menu && i < 2) return;
    drawBowl(ctx, { x: SEAT_XS[i] - 15, y: SEAT_Y - 24, w: 30, h: 18 }, { food: thanks ? null : 'soup', fill: thanks ? 0 : 0.4, marks: 0, t: time });
  });

  drawCountertop(ctx, 1, time);

  // さくらちゃん：ハートを受けとって照れる
  const shy = time >= 4.6;
  drawChef(ctx, 100, 318, { pose: shy ? 'full' : 'cheer', t: time });

  if (thanks && !menu) {
    drawBubble(ctx, 'ごちそうさまでした！', 300, 112, 300, 170, 18);
    // 各席からハートがふわっと飛んで、さくらちゃんのところへ
    STAGE1_SEATS.forEach((_, i) => {
      const p = clamp01((time - 3 - i * 0.18) / 1.5);
      if (p <= 0 || p >= 1) return;
      const sx = SEAT_XS[i], sy = SEAT_Y - 50;
      const x = sx + (110 - sx) * p;
      const y = sy + (220 - sy) * p - Math.sin(Math.PI * p) * 60;
      heart(ctx, x, y, 7 + Math.sin(p * Math.PI) * 3);
    });
  }
  if (shy && !menu) {
    drawBubble(ctx, 'えへへ…', 150, 190, 118, 232, 16);
    drawBubble(ctx, 'おいしかった！', SEAT_XS[3], 150, SEAT_XS[3], 172, 13);
  }

  if (menu) {
    // リスとウサギが席から前へ出てきて、ぴょんぴょん喜ぶ
    const walk = ease((time - 6.6) / 0.8);
    const kids: [KidKind, number, string][] = [['risu', 255, 'どんぐりだ！'], ['usagi', 335, 'にんじんも！']];
    kids.forEach(([kind, x0, say], i) => {
      const x = SEAT_XS[i] + (x0 - SEAT_XS[i]) * walk;
      const y = SEAT_Y + (318 - SEAT_Y) * walk;
      drawKid(ctx, x, y, kind, { reaction: 'happy', size: 0.65 + 0.35 * walk, hop: walk >= 1 ? (time * 2 + i * 0.5) % 1 : 0, t: time });
      if (time >= 7.6) drawBubble(ctx, say, x + (i ? 30 : -30), 205, x, 232, 14);
    });
  }
}

// --- エンディング：雪だるまが溶ける → 外で雪玉を足して作りなおす → 外で いただきます -----

function drawOutdoor(ctx: CanvasRenderingContext2D, time: number): void {
  // 夕方の空と星
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#2c3d78'); sky.addColorStop(1, '#c48ab4');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, 400);
  ctx.fillStyle = 'rgba(255,255,230,0.85)';
  for (let k = 0; k < 22; k++) {
    ctx.beginPath(); ctx.arc((k * 97.3) % WIDTH, 20 + (k * 53.1) % 180, 1 + (k % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  // 遠くの山
  ctx.fillStyle = '#e4ecf6';
  ctx.beginPath(); ctx.moveTo(0, 360);
  ctx.quadraticCurveTo(90, 270, 190, 340); ctx.quadraticCurveTo(300, 260, 400, 330); ctx.quadraticCurveTo(450, 300, 480, 320);
  ctx.lineTo(480, 400); ctx.lineTo(0, 400); ctx.fill();
  // 学校（左奥）：あかりのついた窓
  ctx.fillStyle = '#9c6b48'; ctx.fillRect(18, 262, 150, 110);
  ctx.fillStyle = '#c0504d';
  ctx.beginPath(); ctx.moveTo(8, 266); ctx.lineTo(93, 220); ctx.lineTo(178, 266); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(8, 266); ctx.lineTo(93, 220); ctx.lineTo(178, 266); ctx.lineTo(170, 260); ctx.lineTo(93, 228); ctx.lineTo(16, 260); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  for (const wx of [32, 80, 128]) ctx.fillRect(wx, 290, 26, 22);
  ctx.fillStyle = '#6e4a30'; ctx.fillRect(80, 330, 26, 42);
  // 雪の地面
  const ground = ctx.createLinearGradient(0, 372, 0, HEIGHT);
  ground.addColorStop(0, '#f2f6fb'); ground.addColorStop(1, '#cddbea');
  ctx.fillStyle = ground;
  ctx.beginPath(); ctx.moveTo(0, 380); ctx.quadraticCurveTo(240, 360, 480, 382); ctx.lineTo(480, HEIGHT); ctx.lineTo(0, HEIGHT); ctx.fill();
  drawSnowfall(ctx, time, HEIGHT, 30);
}

/** 雪玉を転がしてくる子。from → to を start〜end 秒で。 */
interface Roller { kind: KidKind; from: number; to: number; y: number; r: number; start: number; end: number; }
const ROLLERS: Roller[] = [
  { kind: 'enaga', from: -40, to: 262, y: 452, r: 16, start: 6.6, end: 7.8 },
  { kind: 'kitsune', from: 540, to: 338, y: 474, r: 22, start: 7.3, end: 8.8 },
  { kind: 'kuma', from: -70, to: 258, y: 500, r: 28, start: 8.2, end: 9.8 }
];
// 溶け具合：1 をこえると、さらに低くつぶれて水たまりが広がる
const SNOW_X = 300, SNOW_Y = 470, SNOW_S = 3.2, MELT = 1.8;

function drawEnding(ctx: CanvasRenderingContext2D, time: number): void {
  if (time < 6) {
    // 給食室：雪だるまがシチューの鍋ごと「おかわり！」→ 熱くて溶けてしまう
    drawRoom(ctx, 3, time);
    (['enaga', 'kitsune', 'kuma', 'risu', 'usagi', 'yamagara'] as KidKind[]).forEach((kind, i) =>
      drawKid(ctx, SEAT_XS[i], SEAT_Y, kind, { reaction: 'happy', size: 0.65, t: time + i }));
    drawTableFront(ctx, 3);
    drawCountertop(ctx, 3, time);
    const moving = clamp01((time - 0.5) / 2);
    const x = 245 + moving * 70;
    const melt = time < 2.5 ? 0 : Math.min(MELT, (time - 2.5) * 0.9);
    drawChef(ctx, 78, 318, { pose: time >= 2.5 && time < 4.2 ? 'shock' : 'serve', gaze: 1, t: time });
    drawKid(ctx, 155, 318, 'kitsune', { reaction: 'fidget', size: 0.7, t: time });
    drawKid(ctx, 450, 318, 'enaga', { reaction: time >= 2.5 ? 'sad' : 'happy', t: time });
    if (time >= 4.5) drawPot(ctx, { x: 362, y: 262, w: 72, h: 56 }, 'stew', { left: 0.25, low: false, pressed: false, t: time });
    drawSnowman(ctx, x, 318, { scale: 2.8, melt, lift: time < 4.5 ? 10 : 0 });
    if (time < 4.5) {
      drawPot(ctx, { x: x - 44, y: 195, w: 88, h: 72 }, 'stew', { left: 0.25, low: false, pressed: false, t: time });
      ctx.strokeStyle = '#7a5536'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 24, 275); ctx.lineTo(x - 48, 230); ctx.moveTo(x + 24, 275); ctx.lineTo(x + 48, 230); ctx.stroke();
      drawBubble(ctx, time < 2.5 ? 'おかわり！' : 'あついよ〜！', x, 145, x, 213, 15);
    } else {
      drawBubble(ctx, 'そとで ゆきを たして なおそう！', 200, 170, 96, 240, 15);
    }
    // 外へ：白くフェードアウト
    if (time > 5.4) { ctx.fillStyle = `rgba(255,255,255,${clamp01((time - 5.4) / 0.6)})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    drawHint(ctx, 'タップで つぎへ', 349);
    return;
  }

  drawOutdoor(ctx, time);
  const finale = time >= 11.4;

  // 雪玉が届くたびに、溶けた雪だるまが元にもどる
  let melt = MELT;
  ROLLERS.forEach(r => { melt -= (MELT / ROLLERS.length) * ease((time - r.end) / 0.45); });
  melt = Math.max(0, melt);

  // 見守る子（右手前）
  const watchers: [KidKind, number][] = [['risu', 392], ['usagi', 446]];
  if (!finale) watchers.forEach(([kind, x], i) => drawKid(ctx, x, 588, kind, { reaction: 'happy', hop: (time * 1.6 + i * 0.4) % 1, t: time }));

  if (!finale) {
    // 奥の列から順に：転がす子と雪玉
    const ordered = [...ROLLERS].sort((a, b) => a.y - b.y);
    for (const r of ordered) {
      if (r.y > SNOW_Y) continue;
      drawRoller(ctx, r, time);
    }
    drawSnowman(ctx, SNOW_X, SNOW_Y, { scale: SNOW_S, melt, grin: melt <= 0.01, lift: melt <= 0.01 ? 6 : 0 });
    for (const r of ordered) if (r.y > SNOW_Y) drawRoller(ctx, r, time);
    // 届いたときの「ぽふっ」
    ROLLERS.forEach(r => {
      const p = (time - r.end) / 0.5;
      if (p < 0 || p > 1) return;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - p)})`;
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(SNOW_X + Math.cos(a) * (20 + p * 40), SNOW_Y - 40 + Math.sin(a) * (14 + p * 26), 6 * (1 - p) + 2, 0, Math.PI * 2); ctx.fill();
      }
    });
    drawChef(ctx, 92, 574, { pose: 'cheer', gaze: 1, t: time });
    if (time < 7.4) drawBubble(ctx, 'みんなで ゆきだまを はこぼう！', 200, 440, 120, 500, 15);
    else if (time >= 10.6) drawBubble(ctx, 'もとに もどった！ ありがとう！', SNOW_X, 230, SNOW_X, 330, 15);
  } else {
    // みんなで 外で いただきます
    const row: [KidKind, number, number][] = [['enaga', 170, 470], ['kitsune', 220, 488], ['kuma', 398, 480], ['risu', 360, 520], ['usagi', 446, 512]];
    row.forEach(([kind, x, y], i) => {
      drawKid(ctx, x, y, kind, { reaction: 'eat', size: 0.85, t: time + i });
      drawBowl(ctx, { x: x - 13, y: y - 8, w: 26, h: 15 }, { food: 'stew', fill: 0.6, marks: 0, t: time });
    });
    drawSnowman(ctx, SNOW_X, SNOW_Y, { scale: SNOW_S, grin: true, lift: 6 });
    drawBowl(ctx, { x: SNOW_X - 22, y: SNOW_Y - 24, w: 44, h: 24 }, { food: 'kakigori', fill: 0.8, marks: 0, t: time });
    drawChef(ctx, 92, 574, { pose: 'eat', food: 'stew', t: time });
    drawBubble(ctx, 'みんなで いただきます！', 240, 250, 240, 290, 18);
    rr(ctx, 160, 568, 160, 50, 14); ctx.fillStyle = 'rgba(15,23,48,.86)'; ctx.fill();
    text(ctx, 'おしまい', 240, 593, 28, '#ffffff', true);
  }
  // 外に出た直後の白いフェードイン
  if (time < 6.6) { ctx.fillStyle = `rgba(255,255,255,${1 - clamp01((time - 6) / 0.6)})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
  if (!finale) drawHint(ctx, 'タップで つぎへ', 624);
}

function drawRoller(ctx: CanvasRenderingContext2D, r: Roller, time: number): void {
  if (time < r.start) return;
  const p = ease((time - r.start) / (r.end - r.start));
  const dir = r.to > r.from ? 1 : -1;
  const bx = r.from + (r.to - r.from) * p;
  // 押している子は雪玉のうしろ。届いたら、そのまま少し下がって見守る
  const kx = time < r.end ? bx - dir * (r.r + 22) : r.to - dir * (r.r + 22) - dir * 10 * ease((time - r.end) / 0.6);
  drawKid(ctx, kx, r.y, r.kind, { reaction: 'happy', hop: time < r.end ? (time * 2.2) % 1 : 0, t: time });
  if (time < r.end) drawSnowball(ctx, bx, r.y - r.r, r.r, (bx - r.from) / (r.r * 6) * dir);
}

// 時間に応じて人物を動かす。タップで途中からでも次へ進める。
export function drawDemo(ctx: CanvasRenderingContext2D, stage: number, time: number, ending: boolean): void {
  if (ending) { drawEnding(ctx, time); return; }
  drawRoom(ctx, stage, time);
  if (stage === 1) {
    drawStage1(ctx, time);
  } else {
    drawSeated2(ctx, stage, time);
    drawCountertop(ctx, stage, time);
    drawStage2(ctx, time);
  }
  drawHint(ctx, 'タップで つぎへ', 349);
}

// --- 2 めんのあと（変更なし）：あしたは ゆきまつり。雪だるまが こっそり近づく --------------

function drawSeated2(ctx: CanvasRenderingContext2D, stage: number, time: number): void {
  (['risu', 'usagi', 'enaga', 'kuma', 'yamagara', 'kitsune'] as KidKind[]).forEach((kind, i) => drawKid(ctx, SEAT_XS[i], SEAT_Y, kind, {
    reaction: time >= 2 ? 'eat' : 'happy', size: 0.65, t: time + i
  }));
  drawTableFront(ctx, stage);
}

function drawStage2(ctx: CanvasRenderingContext2D, time: number): void {
  // よそ見と振り向きを２回繰り返し、見られた間は雪だるまが止まる。
  const cycle = Math.min(time, 7.99);
  const looking = cycle >= 2 && cycle < 3 || cycle >= 5 && cycle < 6;
  const distance = Math.min(cycle, 2) * 14 + Math.min(Math.max(cycle - 3, 0), 2) * 14;
  const x = 480 - distance;
  drawChef(ctx, 100, 318, { pose: 'serve', gaze: looking ? 1 : -1, t: time });
  if (looking) drawBubble(ctx, '！', 132, 190, 110, 242, 18);
  rr(ctx, 55, 70, 370, 90, 12); ctx.fillStyle = '#315c4d'; ctx.fill();
  text(ctx, 'あしたは ゆきまつりの', 240, 100, 17, '#fff', true);
  text(ctx, 'とくべつ きゅうしょく', 240, 130, 17, '#fff', true);
  drawKid(ctx, 250, 318, 'risu', { tray: true });
  drawKid(ctx, 320, 318, 'usagi', { tray: true });
  drawSnowman(ctx, x, 318, { scale: 2.2, hop: looking ? 0 : Math.sin(time * 6), face: looking ? 0 : -1, grin: looking });
}
