// 教室・さくらちゃんの席・情報欄を描く。
import { FOOTER_H, HEIGHT, HUD_H, ROOM_H, ROOM_Y, SEAT_H, SEAT_Y, WIDTH } from './constants';
import { drawAlert, drawOwl, drawPatrol, drawStudent, type StudentKind, type WingPose } from './characters';
import { drawSakura } from './sakura';
import { COLOR, FONT, outlinedText, rr, text } from './ui';

const BOARD = { x: 64, y: ROOM_Y + 16, w: 352, h: 104 } as const;
const FLOOR_Y = ROOM_Y + 170;

/** 先生の立ち位置（足元）。 */
export const TEACHER_X = 300;
export const TEACHER_Y = ROOM_Y + 226;
export const TEACHER_SCALE = 1.9;

export interface RoomState {
  time: number;
  /** 黒板の文字をどこまで書いたか 0..1。 */
  written: number;
  /** 黒板の文字（1 行ごと）。 */
  lines: readonly string[];
  owlTurn: number;
  owlWing: WingPose;
  owlChalk: boolean;
  /** チョーク置き場にチョークがあるか。 */
  trayChalk: boolean;
  /** 先生の頭の上に出す文字（せき払い・チョークを置く音など）。 */
  owlSay?: string;
  /** しかっているところ。 */
  scold?: boolean;
  /** 教室の中のさくらちゃんが頭を下げている量 0..1（つまみ食い中）。 */
  sakuraDip?: number;
  /** 見回りの先生（3 時間目）。 */
  patrol?: { x: number; facing: number; walk: number; looking: boolean; warn: boolean };
}

export function drawRoom(ctx: CanvasRenderingContext2D, s: RoomState): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, ROOM_Y, WIDTH, ROOM_H);
  ctx.clip();

  // 壁
  ctx.fillStyle = '#f4ead6';
  ctx.fillRect(0, ROOM_Y, WIDTH, FLOOR_Y - ROOM_Y);
  // 腰板
  ctx.fillStyle = '#d9b98f';
  ctx.fillRect(0, FLOOR_Y - 26, WIDTH, 26);
  ctx.fillStyle = '#c7a276';
  ctx.fillRect(0, FLOOR_Y - 26, WIDTH, 3);

  // 窓（左端、外は雪の森）
  drawWindow(ctx, -18, ROOM_Y + 24, 70, 110, s.time);
  // 時計（右上）
  drawClock(ctx, 448, ROOM_Y + 34, s.time);

  // 黒板
  ctx.fillStyle = '#8a6444';
  rr(ctx, BOARD.x - 7, BOARD.y - 7, BOARD.w + 14, BOARD.h + 14, 6);
  ctx.fill();
  const g = ctx.createLinearGradient(0, BOARD.y, 0, BOARD.y + BOARD.h);
  g.addColorStop(0, '#2f6b52');
  g.addColorStop(1, '#27583f');
  ctx.fillStyle = g;
  ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
  // 消し跡
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.ellipse(BOARD.x + 250, BOARD.y + 70, 70, 18, -0.1, 0, Math.PI * 2);
  ctx.fill();
  drawBoardText(ctx, s.lines, s.written);
  // チョーク置き場
  ctx.fillStyle = '#7a5638';
  ctx.fillRect(BOARD.x - 4, BOARD.y + BOARD.h + 7, BOARD.w + 8, 6);
  if (s.trayChalk) {
    ctx.fillStyle = '#fbfbf4';
    ctx.fillRect(TEACHER_X + 50, BOARD.y + BOARD.h + 4, 11, 3.5);
  }
  ctx.fillStyle = '#f2b8c8';
  ctx.fillRect(BOARD.x + 30, BOARD.y + BOARD.h + 4, 9, 3.5);
  // 黒板消し
  ctx.fillStyle = '#6a86b8';
  ctx.fillRect(BOARD.x + 60, BOARD.y + BOARD.h + 1, 22, 6);

  // 床
  const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, ROOM_Y + ROOM_H);
  fg.addColorStop(0, '#c89a68');
  fg.addColorStop(1, '#b3824f');
  ctx.fillStyle = fg;
  ctx.fillRect(0, FLOOR_Y, WIDTH, ROOM_Y + ROOM_H - FLOOR_Y);
  ctx.strokeStyle = 'rgba(90,55,25,0.18)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    const y = FLOOR_Y + k * k * 4.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // 教卓（向かって左）
  ctx.fillStyle = '#a0703f';
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 1.2;
  rr(ctx, 110, FLOOR_Y + 6, 90, 40, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b8864f';
  ctx.fillRect(106, FLOOR_Y + 2, 98, 8);
  ctx.strokeRect(106, FLOOR_Y + 2, 98, 8);

  // 先生（しかるときは体ごとこちらを向いて大きく）
  if (s.scold) {
    drawOwl(ctx, TEACHER_X - 20, TEACHER_Y + 40, { scale: 2.1, frontBody: true, angry: true });
    outlinedText(ctx, 'こらっ！', TEACHER_X - 150, TEACHER_Y - 110, 40, '#ff6f6f', '#4a1a1a');
  } else {
    drawOwl(ctx, TEACHER_X, TEACHER_Y, {
      scale: TEACHER_SCALE,
      turn: s.owlTurn,
      turnSide: -1,
      wing: s.owlWing,
      chalk: s.owlChalk,
      time: s.time
    });
  }
  if (s.owlSay) {
    speech(ctx, TEACHER_X - 58, TEACHER_Y - 108, s.owlSay);
  }

  // 見回りの先生は生徒の列の手前を歩く（生徒より奥に描くと隠れて見えないので、生徒の前に描く）
  // 生徒の列（後ろ姿）
  const row: { x: number; kind: StudentKind }[] = [
    { x: 58, kind: 'suzume' },
    { x: 150, kind: 'mejiro' },
    { x: 330, kind: 'yukimaru' },
    { x: 422, kind: 'hiyo' }
  ];
  // 後ろから見ているので、机は生徒の向こう側（体の左右から天板と脚がのぞく）、
  // いすの背もたれは生徒の手前（背中の下のほう）に見える。
  const deskY = ROOM_Y + ROOM_H - 26;
  const seats = [...row.map((r) => r.x), 240];
  for (const [i, x] of seats.entries()) drawDeskBack(ctx, x, deskY, i);
  for (const [i, st] of row.entries()) {
    drawStudent(ctx, st.x, deskY - 8, st.kind, { scale: 1.75, time: s.time, phase: i * 1.7 });
  }
  // さくらちゃんの後ろ姿（つまみ食い中は少し頭を下げる）
  drawSakura(ctx, 240, deskY - 6 + (s.sakuraDip ?? 0) * 7, { view: 'back', scale: 1.75, shadow: false });
  for (const x of seats) drawChairBack(ctx, x, deskY);

  if (s.patrol) {
    const p = s.patrol;
    if (p.looking) drawSightCone(ctx, p.x, TEACHER_Y + 6);
    drawPatrol(ctx, p.x, TEACHER_Y + 36, { scale: 2, facing: p.facing, walk: p.walk, looking: p.looking, warn: p.warn });
  }

  ctx.restore();
}

/**
 * 生徒の机を後ろから見たところ。天板（奥が少し狭い台形）と脚。生徒の体で真ん中は隠れる。
 * 天板の上の教科書・ノートの端が、体の横からのぞくようにする。
 */
function drawDeskBack(ctx: CanvasRenderingContext2D, x: number, deskY: number, i: number): void {
  const far = deskY - 20;
  const near = deskY - 6;
  ctx.strokeStyle = '#6a4424';
  ctx.lineWidth = 1.2;
  // 脚（手前の 2 本と奥の 2 本）
  ctx.fillStyle = '#8a8f98';
  for (const lx of [-36, 36]) ctx.fillRect(x + lx - 1.5, near, 3, 40);
  ctx.fillStyle = '#9ca2ab';
  for (const lx of [-32, 32]) ctx.fillRect(x + lx - 1.2, far, 2.4, 30);
  // 天板の厚み（手前の縁）
  ctx.fillStyle = '#a97643';
  ctx.fillRect(x - 40, near, 80, 5);
  ctx.strokeRect(x - 40, near, 80, 5);
  // 天板
  ctx.fillStyle = '#c8955e';
  ctx.beginPath();
  ctx.moveTo(x - 34, far);
  ctx.lineTo(x + 34, far);
  ctx.lineTo(x + 40, near);
  ctx.lineTo(x - 40, near);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 天板の上の教科書（左右どちらかの端がのぞく）
  const side = i % 2 === 0 ? -1 : 1;
  ctx.fillStyle = ['#ffffff', '#fdf3c8', '#dff0ff'][i % 3]!;
  ctx.strokeStyle = '#9a8a7a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + side * 16, far + 3);
  ctx.lineTo(x + side * 33, far + 3);
  ctx.lineTo(x + side * 36, near - 2);
  ctx.lineTo(x + side * 18, near - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** いすの背もたれ（生徒の手前、背中の下のほう）。 */
function drawChairBack(ctx: CanvasRenderingContext2D, x: number, deskY: number): void {
  ctx.fillStyle = '#9ca2ab';
  for (const px of [-17, 17]) ctx.fillRect(x + px - 1.6, deskY + 10, 3.2, 20);
  ctx.fillStyle = '#b8864f';
  ctx.strokeStyle = '#6a4424';
  ctx.lineWidth = 1.2;
  rr(ctx, x - 22, deskY + 6, 44, 11, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x - 18, deskY + 8, 36, 2);
}

function drawBoardText(ctx: CanvasRenderingContext2D, lines: readonly string[], written: number): void {
  const total = lines.reduce((n, l) => n + l.length, 0);
  let left = Math.floor(total * Math.min(1, written));
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(250,250,240,0.92)';
  for (const [i, line] of lines.entries()) {
    if (left <= 0) break;
    const shown = line.slice(0, left);
    left -= line.length;
    ctx.fillText(shown, BOARD.x + 18, BOARD.y + 18 + i * 23);
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number): void {
  ctx.fillStyle = '#8a6444';
  ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#bfe2f6');
  g.addColorStop(1, '#eef7fc');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // 雪の木
  ctx.fillStyle = '#ffffff';
  for (const [tx, ty, s] of [
    [x + 22, y + h - 14, 1],
    [x + 50, y + h - 8, 1.3]
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(tx, ty - 40 * s);
    ctx.lineTo(tx + 14 * s, ty);
    ctx.lineTo(tx - 14 * s, ty);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a9cde3';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y + h - 10, w, 10);
  // 雪
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 9; k++) {
    const fx = x + ((k * 23.7) % w);
    const fy = y + ((k * 31.3 + t * 14) % h);
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#8a6444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#6a4a30';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#333';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 7, y - 4);
  ctx.moveTo(x, y);
  const a = t * 0.8 - Math.PI / 2;
  ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
  ctx.stroke();
}

/** 吹き出し（先生のせき払いなど）。 */
function speech(ctx: CanvasRenderingContext2D, x: number, y: number, s: string): void {
  ctx.font = `bold 15px ${FONT}`;
  const w = ctx.measureText(s).width + 18;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4a3326';
  ctx.lineWidth = 1.5;
  rr(ctx, x - w / 2, y - 14, w, 28, 12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 14, y + 12);
  ctx.lineTo(x + w / 2 + 2, y + 24);
  ctx.lineTo(x + w / 2 - 4, y + 11);
  ctx.fill();
  text(ctx, s, x, y, 15, '#4a3326', true);
}

/** 見回りの先生の「見ている範囲」（手前＝さくらちゃんのほうへ広がる扇形）。 */
function drawSightCone(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + 90);
  g.addColorStop(0, 'rgba(255,220,90,0.55)');
  g.addColorStop(1, 'rgba(255,220,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 90, y + 90);
  ctx.lineTo(x - 90, y + 90);
  ctx.closePath();
  ctx.fill();
}

// --- さくらちゃんの席（アップ） ---------------------------------------------

export interface SeatState {
  time: number;
  /** ついばみの深さ 0..1（1 で木の実に顔を寄せきった）。 */
  peck: number;
  puff: number;
  /** ほおばりモード中。 */
  cram: boolean;
  /** しかられ中。 */
  caught: boolean;
  /** 木の実の残り（見た目だけ。0..1）。 */
  nuts: number;
  /** ついばみの回数（小数つき。1 増えるごとに 1 回ついばむ）。 */
  chew: number;
  /** 食べた数（机に落ちた殻の数に使う）。 */
  eaten: number;
  /** 立てた教科書の表紙の文字（授業の名前）。 */
  book?: string;
}

/** ひまわりの種の殻（半分）。 */
function drawHusk(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#4a4540';
  ctx.beginPath();
  ctx.moveTo(0, -4.5);
  ctx.quadraticCurveTo(3.4, 0, 0, 4.5);
  ctx.quadraticCurveTo(1.2, 0, 0, -4.5);
  ctx.fill();
  ctx.strokeStyle = '#e8e2d6';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1.1, -3);
  ctx.quadraticCurveTo(2, 0, 1.1, 3);
  ctx.stroke();
  ctx.restore();
}

const SAKURA_X = 214;
const SAKURA_SCALE = 4.2;
const DESK_Y = SEAT_Y + 196;
/** 木の実のおわんの位置（ふちの中心）。ついばんだときのくちばしの先がここに届く。 */
const BOWL_X = 336;
const BOWL_RIM_Y = DESK_Y - 18;

export function drawSeat(ctx: CanvasRenderingContext2D, s: SeatState): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, SEAT_Y, WIDTH, SEAT_H);
  ctx.clip();

  // 背景（うしろの壁と掲示物）
  ctx.fillStyle = '#efe2c8';
  ctx.fillRect(0, SEAT_Y, WIDTH, SEAT_H);
  ctx.fillStyle = '#e4d3b2';
  for (let k = 0; k < 8; k++) ctx.fillRect(k * 64, SEAT_Y, 2, SEAT_H);
  drawPoster(ctx, 30, SEAT_Y + 26, '#fbd0dc', 'ゆき');
  drawPoster(ctx, 380, SEAT_Y + 34, '#cfe8f8', 'えさ');

  // ほおばりモード：縁をピンクに光らせる
  if (s.cram) {
    const a = 0.45 + Math.sin(s.time * 14) * 0.15;
    ctx.strokeStyle = `rgba(255,120,170,${a})`;
    ctx.lineWidth = 14;
    ctx.strokeRect(0, SEAT_Y, WIDTH, SEAT_H);
  }

  // さくらちゃん：押している間は右の木の実へ体を傾け、頭を上下させてついばむ。
  // chew の 1 周で「ついばむ（下）→ くわえて持ち上げる → 殻を割って落とす」。
  const phase = ((s.chew % 1) + 1) % 1;
  const eating = s.peck > 0.3 && !s.caught;
  // d = 1 で木の実に届いた瞬間、0 で持ち上げきったところ
  const d = eating ? Math.pow((1 + Math.cos(phase * Math.PI * 2)) / 2, 1.5) : 1;
  const lean = s.peck * (0.55 + 0.45 * d);
  const px = SAKURA_X + lean * 86;
  const py = DESK_Y - 60 + lean * 33;
  const rot = lean * 0.5;
  // もぐもぐ：食べている間はほっぺを小刻みに動かす
  const chewPuff = eating ? s.puff * (1 + 0.06 * Math.sin(s.chew * Math.PI * 4)) : s.puff;
  drawSakura(ctx, px, py, {
    scale: SAKURA_SCALE,
    rotate: rot,
    puff: Math.min(1.06, chewPuff),
    eyes: s.caught ? 'shock' : s.peck > 0.3 ? 'happy' : 'dot',
    blush: s.caught ? 1 : 0,
    up: !s.caught && s.peck < 0.3,
    beakOpen: eating && (phase > 0.86 || phase < 0.1),
    shadow: false
  });
  // くちばしの先の位置（drawSakura の変形と同じ計算：足元 y+16 を支点に回転、くちばしは支点から 16.8 上）
  const beakX = px + SAKURA_SCALE * 16.8 * Math.sin(rot);
  const beakY = py + SAKURA_SCALE * (16 - 16.8 * Math.cos(rot));

  // 机（天板と前板）
  ctx.fillStyle = '#c8955e';
  ctx.strokeStyle = '#6a4424';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, DESK_Y);
  ctx.lineTo(456, DESK_Y);
  ctx.lineTo(472, DESK_Y + 26);
  ctx.lineTo(8, DESK_Y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a97643';
  ctx.fillRect(8, DESK_Y + 26, 464, 12);
  ctx.strokeRect(8, DESK_Y + 26, 464, 12);
  ctx.fillStyle = '#8f6135';
  ctx.fillRect(20, DESK_Y + 38, 440, SEAT_H);

  // 開いた教科書（左）とノート
  drawBook(ctx, 44, DESK_Y + 4);
  // 筆箱
  drawPencilCase(ctx, 214, DESK_Y + 16);
  // 机に落ちた殻（食べた数だけ少しずつ増える。見た目だけ）
  for (let k = 0; k < Math.min(14, Math.floor(s.eaten / 4)); k++) {
    drawHusk(ctx, 258 + ((k * 23.7) % 60), DESK_Y + 12 + ((k * 7.3) % 10), k * 1.7);
  }

  // 木の実のおわん（さくらちゃんより手前。ついばむとくちばしがおわんの中に入る）
  drawNutBowl(ctx, BOWL_X, BOWL_RIM_Y, s.nuts);
  // おわんの右手前に立てた教科書（先生から隠しているつもり）
  drawStandingBook(ctx, BOWL_X + 50, DESK_Y + 20, s.book ?? 'こくご');

  if (eating) {
    // くわえた種（持ち上げる間だけ見える）
    if (phase < 0.4) {
      ctx.save();
      ctx.translate(beakX, beakY + 1);
      ctx.rotate(0.9);
      ctx.fillStyle = '#3e3a36';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8e2d6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -4.6);
      ctx.lineTo(0, 4.6);
      ctx.stroke();
      ctx.restore();
    }
    // 殻を割って落とす（2 つに割れて左右へ）
    if (phase >= 0.4) {
      const f = (phase - 0.4) / 0.6;
      for (const side of [-1, 1]) {
        const hx = beakX + side * (4 + f * 14);
        const hy = Math.min(DESK_Y + 14, beakY + 4 + f * f * 70);
        drawHusk(ctx, hx, hy, side * (0.6 + f * 3));
      }
    }
  }

  // 食べているときの「もぐもぐ」
  if (s.puff > 0.15 && !s.caught) {
    const bounce = Math.abs(Math.sin(s.time * (s.cram ? 18 : 10))) * 4;
    outlinedText(ctx, s.cram ? 'もぐもぐもぐ！' : 'もぐもぐ', px + 6, py - 86 - bounce, s.cram ? 22 : 18, s.cram ? '#ff7fb0' : '#ffffff', '#6a3448');
  }
  if (s.caught) {
    // あせ
    ctx.fillStyle = '#8fd0ff';
    for (const [x, y] of [
      [px - 70, py - 50],
      [px + 72, py - 58]
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.quadraticCurveTo(x - 7, y, x, y + 4);
      ctx.quadraticCurveTo(x + 7, y, x, y - 12);
      ctx.fill();
    }
  }

  // 区画の見出し
  ctx.fillStyle = 'rgba(40,24,16,0.55)';
  rr(ctx, 8, SEAT_Y + 8, 112, 22, 11);
  ctx.fill();
  text(ctx, 'さくらちゃんの席', 64, SEAT_Y + 19, 12, '#ffffff', true);

  ctx.restore();

  // 教室との境目
  ctx.fillStyle = '#3b2616';
  ctx.fillRect(0, SEAT_Y - 2, WIDTH, 4);
}

function drawPoster(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 70, 52);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 70, 52);
  text(ctx, label, x + 35, y + 26, 20, 'rgba(90,60,40,0.7)', true);
  ctx.fillStyle = '#d8453c';
  ctx.beginPath();
  ctx.arc(x + 35, y + 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBook(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8a7a6a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 70, y + 2);
  ctx.lineTo(x + 134, y);
  ctx.lineTo(x + 138, y + 18);
  ctx.lineTo(x + 70, y + 21);
  ctx.lineTo(x, y + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 70, y + 2);
  ctx.lineTo(x + 70, y + 21);
  ctx.stroke();
  ctx.strokeStyle = '#c9c0b4';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    ctx.moveTo(x + 12, y + 5 + k * 4.5);
    ctx.lineTo(x + 62, y + 6 + k * 4.5);
    ctx.moveTo(x + 78, y + 6 + k * 4.5);
    ctx.lineTo(x + 128, y + 5 + k * 4.5);
  }
  ctx.stroke();
}

function drawPencilCase(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#f08aa8';
  ctx.strokeStyle = '#8e3b58';
  ctx.lineWidth = 1.6;
  rr(ctx, -28, -8, 56, 13, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(14, -1.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f08aa8';
  ctx.beginPath();
  ctx.arc(14, -1.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 木の実を山盛りにしたおわん（ひまわりの種とどんぐり）。(cx, rimY) がふちの中心。amount 0..1 で山が低くなる。
 * 机の上で高さを出して、ついばむさくらちゃんのくちばしが机に隠れずに届くようにしている。
 */
function drawNutBowl(ctx: CanvasRenderingContext2D, cx: number, rimY: number, amount: number): void {
  const rx = 36;
  const bottom = DESK_Y + 14;
  // おわんの内側
  ctx.fillStyle = '#9a5a32';
  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 中の山（ふちより上に盛り上がる。手前半分はおわんの胴に隠れる）
  const heap = 4 + amount * 8;
  const nuts = 14;
  for (let k = 0; k < nuts; k++) {
    const row = Math.floor(k / 5);
    const nx = cx - 26 + ((k * 13.3) % 52);
    const ny = rimY + 2 - row * (heap / 2.5) - Math.sin(((nx - cx + rx) / (rx * 2)) * Math.PI) * heap * 0.5;
    if (k % 3 === 0) {
      ctx.fillStyle = '#b5773a';
      ctx.beginPath();
      ctx.ellipse(nx, ny, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5230';
      ctx.beginPath();
      ctx.ellipse(nx, ny - 4, 5.6, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(k * 0.9);
      ctx.fillStyle = '#3e3a36';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8e2d6';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(0, 4.5);
      ctx.stroke();
      ctx.restore();
    }
  }
  // おわんの胴（手前）
  const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  g.addColorStop(0, '#d98a4e');
  g.addColorStop(0.5, '#f0a868');
  g.addColorStop(1, '#c47a42');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#7a4424';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - rx, rimY);
  ctx.ellipse(cx, rimY, rx, 7, 0, Math.PI, 0, true);
  ctx.bezierCurveTo(cx + rx, rimY + 18, cx + 18, bottom, cx, bottom);
  ctx.bezierCurveTo(cx - 18, bottom, cx - rx, rimY + 18, cx - rx, rimY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // ふちの線とつや
  ctx.strokeStyle = '#8e5230';
  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx, 7, 0, 0, Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 18, rimY + 14, 4, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // 桜の模様
  ctx.fillStyle = '#fbd0dc';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(cx + 8 + Math.cos(a) * 3, rimY + 17 + Math.sin(a) * 3, 2.4, 1.7, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- 情報欄 ----------------------------------------------------------------

export interface HudState {
  period: number;
  subject: string;
  timeLeft: number;
  score: number;
  eaten: number;
  hiScore: number;
}

export function drawHud(ctx: CanvasRenderingContext2D, s: HudState): void {
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, 0, WIDTH, HUD_H);

  // ポーズボタン（左端）
  ctx.fillStyle = COLOR.panel;
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 1;
  rr(ctx, 6, 6, 30, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(15, 13, 4, 14);
  ctx.fillRect(23, 13, 4, 14);

  text(ctx, `${s.period}じかんめ`, 46, 13, 11, COLOR.muted, true, 'left');
  text(ctx, s.subject, 46, 28, 15, COLOR.ink, true, 'left');

  // 残り時間（中央）
  const sec = Math.ceil(s.timeLeft);
  const low = s.timeLeft < 10;
  text(ctx, 'のこり', 196, 20, 11, COLOR.muted, true);
  text(ctx, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 244, 20, 22, low ? '#ff9a7a' : COLOR.ink, true);

  // 点数（右）
  text(ctx, 'てんすう', 470, 11, 10, COLOR.muted, true, 'right');
  text(ctx, s.score.toLocaleString('en-US'), 470, 28, 20, COLOR.pink, true, 'right');

  // 下の欄：食べた数とハイスコア
  const fy = HEIGHT - FOOTER_H;
  ctx.fillStyle = COLOR.hud;
  ctx.fillRect(0, fy, WIDTH, FOOTER_H);
  text(ctx, `たべた ${s.eaten} こ`, 12, fy + 12, 12, COLOR.ink, true, 'left');
  text(ctx, `HI ${s.hiScore.toLocaleString('en-US')}`, 470, fy + 12, 12, COLOR.muted, true, 'right');
  text(ctx, 'おしている間 たべる', 240, fy + 12, 11, COLOR.muted, false);
}

export { drawAlert };

/**
 * 机に立てた教科書（表紙が見える）。(x, bottom) が下の中心。少し右へ傾けて立てかける。
 */
function drawStandingBook(ctx: CanvasRenderingContext2D, x: number, bottom: number, title: string): void {
  const w = 50;
  const h = 72;
  ctx.save();
  ctx.translate(x, bottom);
  ctx.rotate(0.07);
  // 影
  ctx.fillStyle = 'rgba(60,30,10,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, 0, w * 0.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // ページの厚み（左側に白い小口）
  ctx.fillStyle = '#f4efe4';
  ctx.strokeStyle = '#9a8a7a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 6, -h + 5);
  ctx.lineTo(-w / 2, -h);
  ctx.lineTo(-w / 2, 0);
  ctx.lineTo(-w / 2 - 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,130,110,0.5)';
  ctx.beginPath();
  for (let k = 1; k < 4; k++) {
    ctx.moveTo(-w / 2 - k * 1.5, -h + 1 + k);
    ctx.lineTo(-w / 2 - k * 1.5, 1 + k);
  }
  ctx.stroke();
  // 表紙
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#5b8fd6');
  g.addColorStop(1, '#3f73bd');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#27497a';
  ctx.lineWidth = 1.6;
  rr(ctx, -w / 2, -h, w, h, 3);
  ctx.fill();
  ctx.stroke();
  // 背の帯
  ctx.fillStyle = '#2f5a9a';
  ctx.fillRect(-w / 2, -h, 6, h);
  // 題名の白い枠
  ctx.fillStyle = '#ffffff';
  rr(ctx, -w / 2 + 11, -h + 9, w - 18, 20, 3);
  ctx.fill();
  text(ctx, title, 3, -h + 19.5, title.length > 3 ? 9 : 11, '#27497a', true);
  // 表紙の絵（雪の結晶）
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    ctx.moveTo(3 - Math.cos(a) * 10, -26 - Math.sin(a) * 10);
    ctx.lineTo(3 + Math.cos(a) * 10, -26 + Math.sin(a) * 10);
  }
  ctx.stroke();
  ctx.restore();
}
