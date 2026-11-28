// 宣伝用の素材（OGP 画像と、インスタのストーリー用の縦動画のコマ）を作る（開発時だけ使う。ビルドには含めない）。
// promo.html を開き、コンソールから __makeOg() / __makeVideo() を呼ぶ。できた画像は、ローカルの受け取り用サーバー
// （http://localhost:5191/<ファイル名> に POST すると保存するもの）へ送る。動画は tools/promo.ts で音をつけて MP4 にする。
//
// ゲームそのもの（Game・render）を 1/30 秒ずつ動かしてコマを描くので、ゲームと同じ絵・同じ転がりになる。

import { drawBear } from './game/bear';
import { BEAR_SCALE, FOX_SCALE, HEIGHT, WIDTH } from './game/constants';
import { drawAbove, drawGround, drawTreeTop } from './game/field';
import { Game, DRAG_FULL, type GameAudio } from './game/game';
import { drawBall, drawFlag, drawGolfer } from './game/golfer';
import { HOLES } from './game/holes';
import { drawHoleStamp } from './game/hud';
import { drawKitsune } from './game/kitsune';
import { STEP, launch, newBall, simulate, stepBall, type BallEvent } from './game/physics';
import { planShot, SKILLS } from './game/bot';
import { render } from './game/render';
import { hash, outlinedText, rr, text } from './game/ui';
import type { SoundName } from './game/audio';

const SERVER = 'http://localhost:5191/';

async function post(name: string, data: string): Promise<void> {
  await fetch(SERVER + encodeURIComponent(name), { method: 'POST', body: data });
}

// --- OGP（1200×630） -----------------------------------------------------------------

function makeOgCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext('2d')!;
  // 右側：1 めんのコース（1-1 のカップのあたり）を大きめに
  const hole = HOLES[0]!;
  const S = 1.4;
  ctx.save();
  ctx.fillStyle = '#a9d47e';
  ctx.fillRect(0, 0, 1200, 630);
  // 左のあいている所にも、春の花と桜の木
  for (let i = 0; i < 90; i++) {
    const x = hash(i, 1) * 560;
    const y = hash(i, 2) * 630;
    ctx.fillStyle = ['#ffffff', '#ffe066', '#f7a8c0'][i % 3]!;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const [x, y, r] of [
    [60, 560, 46],
    [200, 600, 40],
    [40, 380, 38],
    [520, 40, 40],
    [330, 610, 34]
  ] as const)
    drawTreeTop(ctx, x, y, r, 'spring', (x / 10) % 3 === 1 ? 1 : 0);
  // カップ（ワールドの (240, 170)）が画面の (836, 190) に来るように
  ctx.translate(500, 190 - 170 * S);
  ctx.scale(S, S);
  const v = { hole, theme: 'spring' as const, camY: 0, t: 1.2, viewH: 700 };
  drawGround(ctx, v);
  drawAbove(ctx, v);
  drawFlag(ctx, hole.cup.x, hole.cup.y, 0.8, 0.6, '#ff6f98', 1);
  ctx.restore();
  // ボールとさくらちゃん（大きく）
  ctx.save();
  ctx.translate(800, 450);
  ctx.scale(2.6, 2.6);
  drawBall(ctx, 0, 0, 0.5);
  drawGolfer(ctx, 0, 0, { pose: 'back', aim: -Math.PI / 2 + 0.12, swing: 0.75, scale: 1.5 });
  ctx.restore();
  drawBear(ctx, 1080, 600, { scale: BEAR_SCALE * 2.2, noKine: true, hat: 'cap', face: 'excited', arms: 'clap', clap: 0.4 });
  drawKitsune(ctx, 1130, 470, { scale: FOX_SCALE * 2.1, pose: 'whisper' });
  // 左：タイトル
  rr(ctx, 44, 40, 520, 250, 22);
  ctx.fillStyle = 'rgba(18,40,28,0.88)';
  ctx.fill();
  outlinedText(ctx, 'さくらちゃんの', 304, 106, 46, '#ffffff', '#1f3a2a');
  outlinedText(ctx, 'パークゴルフ', 304, 196, 82, '#f8c3d2', '#8a2f52');
  text(ctx, 'さかを よんで カップを ねらおう', 304, 260, 24, '#cfe6d6', true);
  // ホールインワンきねんのスタンプ
  drawHoleStamp(ctx, 190, 440, 2, 1.55, -0.18);
  text(ctx, '全 3 コース 9 ホール', 420, 430, 26, '#1f3a2a', true);
  text(ctx, 'ブラウザで すぐ遊べる', 420, 470, 26, '#1f3a2a', true);
  return c;
}

export async function makeOg(): Promise<void> {
  const c = makeOgCanvas();
  await post('og.jpg', c.toDataURL('image/jpeg', 0.9));
  await post('og_preview.png', c.toDataURL('image/png'));
}

// --- 動画（1080×1920・30fps） -----------------------------------------------------------

const FPS = 30;
const VW = 1080;
const VH = 1920;
const GAME_Y = 240;
const GS = VW / WIDTH;

interface SoundEvent {
  t: number;
  name: SoundName;
  pitch: number;
}

class Recorder {
  frame = 0;
  sounds: SoundEvent[] = [];
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly game: HTMLCanvasElement;
  private readonly gctx: CanvasRenderingContext2D;
  /** 実際に保存するか（false の間は、ゲームを進めるだけ）。 */
  recording = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = VW;
    this.canvas.height = VH;
    this.ctx = this.canvas.getContext('2d')!;
    this.game = document.createElement('canvas');
    this.game.width = VW;
    this.game.height = HEIGHT * GS;
    this.gctx = this.game.getContext('2d')!;
  }

  audio(): GameAudio {
    return {
      muted: false,
      toggleMute: () => false,
      play: (name, pitch = 1) => {
        if (this.recording) this.sounds.push({ t: this.frame / FPS, name, pitch });
      }
    };
  }

  /** 1 コマ描いて送る。 */
  async shot(g: Game, top: string, bottom: string, topBig = false): Promise<void> {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, '#173326');
    bg.addColorStop(1, '#0c1a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VW, VH);
    // ゲーム画面
    this.gctx.setTransform(GS, 0, 0, GS, 0, 0);
    render(this.gctx, g);
    ctx.drawImage(this.game, 0, GAME_Y);
    // 上：タイトル（または大きな見出し）
    if (topBig) outlinedText(ctx, top, VW / 2, 124, 64, '#ffffff', '#1f3a2a');
    else {
      outlinedText(ctx, 'さくらちゃんの', VW / 2, 70, 44, '#ffffff', '#1f3a2a');
      outlinedText(ctx, 'パークゴルフ', VW / 2, 158, 86, '#f8c3d2', '#8a2f52');
    }
    // 下：ひとこと
    outlinedText(ctx, bottom, VW / 2, GAME_Y + HEIGHT * GS + 120, bottom.startsWith('rapid') ? 46 : 58, '#ffffff', '#1f3a2a');
    if (this.recording) {
      await post(`v_${String(this.frame).padStart(4, '0')}.jpg`, this.canvas.toDataURL('image/jpeg', 0.92));
      this.frame++;
    }
  }
}

/** ゲームを 1/30 秒すすめる。 */
const tick = (g: Game): void => g.update(1 / FPS);

/** 打つ画面まで進める（記録しない）。 */
function skipToAim(g: Game): void {
  for (let i = 0; i < 60 * 30 && g.phase !== 'aim'; i++) {
    tick(g);
    const ph: string = g.phase;
    if (ph !== 'aim' && ph !== 'rolling') g.confirm();
  }
  // カメラが落ちつくまで
  for (let i = 0; i < 40; i++) tick(g);
}

/** 1-1 でホールインワンになる向きと強さ（強さの幅のまん中）を探す。 */
function findAce(): { aim: number; power: number } {
  const h = HOLES[0]!;
  let best = { aim: -Math.PI / 2, power: 0.85, run: 0 };
  for (let a = -96; a <= -84; a += 0.1) {
    const aim = (a * Math.PI) / 180;
    let run: number[] = [];
    for (let p = 0.8; p <= 0.915; p += 0.002) {
      if (simulate(h, h.tee.x, h.tee.y, aim, p, 0).done === 'cup') run.push(p);
      else {
        if (run.length > best.run) best = { aim, power: run[Math.floor(run.length / 2)]!, run: run.length };
        run = [];
      }
    }
    if (run.length > best.run) best = { aim, power: run[Math.floor(run.length / 2)]!, run: run.length };
  }
  return best;
}

/** 3-2 で、かまくらのトンネルを通る打ち方（雪だるまの時計もふくめて）を探す。 */
function findTunnel(clock0: number): { aim: number; power: number; clock: number } {
  const h = HOLES[7]!;
  for (let dc = 0; dc < 3.2; dc += 1 / FPS) {
    const clock = clock0 + dc;
    for (let a = -96; a <= -82; a += 0.5) {
      for (let p = 0.6; p <= 0.95; p += 0.01) {
        const b = newBall(h.tee.x, h.tee.y);
        launch(b, (a * Math.PI) / 180, p);
        const ev: BallEvent[] = [];
        let c = clock;
        while (!b.done) {
          stepBall(h, b, c, ev);
          c += STEP;
        }
        if (ev.includes('tunnel') && b.done === 'stop') return { aim: (a * Math.PI) / 180, power: p, clock };
      }
    }
  }
  throw new Error('トンネルを通る打ち方が見つからない');
}

/** マウスで後ろへ引っぱってはなす（そのあいだのコマも記録する）。 */
async function dragShot(
  rec: Recorder,
  g: Game,
  aim: number,
  power: number,
  top: string,
  bottom: string,
  frames = 24,
  beforeRelease?: () => void
): Promise<void> {
  const sx = 300;
  const sy = 330;
  g.pointerDown(1, sx, sy, false);
  for (let i = 1; i <= frames; i++) {
    const k = Math.min(1, i / (frames * 0.75));
    const e = 1 - (1 - k) * (1 - k);
    g.pointerMove(1, sx - Math.cos(aim) * power * DRAG_FULL * e, sy - Math.sin(aim) * power * DRAG_FULL * e, false);
    tick(g);
    await rec.shot(g, top, bottom);
  }
  beforeRelease?.();
  g.pointerUp(1);
}

export async function makeVideo(): Promise<number> {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('sakura-parkgolf')) localStorage.removeItem(k);
  } catch {
    /* なくてもよい */
  }
  const rec = new Recorder();
  const g = new Game(rec.audio());
  const G = g as unknown as Record<string, (...a: unknown[]) => void> & { clock: number; courseIndex: number; holeIndex: number };

  // ① 1-1：坂を読んで、引っぱって打つ → ホールインワン
  g.startRun();
  skipToAim(g);
  rec.recording = true;
  const cap1 = '坂を よんで、ひっぱって うつ！';
  for (let i = 0; i < 18; i++) {
    tick(g);
    await rec.shot(g, '', cap1);
  }
  const ace = findAce();
  await dragShot(rec, g, ace.aim, ace.power, '', cap1, 26);
  for (let i = 0; i < 6 * FPS && g.phase === 'rolling'; i++) {
    tick(g);
    await rec.shot(g, '', cap1);
  }
  // ② ホールインワン
  for (let i = 0; i < 3.4 * FPS; i++) {
    tick(g);
    await rec.shot(g, '', 'ホールインワンで おおはしゃぎ！');
  }

  // ③ 2-1：秋の森の橋をわたる
  rec.recording = false;
  G.courseIndex = 1;
  G['startCourse']!();
  skipToAim(g);
  rec.recording = true;
  const cap3 = '秋の 森も、冬の 雪も！';
  for (let i = 0; i < 8; i++) {
    tick(g);
    await rec.shot(g, '', cap3);
  }
  // 橋をわたって、坂で右へ曲がって止まる打ち方（ここでホールインワンにはしない）
  const plan = planShot(g.hole, g.ball.x, g.ball.y, g.clock, SKILLS[2]!);
  let pw = plan.power;
  for (const k of [0.9, 0.85, 0.8, 0.75, 0.7]) {
    const b = simulate(g.hole, g.ball.x, g.ball.y, plan.aim, plan.power * k, g.clock);
    if (b.done === 'stop' && b.y < 420) {
      pw = plan.power * k;
      break;
    }
  }
  await dragShot(rec, g, plan.aim, pw, '', cap3, 18);
  for (let i = 0; i < 3 * FPS && g.phase === 'rolling'; i++) {
    tick(g);
    await rec.shot(g, '', cap3);
  }
  for (let i = 0; i < 8; i++) {
    tick(g);
    await rec.shot(g, '', cap3);
  }

  // ④ 3-2：かまくらのトンネル
  rec.recording = false;
  G.courseIndex = 2;
  G['startCourse']!();
  skipToAim(g);
  G.holeIndex = 1;
  G['loadHole']!();
  G['startAim']!();
  for (let i = 0; i < 40; i++) tick(g);
  rec.recording = true;
  const cap4 = 'かまくらの トンネルも あるよ';
  const DRAG4 = 18;
  const tn = findTunnel(g.clock + (6 + DRAG4) / FPS);
  for (let i = 0; i < 6; i++) {
    tick(g);
    await rec.shot(g, '', cap4);
  }
  await dragShot(rec, g, tn.aim, tn.power, '', cap4, DRAG4, () => {
    G.clock = tn.clock;
  });
  for (let i = 0; i < 4.2 * FPS && g.phase === 'rolling'; i++) {
    tick(g);
    await rec.shot(g, '', cap4);
  }
  for (let i = 0; i < 12; i++) {
    tick(g);
    await rec.shot(g, '', cap4);
  }

  // ⑤ タイトル：ブラウザですぐ遊べる
  // 録画のあいだに押したスタンプは、タイトルに出さない
  (g as unknown as { stamps: number[] }).stamps = new Array<number>(9).fill(0);
  G['setPhase']!('title');
  for (let i = 0; i < 2.8 * FPS; i++) {
    tick(g);
    await rec.shot(g, 'ブラウザで すぐ遊べる！', 'rapid-apps.co.jp/games/013parkgolf/', true);
  }

  // 音のきっかけ
  const json = JSON.stringify({ fps: FPS, frames: rec.frame, sounds: rec.sounds });
  await post('promo_sounds.json', 'data:image/json;base64,' + btoa(unescape(encodeURIComponent(json))));
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('sakura-parkgolf')) localStorage.removeItem(k);
  } catch {
    /* なくてもよい */
  }
  return rec.frame;
}

Object.assign(window, { __makeOg: makeOg, __makeVideo: makeVideo });
