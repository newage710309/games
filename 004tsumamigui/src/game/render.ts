import { HEIGHT, READY_TIME, ROOM_Y, SEAT_Y, WIDTH } from './constants';
import { drawDemo, type DemoKind } from './demo';
import { isTouchDevice } from './device';
import { PAUSE_MENU, type Button, type Game } from './game';
import { drawSakura } from './sakura';
import { drawHud, drawRoom, drawSeat, type RoomState } from './scene';
import { ENDING_SCORES, STAGES } from './stages';
import { COLOR, blink, outlinedText, rr, text } from './ui';

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  switch (game.phase) {
    case 'title':
      drawTitle(ctx, game);
      return;
    case 'demo':
      drawDemo(ctx, (game.stageIndex === 0 ? 'break1' : 'break2') as DemoKind, game.phaseTime, game.phaseTime > 1);
      return;
    case 'ending':
      drawDemo(ctx, `end${game.endingTier}` as DemoKind, game.phaseTime, game.phaseTime > 1.5);
      return;
    case 'result':
      drawResult(ctx, game);
      return;
    default:
      break;
  }

  drawClassroom(ctx, game);

  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  if (phase === 'ready') drawReady(ctx, game);
  if (phase === 'bell') drawBell(ctx, game);
  if (game.phase === 'gameover') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx, game);
}

function drawClassroom(ctx: CanvasRenderingContext2D, game: Game): void {
  const owl = game.owl;
  const stage = game.stage;
  const phase = game.phase === 'paused' ? game.pausedFrom : game.phase;
  const caught = phase === 'caught' || phase === 'gameover';
  // 授業の前後は先生がこちらを向いている
  let owlTurn = owl.turn;
  let say = owl.say;
  // よーいの間はこちらを向き、「はじめ！」で黒板のほうへ向き直る
  if (phase === 'ready') owlTurn = Math.max(0, Math.min(1, (READY_TIME - 0.5 - game.phaseTime) / 0.22));
  if (phase === 'bell') {
    owlTurn = Math.min(1, game.phaseTime / 0.2);
    say = game.phaseTime > 0.3 ? 'ここまで！' : '';
  }
  const p = game.patrol;
  const room: RoomState = {
    time: game.time,
    written: owl.written / owl.boardTotal,
    lines: stage.board,
    owlTurn,
    owlWing: phase === 'playing' ? owl.wing : 'rest',
    owlChalk: owl.chalkInHand && phase === 'playing',
    trayChalk: !(owl.chalkInHand && phase === 'playing'),
    owlSay: caught ? '' : say,
    scold: caught,
    sakuraDip: game.peck,
    patrol:
      p === null
        ? undefined
        : {
            x: p.x,
            facing: p.facing,
            walk: p.walk,
            looking: p.state === 'look' || (caught && p.watching),
            warn: p.state === 'warn' && phase === 'playing'
          }
  };
  drawRoom(ctx, room);
  drawSeat(ctx, {
    time: game.time,
    peck: game.peck,
    puff: game.puff,
    cram: game.cram && phase === 'playing',
    caught,
    nuts: 1 - (game.eaten % 60) / 100,
    chew: game.chew,
    book: stage.subject,
    eaten: game.eaten
  });
  drawHud(ctx, {
    period: game.stageIndex + 1,
    subject: stage.subject,
    timeLeft: game.timeLeft,
    score: game.score,
    eaten: game.eaten,
    hiScore: game.hiScore
  });
}

// --- 重ねて出す案内 ----------------------------------------------------------

function banner(ctx: CanvasRenderingContext2D, y: number, h: number): void {
  ctx.fillStyle = 'rgba(10,18,38,0.78)';
  ctx.fillRect(0, y, WIDTH, h);
}

function drawReady(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.phaseTime;
  banner(ctx, SEAT_Y + 40, 120);
  text(ctx, `${game.stageIndex + 1}じかんめ`, WIDTH / 2, SEAT_Y + 72, 18, COLOR.muted, true);
  text(ctx, game.stage.subject, WIDTH / 2, SEAT_Y + 104, 34, COLOR.ink, true);
  const sub = t < 1.4 ? 'よーい…' : 'はじめ！';
  text(ctx, sub, WIDTH / 2, SEAT_Y + 140, 18, COLOR.pink, true);
  if (game.stageIndex === 0 && game.score === 0) {
    const how = isTouchDevice() ? 'おしている間 たべる ・ 先生が見たら はなす' : 'おしている間（クリック / スペース）たべる';
    text(ctx, how, WIDTH / 2, SEAT_Y + 186, 13, COLOR.ink, true);
  }
}

function drawBell(ctx: CanvasRenderingContext2D, game: Game): void {
  banner(ctx, SEAT_Y + 40, 110);
  outlinedText(ctx, 'キーンコーン カーンコーン', WIDTH / 2, SEAT_Y + 76, 22, '#fff4c2', '#5a3a1e');
  text(ctx, `${game.stageIndex + 1}じかんめ おわり！`, WIDTH / 2, SEAT_Y + 112, 18, COLOR.ink, true);
  text(ctx, `いままでに ${game.eaten} こ たべた`, WIDTH / 2, SEAT_Y + 136, 14, COLOR.pink, true);
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(8,12,26,0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 60, 190, 360, 250);
  text(ctx, 'しかられちゃった…', WIDTH / 2, 230, 26, COLOR.pink, true);
  text(ctx, `${game.stageIndex + 1}じかんめ ${game.stage.subject}`, WIDTH / 2, 268, 14, COLOR.muted, true);
  text(ctx, 'てんすう', WIDTH / 2, 300, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 328, 32, COLOR.ink, true);
  text(ctx, `たべた ${game.eaten} こ`, WIDTH / 2, 362, 14, COLOR.ink, true);
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 390, 15, '#ffd84a', true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) {
    text(ctx, 'タップで タイトルへ', WIDTH / 2, 420, 14, COLOR.muted, true);
  }
}

function drawResult(ctx: CanvasRenderingContext2D, game: Game): void {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const names = ['もうすこし…', 'おなか いっぱい', 'みんなで おやつ'];
  panel(ctx, 50, 110, 380, 400);
  text(ctx, 'けっか', WIDTH / 2, 146, 16, COLOR.muted, true);
  text(ctx, names[game.endingTier]!, WIDTH / 2, 186, 28, COLOR.pink, true);
  drawSakura(ctx, WIDTH / 2, 262, {
    scale: 2.6,
    eyes: game.endingTier === 0 ? 'dot' : 'happy',
    puff: game.endingTier * 0.3
  });
  text(ctx, 'てんすう', WIDTH / 2, 330, 12, COLOR.muted, true);
  text(ctx, game.score.toLocaleString('en-US'), WIDTH / 2, 360, 36, COLOR.ink, true);
  text(ctx, `たべた ${game.eaten} こ`, WIDTH / 2, 396, 15, COLOR.ink, true);
  if (game.isClear) {
    outlinedText(ctx, 'ぜんぶ クリア！', WIDTH / 2, 436, 26, '#ffd84a', '#5a3a1e');
  } else {
    const need = ENDING_SCORES[1] - game.score;
    text(ctx, `みんなで おやつ まで あと ${need.toLocaleString('en-US')} てん`, WIDTH / 2, 436, 14, COLOR.muted, true);
  }
  if (game.newHiScore) text(ctx, 'ハイスコア こうしん！', WIDTH / 2, 470, 15, '#ffd84a', true);
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, 492, 12, COLOR.muted, true);
  if (game.phaseTime > 1.2 && blink(game.phaseTime)) {
    text(ctx, 'タップで タイトルへ', WIDTH / 2, 560, 15, COLOR.ink, true);
  }
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
  button(ctx, PAUSE_MENU.title, 'タイトルへ');
}

// --- タイトル ----------------------------------------------------------------

function drawTitle(ctx: CanvasRenderingContext2D, game: Game): void {
  const t = game.time;
  // 背景は授業中の教室（先生は板書中）
  const cycle = t % 4;
  const eating = cycle < 2.6;
  const peck = eating ? Math.min(1, cycle / 0.15) : Math.max(0, 1 - (cycle - 2.6) / 0.1);
  drawRoom(ctx, {
    time: t,
    written: (t * 0.06) % 1,
    lines: STAGES[0]!.board,
    owlTurn: 0,
    owlWing: 'write',
    owlChalk: true,
    trayChalk: false,
    sakuraDip: peck
  });
  drawSeat(ctx, {
    time: t,
    peck,
    puff: eating ? Math.min(1, cycle / 2.2) : Math.max(0, 1 - (cycle - 2.6) / 0.25),
    cram: eating && cycle > 2.2,
    caught: false,
    nuts: 0.8,
    chew: t * 3,
    eaten: 24
  });

  // 題名
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, 0, WIDTH, 40);
  text(ctx, 'ラピッド・アプリケーションズ', WIDTH / 2, 20, 11, COLOR.muted, true);
  ctx.fillStyle = 'rgba(10,18,38,0.72)';
  rr(ctx, 30, ROOM_Y + 150, WIDTH - 60, 120, 18);
  ctx.fill();
  text(ctx, 'さくらちゃんの', WIDTH / 2, ROOM_Y + 180, 20, COLOR.pink, true);
  outlinedText(ctx, 'こっそりつまみぐい', WIDTH / 2, ROOM_Y + 222, 38, '#fff4f8', '#8a3b58');
  text(ctx, '先生に 見つからないように たべよう', WIDTH / 2, ROOM_Y + 254, 13, COLOR.ink, true);

  // 下の案内
  ctx.fillStyle = 'rgba(10,18,38,0.82)';
  ctx.fillRect(0, HEIGHT - 64, WIDTH, 64);
  if (blink(t, 1.2)) {
    text(ctx, isTouchDevice() ? 'タップで はじめる' : 'クリック / スペースで はじめる', WIDTH / 2, HEIGHT - 42, 18, COLOR.ink, true);
  }
  text(ctx, `HI ${game.hiScore.toLocaleString('en-US')}`, WIDTH / 2, HEIGHT - 16, 12, COLOR.muted, true);
}

