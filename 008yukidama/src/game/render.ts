import { HEIGHT, HUD_H, WIDTH } from './constants';
import { drawDemo } from './demo';
import { isTouchDevice } from './device';
import { PAUSE_MENU, READY_TIME, type Button, type Game } from './game';
import { drawSakura } from './sakura';
import { drawHud, drawStar, drawWorld } from './scene';
import { drawShards } from './snowball';
import { drawTitleScreen } from './title';
import { COLOR, blink, outlinedText, rr, text } from './ui';

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  switch (game.phase) {
    case 'title':
      drawTitleScreen(ctx, game.time, game.hiScore);
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

  drawPlayfield(ctx, game);

  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  if (phase === 'ready') drawReady(ctx, game);
  if (phase === 'impact' && game.stars === 0) {
    outlinedText(ctx, 'びくともしない…！', WIDTH / 2, 300, 30, '#ffffff', '#b8483e');
  }
  if (phase === 'stageClear') drawStageClear(ctx, game);
  if (game.phase === 'gameover') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

function drawPlayfield(ctx: CanvasRenderingContext2D, game: Game): void {
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const missed = (phase === 'miss' || phase === 'gameover') && game.missReason === 'small';
  const c = game.course;
  const z = game.zoom;
  const t = game.stageTime;
  // 見えているものだけを描く（下はとりでの高さと影のぶん、余分に）
  const top = game.camY - 280 / z;
  const bottom = game.camY + 560 / z;
  const inView = (y: number, m = 120): boolean => y > top - m && y < bottom + m;
  const props = c.props
    .filter((p) => !p.eaten && inView(p.y))
    .map((p) => ({ ...p, edible: p.eatAt === null || p.eatAt === 0 ? undefined : game.cm >= p.eatAt }));
  const fade = Math.max(0, Math.min(1, (c.length - game.y - 300) / 500));

  ctx.save();
  if (game.shake > 0) {
    const s = game.shake * 7;
    ctx.translate(Math.sin(game.time * 71) * s, Math.cos(game.time * 83) * s);
  }
  drawWorld(ctx, {
    theme: game.stage.theme,
    view: { camX: game.camX, camY: game.camY, zoom: z },
    road: c.road,
    t,
    patches: c.patches.filter((p) => inView(p.y, p.h)).map((p) => ({ ...p })),
    ridges: c.ridges.filter((r) => r.y2 > top && r.y1 < bottom),
    gates: c.gates.filter((g) => inView(g.y)),
    props,
    trail: game.trail,
    fort: inView(c.length, 300) ? { x: 240, y: c.length, damage: game.fortDamage, flyT: game.fortFly, t: game.time, goal: game.stage.goal } : undefined,
    ball: {
      x: game.x,
      y: game.y,
      r: game.shownR,
      roll: game.roll,
      stuck: game.stuck,
      flash: game.flash * 0.6,
      rider: missed ? null : { steer: Math.max(-1, Math.min(1, game.vx / 300)), eyes: game.moodEyes },
      // 無敵のあいだは点滅して知らせる
      alpha: game.invuln > 0 && blink(game.time, 7) ? 0.55 : 1
    },
    overlay: () => {
      for (const b of game.bursts) drawShards(ctx, b.x, b.y, b.r, b.t / b.dur, b.seed, b.n);
      for (const p of game.pops) {
        ctx.save();
        ctx.globalAlpha = 1 - Math.max(0, p.t - 0.55) / 0.35;
        outlinedText(ctx, p.text, p.x, p.y - p.t * 46, 15 / z, p.color ?? '#ff6f98', '#ffffff');
        ctx.restore();
      }
      if (missed) {
        // 転げ落ちるさくらちゃん
        const m = Math.min(1.4, game.phase === 'miss' ? game.phaseTime : 1.4);
        drawSakura(ctx, game.x + m * 90, game.y - game.r - 20 - 120 * m + 190 * m * m, { scale: 1.3, dead: true, rotate: m * 7, shadow: false });
      }
    },
    blizzard: game.stage.blizzard * fade
  });
  ctx.restore();

  drawHud(ctx, {
    stage: game.stageIndex + 1,
    left: game.left,
    score: game.score,
    hiScore: game.hiScore,
    cm: game.cm,
    goal: game.stage.goal,
    shrink: game.shrinking
  });
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, y, WIDTH, h);
}

const HINTS: [string, string][] = [
  ['小さいものは まきこめる', '赤い「！」や 岩に ぶつかると かける'],
  ['門は 看板より大きいと とおれない', '日なたを通ると とけて 小さくなる'],
  ['氷は すべって 雪が つかない', 'ふぶきで さきが みえにくい']
];

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.phaseTime;
  const [h1, h2] = HINTS[game.stageIndex]!;
  banner(ctx, 300, 180);
  text(ctx, `${game.stageIndex + 1}めん ${game.stage.name}`, WIDTH / 2, 330, 26, COLOR.ink, true);
  text(ctx, `もくひょう ${game.stage.goal}cm まで そだてて とりでへ！`, WIDTH / 2, 364, 15, '#ffe38a', true);
  text(ctx, h1, WIDTH / 2, 392, 13, COLOR.ink, true);
  text(ctx, h2, WIDTH / 2, 412, 13, COLOR.ink, true);
  text(ctx, t < READY_TIME - 0.8 ? 'よーい…' : 'はじめ！', WIDTH / 2, 448, 20, COLOR.pink, true);
  if (game.stageIndex === 0) {
    banner(ctx, 490, 36);
    text(ctx, isTouchDevice() ? 'どこでも 左右に ドラッグ で うごかす' : '← → か マウス で うごかす', WIDTH / 2, 508, 14, COLOR.ink, true);
  }
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, size = 22): void {
  for (let k = 0; k < 3; k++) {
    const got = k < n;
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

function drawStageClear(ctx: CanvasRenderingContext2D, game: Game): void {
  // くずれたとりでが見えるように、画面の下に出す
  banner(ctx, 366, 214);
  outlinedText(ctx, `${game.stageIndex + 1}めん クリア！`, WIDTH / 2, 400, 28, '#fff4c2', '#5a3a1e');
  drawStars(ctx, WIDTH / 2, 446, game.stars);
  text(ctx, `とりでに ついた大きさ ${Math.floor(game.arrivedCm)}cm … ${game.sizeBonus.toLocaleString('en-US')}てん`, WIDTH / 2, 488, 13, COLOR.ink, true);
  text(ctx, `めんクリア ${game.stageBonus}てん`, WIDTH / 2, 510, 13, COLOR.ink, true);
  text(ctx, game.noMissBonus > 0 ? `いちども かけなかった！ ${game.noMissBonus.toLocaleString('en-US')}てん` : `かけた かいすう ${game.chips}かい`, WIDTH / 2, 532, 13, game.noMissBonus > 0 ? '#ffe38a' : COLOR.muted, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, 'タップで つぎへ', WIDTH / 2, 560, 12, COLOR.muted, true);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(15,23,48,0.94)';
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,12,26,0.6)';
  ctx.fillRect(0, HUD_H, WIDTH, HEIGHT - HUD_H);
  panel(ctx, 40, 240, 400, 280);
  const small = game.missReason === 'small';
  outlinedText(ctx, small ? 'ころげおちちゃった…' : 'はじき かえされた…', WIDTH / 2, 278, 26, '#ffffff', '#b8483e');
  text(
    ctx,
    small
      ? `${game.stageIndex + 1}めん ・ とりでまで あと ${game.left}m`
      : `${game.stageIndex + 1}めん ・ ${Math.floor(game.arrivedCm)}cm（もくひょう ${game.stage.goal}cm）`,
    WIDTH / 2,
    318,
    14,
    COLOR.ink,
    true
  );
  text(ctx, small ? '10cm より 小さくなると おちちゃうよ' : 'もくひょうまで そだててから ぶつかろう', WIDTH / 2, 342, 12, COLOR.muted, true);
  text(ctx, 'てんすう', WIDTH / 2, 374, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 406, 32, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 444, 15, '#ffd84a', true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) text(ctx, 'タップで タイトルへ', WIDTH / 2, 490, 14, COLOR.muted, true);
}

function drawResult(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 50, 80, 380, 460);
  text(ctx, 'けっか', WIDTH / 2, 112, 16, COLOR.muted, true);
  outlinedText(ctx, 'ぜんぶ クリア！', WIDTH / 2, 150, 28, '#ffd84a', '#5a3a1e');
  drawSakura(ctx, WIDTH / 2, 216, { scale: 2.4, eyes: 'happy' });
  for (const [i, n] of game.starLog.entries()) {
    const y = 288 + i * 34;
    text(ctx, `${i + 1}めん`, WIDTH / 2 - 92, y, 15, COLOR.ink, true);
    drawStars(ctx, WIDTH / 2 + 34, y + 1, n, 11);
  }
  text(ctx, 'てんすう', WIDTH / 2, 402, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 432, 36, COLOR.ink, true);
  text(ctx, `まきこんだ もの ${game.eaten}こ`, WIDTH / 2, 468, 14, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 494, 15, '#ffd84a', true);
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 520, 12, COLOR.muted, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) {
    text(ctx, 'タップで タイトルへ', WIDTH / 2, 576, 15, COLOR.ink, true);
  }
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
  button(ctx, PAUSE_MENU.title, 'タイトルへ');
}
