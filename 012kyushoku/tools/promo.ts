// 宣伝動画（Instagram 用の縦型 1080×1920・約 12.5 秒・効果音つき）を、ブラウザの中で組み立てて録画する。
// ゲームの画面は、乱数を固定してボット（じょうず）に遊ばせたものをそのまま描く。
// 録画は MediaRecorder（mp4 / H.264 + AAC）。Chrome 系のブラウザで開く。
//
// 構成：
//   1. タイトル
//   2. 長押しでよそって「ぴったり！」が続く（1 めん）
//   3. 盛りすぎて、本体の鍋がカタカタ（さくらちゃんの分があぶない。3 めん）
//   4. さくらちゃんが最後に自分の給食を食べる
//   5. ゲーム名で締める

import { AudioManager } from '../src/game/audio';
import { Bot } from '../src/game/bot';
import { drawChef } from '../src/game/chef';
import { HEIGHT, WIDTH } from '../src/game/constants';
import { Game } from '../src/game/game';
import { drawCounter, drawRoom, drawTableFront } from '../src/game/kitchen';
import { drawKid, drawRating } from '../src/game/kids';
import { drawBowl, drawPot } from '../src/game/food';
import { render } from '../src/game/render';
import { FONT } from '../src/game/ui';

const W = 1080;
const H = 1920;
const FPS = 30;
/** ゲーム画面の置き場所（480×640 を 2.25 倍）。 */
const GAME = { x: 0, y: 240, k: W / WIDTH };
const GAME_H = HEIGHT * GAME.k;

/** 場面の切りかわり（秒）。 */
const T = { title: 1.8, perfect: 6.4, low: 8.9, eat: 10.9, end: 12.6 } as const;
/** ゲームを少し速く進めて、テンポよく見せる。 */
const SPEED = 1.45;

const canvas = document.getElementById('promo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const status = document.getElementById('status')!;

// ゲームの画面を描く下書き用のキャンバス
const gameCanvas = document.createElement('canvas');
gameCanvas.width = W;
gameCanvas.height = GAME_H;
const gctx = gameCanvas.getContext('2d')!;

// --- 音：ゲームの効果音を、スピーカーと録画の両方へ流す ----------------------
const actx = new AudioContext();
const mix = actx.createGain();
// ゲームの音は小さめに作ってあるので、動画では大きくする
mix.gain.value = 5;
const tap = actx.createMediaStreamDestination();
mix.connect(actx.destination);
mix.connect(tap);
const connect = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => unknown;
// AudioManager は音を actx.destination につなぐので、その手前で mix へ向けかえる。
(AudioNode.prototype as unknown as { connect: unknown }).connect = function (this: AudioNode, ...a: unknown[]) {
  if (a[0] === actx.destination && this !== mix) a[0] = mix;
  return connect.apply(this, a);
};
const audio = new AudioManager();
audio.muted = false;
(audio as unknown as { context: AudioContext }).context = actx;

// --- ゲーム --------------------------------------------------------------------
let game = new Game(audio, { seed: 4 });
let bot = new Bot(game, 'じょうず');
let scene = -1;

/** 場面を用意する（音を鳴らさずに少し進めておく）。 */
function prepare(n: number): void {
  const warm = (sec: number): void => {
    const muted = audio.muted;
    audio.muted = true;
    for (let t = 0; t < sec; t += 1 / 60) {
      bot.update(1 / 60);
      game.update(1 / 60);
    }
    audio.muted = muted;
  };
  if (n === 1) {
    game = new Game(audio, { seed: 4 });
    bot = new Bot(game, 'じょうず');
    game.startRun(4);
    game.screen = 'play';
    warm(0.8);
  } else if (n === 2) {
    game = new Game(audio, { seed: 9 });
    bot = new Bot(game, 'じょうず');
    game.startRun(9);
    game.stage = 3;
    game.setup();
    game.screen = 'play';
    game.index = 6;
    warm(1.2);
    // 鍋を残りわずかにする（これから来る子の分より少し少なく）
    game.pots = game.pots.map((p, i) => Math.min(p, game.initial[i] * 0.16));
  } else if (n === 3) {
    game = new Game(audio, { seed: 9 });
    game.startRun(9);
    game.screen = 'eat';
    game.sceneTime = 0;
    game.full = true;
    game.index = game.customers.length;
    game.pots = game.pots.map((p) => p * 0.18);
  }
}

// --- 描画 ----------------------------------------------------------------------

function band(top: number, h: number): void {
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, '#16224a');
  g.addColorStop(1, '#0b1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, h);
}

function outlined(s: string, x: number, y: number, size: number, fill: string, line: string): void {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(6, size * 0.2);
  ctx.strokeStyle = line;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

function titleBand(): void {
  band(0, GAME.y);
  outlined('さくらちゃんの', W / 2, 78, 44, '#ffffff', '#2a3668');
  outlined('給食当番', W / 2, 160, 92, '#f8c3d2', '#8a2f52');
}

function caption(s: string, age: number): void {
  band(GAME.y + GAME_H, H - GAME.y - GAME_H);
  const a = Math.min(1, age * 4);
  ctx.save();
  ctx.globalAlpha = a;
  outlined(s, W / 2, GAME.y + GAME_H + 120 - (1 - a) * 16, 58, '#ffffff', '#2a3668');
  ctx.restore();
}

/** 480×640 の座標で描く関数を、ゲーム画面の場所に描く。 */
function inGame(draw: (c: CanvasRenderingContext2D) => void): void {
  gctx.setTransform(GAME.k, 0, 0, GAME.k, 0, 0);
  draw(gctx);
  ctx.drawImage(gameCanvas, GAME.x, GAME.y);
}

function titleCard(t: number, closing: boolean): void {
  ctx.fillStyle = '#0b1428';
  ctx.fillRect(0, 0, W, H);
  inGame((c) => {
    drawRoom(c, 1, t);
    drawTableFront(c, 1);
    drawKid(c, 300, 318, 'kuma', { tray: true, t });
    drawKid(c, 372, 318, 'usagi', { tray: true, t });
    drawKid(c, 430, 318, 'risu', { tray: true, t });
    drawKid(c, 232, 318, 'enaga', { tray: true, reaction: 'happy', t });
    drawCounter(c, 1);
    drawPot(c, { x: 250, y: 470, w: 200, h: 130 }, 'soup', { left: 0.9, low: false, pressed: false, t });
    drawChef(c, 130, 480, { pose: closing ? 'full' : 'cheer', scale: 4.2, t });
  });
  // タイトルを画面のまん中に大きく
  const pop = Math.min(1, t * 3);
  ctx.save();
  ctx.translate(W / 2, closing ? 560 : 640);
  ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
  ctx.fillStyle = 'rgba(15,23,48,0.86)';
  ctx.beginPath();
  ctx.roundRect(-460, -170, 920, closing ? 400 : 320, 40);
  ctx.fill();
  outlined('さくらちゃんの', 0, -88, 64, '#ffffff', '#2a3668');
  outlined('給食当番', 0, 40, 150, '#f8c3d2', '#8a2f52');
  if (closing) {
    outlined('ブラウザで すぐ あそべる！', 0, 168, 46, '#ffe38a', '#5a3a10');
  }
  ctx.restore();
  band(0, 120);
  band(H - 240, 240);
  ctx.save();
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillStyle = '#8fa5ce';
  ctx.textAlign = 'center';
  ctx.fillText('ラピッド・アプリケーションズ', W / 2, 68);
  ctx.restore();
  outlined(closing ? '全3めん ・ PC / スマホ' : 'もりの がっこうの きゅうしょくしつ', W / 2, H - 120, 50, '#ffffff', '#2a3668');
}

function gameScene(text: string, age: number): void {
  ctx.fillStyle = '#0b1428';
  ctx.fillRect(0, 0, W, H);
  inGame((c) => render(c, game));
  titleBand();
  caption(text, age);
}

function frame(t: number, dt: number): void {
  const n = t < T.title ? 0 : t < T.perfect ? 1 : t < T.low ? 2 : t < T.eat ? 3 : 4;
  if (n !== scene) {
    scene = n;
    prepare(n);
    if (n === 0) audio.play('demo');
    if (n === 4) audio.play('clear');
  }
  if (n >= 1 && n <= 3) {
    bot.update(dt * SPEED);
    game.update(dt * SPEED);
  }
  if (n === 0) titleCard(t, false);
  else if (n === 1) gameScene('ながおしで よそって… ぴったり！', t - T.title);
  else if (n === 2) gameScene('もりすぎると… なべが カタカタ！', t - T.perfect);
  else if (n === 3) gameScene('さいごは じぶんの きゅうしょく♪', t - T.low);
  else titleCard(t - T.eat, true);
}

// --- 再生と録画 ------------------------------------------------------------------

function run(record: boolean): void {
  void actx.resume();
  audio.muted = false;
  scene = -1;
  const stream = canvas.captureStream(FPS);
  for (const track of tap.stream.getAudioTracks()) stream.addTrack(track);
  const type = 'video/mp4;codecs=avc1,mp4a.40.2';
  const rec = record ? new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 }) : null;
  const chunks: Blob[] = [];
  if (rec) {
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      Object.assign(window, { __promoBlob: blob });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kyushoku_promo.mp4';
      a.textContent = 'kyushoku_promo.mp4 を保存';
      status.textContent = '';
      status.appendChild(a);
    };
    rec.start();
  }
  status.textContent = record ? '録画中…' : '下見中…';
  const start = performance.now();
  let last = start;
  const tick = (now: number): void => {
    const t = (now - start) / 1000;
    frame(t, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (t < T.end) requestAnimationFrame(tick);
    else if (rec) rec.stop();
    else status.textContent = 'おわり';
  };
  requestAnimationFrame(tick);
}

// --- OGP 画像（1200×630）とサムネイル（480×640） ---------------------------------

/** OGP 画像：給食室の上に、タイトルと、おたまを持った大きなさくらちゃん、「ぴったり！」の器。 */
function makeOg(): string {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  const g = c.getContext('2d')!;
  // 背景：給食室の奥を 2.5 倍で
  g.save();
  g.scale(2.5, 2.5);
  g.translate(0, -46);
  drawRoom(g, 1, 1.2);
  drawTableFront(g, 1);
  for (const [x, kind] of [[300, 'kuma'], [372, 'usagi'], [432, 'risu']] as const) drawKid(g, x, 296, kind, { tray: true, t: 1 });
  g.restore();
  // 手前のカウンター
  g.fillStyle = '#eef2f6';
  g.fillRect(0, 520, 1200, 110);
  g.fillStyle = '#9aa6b4';
  g.fillRect(0, 520, 1200, 6);
  // 「ぴったり！」の器
  g.save();
  g.translate(320, 392);
  g.scale(1.55, 1.55);
  drawBowl(g, { x: -80, y: 0, w: 160, h: 84 }, { food: 'soup', fill: 0.55, marks: 1, t: 1 });
  drawRating(g, 0, -26, 'perfect', 0.6, 100);
  g.restore();
  // さくらちゃん
  drawChef(g, 930, 610, { pose: 'serve', scale: 10, t: 0.3 });
  // タイトル
  g.fillStyle = 'rgba(15,23,48,0.86)';
  g.beginPath();
  g.roundRect(40, 36, 520, 230, 28);
  g.fill();
  const out = (s2: string, x: number, y: number, size: number, fill: string, line: string): void => {
    g.font = `bold ${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = size * 0.2;
    g.strokeStyle = line;
    g.strokeText(s2, x, y);
    g.fillStyle = fill;
    g.fillText(s2, x, y);
  };
  out('さくらちゃんの', 300, 100, 44, '#ffffff', '#2a3668');
  out('給食当番', 300, 192, 104, '#f8c3d2', '#8a2f52');
  return c.toDataURL('image/jpeg', 0.9);
}

/** サムネイル：1 めんで「ぴったり！」が出た瞬間のゲーム画面。 */
function makeThumb(): string {
  const g0 = new Game(audio, { seed: 4 });
  const b0 = new Bot(g0, 'じょうず');
  const muted = audio.muted;
  audio.muted = true;
  g0.startRun(4);
  g0.screen = 'play';
  for (let t = 0; t < 30; t += 1 / 60) {
    b0.update(1 / 60);
    g0.update(1 / 60);
    if (g0.index >= 2 && g0.results.some((r) => r.age > 0.35 && r.age < 0.4 && r.rating === 'perfect')) break;
  }
  audio.muted = muted;
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 640;
  render(c.getContext('2d')!, g0);
  return c.toDataURL('image/webp', 0.9);
}

document.getElementById('preview')!.addEventListener('click', () => run(false));
document.getElementById('record')!.addEventListener('click', () => run(true));
Object.assign(window, { __promoRun: run, __promoFrame: frame, __makeOg: makeOg, __makeThumb: makeThumb });
frame(0.5, 0);
