// 画面を描く。状態は game.ts が持ち、ここは見せるだけ。
import { BIRD_SCALE, HEIGHT, WIDTH } from './constants';
import { drawBird } from './birds';
import { drawDemo } from './demo';
import { isTouchDevice } from './device';
import { JUMP_TIME, PAUSE_MENU, SELECT_BACK, THROWER, selectCard, type Button, type Game, type Phase } from './game';
import { orderOk, type Cell } from './rules';
import { drawSakura } from './sakura';
import {
  angleFor,
  drawBigWord,
  drawBranch,
  drawFeather,
  drawHud,
  drawPanel,
  drawQueue,
  drawSnowball,
  drawStageBackground,
  drawStar,
  drawThrower,
  say,
  type QueueItem,
  type SlotThing
} from './scene';
import { ALL_PUZZLES, STAGES } from './stages';
import { drawTitleScreen } from './title';
import { COLOR, blink, outlinedText, rr, text } from './ui';

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  switch (game.phase) {
    case 'title':
      drawTitleScreen(ctx, game.time, game.hiScore);
      return;
    case 'select':
      drawSelect(ctx, game);
      return;
    case 'demo':
      drawDemo(ctx, game.stageIndex === 0 ? 'break1' : 'break2', game.phaseTime, game.phaseTime > 1);
      return;
    case 'ending':
      drawDemo(ctx, 'ending', game.phaseTime, game.phaseTime > 1.5);
      return;
    case 'result':
      drawResult(ctx, game);
      return;
    default:
      break;
  }

  const phase: Phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  drawPlayfield(ctx, game, phase);
  if (phase === 'intro') drawIntro(ctx, game);
  if (phase === 'cleared') drawCleared(ctx, game);
  if (phase === 'stageClear') drawStageClear(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

// --- 遊ぶ画面 ----------------------------------------------------------------

function toSlot(game: Game, c: Cell, pos: number, happy: boolean): SlotThing | null {
  if (c === null) return null;
  if (c.kind === 'snow') return { kind: 'snow', weight: c.weight };
  const ok = orderOk(game.board, game.puzzle.perSide, pos);
  return { kind: 'bird', bird: c.bird, order: c.order, ok, mood: happy ? 'happy' : ok ? 'normal' : 'puzzled' };
}

function drawPlayfield(ctx: CanvasRenderingContext2D, game: Game, phase: Phase): void {
  const p = game.puzzle;
  const stage = game.stageIndex + 1;
  const a = game.anim;
  const t = game.time;
  drawStageBackground(ctx, stage, t);

  const ball = game.ballPos();
  if (p.queue.some((q) => q.kind === 'snowball')) drawThrower(ctx, THROWER.x, THROWER.y, t, ball ? ball.windup : 0);

  const finale = a?.kind === 'finale' ? a : null;
  const done = phase === 'cleared' || phase === 'stageClear';
  const happy = finale !== null || done;
  const falling = a?.kind === 'fall';
  const slots = game.board.map((c, i) => (falling && c?.kind === 'bird' ? null : toSlot(game, c, i - p.perSide, happy)));
  const ghost = game.ghostTilt();
  const waiting = phase === 'playing' && a === null && game.current !== null;

  let sakura: { state: 'none' } | { state: 'on'; happy?: boolean } | { state: 'jump'; p: number } = { state: 'none' };
  if (finale) sakura = finale.t < JUMP_TIME ? { state: 'jump', p: finale.t / JUMP_TIME } : { state: 'on', happy: true };
  else if (done) sakura = { state: 'on', happy: true };

  drawBranch(ctx, {
    stage,
    perSide: p.perSide,
    angle: game.angle,
    slots,
    cursor: waiting ? game.cursor : null,
    ghostAngle: ghost === null ? null : angleFor(ghost, p.limit),
    incoming: waiting ? game.current : null,
    snowTargets: game.snowTargets(),
    sakura,
    dango: game.dangoLevel(),
    t
  });

  // 飛んでくる鳥
  const fly = game.flyPos();
  if (fly) drawBird(ctx, fly.x, fly.y, fly.bird, { scale: BIRD_SCALE, flap: (1 - fly.p) * (0.5 + 0.5 * Math.sin(t * 22)), dots: true });
  // 雪玉
  if (ball) drawSnowball(ctx, ball.x, ball.y, 10, ball.spin);
  if (ball && ball.windup > 0) say(ctx, 'えいっ', THROWER.x - 50, THROWER.y - 108, THROWER.x - 20, THROWER.y - 80, 15);

  // 失敗：ばさばさっ
  if (a?.kind === 'fall') {
    for (const b of game.fallBirds()) drawBird(ctx, b.x, b.y, b.bird, { scale: BIRD_SCALE, flap: b.flap, mood: 'shock', rotate: b.rot });
    for (let k = 0; k < 9; k++) {
      const ft = a.t * (0.7 + (k % 3) * 0.2);
      drawFeather(ctx, 120 + k * 30 + Math.sin(ft * 3 + k) * 14, 360 + ft * 60 + (k % 4) * 10, ft * 2 + k, k % 2 ? '#ffffff' : '#c9743a');
    }
    if (a.t < 1.6) drawBigWord(ctx, 'ばさばさっ！', 200 - Math.min(a.t, 0.3) * 30, 40, '#ffffff', '#7a1f30');
  }

  const items: QueueItem[] = p.queue.slice(game.step).map((q) => (q.kind === 'bird' ? { kind: 'bird', bird: q.bird, order: q.order } : q));
  drawQueue(ctx, items, p.perSide, t);
  const msg = game.message();
  drawPanel(ctx, {
    message: msg.text,
    messageColor: msg.color,
    tilt: game.tilt,
    limit: p.limit,
    ghost,
    canUndo: phase === 'playing' && game.history.length > 0 && (a === null || a.kind === 'ball'),
    t
  });
  drawHud(ctx, {
    stage,
    puzzle: game.puzzleIndex + 1,
    puzzles: game.stage.puzzles.length,
    score: game.score,
    hiScore: game.hiScore
  });
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.86)';
  ctx.fillRect(0, y, WIDTH, h);
}

const INTRO_LINES: [string, string][] = [
  ['左右の「おもさ × 真ん中からの きょり」を', 'ぴったり 同じにすると つり合う'],
  ['雪の 場所には とまれない', '積もった 雪にも おもさが ある'],
  ['雪玉が 来る 場所には とまれない', '落ちても かたむきすぎない ように']
];

function drawIntro(ctx: CanvasRenderingContext2D, game: Game): void {
  const [a, b] = INTRO_LINES[game.stageIndex]!;
  banner(ctx, 124, 196);
  outlinedText(ctx, `${game.stageIndex + 1}めん ${game.stage.name}`, WIDTH / 2, 156, 28, '#fff4c2', '#5a3a1e');
  text(ctx, game.stage.intro, WIDTH / 2, 192, 15, '#ffe38a', true);
  text(ctx, a, WIDTH / 2, 222, 14, COLOR.ink, true);
  text(ctx, b, WIDTH / 2, 244, 14, COLOR.ink, true);
  if (game.stageIndex === 0) {
    text(
      ctx,
      isTouchDevice() ? 'タップで 場所を えらび、もういちど タップで とまる' : 'クリック か ← → と スペースで とまる',
      WIDTH / 2,
      272,
      13,
      COLOR.pink,
      true
    );
  }
  if (game.phaseTime > 0.4 && blink(game.phaseTime)) text(ctx, isTouchDevice() ? 'タップで スタート' : 'クリックで スタート', WIDTH / 2, 300, 13, COLOR.muted, true);
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, size = 22, shown = 3): void {
  for (let k = 0; k < 3; k++) {
    const got = k < n && k < shown;
    const big = k === 1 ? 1.18 : 1;
    drawStar(
      ctx,
      x + (k - 1) * size * 2.35,
      y - (k === 1 ? size * 0.25 : 0),
      size * big,
      got ? '#ffd84a' : 'rgba(255,255,255,0.2)',
      got ? '#a8761a' : 'rgba(255,255,255,0.5)'
    );
  }
}

function drawCleared(ctx: CanvasRenderingContext2D, game: Game): void {
  const c = game.clear;
  if (!c) return;
  banner(ctx, 118, 196);
  outlinedText(ctx, c.dango ? 'エナガだんご かんせい！' : 'つり合った！', WIDTH / 2, 150, 26, '#fff4c2', '#5a3a1e');
  const shown = Math.floor(game.phaseTime / 0.22);
  drawStars(ctx, WIDTH / 2, 198, c.stars, 22, shown);
  const parts = ['クリア 300'];
  if (c.clean) parts.push('もどさず 200');
  if (c.stars === 3) parts.push('すき間なし 300');
  text(ctx, parts.join(' ・ '), WIDTH / 2, 240, 13, COLOR.ink, true);
  let tip = '';
  if (!c.clean) tip = '「ひとつもどす」と 失敗なしで ★★';
  else if (!c.dango) tip = 'すき間なしの だんごで ★★★';
  if (c.best && game.phaseTime > 0.7) text(ctx, 'さいこう きろく！', WIDTH / 2, 262, 13, '#ffd84a', true);
  else if (tip) text(ctx, tip, WIDTH / 2, 262, 12, COLOR.muted, true);
  if (game.phaseTime > 0.9 && blink(game.phaseTime)) text(ctx, isTouchDevice() ? 'タップで つぎへ' : 'クリック / スペースで つぎへ', WIDTH / 2, 292, 13, COLOR.pink, true);
}

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  banner(ctx, 118, 196);
  outlinedText(ctx, `${game.stageIndex + 1}めん クリア！`, WIDTH / 2, 152, 30, '#fff4c2', '#5a3a1e');
  text(ctx, 'めんクリア 500てん', WIDTH / 2, 190, 14, '#ffe38a', true);
  const n = game.stage.puzzles.length;
  for (let i = 0; i < n; i++) {
    const f = ALL_PUZZLES.findIndex((q) => q.stage === game.stageIndex && q.index === i);
    const x = WIDTH / 2 + (i - (n - 1) / 2) * 84;
    text(ctx, `${game.stageIndex + 1}-${i + 1}`, x, 222, 12, COLOR.muted, true);
    drawStars(ctx, x, 248, game.stars[f]!, 8);
  }
  if (game.phaseTime > 1 && blink(game.phaseTime)) text(ctx, isTouchDevice() ? 'タップで つぎへ' : 'クリック / スペースで つぎへ', WIDTH / 2, 292, 13, COLOR.pink, true);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(15,23,48,0.94)';
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

function button(ctx: CanvasRenderingContext2D, b: Button, label: string, primary = false): void {
  ctx.fillStyle = primary ? COLOR.accent : COLOR.panel;
  ctx.strokeStyle = primary ? '#ffd0de' : COLOR.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, 17, primary ? '#2a0f1a' : COLOR.ink, true);
}

function drawPaused(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,12,26,0.7)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  text(ctx, 'ポーズ', WIDTH / 2, 206, 28, COLOR.ink, true);
  button(ctx, PAUSE_MENU.resume, 'つづける', true);
  button(ctx, PAUSE_MENU.sound, game.muted ? 'おと：OFF' : 'おと：ON');
  button(ctx, PAUSE_MENU.select, 'もんだい えらび');
}

// --- 問題えらび・結果 --------------------------------------------------------

function drawSelect(ctx: CanvasRenderingContext2D, game: Game): void {
  drawStageBackground(ctx, 1, game.time);
  ctx.fillStyle = 'rgba(10,18,38,0.78)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  outlinedText(ctx, 'もんだいを えらぶ', WIDTH / 2, 70, 26, '#f8c3d2', '#8a2f52');
  const total = game.stars.reduce((s, n) => s + n, 0);
  text(ctx, `★ ${total} / ${ALL_PUZZLES.length * 3}`, WIDTH / 2, 104, 14, '#ffd84a', true);
  for (const [s, st] of STAGES.entries()) {
    const first = selectCard(s, 0);
    text(ctx, `${s + 1}めん ${st.name}`, WIDTH / 2, first.y - 16, 15, COLOR.ink, true);
    for (let i = 0; i < st.puzzles.length; i++) {
      const b = selectCard(s, i);
      const f = ALL_PUZZLES.findIndex((q) => q.stage === s && q.index === i);
      const open = game.isUnlocked(f);
      const sel = f === game.selectCursor && !isTouchDevice();
      ctx.fillStyle = open ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.18)';
      ctx.strokeStyle = sel ? '#ff6f98' : open ? '#8fb0e8' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = sel ? 3 : 1.6;
      rr(ctx, b.x, b.y, b.w, b.h, 12);
      ctx.fill();
      ctx.stroke();
      text(ctx, `${s + 1}-${i + 1}`, b.x + b.w / 2, b.y + 20, 17, open ? '#3a2a40' : 'rgba(255,255,255,0.5)', true);
      if (open) {
        drawStars(ctx, b.x + b.w / 2, b.y + 56, game.stars[f]!, 8.5);
        if (game.stars[f] === 0) text(ctx, 'つぎ', b.x + b.w / 2, b.y + 76, 11, '#d2577f', true);
      } else {
        text(ctx, '🔒', b.x + b.w / 2, b.y + 56, 20, COLOR.ink);
      }
    }
  }
  button(ctx, SELECT_BACK, 'タイトルへ');
}

function drawResult(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 50, 80, 380, 460);
  text(ctx, 'けっか', WIDTH / 2, 112, 16, COLOR.muted, true);
  outlinedText(ctx, 'エナガだんご だいせいこう！', WIDTH / 2, 150, 24, '#ffd84a', '#5a3a1e');
  drawSakura(ctx, WIDTH / 2, 216, { scale: 2.4, eyes: 'happy' });
  const total = game.stars.reduce((s, n) => s + n, 0);
  text(ctx, 'あつめた ★', WIDTH / 2, 290, 12, COLOR.muted, true);
  text(ctx, `${total} / ${ALL_PUZZLES.length * 3}`, WIDTH / 2, 318, 26, '#ffd84a', true);
  text(ctx, 'てんすう', WIDTH / 2, 372, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 404, 36, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 448, 15, '#ffd84a', true);
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 476, 12, COLOR.muted, true);
  if (total < ALL_PUZZLES.length * 3) text(ctx, '★★★ は もんだい えらびから ねらえるよ', WIDTH / 2, 510, 12, COLOR.pink, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, isTouchDevice() ? 'タップで タイトルへ' : 'クリックで タイトルへ', WIDTH / 2, 576, 15, COLOR.ink, true);
}

